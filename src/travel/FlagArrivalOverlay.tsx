/**
 * FlagArrivalOverlay.tsx — v3 (Deterministic / Controlled)
 * ==========================================================
 * Flag arrival animation driven ENTIRELY by `elapsedMs` prop.
 * Zero internal setTimeout / useEffect animation state.
 *
 * WHY THIS IS CORRECT:
 *   The export pipeline (useVideoExport) drives the timeline by calling
 *   setTimelineElapsed(synthetic_ms) frame-by-frame. Real wall-clock time
 *   does NOT advance during that loop. Any component that uses setTimeout
 *   or requestAnimationFrame for animation will be frozen/broken in the
 *   exported video. Making every visual state a pure function of `elapsedMs`
 *   guarantees the exported frame and the live preview frame are identical
 *   for any given timeline position.
 *
 * SEQUENCE (total = FLAG_TOTAL_DURATION_MS ≈ 2740 ms):
 *   [0        → FADE_IN_MS]          backdrop fades in
 *   [0        → FLY_IN_MS]           flag slides in from above (ease-out)
 *   [FLY_IN_MS → FLY_IN_MS+WAVE_MS]  flag waves, subtitle appears
 *   [FLY_IN_MS+WAVE_MS → total]      flag wipes out to the right (ease-in)
 */

import React, { useEffect, useState } from "react";
import { WavingFlag } from "./WavingFlag";

// ── Exported timing constants (imported by usePreviewTimeline) ────────────
export const FADE_IN_MS           = 150;
export const FLY_IN_MS            = 400;
export const WAVE_HOLD_MS         = 1800;
export const WIPE_OUT_MS          = 390;
export const FLAG_TOTAL_DURATION_MS =
  FADE_IN_MS + FLY_IN_MS + WAVE_HOLD_MS + WIPE_OUT_MS; // ≈ 2740 ms

// ── Easing helpers ────────────────────────────────────────────────────────
const easeOutCubic = (t: number) => 1 - Math.pow(1 - Math.min(1, t), 3);
const easeInCubic  = (t: number) => Math.min(1, t) * Math.min(1, t) * Math.min(1, t);

// ── Props ─────────────────────────────────────────────────────────────────
export interface FlagArrivalOverlayProps {
  flagUrl: string | null;
  countryName: string;
  cityName: string;
  /**
   * Controlled elapsed time (ms) within [0 … FLAG_TOTAL_DURATION_MS].
   * Derived from journeyElapsed in usePreviewTimeline — same value for
   * both live playback and frame-by-frame export.
   */
  elapsedMs: number;
  className?: string;
}

export const FlagArrivalOverlay: React.FC<FlagArrivalOverlayProps> = ({
  flagUrl,
  countryName,
  cityName,
  elapsedMs,
  className = "",
}) => {
  // Track image load failure; reset whenever flagUrl changes
  const [imageErrored, setImageErrored] = useState(false);
  useEffect(() => { setImageErrored(false); }, [flagUrl]);

  // ── Clamp elapsed to the valid window ───────────────────────────────────
  const t = Math.max(0, Math.min(FLAG_TOTAL_DURATION_MS, elapsedMs));

  // ── Phase boundaries ────────────────────────────────────────────────────
  const FLY_END  = FLY_IN_MS;               // when fly-in ends (wave starts)
  const WAVE_END = FLY_END + WAVE_HOLD_MS;  // when wave ends (wipe starts)

  // ── Backdrop opacity: ramps 0→1 over FADE_IN_MS ─────────────────────────
  const backdropOpacity = easeOutCubic(t / FADE_IN_MS);

  // ── Flag container transforms ────────────────────────────────────────────
  let flagTranslateY = 0; // px  (negative = above viewport)
  let flagTranslateX = 0; // %   (positive = off-screen right)
  let flagOpacity    = 1;
  let isWaving       = false;

  if (t <= FLY_END) {
    // Fly-in: slides down from -70px to 0, opacity 0→1
    const progress = easeOutCubic(t / FLY_IN_MS);
    flagTranslateY = (1 - progress) * -70;
    flagOpacity    = progress;
  } else if (t <= WAVE_END) {
    // Waving: fully visible, cloth animation
    flagTranslateY = 0;
    flagOpacity    = 1;
    isWaving       = true;
  } else {
    // Wipe-out: slides right off screen, fades out
    const progress = easeInCubic((t - WAVE_END) / WIPE_OUT_MS);
    flagTranslateX = progress * 120;
    flagOpacity    = 1 - progress;
    isWaving       = false;
  }

  // ── Subtitle: visible only during waving phase ───────────────────────────
  const subtitleProgress = isWaving
    ? Math.min(1, (t - FLY_END) / 300) // fade in over 300ms after wave starts
    : t > WAVE_END
    ? Math.max(0, 1 - easeInCubic((t - WAVE_END) / WIPE_OUT_MS)) // fade with wipe
    : 0;

  return (
    <div
      className={`flag-arrival-overlay ${className}`}
      aria-live="polite"
      aria-label={`Arriving in ${countryName}`}
      style={{
        position:       "absolute",
        inset:          0,
        zIndex:         100,
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        gap:            "28px",
        pointerEvents:  "none",
        background:     `rgba(2, 8, 16, ${(0.74 * backdropOpacity).toFixed(3)})`,
        overflow:       "hidden",
      }}
    >
      {/* ── Flag container ──────────────────────────────────────────────── */}
      <div
        style={{
          width:        "min(54vw, 440px)",
          height:       "min(36vw, 295px)",
          flexShrink:   0,
          borderRadius: "10px",
          overflow:     "hidden",
          boxShadow:    "0 28px 80px rgba(0,0,0,0.88), 0 0 0 2px rgba(255,255,255,0.10)",
          transform:    `translateY(${flagTranslateY.toFixed(1)}px) translateX(${flagTranslateX.toFixed(1)}%)`,
          opacity:      flagOpacity,
          // No CSS transition — values are driven frame-by-frame by elapsedMs
          transition:   "none",
          willChange:   "transform, opacity",
        }}
      >
        {(!flagUrl || imageErrored) ? (
          /* Graceful fallback: keep overlay running, just show a globe emoji */
          <div
            style={{
              width:          "100%",
              height:         "100%",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              background:     "linear-gradient(135deg, rgba(56,189,248,0.14), rgba(2,8,16,0.6))",
              fontSize:       "80px",
            }}
          >
            🌍
          </div>
        ) : (
          <WavingFlag
            src={flagUrl}
            countryName={countryName}
            autoPlay={isWaving}
            onError={() => setImageErrored(true)}
          />
        )}
      </div>

      {/* ── Country + City subtitle ─────────────────────────────────────── */}
      <div
        style={{
          textAlign:     "center",
          opacity:       subtitleProgress,
          transform:     `translateY(${((1 - subtitleProgress) * 18).toFixed(1)}px)`,
          transition:    "none",
          pointerEvents: "none",
          willChange:    "opacity, transform",
        }}
      >
        {/* "Entering …" badge */}
        <div
          style={{
            display:        "inline-flex",
            alignItems:     "center",
            gap:            "8px",
            padding:        "5px 18px",
            borderRadius:   "999px",
            border:         "1.5px solid rgba(56,189,248,0.55)",
            background:     "rgba(3,16,29,0.88)",
            backdropFilter: "blur(12px)",
            marginBottom:   "12px",
          }}
        >
          <span
            style={{
              width:        "7px",
              height:       "7px",
              borderRadius: "50%",
              background:   "#38bdf8",
              boxShadow:    "0 0 8px #38bdf8",
              display:      "inline-block",
              flexShrink:   0,
            }}
          />
          <span
            style={{
              fontSize:      "11px",
              fontWeight:    800,
              color:         "#38bdf8",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            🌏 Welcome to {countryName}
          </span>
        </div>

        {/* City name */}
        <div
          style={{
            fontSize:      "clamp(30px, 5.5vw, 46px)",
            fontWeight:    700,
            fontFamily:    "Georgia, 'Times New Roman', serif",
            color:         "#ffffff",
            textShadow:    "0 4px 28px rgba(0,0,0,0.75)",
            letterSpacing: "-0.01em",
            lineHeight:    1.1,
          }}
        >
          {cityName}
        </div>
      </div>
    </div>
  );
};

export default FlagArrivalOverlay;
