import { useMemo } from "react";
import type { Location } from "../../types";
import type { LegScheduleItem } from "../types/preview.types";
import { getTripPhotoTransition } from "../transitions";

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


  // Deterministically select transition for this leg and photo
  const transition = useMemo(
    () => getTripPhotoTransition(currentLegIndex, photoIndex),
    [currentLegIndex, photoIndex]
  );

  // Format CSS animation name (e.g. photoCubeRotateLeft, photoSlideFromLeft)
  const animKeyframe = "photo" + transition.id[0].toUpperCase() + transition.id.slice(1);
  const inAnimationRule = `${animKeyframe} ${transition.durationMs}ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards`;
  const outAnimationRule = `${animKeyframe}Out ${transition.durationMs}ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards`;

  return (
    <section
      className="arrival-photo-fullscreen"
      style={{ opacity: arrivalMediaOpacity }}
      aria-label={`${destination.name} travel photo`}
    >
      {/* Micro-flash camera snap fires selectively (e.g. for shutterFlashCut) */}
      {transition.hasFlashOverlay && (
        <div className="micro-flash-overlay" key={`flash-${currentLegIndex}-${photoIndex}`} />
      )}

      {/* 3D perspective stage preserves true 3D space */}
      <div className="arrival-photo-stage">
        {imagesToRender.map((url, idx) => {
          if (!url) return null;
          const isCurrent = idx === photoIndex;
          const isPrevious = idx === photoIndex - 1;
          if (!isCurrent && !isPrevious) return null;

          return (
            <img
              key={`photo-${currentLegIndex}-${idx}-${isCurrent ? "cur" : "prev"}`}
              src={url}
              alt={`${destination.name} travel moment`}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                zIndex: isCurrent ? 2 : 1,
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transformStyle: "preserve-3d",
                animation: isCurrent ? inAnimationRule : outAnimationRule,
              }}
            />
          );
        })}
      </div>

      <div className="arrival-photo-caption" style={{ position: "relative", zIndex: 3 }}>
        <span>ARRIVED · STOP {currentLegIndex + 2} OF {totalLegs + 1}</span>
        <h2>{destination.name}</h2>
        <p>
          {destination.country} · Photo {photoIndex + 1} of {activeSchedule?.photoCount ?? 1} · 2 seconds
        </p>
      </div>
    </section>
  );
}


