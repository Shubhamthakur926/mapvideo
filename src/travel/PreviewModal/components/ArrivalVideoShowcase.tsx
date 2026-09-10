import type { Location } from "../../types";
import type { LegScheduleItem } from "../types/preview.types";

interface ArrivalVideoShowcaseProps {
  arrivalMediaOpacity: number;
  destination: Location;
  currentLegIndex: number;
  activePhotoUrl?: string;
  activeSchedule?: LegScheduleItem;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  muted: boolean;
  onVideoError: (url: string) => void;
}

export function ArrivalVideoShowcase({
  arrivalMediaOpacity,
  destination,
  currentLegIndex,
  activePhotoUrl,
  activeSchedule,
  videoRef,
  muted,
  onVideoError,
}: ArrivalVideoShowcaseProps) {
  if (!activeSchedule?.video) return null;

  return (
    <section
      className="arrival-video-fullscreen"
      style={{ opacity: arrivalMediaOpacity }}
      aria-label={`${destination.name} travel video`}
    >
      <video
        ref={videoRef}
        key={activeSchedule.video.url}
        src={activeSchedule.video.url}
        autoPlay
        playsInline
        muted={muted}
        style={{
          position: "relative",
          zIndex: 1,
          animation: "snappyPop 400ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        }}
        onError={() => onVideoError(activeSchedule.video!.url)}
      />
      <div className="arrival-photo-caption" style={{ position: "relative", zIndex: 2 }}>
        <span>
          {muted
            ? "TRAVEL VIDEO · TAP SOUND FOR ORIGINAL AUDIO"
            : "TRAVEL VIDEO · ORIGINAL AUDIO"}
        </span>
        <h2>{destination.name}</h2>
        <p>{destination.country}</p>
        {activeSchedule.video.credit && (
          <small className="video-credit">{activeSchedule.video.credit}</small>
        )}
      </div>
    </section>
  );
}

