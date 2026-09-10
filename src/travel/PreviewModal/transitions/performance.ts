import type { TransitionId } from "./types";

/**
 * Detects if the client explicitly prefers reduced motion or is on an extreme constrained environment.
 */
export function isLowEndDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  // Check user preference for reduced motion
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return true;
  }

  // Only trigger on single-core constrained environments
  if (typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 1) {
    return true;
  }

  return false;
}


/**
 * Fallback mapping for heavy 3D and canvas-heavy transitions on lower-end devices.
 * Flagged for graceful degradation.
 */
export const LOW_END_FALLBACK_MAP: Partial<Record<TransitionId, TransitionId>> = {
  // 3D rotations degrade to corresponding 2D slides or push
  cubeRotateLeft: "slideFromRight",
  cubeRotateRight: "slideFromLeft",
  cubeRotateUp: "slideFromBottom",
  cubeRotateDown: "slideFromTop",
  flipHorizontal: "wipeLeftToRight",
  flipVertical: "wipeTopToBottom",
  tiltInFromLeft: "slideFromLeft",
  tiltInFromRight: "slideFromRight",
  pageCurl: "wipeDiagonal",
  pageCurlReverse: "wipeDiagonal",
  doorSwingOpen: "slideFromRight",
  foldReveal: "splitReveal",

  // Canvas-heavy pixel operations degrade to clean wipes/fades
  shatterDissolve: "crossfade",
  pixelateDissolve: "blurCrossfade",
  filmBurnTransition: "fadeThroughWhite",
  vhsStatic: "glitchCut",
};

/**
 * Returns the effective transition ID, degrading heavy transitions on low-end hardware.
 */
export function resolveEffectiveTransitionId(
  id: TransitionId,
  isLowEnd = isLowEndDevice()
): TransitionId {
  if (!isLowEnd) {
    return id;
  }
  return LOW_END_FALLBACK_MAP[id] ?? id;
}

