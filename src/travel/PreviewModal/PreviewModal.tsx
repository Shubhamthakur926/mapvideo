import { useEffect, useRef, useState } from "react";
import { MapboxGlobe, type MapboxGlobeHandle } from "../MapboxGlobe";
import type { RouteOverviewMapHandle } from "../RouteOverviewMap";
import "../map-video.css";
import "../video-controls.css";
import "../cinematic-effects.css";
import { ArrivalPhotoShowcase } from "./components/ArrivalPhotoShowcase";
import { ArrivalVideoShowcase } from "./components/ArrivalVideoShowcase";
import { CollageOverlay } from "./components/CollageOverlay";
import { IntroVideoOverlay } from "./components/IntroVideoOverlay";
import { OutroOverlay } from "./components/OutroOverlay";
import { RecordingIndicator } from "./components/RecordingIndicator";
import { RouteOverviewOverlay } from "./components/RouteOverviewOverlay";
import { SummaryCardOverlay } from "./components/SummaryCardOverlay";
import { VideoControls } from "./components/VideoControls";
import { usePreviewMedia } from "./hooks/usePreviewMedia";
import { usePreviewTimeline } from "./hooks/usePreviewTimeline";
import { useVideoExport } from "./hooks/useVideoExport";
import type { PreviewModalProps } from "./types/preview.types";
import { FlagArrivalOverlay } from "../FlagArrivalOverlay";


export function PreviewModal({
  locations,
  legs,
  onClose,
  autoRecord = false,
}: PreviewModalProps) {
  const frame = useRef<HTMLDivElement>(null);
  const routeOverviewRef = useRef<RouteOverviewMapHandle>(null);
  const mapboxGlobeRef = useRef<MapboxGlobeHandle>(null);

  const [playing, setPlaying] = useState(true);
  const [timelineElapsed, setTimelineElapsed] = useState(0);
  const [restartKey, setRestartKey] = useState(0);
  const [muted, setMuted] = useState(false);
  const [unavailableVideos, setUnavailableVideos] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);

  // Timeline and schedule computations
  const timeline = usePreviewTimeline({
    locations,
    legs,
    playing,
    setPlaying,
    timelineElapsed,
    setTimelineElapsed,
    recording,
    unavailableVideos,
  });

  // Media (audio/video) playback synchronization
  const media = usePreviewMedia({
    playing,
    recording,
    muted,
    isIntro: timeline.isIntro,
    isVideoShowcase: timeline.isVideoShowcase,
    restartKey,
    timelineElapsed,
  });

  // Video recording & HD export pipeline
  const { startDownloadRecording } = useVideoExport({
    locations,
    legs,
    legSchedule: timeline.legSchedule,
    allPhotos: timeline.allPhotos,
    totalBatches: timeline.totalBatches,
    totalJourneyDuration: timeline.totalJourneyDuration,
    totalPlaybackDuration: timeline.totalPlaybackDuration,
    effectiveDurationSec: timeline.effectiveDurationSec,
    journeyStartTime: timeline.journeyStartTime,
    routeMapStartTime: timeline.routeMapStartTime,
    summaryStartTime: timeline.summaryStartTime,
    collageStartTime: timeline.collageStartTime,
    outroStartTime: timeline.outroStartTime,
    totalTripDistance: timeline.totalTripDistance,
    INTRO_DURATION_MS: timeline.INTRO_DURATION_MS,
    COLLAGE_TOTAL_DURATION: timeline.COLLAGE_TOTAL_DURATION,
    frame,
    mapboxGlobeRef,
    routeOverviewRef,
    audioRef: media.audioRef,
    setTimelineElapsed,
    setPlaying,
    recording,
    setRecording,
    recordProgress,
    setRecordProgress,
    autoRecord,
  });

  // Keyboard shortcut listener for Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !recording) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, recording]);

  const restart = () => {
    if (recording) return;
    media.audioRef.current?.pause();
    if (media.audioRef.current) {
      media.audioRef.current.currentTime = 0;
      media.audioRef.current.load();
    }
    if (media.introVideoRef.current) {
      media.introVideoRef.current.currentTime = 0;
    }
    setTimelineElapsed(0);
    setRestartKey((value) => value + 1);
    setPlaying(true);
  };

  const togglePlayback = () => {
    if (recording) return;
    if (playing) {
      setPlaying(false);
      media.audioRef.current?.pause();
    } else {
      if (timelineElapsed >= timeline.totalPlaybackDuration) setTimelineElapsed(0);
      setPlaying(true);
    }
  };

  const fullscreen = () => frame.current?.requestFullscreen?.().catch(() => undefined);

  return (
    <div
      className="modal map-video-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Route video preview"
      onClick={() => !recording && onClose()}
    >
      <div className="map-video" ref={frame} onClick={(e) => e.stopPropagation()}>
        <RecordingIndicator
          recording={recording}
          recordProgress={recordProgress}
          onClose={onClose}
        />

        {!timeline.isCollage && (
          <MapboxGlobe
            ref={mapboxGlobeRef}
            isRecording={recording}
            key={restartKey}
            locations={locations}
            legs={legs}
            progress={timeline.mapProgress}
            activeLocation={timeline.destination}
            playing={timeline.journeyIsPlaying || recording}
            className="map-video-globe"
            hideOverlays
            showVehicle={!timeline.isMediaShowcase}
          />
        )}

        {/* ── Country Flag Arrival Animation ─────────────────────────────
             Controlled entirely by timeline.flagOverlay.elapsedMs — no
             internal timers. Works identically in live playback AND export. */}
        {timeline.flagOverlay.visible && (
          <FlagArrivalOverlay
            key={`flag-leg-${timeline.currentLegIndex}`}
            flagUrl={timeline.flagOverlay.flagUrl}
            countryName={timeline.flagOverlay.countryName}
            cityName={timeline.flagOverlay.cityName}
            elapsedMs={timeline.flagOverlay.elapsedMs}
          />
        )}

        {timeline.isJourney && timeline.isPhotoShowcase && !timeline.isVideoShowcase && (
          <ArrivalPhotoShowcase
            arrivalMediaOpacity={timeline.arrivalMediaOpacity}
            destination={timeline.destination}
            currentLegIndex={timeline.currentLegIndex}
            photoIndex={timeline.photoIndex}
            totalLegs={timeline.totalLegs}
            activeSchedule={timeline.activeSchedule}
          />
        )}


        {timeline.isJourney && timeline.isVideoShowcase && timeline.activeSchedule?.video && (
          <ArrivalVideoShowcase
            arrivalMediaOpacity={timeline.arrivalMediaOpacity}
            destination={timeline.destination}
            currentLegIndex={timeline.currentLegIndex}
            activePhotoUrl={timeline.activePhotoUrl}
            activeSchedule={timeline.activeSchedule}
            videoRef={media.videoRef}
            muted={muted}
            onVideoError={(url) =>
              setUnavailableVideos((current) =>
                current.includes(url) ? current : [...current, url]
              )
            }
          />
        )}

        {timeline.isIntro && (
          <IntroVideoOverlay
            introOpacity={timeline.introOpacity}
            introVideoRef={media.introVideoRef}
            muted={muted}
          />
        )}

        <RouteOverviewOverlay
          isRouteMap={timeline.isRouteMap}
          routeMapOpacity={timeline.routeMapOpacity}
          routeOverviewRef={routeOverviewRef}
          locations={locations}
          totalTripDistance={timeline.totalTripDistance}
        />

        {timeline.isSummary && (
          <SummaryCardOverlay
            summaryOpacity={timeline.summaryOpacity}
            locations={locations}
            legs={legs}
            totalTripDistance={timeline.totalTripDistance}
          />
        )}

        {timeline.isCollage && (
          <CollageOverlay
            collageOpacity={timeline.collageOpacity}
            collageElapsed={timeline.collageElapsed}
            allPhotos={timeline.allPhotos}
            locations={locations}
            totalBatches={timeline.totalBatches}
            currentBatchIndex={timeline.currentBatchIndex}
          />
        )}

        {timeline.isOutro && <OutroOverlay outroOpacity={timeline.outroOpacity} />}

        <VideoControls
          internalProgress={timeline.internalProgress}
          playing={playing}
          recording={recording}
          recordProgress={recordProgress}
          muted={muted}
          isIntro={timeline.isIntro}
          isRouteMap={timeline.isRouteMap}
          isSummary={timeline.isSummary}
          isCollage={timeline.isCollage}
          isOutro={timeline.isOutro}
          totalTripDistance={timeline.totalTripDistance}
          totalBatches={timeline.totalBatches}
          currentBatchIndex={timeline.currentBatchIndex}
          allPhotosLength={timeline.allPhotos.length}
          elapsedSec={timeline.elapsedSec}
          effectiveDurationSec={timeline.effectiveDurationSec}
          currentLegIndex={timeline.currentLegIndex}
          totalLegs={timeline.totalLegs}
          destinationName={timeline.destination.name}
          togglePlayback={togglePlayback}
          restart={restart}
          setMuted={setMuted}
          fullscreen={fullscreen}
          startDownloadRecording={startDownloadRecording}
        />
      </div>
    </div>
  );
}
