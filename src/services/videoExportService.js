import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { makeJobId, normalizeJourneyInput, resolveLocalAssetPath, sanitizeFileName } from "../utils/validation.js";
import { downloadRemoteAsset } from "./assetDownloader.js";
import env from "../config.js";

const EXPORT_JOBS = new Map();
const PROJECT_ROOT = path.resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const PUBLIC_DIR = path.resolve(PROJECT_ROOT, "public");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getJob(jobId) {
  return EXPORT_JOBS.get(jobId);
}

function updateJob(jobId, patch) {
  const current = EXPORT_JOBS.get(jobId);
  if (!current) return null;
  const next = { ...current, ...patch };
  EXPORT_JOBS.set(jobId, next);
  return next;
}

function buildOutputFilename(journey) {
  const startName = sanitizeFileName(journey.locations?.[0]?.name || "travel");
  const endName = sanitizeFileName(journey.locations?.at(-1)?.name || "journey");
  return `${startName}-to-${endName}-roamly-export.mp4`;
}

async function ensureOutputDir() {
  const outputDir = path.resolve(PROJECT_ROOT, env.videoOutputDir);
  await fs.mkdir(outputDir, { recursive: true });
  return outputDir;
}

async function resolveMediaPath(url, destinationDir, label) {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();
  if (trimmed.startsWith("/")) {
    const resolved = resolveLocalAssetPath(trimmed, PROJECT_ROOT);
    if (resolved && fsSync.existsSync(resolved)) {
      return resolved;
    }
    const publicCandidate = path.resolve(PUBLIC_DIR, trimmed.replace(/^\//, ""));
    if (fsSync.existsSync(publicCandidate)) {
      return publicCandidate;
    }

    return null;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return downloadRemoteAsset(trimmed, path.resolve(PROJECT_ROOT, env.assetCacheDir), label, {
      connectTimeoutMs: env.assetConnectTimeoutMs,
      requestTimeoutMs: env.assetRequestTimeoutMs,
      maxRetries: env.assetMaxRetries,
      retryDelayMs: env.assetRetryDelayMs,
      maxFileSize: env.assetMaxFileSize,
    });
  }

  return null;
}

async function resolveMediaPathSafely(url, destinationDir, label) {
  try {
    return await resolveMediaPath(url, destinationDir, label);
  } catch (error) {
    console.error(`[export asset:${label}] unavailable (${url}):`, error);
    return null;
  }
}

async function renderSegment({ source, label, duration, kind, tempDir }) {
  const segmentPath = path.join(tempDir, `${sanitizeFileName(label)}-${Date.now()}.mp4`);
  const args = ["-y"];

  if (kind === "image") {
    args.push("-loop", "1", "-t", String(duration), "-i", source);
    args.push(
      "-vf",
      "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p",
      "-r",
      "30",
      "-pix_fmt",
      "yuv420p",
      "-c:v",
      "libx264",
      "-t",
      String(duration),
      segmentPath
    );
    return runFfmpeg(args);
  }

  args.push("-i", source, "-t", String(duration), "-vf", "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:color=black", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-r", "30", segmentPath);
  return runFfmpeg(args);
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`ffmpeg failed (${code}): ${stderr || stdout || "unknown ffmpeg error"}`));
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

async function buildRenderPlan(journey, tempDir) {
  const introSource = path.resolve(PUBLIC_DIR, "videos", "intro.mp4");
  const plan = [];

  if (fsSync.existsSync(introSource)) {
    plan.push({ kind: "video", label: "intro", source: introSource, duration: 6 });
  }

  for (const [index, location] of journey.locations.slice(1).entries()) {
    const prev = journey.locations[index];
    const videoSource = location.videoUrl ? await resolveMediaPathSafely(location.videoUrl, tempDir, `video-${index}`) : null;
    const images = location.images && location.images.length > 0
      ? await Promise.all(
          location.images.map(async (image, imageIndex) => resolveMediaPathSafely(image, tempDir, `photo-${index}-${imageIndex}`))
        )
      : [];

    const fallbackImage = location.imageUrl ? await resolveMediaPathSafely(location.imageUrl, tempDir, `cover-${index}`) : null;
    const photoSources = images.filter(Boolean).length ? images.filter(Boolean) : fallbackImage ? [fallbackImage] : [];

    if (videoSource) {
      const duration = Number(location.videoDuration) > 0 ? Number(location.videoDuration) : 5;
      plan.push({ kind: "video", label: `arrival-${index}`, source: videoSource, duration });
      continue;
    }

    if (photoSources.length) {
      const duration = Math.max(2, Math.min(6, photoSources.length * 2));
      for (const photo of photoSources) {
        plan.push({ kind: "image", label: `slide-${index}-${Date.now()}-${Math.random()}`, source: photo, duration: duration / photoSources.length });
      }
    }

    if (!videoSource && !photoSources.length && prev) {
      const previousImage = prev.imageUrl
        ? await resolveMediaPathSafely(prev.imageUrl, tempDir, `fallback-${index}`)
        : null;
      plan.push({
        kind: "image",
        label: `fallback-${index}`,
        source: previousImage || path.resolve(PUBLIC_DIR, "picture", "App-logo.png"),
        duration: 4,
      });
    }
  }

  return plan.filter((segment) => segment && segment.source);
}

async function renderExport(jobId) {
  const job = getJob(jobId);
  if (!job) return;

  updateJob(jobId, { status: "preparing", progress: 5, error: null });
  const outputDir = await ensureOutputDir();
  const tempDir = path.join(os.tmpdir(), "roamly-export", jobId);
  await fs.mkdir(tempDir, { recursive: true });

  updateJob(jobId, { status: "downloading_assets", progress: 20, tempDir });

  const normalizedJourney = normalizeJourneyInput(job.payload);
  const plan = await buildRenderPlan(normalizedJourney, tempDir);

  if (!plan.length) {
    throw new Error("No media was found to build the travel export.");
  }

  updateJob(jobId, { status: "rendering", progress: 45, journey: normalizedJourney });

  const segmentFiles = [];
  for (const [index, segment] of plan.entries()) {
    updateJob(jobId, {
      status: "rendering",
      progress: 45 + Math.round((index / Math.max(1, plan.length)) * 30),
    });
    const segmentPath = path.join(tempDir, `segment-${index}.mp4`);
    const args = ["-y"];

    if (segment.kind === "image") {
      args.push("-loop", "1", "-t", String(segment.duration), "-i", segment.source);
      args.push(
        "-vf",
        "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p",
        "-r",
        "30",
        "-pix_fmt",
        "yuv420p",
        "-c:v",
        "libx264",
        "-t",
        String(segment.duration),
        segmentPath
      );
    } else {
      args.push("-i", segment.source, "-t", String(segment.duration), "-vf", "scale=1080:1080:force_original_aspect_ratio=decrease,pad=1080:1080:(ow-iw)/2:(oh-ih)/2:color=black", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-r", "30", segmentPath);
    }

    await runFfmpeg(args);
    segmentFiles.push(segmentPath);
  }

  const listFile = path.join(tempDir, "concat.txt");
  const concatContents = segmentFiles.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join("\n");
  await fs.writeFile(listFile, concatContents, "utf8");

  const outputPath = path.join(outputDir, buildOutputFilename(normalizedJourney));
  await runFfmpeg([
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listFile,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputPath,
  ]);

  updateJob(jobId, {
    status: "completed",
    progress: 100,
    outputPath,
    fileName: path.basename(outputPath),
    downloadUrl: `/api/video/export/${jobId}/download`,
  });
  console.log(`[export:${jobId}] completed: ${outputPath}`);

  await sleep(2500);
  await fs.rm(tempDir, { recursive: true, force: true });
}

export async function createExportJob(payload) {
  if (EXPORT_JOBS.size >= env.maxExportJobs) {
    throw new Error("The export queue is full. Please try again shortly.");
  }

  const journey = normalizeJourneyInput(payload);
  const jobId = makeJobId();
  const job = {
    id: jobId,
    status: "queued",
    progress: 0,
    createdAt: Date.now(),
    journey,
    payload,
    outputPath: null,
    fileName: null,
    downloadUrl: null,
    error: null,
  };

  EXPORT_JOBS.set(jobId, job);
  queueMicrotask(() => {
    renderExport(jobId).catch((error) => {
      console.error(`[export:${jobId}] failed:`, error);
      updateJob(jobId, {
        status: "failed",
        progress: 100,
        error: error instanceof Error ? error.message : "Export failed.",
      });
    });
  });

  return jobId;
}

export function getExportJob(jobId) {
  const job = getJob(jobId);
  if (!job) return null;

  return {
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    createdAt: job.createdAt,
    outputPath: job.outputPath,
    fileName: job.fileName,
    downloadUrl: job.downloadUrl,
    error: job.error,
  };
}

export async function getExportFile(jobId) {
  const job = getJob(jobId);
  if (!job || !job.outputPath || !fsSync.existsSync(job.outputPath)) {
    throw new Error("Video export not found or has expired.");
  }
  return job.outputPath;
}

export function listJobs() {
  return Array.from(EXPORT_JOBS.entries()).map(([jobId, job]) => ({
    jobId,
    status: job.status,
    progress: job.progress,
    createdAt: job.createdAt,
    fileName: job.fileName,
  }));
}
