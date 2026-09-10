import type { Location } from "../../types";
import type { LegScheduleItem } from "../types/preview.types";
import {
  CinematicPhotoOverlay,
  getCinematicEffect,
  getPhotoTransitionAnimation,
} from "../../CinematicEffects";

interface ArrivalPhotoShowcaseProps {
  arrivalMediaOpacity: number;
  destination: Location;
  currentLegIndex: number;
  photoIndex: number;
  totalLegs: number;
  activeSchedule?: LegScheduleItem;
}

export function ArrivalPhotoShowcase({
  arrivalMediaOpacity,
  destination,
  currentLegIndex,
  photoIndex,
  totalLegs,
  activeSchedule,
}: ArrivalPhotoShowcaseProps) {
  const imagesToRender = activeSchedule?.images.length
    ? activeSchedule.images
    : [destination.imageUrl || ""];

  const effectIndex = currentLegIndex * 3 + photoIndex;
  const currentEffect = getCinematicEffect(effectIndex);

  return (
    <section
      className="arrival-photo-fullscreen"
      style={{ opacity: arrivalMediaOpacity }}
      aria-label={`${destination.name} travel photo`}
    >
      {imagesToRender.map((url, idx) => {
        if (!url) return null;
        const isCurrent = idx === photoIndex;
        const isPrevious = idx === photoIndex - 1;
        if (!isCurrent && !isPrevious) return null;

        return (
          <img
            key={url + "-" + idx + "-" + (isCurrent ? photoIndex : "prev")}
            src={url}
            alt={`${destination.name} travel moment`}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: isCurrent ? 2 : 1,
              animation: isCurrent
                ? getPhotoTransitionAnimation(effectIndex, photoIndex)
                : "none",
            }}
          />
        );
      })}
      <CinematicPhotoOverlay
        key={`photo-effect-${currentLegIndex}-${photoIndex}`}
        effectIndex={effectIndex}
      />
      <div className="arrival-photo-caption" style={{ position: "relative", zIndex: 3 }}>
        <span>ARRIVED · STOP {currentLegIndex + 2} OF {totalLegs + 1}</span>
        <h2>{destination.name}</h2>
        <p>
          {destination.country} · Photo {photoIndex + 1} of {activeSchedule?.photoCount ?? 1} · 2 seconds
        </p>
        <div
          className="cinematic-effect-badge"
          style={{ borderColor: currentEffect.accentColor }}
        >
          <span
            className="badge-dot"
            style={{ backgroundColor: currentEffect.accentColor }}
          />
          <span>{currentEffect.badge}</span>
        </div>
      </div>
    </section>
  );
}

