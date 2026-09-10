import { useEffect, useMemo, useState } from "react";
import { calculateDistanceKm, formatDistanceKm } from "../../MapboxGlobe";
import { getLocationImages, getLocationVideo, type Location, type Transport } from "../../types";
import {
  COLLAGE_DURATION_MS,
  DEFAULT_INTRO_DURATION_MS,
  FADE_TRANSITION_MS,
  INTRO_VIDEO_URL,
  OUTRO_DURATION_MS,
  PHOTO_DURATION_MS,
  ROUTE_MAP_DURATION_MS,
  SUMMARY_DURATION_MS,
  VEHICLE_LEG_DURATION_MS,
} from "../constants/preview.constants";
import type { LegScheduleItem, PhotoItem } from "../types/preview.types";
import { getFadeOpacity } from "../utils/previewFormatters";

interface UsePreviewTimelineParams {
  locations: Location[];
  legs: Transport[];
  playing: boolean;
  setPlaying: (playing: boolean) => void;
  timelineElapsed: number;
  setTimelineElapsed: React.Dispatch<React.SetStateAction<number>>;
  recording: boolean;
  unavailableVideos: string[];
}

export function usePreviewTimeline({
  locations,
  legs,
  playing,
  setPlaying,
  timelineElapsed,
  setTimelineElapsed,
  recording,
  unavailableVideos,
}: UsePreviewTimelineParams) {
  const [clipDurations, setClipDurations] = useState<Record<string, number>>({});
  const [introDurationMs, setIntroDurationMs] = useState<number>(DEFAULT_INTRO_DURATION_MS);

  useEffect(() => {
    const media = document.createElement("video");
    media.preload = "metadata";
    media.src = INTRO_VIDEO_URL;
    const updateDuration = () => {
      if (Number.isFinite(media.duration) && media.duration > 0) {
        setIntroDurationMs(Math.round(media.duration * 1000));
      }
    };
    media.addEventListener("loadedmetadata", updateDuration);
    media.load();
    return () => {
      media.removeEventListener("loadedmetadata", updateDuration);
      media.removeAttribute("src");
      media.load();
    };
  }, []);

  const INTRO_DURATION_MS = introDurationMs;

  // Collect all unique photos from all locations
  const allPhotos = useMemo<PhotoItem[]>(() => {
    const photoMap = new Map<string, PhotoItem>();
    locations.forEach((loc) => {
      const images = getLocationImages(loc);
      if (loc.imageUrl) {
        photoMap.set(loc.imageUrl, { url: loc.imageUrl, locationName: loc.name });
      }
      images.forEach((img) => {
        photoMap.set(img, { url: img, locationName: loc.name });
      });
    });
    return Array.from(photoMap.values());
  }, [locations]);

  const totalBatches = allPhotos.length > 0 ? 1 : 0;
  const COLLAGE_TOTAL_DURATION = allPhotos.length > 0 ? COLLAGE_DURATION_MS : 0;

  useEffect(() => {
    const clips = locations
      .map(getLocationVideo)
      .filter((clip): clip is { url: string; duration?: number; credit?: string } => clip !== null);
    const cleanups = clips.map((clip) => {
      const media = document.createElement("video");
      media.preload = "metadata";
      media.src = clip.url;
      const updateDuration = () => {
        if (Number.isFinite(media.duration) && media.duration > 0) {
          setClipDurations((current) =>
            current[clip.url] === media.duration ? current : { ...current, [clip.url]: media.duration }
          );
        }
      };
      media.addEventListener("loadedmetadata", updateDuration);
      media.load();
      return () => {
        media.removeEventListener("loadedmetadata", updateDuration);
        media.removeAttribute("src");
        media.load();
      };
    });
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [locations]);

  const totalLegs = Math.max(1, locations.length - 1);

  const legSchedule = useMemo<LegScheduleItem[]>(
    () =>
      locations.slice(1).map((stop, index) => {
        const images = getLocationImages(stop);
        const video = getLocationVideo(stop);
        const photoCount = Math.max(1, images.length);
        const videoDurationMs = video ? (clipDurations[video.url] ?? video.duration ?? 5) * 1000 : 0;
        const photosDurationMs = photoCount * PHOTO_DURATION_MS;
        return {
          index,
          stop,
          images,
          video,
          photoCount,
          videoDurationMs,
          photosDurationMs,
          duration: VEHICLE_LEG_DURATION_MS + videoDurationMs + photosDurationMs,
        };
      }),
    [locations, clipDurations]
  );

  const totalJourneyDuration = legSchedule.reduce((total, leg) => total + leg.duration, 0);
  const totalPlaybackDuration =
    INTRO_DURATION_MS +
    totalJourneyDuration +
    ROUTE_MAP_DURATION_MS +
    SUMMARY_DURATION_MS +
    COLLAGE_TOTAL_DURATION +
    OUTRO_DURATION_MS;
  const effectiveDurationSec = totalPlaybackDuration / 1000;

  const journeyStartTime = INTRO_DURATION_MS;
  const routeMapStartTime = journeyStartTime + totalJourneyDuration;
  const summaryStartTime = routeMapStartTime + ROUTE_MAP_DURATION_MS;
  const collageStartTime = summaryStartTime + SUMMARY_DURATION_MS;
  const outroStartTime = collageStartTime + COLLAGE_TOTAL_DURATION;

  const isIntro = timelineElapsed < journeyStartTime;
  const isJourney = timelineElapsed >= journeyStartTime && timelineElapsed < routeMapStartTime;
  const isRouteMap = timelineElapsed >= routeMapStartTime && timelineElapsed < summaryStartTime;
  const isSummary = timelineElapsed >= summaryStartTime && timelineElapsed < collageStartTime;
  const isCollage = timelineElapsed >= collageStartTime && timelineElapsed < outroStartTime;
  const isOutro = timelineElapsed >= outroStartTime;

  const collageElapsed = Math.max(0, timelineElapsed - collageStartTime);
  const currentBatchIndex = 0;
  const batchTransitionProgress = 0;

  const introOpacity = isIntro ? getFadeOpacity(timelineElapsed, INTRO_DURATION_MS, 0, 400) : 0;
  const routeMapOpacity = isRouteMap
    ? getFadeOpacity(timelineElapsed - routeMapStartTime, ROUTE_MAP_DURATION_MS)
    : 0;
  const summaryOpacity = isSummary ? getFadeOpacity(timelineElapsed - summaryStartTime, SUMMARY_DURATION_MS) : 0;
  const collageOpacity = isCollage ? getFadeOpacity(collageElapsed, COLLAGE_TOTAL_DURATION) : 0;
  const outroOpacity = isOutro ? getFadeOpacity(timelineElapsed - outroStartTime, OUTRO_DURATION_MS) : 0;

  const journeyElapsed = Math.min(totalJourneyDuration, Math.max(0, timelineElapsed - journeyStartTime));
  const internalProgress = totalJourneyDuration > 0 ? (journeyElapsed / totalJourneyDuration) * 100 : 0;

  let scheduleOffset = 0;
  let activeSchedule = legSchedule.at(-1);
  let elapsedInLeg = 0;
  for (const schedule of legSchedule) {
    if (journeyElapsed < scheduleOffset + schedule.duration) {
      activeSchedule = schedule;
      elapsedInLeg = journeyElapsed - scheduleOffset;
      break;
    }
    scheduleOffset += schedule.duration;
  }

  const currentLegIndex = activeSchedule?.index ?? 0;
  const destination = activeSchedule?.stop ?? locations.at(-1)!;
  const isArrivalPhase = elapsedInLeg >= VEHICLE_LEG_DURATION_MS;
  const videoDurationMs = activeSchedule?.videoDurationMs ?? 0;
  const isVideoScheduled =
    isArrivalPhase && videoDurationMs > 0 && elapsedInLeg - VEHICLE_LEG_DURATION_MS < videoDurationMs;
  const isVideoShowcase =
    isVideoScheduled &&
    Boolean(activeSchedule?.video) &&
    !unavailableVideos.includes(activeSchedule?.video?.url ?? "");
  const isPhotoShowcase = isArrivalPhase && (!isVideoShowcase || !activeSchedule?.video);
  const isMediaShowcase = isArrivalPhase;
  const arrivalMediaDuration = Math.max(
    0,
    (activeSchedule?.duration ?? VEHICLE_LEG_DURATION_MS) - VEHICLE_LEG_DURATION_MS
  );
  const arrivalMediaOpacity = isArrivalPhase
    ? getFadeOpacity(
        elapsedInLeg - VEHICLE_LEG_DURATION_MS,
        arrivalMediaDuration,
        FADE_TRANSITION_MS,
        FADE_TRANSITION_MS
      )
    : 0;
  const travelProgress = Math.min(1, elapsedInLeg / VEHICLE_LEG_DURATION_MS);
  const photoElapsedInLeg = Math.max(0, elapsedInLeg - VEHICLE_LEG_DURATION_MS - videoDurationMs);
  const photoIndex = isPhotoShowcase
    ? Math.min(
        Math.max(0, (activeSchedule?.photoCount ?? 1) - 1),
        Math.floor(photoElapsedInLeg / PHOTO_DURATION_MS)
      )
    : 0;
  const activePhotoUrl = activeSchedule?.images[photoIndex] || destination?.imageUrl || "";
  const mapProgress = Math.min(
    1,
    (currentLegIndex + (isMediaShowcase ? 0.999999 : travelProgress * 0.55)) / totalLegs
  );

  const totalTripDistance = useMemo(
    () =>
      formatDistanceKm(
        locations
          .slice(1)
          .reduce((total, dest, index) => total + calculateDistanceKm(locations[index], dest), 0)
      ),
    [locations]
  );

  const elapsedSec = Math.min(
    effectiveDurationSec,
    Math.floor((internalProgress / 100) * effectiveDurationSec)
  );
  const journeyIsPlaying = playing && isJourney;

  // Playback timer ticker
  useEffect(() => {
    if (!playing || recording) return;
    const intervalMs = 30;
    const timer = window.setInterval(() => {
      setTimelineElapsed((value) => Math.min(totalPlaybackDuration, value + intervalMs));
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [playing, totalPlaybackDuration, recording, setTimelineElapsed]);

  // Stop at end
  useEffect(() => {
    if (playing && !recording && timelineElapsed >= totalPlaybackDuration) {
      setPlaying(false);
    }
  }, [playing, recording, timelineElapsed, totalPlaybackDuration, setPlaying]);

  return {
    INTRO_DURATION_MS,
    allPhotos,
    totalBatches,
    COLLAGE_TOTAL_DURATION,
    totalLegs,
    legSchedule,
    totalJourneyDuration,
    totalPlaybackDuration,
    effectiveDurationSec,
    journeyStartTime,
    routeMapStartTime,
    summaryStartTime,
    collageStartTime,
    outroStartTime,
    isIntro,
    isJourney,
    isRouteMap,
    isSummary,
    isCollage,
    isOutro,
    collageElapsed,
    currentBatchIndex,
    batchTransitionProgress,
    introOpacity,
    routeMapOpacity,
    summaryOpacity,
    collageOpacity,
    outroOpacity,
    internalProgress,
    activeSchedule,
    currentLegIndex,
    destination,
    isArrivalPhase,
    isVideoShowcase,
    isPhotoShowcase,
    isMediaShowcase,
    arrivalMediaOpacity,
    photoIndex,
    activePhotoUrl,
    mapProgress,
    totalTripDistance,
    elapsedSec,
    journeyIsPlaying,
  };
}

