import type { Transport } from "../../types";

export const vehicleMarks: Record<Transport, string> = {
  car: "🚗",
  bike: "🏍️",
  flight: "✈️",
  train: "🚆",
  taxi: "🚕",
  bicycle: "🚲",
  bus: "🚌",
  walking: "🚶",
  ship: "🚢",
};

export const BACKGROUND_MUSIC_URL = "/sounds/background.mp3";
export const BACKGROUND_MUSIC_VOLUME = 0.6;
export const BACKGROUND_MUSIC_DUCK_VOLUME = 0.15;
export const BRAND_LOGO_URL = "/picture/App-logo.png";
export const INTRO_VIDEO_URL = "/videos/intro.mp4";
export const DEFAULT_INTRO_DURATION_MS = 6500;

// Stage Durations
export const SUMMARY_DURATION_MS = 3600;
export const OUTRO_DURATION_MS = 2500;
export const FADE_TRANSITION_MS = 500;
export const VEHICLE_LEG_DURATION_MS = 4000;
export const PHOTO_DURATION_MS = 2000;
export const PHOTO_TRANSITION_MS = 480;
export const ROUTE_MAP_DURATION_MS = 3200;
export const COLLAGE_DURATION_MS = 8000;
export const COLLAGE_ENTRY_DURATION_MS = 800;
export const COLLAGE_STAGGER_MS = 50;
export const EXPORT_FRAME_RATE = 30;

export const COLLAGE_ENTRY_VECTORS = [
  { x: -780, y: -640, rotate: -14 },
  { x: 0, y: -760, rotate: -8 },
  { x: 780, y: -640, rotate: 14 },
  { x: 860, y: 0, rotate: 10 },
  { x: 780, y: 640, rotate: -12 },
  { x: 0, y: 760, rotate: 8 },
  { x: -780, y: 640, rotate: 12 },
  { x: -860, y: 0, rotate: -10 },
] as const;

