import type { Location } from "../../types";
import {
  COLLAGE_ENTRY_DURATION_MS,
  COLLAGE_ENTRY_VECTORS,
  COLLAGE_STAGGER_MS,
} from "../constants/preview.constants";
import type { PhotoItem } from "../types/preview.types";
import { getCollageColumns } from "../utils/previewFormatters";

interface CollageOverlayProps {
  collageOpacity: number;
  collageElapsed: number;
  allPhotos: PhotoItem[];
  locations: Location[];
  totalBatches: number;
  currentBatchIndex: number;
}

export function CollageOverlay({
  collageOpacity,
  collageElapsed,
  allPhotos,
  locations,
  totalBatches,
  currentBatchIndex,
}: CollageOverlayProps) {
  return (
    <div
      className="video-collage-card"
      style={{
        opacity: collageOpacity,
        transition: "opacity 0.05s linear",
        position: "absolute",
        inset: 0,
        zIndex: 20,
        background: "rgba(2, 12, 27, 0.95)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
        overflow: "hidden",
      }}
      aria-live="polite"
    >
      <div
        className="collage-header"
        style={{
          width: "100%",
          maxWidth: "900px",
          textAlign: "center",
          marginBottom: "16px",
          zIndex: 2,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: "#38bdf8",
            fontSize: "14px",
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          📸 JOURNEY PHOTO COLLAGE
        </span>
        <h2
          className="collage-title"
          style={{
            color: "#ffffff",
            fontSize: "24px",
            fontWeight: 700,
            margin: "6px 0 2px",
            fontFamily: "Georgia, serif",
          }}
        >
          All Travel Memories
        </h2>
        <p
          className="collage-subtitle"
          style={{
            color: "#94a3b8",
            fontSize: "13px",
            fontWeight: 500,
            margin: "4px 0 8px",
          }}
        >
          {`${allPhotos.length} memories · ${locations.length} destinations · one journey`}
        </p>

        {/* Batch indicator dots */}
        {totalBatches > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "8px",
              marginTop: "8px",
            }}
          >
            {Array.from({ length: totalBatches }).map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: idx === currentBatchIndex ? "24px" : "8px",
                  height: "8px",
                  borderRadius: "4px",
                  background: idx === currentBatchIndex ? "#38bdf8" : "rgba(56, 189, 248, 0.3)",
                  transition: "all 0.3s ease",
                  boxShadow: idx === currentBatchIndex ? "0 0 12px rgba(56, 189, 248, 0.5)" : "none",
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div
        className="collage-grid"
        style={{
          display: "grid",
          width: "100%",
          maxWidth: "800px",
          flex: "1",
          gap: "8px",
          padding: "4px",
          gridTemplateColumns: `repeat(${getCollageColumns(allPhotos.length)}, minmax(0, 1fr))`,
          gridAutoRows: "1fr",
          maxHeight: "calc(100vh - 320px)",
          overflow: "hidden",
          position: "relative",
          zIndex: 2,
        }}
      >
        {allPhotos.map(({ url, locationName }, idx) => {
          const staggerDelay = Math.min(idx * COLLAGE_STAGGER_MS, 2000);
          const progress = Math.max(
            0,
            Math.min(1, (collageElapsed - staggerDelay) / COLLAGE_ENTRY_DURATION_MS)
          );
          const entry = COLLAGE_ENTRY_VECTORS[idx % COLLAGE_ENTRY_VECTORS.length];
          const scale = 0.72 + 0.28 * progress;
          const opacity = progress;

          return (
            <div
              key={url}
              className="collage-tile"
              style={{
                position: "relative",
                aspectRatio: "1",
                borderRadius: "16px",
                overflow: "hidden",
                backgroundColor: "rgba(30, 58, 95, 0.3)",
                transform: `translate(${entry.x * (1 - progress)}px, ${entry.y * (1 - progress)}px) rotate(${entry.rotate * (1 - progress)}deg) scale(${scale})`,
                opacity: opacity,
                transition: "transform 0.12s linear, opacity 0.12s linear",
                boxShadow: "0 12px 28px rgba(0,0,0,0.32)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <img
                src={url}
                alt={locationName}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
                loading="lazy"
              />
              <div
                className="collage-caption"
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "6px 8px",
                  background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
                  color: "#ffffff",
                  fontSize: "10px",
                  fontWeight: 600,
                  textAlign: "center",
                  pointerEvents: "none",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {locationName}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="collage-footer"
        style={{
          marginTop: "12px",
          color: "#64748b",
          fontSize: "12px",
          fontWeight: 400,
          textAlign: "center",
          zIndex: 2,
          letterSpacing: "0.03em",
          flexShrink: 0,
        }}
      >
        ✨ Every moment captured along the journey
      </div>
    </div>
  );
}

