import path from "node:path";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export const VALID_TRANSPORTS = new Set([
  "flight",
  "car",
  "bike",
  "taxi",
  "train",
  "bicycle",
  "bus",
  "walking",
  "ship",
]);

export function makeJobId() {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function sanitizeFileName(value, fallback = "export") {
  const cleaned = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || fallback;
}

function isIpAddress(value) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(value) || value === "::1" || value.startsWith("::ffff:");
}

function isLocalHostname(hostname) {
  if (!hostname) return true;
  const normalized = hostname.toLowerCase();
  if (normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1" || normalized.startsWith("[::1]")) {
    return true;
  }

  if (normalized.startsWith("10.") || normalized.startsWith("192.168.") || normalized.startsWith("172.")) {
    return true;
  }

  if (normalized.startsWith("169.254.") || normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }

  if (isIpAddress(normalized)) {
    return true;
  }

  return false;
}

export function isAllowedMediaUrl(rawUrl) {
  if (typeof rawUrl !== "string") return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith("/")) {
    return trimmed.startsWith("//") === false && !trimmed.includes("..") && !trimmed.includes("\\");
  }

  try {
    const url = new URL(trimmed);
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
      return false;
    }
    if (isLocalHostname(url.hostname)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function resolveLocalAssetPath(url, baseDir) {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/")) {
    const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    const candidate = path.resolve(baseDir, `.${normalized}`);
    return candidate;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return null;
  }

  return null;
}

export function normalizeJourneyInput(payload) {
  const journey = payload?.journey ?? payload;
  if (!journey || typeof journey !== "object") {
    throw new Error("The export payload must include a valid journey object.");
  }

  const rawLocations = Array.isArray(journey.locations) ? journey.locations : Array.isArray(journey.stops) ? journey.stops : [];
  if (rawLocations.length < 2) {
    throw new Error("A journey needs at least two locations.");
  }

  const locations = rawLocations.map((stop, index) => {
    const lat = Number(stop?.lat);
    const lng = Number(stop?.lng);
    if (!stop?.name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error(`Location ${index + 1} must include a valid name, lat and lng.`);
    }

    const images = Array.isArray(stop.images)
      ? stop.images.filter((image) => typeof image === "string" && isAllowedMediaUrl(image))
      : [];

    const imageUrl = typeof stop.imageUrl === "string" && isAllowedMediaUrl(stop.imageUrl) ? stop.imageUrl : images[0] || "";
    const videoUrl = typeof stop.videoUrl === "string" && isAllowedMediaUrl(stop.videoUrl) ? stop.videoUrl : undefined;
    const safeVideoDuration = Number.isFinite(Number(stop.videoDuration)) ? Number(stop.videoDuration) : undefined;

    return {
      id: String(stop.id || `${stop.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`),
      name: String(stop.name),
      country: String(stop.country || ""),
      code: String(stop.code || ""),
      lat,
      lng,
      imageUrl,
      images,
      videoUrl,
      videoDuration: safeVideoDuration,
      description: typeof stop.description === "string" ? stop.description : undefined,
    };
  });

  const rawLegs = Array.isArray(journey.legs) ? journey.legs : [];
  const legs = locations.slice(1).map((_, index) => {
    const chosen = rawLegs[index];
    return VALID_TRANSPORTS.has(chosen) ? chosen : "flight";
  });

  return { locations, legs };
}
