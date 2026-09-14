import crypto from "node:crypto";
import dns from "node:dns/promises";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { isAllowedMediaUrl } from "../utils/validation.js";

const USER_AGENT = "Roamly/1.0 asset downloader";
const MAX_REDIRECTS = 5;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENETUNREACH",
  "EHOSTUNREACH",
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hashUrl(url) {
  return crypto.createHash("sha256").update(url).digest("hex");
}

function isPrivateIp(address) {
  if (net.isIPv4(address)) {
    const [first, second] = address.split(".").map(Number);
    return first === 10
      || first === 127
      || (first === 169 && second === 254)
      || (first === 172 && second >= 16 && second <= 31)
      || (first === 192 && second === 168)
      || first === 0;
  }

  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    return normalized === "::1"
      || normalized === "::"
      || normalized.startsWith("fc")
      || normalized.startsWith("fd")
      || normalized.startsWith("fe8")
      || normalized.startsWith("fe9")
      || normalized.startsWith("fea")
      || normalized.startsWith("feb");
  }

  return true;
}

async function resolvePublicIpv4(url) {
  const parsed = new URL(url);
  if (!isAllowedMediaUrl(url) || !["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`Unsafe media URL rejected: ${url}`);
  }

  const records = await dns.lookup(parsed.hostname, { all: true, family: 4, verbatim: true });
  if (!records.length || records.some((record) => isPrivateIp(record.address))) {
    throw new Error(`Media host resolves to a private or unavailable address: ${parsed.hostname}`);
  }

  return { parsed, address: records[0].address };
}

function contentTypeExtension(contentType) {
  const normalized = contentType.split(";", 1)[0].trim().toLowerCase();
  if (normalized === "image/jpeg") return ".jpg";
  if (normalized === "image/png") return ".png";
  if (normalized === "image/webp") return ".webp";
  if (normalized === "image/avif") return ".avif";
  if (normalized === "image/gif") return ".gif";
  if (normalized === "video/mp4") return ".mp4";
  if (normalized === "video/webm") return ".webm";
  if (normalized === "video/quicktime") return ".mov";
  return null;
}

function isSupportedContentType(contentType) {
  const normalized = contentType.split(";", 1)[0].trim().toLowerCase();
  return normalized.startsWith("image/") || normalized.startsWith("video/");
}

function retryableError(error) {
  return RETRYABLE_ERROR_CODES.has(error?.code) || error?.name === "AbortError";
}

function formatReason(error) {
  return error?.code || error?.message || "unknown network error";
}

async function findCachedAsset(cacheDir, key) {
  const entries = await fs.readdir(cacheDir).catch(() => []);
  const cached = entries.find((entry) => entry.startsWith(`${key}.`) && !entry.endsWith(".part"));
  if (!cached) return null;

  const filePath = path.join(cacheDir, cached);
  const stat = await fs.stat(filePath).catch(() => null);
  return stat?.size > 0 ? filePath : null;
}

function convertAvifToPng(sourcePath) {
  const targetPath = sourcePath.replace(/\.avif$/i, ".png");
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, ["-y", "-i", sourcePath, "-frames:v", "1", targetPath], { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", async (code) => {
      if (code !== 0) {
        reject(new Error(`Unable to normalize AVIF asset (${code}): ${stderr}`));
        return;
      }
      await fs.rm(sourcePath, { force: true });
      resolve(targetPath);
    });
  });
}

async function normalizeCachedAsset(filePath) {
  return filePath.endsWith(".avif") ? convertAvifToPng(filePath) : filePath;
}

async function requestAsset(url, destinationPath, options, label, attempt) {
  const { parsed, address } = await resolvePublicIpv4(url);
  const transport = parsed.protocol === "https:" ? https : http;
  const temporaryPath = `${destinationPath}.part`;

  console.log(`[export asset:${label}] Attempt: ${attempt}/${options.maxAttempts} Status: connecting URL: ${url}`);

  return new Promise((resolve, reject) => {
    let settled = false;
    let connected = false;
    let bytes = 0;
    const requestStartedAt = Date.now();
    const request = transport.request({
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || undefined,
      path: `${parsed.pathname}${parsed.search}`,
      method: "GET",
      family: 4,
      lookup: (_hostname, _options, callback) => callback(null, address, 4),
      servername: parsed.hostname,
      headers: {
        Accept: "image/avif,image/webp,image/jpeg,video/mp4,video/webm,*/*",
        "User-Agent": USER_AGENT,
      },
    }, async (response) => {
      const statusCode = response.statusCode || 0;
      if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
        response.resume();
        reject(Object.assign(new Error(`Redirect received (${statusCode})`), {
          code: "REDIRECT",
          redirectUrl: new URL(response.headers.location, url).toString(),
        }));
        return;
      }

      if (statusCode < 200 || statusCode >= 300) {
        response.resume();
        reject(Object.assign(new Error(`Media download failed (${statusCode})`), {
          code: `HTTP_${statusCode}`,
          statusCode,
        }));
        return;
      }

      const contentType = response.headers["content-type"] || "";
      const declaredLength = Number(response.headers["content-length"] || 0);
      if (!isSupportedContentType(contentType)) {
        response.resume();
        reject(Object.assign(new Error(`Unsupported media content type: ${contentType || "unknown"}`), { code: "UNSUPPORTED_CONTENT_TYPE" }));
        return;
      }
      if (declaredLength > options.maxFileSize) {
        response.resume();
        reject(Object.assign(new Error(`Media file exceeds the ${options.maxFileSize} byte limit`), { code: "MAX_FILE_SIZE" }));
        return;
      }

      try {
        const output = fsSync.createWriteStream(temporaryPath, { flags: "w" });
        response.on("data", (chunk) => {
          bytes += chunk.length;
          if (bytes > options.maxFileSize) {
            response.destroy(Object.assign(new Error(`Media file exceeds the ${options.maxFileSize} byte limit`), { code: "MAX_FILE_SIZE" }));
          }
        });
        await pipeline(response, output);
        if (bytes === 0) throw new Error("Media response was empty");
        await fs.rename(temporaryPath, destinationPath);
        resolve({ contentType, bytes, elapsedMs: Date.now() - requestStartedAt });
      } catch (error) {
        await fs.rm(temporaryPath, { force: true }).catch(() => {});
        reject(error);
      }
    });

    const connectTimer = setTimeout(() => {
      if (!connected) request.destroy(Object.assign(new Error("connection timeout"), { code: "ETIMEDOUT" }));
    }, options.connectTimeoutMs);
    const requestTimer = setTimeout(() => {
      request.destroy(Object.assign(new Error("request timeout"), { code: "ETIMEDOUT" }));
    }, options.requestTimeoutMs);

    request.on("socket", (socket) => {
      socket.once("connect", () => {
        connected = true;
        clearTimeout(connectTimer);
      });
    });
    request.on("error", (error) => {
      clearTimeout(connectTimer);
      clearTimeout(requestTimer);
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
    request.on("close", () => {
      clearTimeout(connectTimer);
      clearTimeout(requestTimer);
    });
    request.end();
  });
}

async function downloadWithRedirects(url, destinationPath, options, label, attempt, redirectCount = 0) {
  try {
    return await requestAsset(url, destinationPath, options, label, attempt);
  } catch (error) {
    if (error.code === "REDIRECT") {
      if (redirectCount >= MAX_REDIRECTS) throw new Error(`Too many redirects while downloading ${url}`);
      const redirectedUrl = error.redirectUrl;
      await resolvePublicIpv4(redirectedUrl);
      console.log(`[export asset:${label}] Redirecting to validated URL: ${redirectedUrl}`);
      return downloadWithRedirects(redirectedUrl, destinationPath, options, label, attempt, redirectCount + 1);
    }
    throw error;
  }
}

export async function downloadRemoteAsset(url, cacheDir, label, options) {
  if (!isAllowedMediaUrl(url)) throw new Error(`Unsafe media URL rejected: ${url}`);
  await fs.mkdir(cacheDir, { recursive: true });

  const key = hashUrl(url);
  const cachedPath = await findCachedAsset(cacheDir, key);
  if (cachedPath) {
    console.log(`[export asset:${label}] cache hit: ${url}`);
    return normalizeCachedAsset(cachedPath);
  }

  const destinationPath = path.join(cacheDir, `${key}.asset`);
  const maxAttempts = options.maxRetries + 1;
  const requestOptions = { ...options, maxAttempts };
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await downloadWithRedirects(url, destinationPath, requestOptions, label, attempt);
      const extension = contentTypeExtension(result.contentType);
      if (!extension) throw new Error(`Unsupported media content type: ${result.contentType}`);
      const finalPath = path.join(cacheDir, `${key}${extension}`);
      await fs.rename(destinationPath, finalPath);
      const normalizedPath = extension === ".avif" ? await convertAvifToPng(finalPath) : finalPath;
      console.log(`[export asset:${label}] downloaded ${result.bytes} bytes in ${result.elapsedMs}ms`);
      return normalizedPath;
    } catch (error) {
      lastError = error;
      const statusCode = error.statusCode;
      const canRetry = (retryableError(error) || RETRYABLE_STATUS_CODES.has(statusCode)) && attempt < maxAttempts;
      console.warn(`[export asset:${label}] Attempt ${attempt} failed: ${formatReason(error)}`);
      if (!canRetry) break;
      const delay = options.retryDelayMs * (2 ** (attempt - 1));
      console.warn(`[export asset:${label}] Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  await fs.rm(destinationPath, { force: true }).catch(() => {});
  throw new Error(`Failed to download remote asset after ${maxAttempts} attempts: ${url} Reason: ${formatReason(lastError)}`);
}