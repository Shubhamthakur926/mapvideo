import { Download, Expand, Loader2, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { formatTime } from "../utils/previewFormatters";

interface VideoControlsProps {
  internalProgress: number;
  playing: boolean;
  recording: boolean;
  recordProgress: number;
  muted: boolean;
  isIntro: boolean;
  isRouteMap: boolean;
  isSummary: boolean;
  isCollage: boolean;
  isOutro: boolean;
  totalTripDistance: string;
  totalBatches: number;
  currentBatchIndex: number;
  allPhotosLength: number;
  elapsedSec: number;
  effectiveDurationSec: number;
  currentLegIndex: number;
  totalLegs: number;
  destinationName: string;
  togglePlayback: () => void;
  restart: () => void;
  setMuted: React.Dispatch<React.SetStateAction<boolean>>;
  fullscreen: () => void;
  startDownloadRecording: () => void;
}

export function VideoControls({
  internalProgress,
  playing,
  recording,
  recordProgress,
  muted,
  isIntro,
  isRouteMap,
  isSummary,
  isCollage,
  isOutro,
  totalTripDistance,
  totalBatches,
  currentBatchIndex,
  allPhotosLength,
  elapsedSec,
  effectiveDurationSec,
  currentLegIndex,
  totalLegs,
  destinationName,
  togglePlayback,
  restart,
  setMuted,
  fullscreen,
  startDownloadRecording,
}: VideoControlsProps) {
  return (
    <div className="video-controls">
      <div className="video-progress" aria-label="Video progress">
        <i style={{ width: `${internalProgress}%` }} />
      </div>
      <div className="video-actions">
        <button
          aria-label={playing ? "Pause video" : "Play video"}
          onClick={togglePlayback}
          disabled={recording}
        >
          {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
        </button>
        <button aria-label="Restart video" onClick={restart} disabled={recording}>
          <RotateCcw />
        </button>
        <button
          aria-label={muted ? "Unmute sound" : "Mute sound"}
          title={muted ? "Unmute sound" : "Mute sound"}
          onClick={() => setMuted((value) => !value)}
          disabled={recording}
        >
          {muted ? <VolumeX /> : <Volume2 />}
        </button>
        <span>
          {isIntro
            ? "Intro · Travel Video"
            : isRouteMap
              ? "Route Overview · 2D Map"
              : isSummary
                ? `Travel Summary · ${totalTripDistance}`
                : isCollage
                  ? `Photo Collage · ${totalBatches > 1 ? `Batch ${currentBatchIndex + 1}/${totalBatches}` : `${allPhotosLength} Photos`}`
                  : isOutro
                    ? "Outro · Journey Complete"
                    : `${formatTime(elapsedSec)} / ${formatTime(effectiveDurationSec)} · Stop ${currentLegIndex + 1} of ${totalLegs} · ${destinationName}`}
        </span>
        <button aria-label="Fullscreen" onClick={fullscreen} disabled={recording}>
          <Expand />
        </button>
        <button className="download-video" onClick={startDownloadRecording} disabled={recording}>
          {recording ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Recording ({recordProgress}%)
            </>
          ) : (
            <>
              <Download size={16} /> Download HD
            </>
          )}
        </button>
      </div>
    </div>
  );
}

