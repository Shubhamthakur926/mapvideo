import type { Location, Transport } from "../../types";

export type PhotoTransitionDirection = "left" | "right" | "top";

export interface SummaryCardOptions {
  ctx: CanvasRenderingContext2D;
  locations: Location[];
  legs: Transport[];
  totalTripDistance: string;
  preloadedImgs: Map<string, HTMLImageElement>;
  opacity: number;
  elapsedInSummary?: number;
  summaryDuration?: number;
}

export interface PreviewModalProps {
  locations: Location[];
  legs: Transport[];
  onClose: () => void;
  autoRecord?: boolean;
  duration?: number;
}

export interface LegScheduleItem {
  index: number;
  stop: Location;
  images: string[];
  video: { url: string; duration?: number; credit?: string } | null;
  photoCount: number;
  videoDurationMs: number;
  photosDurationMs: number;
  duration: number;
}

export interface PhotoItem {
  url: string;
  locationName: string;
}

export interface ExportArrivalWindow {
  start: number;
  end: number;
  hasVideo: boolean;
  videoUrl?: string;
}

