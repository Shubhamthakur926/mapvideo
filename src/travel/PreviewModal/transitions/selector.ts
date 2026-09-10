import { isLowEndDevice, resolveEffectiveTransitionId } from "./performance";
import { TRANSITION_LIST, TRANSITIONS } from "./registry";
import type {
  TransitionConfig,
  TransitionId,
  TransitionSelectionOptions,
} from "./types";

/**
 * Trip-level transition cache so that DOM playback and Canvas export
 * evaluate the exact same transition deterministically per (legIndex, photoIndex).
 */
const tripTransitionCache = new Map<string, TransitionId>();
let lastSelectedTransitionId: TransitionId | null = null;

/**
 * Clears the trip-level transition cache.
 */
export function resetTripTransitionCache(): void {
  tripTransitionCache.clear();
  lastSelectedTransitionId = null;
}

/**
 * Weighted random selector for photo transitions.
 * Ensures:
 * - No back-to-back repeats.
 * - Exclusion of heavy/glitch transitions on the first photo of a stop.
 * - Weighted distribution favoring clean slides/fades/wipes over rare stylized effects.
 * - Degradation fallback on lower-end devices.
 */
export function getRandomPhotoTransition(
  options: TransitionSelectionOptions = {}
): TransitionConfig {
  const previousId = options.previousId ?? lastSelectedTransitionId;
  const isFirstPhoto = Boolean(options.isFirstPhotoInStop);
  const isLowEnd = options.disableHeavy ?? isLowEndDevice();

  // Filter candidates
  let candidates = TRANSITION_LIST.filter((t) => {
    // Exclude immediate repeat
    if (previousId && t.id === previousId) {
      return false;
    }
    // Exclude first photo disruptions if requested
    if (isFirstPhoto && t.excludeOnFirstPhoto) {
      return false;
    }
    // Excluded IDs list
    if (options.excludedIds && options.excludedIds.includes(t.id)) {
      return false;
    }
    // Allowed categories list
    if (options.allowedCategories && !options.allowedCategories.includes(t.category)) {
      return false;
    }
    return true;
  });

  if (candidates.length === 0) {
    candidates = TRANSITION_LIST.filter((t) => t.id !== previousId);
    if (candidates.length === 0) {
      candidates = TRANSITION_LIST;
    }
  }

  // Calculate weighted lottery
  const weightedPool = candidates.map((t) => {
    let weight = t.weight;
    if (options.categoryWeights?.[t.category] !== undefined) {
      weight *= options.categoryWeights[t.category]!;
    }
    return { transition: t, weight: Math.max(1, weight) };
  });

  const totalWeight = weightedPool.reduce((sum, item) => sum + item.weight, 0);
  let randomVal = Math.random() * totalWeight;

  let selected = weightedPool[0].transition;
  for (const item of weightedPool) {
    if (randomVal < item.weight) {
      selected = item.transition;
      break;
    }
    randomVal -= item.weight;
  }

  // Check low-end fallback
  const effectiveId = resolveEffectiveTransitionId(selected.id, isLowEnd);
  const finalConfig = TRANSITIONS[effectiveId] || selected;

  lastSelectedTransitionId = finalConfig.id;
  return finalConfig;
}

/**
 * Returns a stable, deterministic transition for a specific leg and photo index.
 * Allows multi-frame rendering (DOM or Canvas) to remain consistent throughout the transition duration.
 */
export function getTripPhotoTransition(
  legIndex: number,
  photoIndex: number,
  options: TransitionSelectionOptions = {}
): TransitionConfig {
  const cacheKey = `${legIndex}_${photoIndex}`;
  const cachedId = tripTransitionCache.get(cacheKey);

  if (cachedId && TRANSITIONS[cachedId]) {
    return TRANSITIONS[cachedId];
  }

  // Determine previous transition in the trip sequence
  let prevId: TransitionId | null = null;
  if (photoIndex > 0) {
    prevId = tripTransitionCache.get(`${legIndex}_${photoIndex - 1}`) || null;
  } else if (legIndex > 0) {
    // If first photo of this stop, look for the last photo of the previous stop
    for (let p = 20; p >= 0; p--) {
      const id = tripTransitionCache.get(`${legIndex - 1}_${p}`);
      if (id) {
        prevId = id;
        break;
      }
    }
  }

  const transition = getRandomPhotoTransition({
    ...options,
    previousId: prevId || options.previousId,
    isFirstPhotoInStop: photoIndex === 0,
  });

  tripTransitionCache.set(cacheKey, transition.id);
  return transition;
}

