import { FADE_TRANSITION_MS, PHOTO_TRANSITION_MS } from "../constants/preview.constants";
import type { PhotoTransitionDirection } from "../types/preview.types";

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function getCollageColumns(imageCount: number): number {
  if (imageCount <= 1) return 1;
  if (imageCount <= 4) return 2;
  if (imageCount <= 8) return 4;
  if (imageCount <= 12) return 4;
  return 5;
}

// Calculate smooth fade-in and fade-out opacity envelope (0 -> 1 -> 0)
export function getFadeOpacity(
  elapsedInPhase: number,
  phaseDuration: number,
  fadeInDuration = FADE_TRANSITION_MS,
  fadeOutDuration = FADE_TRANSITION_MS
): number {
  if (elapsedInPhase < 0 || elapsedInPhase > phaseDuration) return 0;
  if (elapsedInPhase < fadeInDuration) {
    return Math.min(1, Math.max(0, elapsedInPhase / fadeInDuration));
  }
  const timeRemaining = phaseDuration - elapsedInPhase;
  if (timeRemaining < fadeOutDuration) {
    return Math.min(1, Math.max(0, timeRemaining / fadeOutDuration));
  }
  return 1;
}

export {
  getRandomPhotoTransition,
  getTripPhotoTransition,
  resetTripTransitionCache,
} from "../transitions";
export type { TransitionConfig } from "../transitions";

/**
 * @deprecated Use getRandomPhotoTransition() or getTripPhotoTransition() instead.
 * Retained for backwards compatibility.
 */
export function getPhotoTransitionDirection(photoIndex: number): PhotoTransitionDirection {
  return (["left", "right", "top"] as const)[photoIndex % 3];
}

export function getPhotoTransitionAnimation(
  photoIndex: number,
  transitionName?: string
): string {
  if (transitionName) {
    return `${transitionName} ${PHOTO_TRANSITION_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards`;
  }
  const direction = getPhotoTransitionDirection(photoIndex);
  return `photoSlideFrom${direction[0].toUpperCase()}${direction.slice(1)} ${PHOTO_TRANSITION_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards`;
}

