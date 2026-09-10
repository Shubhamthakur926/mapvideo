import "./cinematic-effects.css";

export type CinematicEffect = {
  id: string;
  name: string;
  badge: string;
  accentColor: string;
  className: string;
  isSimple?: boolean;
};

// Selection of bold animated cinematic transition effects + clean natural photos
export const CINEMATIC_EFFECTS: readonly CinematicEffect[] = [
  {
    id: "glass-blur",
    name: "Focus Pull Glass Blur",
    badge: "FOCUS PULL BLUR",
    accentColor: "#38bdf8",
    className: "cinematic-glass-blur",
  },
  {
    id: "simple",
    name: "Natural / Simple Photo",
    badge: "ORIGINAL PHOTO",
    accentColor: "#94a3b8",
    className: "cinematic-simple",
    isSimple: true,
  },
  {
    id: "zoom-blur",
    name: "Zoom-Snap Dynamic Blur",
    badge: "ZOOM FOCUS SNAP",
    accentColor: "#a855f7",
    className: "cinematic-zoom-blur",
  },
  {
    id: "flash-burst",
    name: "Paparazzi Camera Flash",
    badge: "FLASH BLOOM BURST",
    accentColor: "#ffffff",
    className: "cinematic-flash",
  },
  {
    id: "simple-2",
    name: "Natural / Simple Photo",
    badge: "ORIGINAL PHOTO",
    accentColor: "#94a3b8",
    className: "cinematic-simple",
    isSimple: true,
  },
  {
    id: "motion-blur",
    name: "Speed Motion Streak",
    badge: "SPEED MOTION BLUR",
    accentColor: "#f97316",
    className: "cinematic-motion-blur",
  },
  {
    id: "light-sweep",
    name: "Anamorphic Golden Flare",
    badge: "ANAMORPHIC FLARE",
    accentColor: "#fde047",
    className: "cinematic-light-sweep",
  },
  {
    id: "simple-3",
    name: "Natural / Simple Photo",
    badge: "ORIGINAL PHOTO",
    accentColor: "#94a3b8",
    className: "cinematic-simple",
    isSimple: true,
  },
  {
    id: "film-burn",
    name: "Vintage Film Burn Flare",
    badge: "VINTAGE FILM BURN",
    accentColor: "#f59e0b",
    className: "cinematic-film-burn",
  },
  {
    id: "bokeh-bloom",
    name: "Dreamy Bokeh Bloom Discs",
    badge: "BOKEH BLOOM GLOW",
    accentColor: "#fbbf24",
    className: "cinematic-bokeh",
  },
  {
    id: "simple-4",
    name: "Natural / Simple Photo",
    badge: "ORIGINAL PHOTO",
    accentColor: "#94a3b8",
    className: "cinematic-simple",
    isSimple: true,
  },
  {
    id: "glitch-shutter",
    name: "Prismatic Shutter Snap",
    badge: "PRISMATIC SHUTTER",
    accentColor: "#06b6d4",
    className: "cinematic-glitch-shutter",
  },
];

export function getCinematicEffect(effectIndex: number): CinematicEffect {
  return CINEMATIC_EFFECTS[Math.abs(effectIndex) % CINEMATIC_EFFECTS.length];
}

export function getPhotoTransitionAnimation(effectIndex: number, photoIndex: number): string {
  const effect = getCinematicEffect(effectIndex);
  if (effect.isSimple) {
    const direction = (["Left", "Right", "Top"] as const)[photoIndex % 3];
    return `fxTransitionSimple${direction} 550ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards`;
  }

  switch (effect.id) {
    case "glass-blur":
      return `fxTransitionGlassBlur 1150ms cubic-bezier(0.16, 1, 0.3, 1) forwards`;
    case "zoom-blur":
      return `fxTransitionZoomBlur 1100ms cubic-bezier(0.18, 0.9, 0.28, 1) forwards`;
    case "flash-burst":
      return `fxTransitionFlashBurst 900ms cubic-bezier(0.1, 0.9, 0.2, 1) forwards`;
    case "motion-blur":
      return `fxTransitionMotionBlur 950ms cubic-bezier(0.2, 0.85, 0.25, 1) forwards`;
    case "light-sweep":
      return `fxTransitionLightSweep 1100ms cubic-bezier(0.16, 1, 0.3, 1) forwards`;
    case "film-burn":
      return `fxTransitionFilmBurn 1100ms cubic-bezier(0.16, 1, 0.3, 1) forwards`;
    case "bokeh-bloom":
      return `fxTransitionBokehBloom 1200ms cubic-bezier(0.16, 1, 0.3, 1) forwards`;
    case "glitch-shutter":
      return `fxTransitionGlitchShutter 900ms cubic-bezier(0.2, 0.85, 0.25, 1) forwards`;
    default:
      return `fxTransitionGlassBlur 1150ms cubic-bezier(0.16, 1, 0.3, 1) forwards`;
  }
}

export function CinematicPhotoOverlay({ effectIndex }: { effectIndex: number }) {
  const effect = getCinematicEffect(effectIndex);

  if (effect.isSimple) {
    return null; // Pure clean image without any overlay
  }

  return (
    <div className={`cinematic-photo-effect ${effect.className}`} aria-hidden="true">
      <div className="cinematic-effect-texture" />

      {effect.id === "glass-blur" && (
        <div className="cinematic-focus-ring" />
      )}

      {effect.id === "zoom-blur" && (
        <div className="cinematic-zoom-vignette" />
      )}

      {effect.id === "flash-burst" && (
        <div className="cinematic-flash-halo" />
      )}

      {effect.id === "light-sweep" && (
        <div className="cinematic-laser-flare" />
      )}

      {effect.id === "film-burn" && (
        <div className="cinematic-film-sparks">
          <span className="spark s1" />
          <span className="spark s2" />
          <span className="spark s3" />
        </div>
      )}

      {effect.id === "bokeh-bloom" && (
        <div className="cinematic-bokeh-orbs">
          <span className="b-orb b1" />
          <span className="b-orb b2" />
          <span className="b-orb b3" />
          <span className="b-orb b4" />
          <span className="b-orb b5" />
          <span className="b-orb b6" />
        </div>
      )}

      {effect.id === "glitch-shutter" && (
        <div className="cinematic-shutter-lines" />
      )}
    </div>
  );
}

export function drawCinematicPhotoOnCanvas(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  effectIndex: number,
  photoIndex: number,
  elapsed: number
) {
  const effect = getCinematicEffect(effectIndex);
  const duration = effect.isSimple ? 550 : 1100;
  const progress = Math.min(1, Math.max(0, elapsed / duration));
  const isTransitioning = progress < 1;

  ctx.save();

  if (effect.isSimple) {
    // Pure natural clean photo slide (no blur, no filter)
    const direction = photoIndex % 3; // 0: left, 1: right, 2: top
    const ease = 1 - Math.pow(1 - progress, 3);
    const offset = (1 - ease) * 45;
    const dx = direction === 0 ? -offset : direction === 1 ? offset : 0;
    const dy = direction === 2 ? -offset : 0;
    ctx.globalAlpha = Math.min(1, progress * 2.5);
    ctx.filter = "none";
    ctx.drawImage(img, dx, dy, 1080, 1080);
    ctx.restore();
    return;
  }

  // Animated Transitions
  const easeOut = 1 - Math.pow(1 - progress, 3);
  const remaining = 1 - easeOut;

  let filterStr = "none";
  let scale = 1;
  let rotate = 0;
  let translateX = 0;
  let translateY = 0;

  switch (effect.id) {
    case "glass-blur": {
      const blurPx = Math.max(0, remaining * 45);
      const bright = 1 + remaining * 0.4;
      const contrast = 1 + remaining * 0.15;
      filterStr = `blur(${blurPx.toFixed(1)}px) brightness(${bright.toFixed(2)}) contrast(${contrast.toFixed(2)})`;
      scale = 1 + remaining * 0.24;
      break;
    }
    case "zoom-blur": {
      const blurPx = Math.max(0, remaining * 38);
      const contrast = 1 + remaining * 0.45;
      const sat = 1 + remaining * 0.5;
      filterStr = `blur(${blurPx.toFixed(1)}px) contrast(${contrast.toFixed(2)}) saturate(${sat.toFixed(2)})`;
      scale = 1 + remaining * 0.45;
      rotate = (remaining * -3 * Math.PI) / 180;
      break;
    }
    case "flash-burst": {
      const flashFade = Math.min(1, elapsed / 850);
      const flashRem = Math.pow(1 - flashFade, 2);
      const blurPx = Math.max(0, flashRem * 22);
      const bright = 1 + flashRem * 4.8;
      const contrast = 1 + flashRem * 0.9;
      filterStr = `blur(${blurPx.toFixed(1)}px) brightness(${bright.toFixed(2)}) contrast(${contrast.toFixed(2)})`;
      scale = 1 + flashRem * 0.2;
      break;
    }
    case "motion-blur": {
      const motionFade = Math.min(1, elapsed / 950);
      const motionRem = 1 - (1 - Math.pow(1 - motionFade, 3));
      const blurPx = Math.max(0, motionRem * 36);
      filterStr = `blur(${blurPx.toFixed(1)}px) brightness(${(1 + motionRem * 0.25).toFixed(2)})`;
      translateX = -130 * motionRem;
      scale = 1 + motionRem * 0.2;
      break;
    }
    case "light-sweep": {
      const blurPx = Math.max(0, remaining * 32);
      const bright = 1 + remaining * 0.9;
      const sat = 1 + remaining * 0.65;
      filterStr = `blur(${blurPx.toFixed(1)}px) brightness(${bright.toFixed(2)}) saturate(${sat.toFixed(2)})`;
      scale = 1 + remaining * 0.22;
      break;
    }
    case "film-burn": {
      const blurPx = Math.max(0, remaining * 34);
      const sep = remaining * 0.75;
      const sat = 1 + remaining * 1.5;
      const bright = 1 + remaining * 0.65;
      filterStr = `blur(${blurPx.toFixed(1)}px) sepia(${sep.toFixed(2)}) saturate(${sat.toFixed(2)}) brightness(${bright.toFixed(2)})`;
      scale = 1 + remaining * 0.22;
      break;
    }
    case "bokeh-bloom": {
      const blurPx = Math.max(0, remaining * 42);
      const sat = 1 + remaining * 1.4;
      const bright = 1 + remaining * 0.5;
      filterStr = `blur(${blurPx.toFixed(1)}px) saturate(${sat.toFixed(2)}) brightness(${bright.toFixed(2)})`;
      scale = 1 + remaining * 0.26;
      break;
    }
    case "glitch-shutter": {
      const blurPx = Math.max(0, remaining * 24);
      const contrast = 1 + remaining * 0.75;
      const hue = remaining * 60;
      filterStr = `blur(${blurPx.toFixed(1)}px) contrast(${contrast.toFixed(2)}) hue-rotate(${hue.toFixed(0)}deg)`;
      scale = 1 + remaining * 0.2;
      break;
    }
    default: {
      const blurPx = Math.max(0, remaining * 36);
      filterStr = `blur(${blurPx.toFixed(1)}px)`;
      scale = 1 + remaining * 0.2;
      break;
    }
  }

  // Draw the transformed image with filter
  ctx.filter = filterStr;
  ctx.translate(540 + translateX, 540 + translateY);
  ctx.rotate(rotate);
  ctx.scale(scale, scale);
  ctx.drawImage(img, -540, -540, 1080, 1080);
  ctx.restore();

  // Reset filter for overlays
  ctx.save();
  ctx.filter = "none";

  // Draw transient animated overlays (< duration)
  if (isTransitioning) {
    const fade = Math.max(0, 1 - progress);
    ctx.globalCompositeOperation = "screen";

    if (effect.id === "glass-blur") {
      const ringRadius = 140 + progress * 160;
      ctx.beginPath();
      ctx.arc(540, 500, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 * fade})`;
      ctx.lineWidth = 10;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(540, 500, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * fade})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      const glassBloom = ctx.createRadialGradient(540, 500, 20, 540, 500, 700);
      glassBloom.addColorStop(0, `rgba(255, 255, 255, ${0.4 * fade})`);
      glassBloom.addColorStop(0.5, `rgba(56, 189, 248, ${0.2 * fade})`);
      glassBloom.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = glassBloom;
      ctx.fillRect(0, 0, 1080, 1080);
    } else if (effect.id === "zoom-blur") {
      const vig = ctx.createRadialGradient(540, 540, 250, 540, 540, 780);
      vig.addColorStop(0, "rgba(168, 85, 247, 0)");
      vig.addColorStop(0.7, `rgba(168, 85, 247, ${0.4 * fade})`);
      vig.addColorStop(1, `rgba(168, 85, 247, ${0.75 * fade})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, 1080, 1080);
    } else if (effect.id === "flash-burst") {
      const flashHalo = ctx.createRadialGradient(540, 540, 0, 540, 540, 450 + progress * 350);
      flashHalo.addColorStop(0, `rgba(255, 255, 255, ${0.95 * fade})`);
      flashHalo.addColorStop(0.35, `rgba(255, 245, 200, ${0.6 * fade})`);
      flashHalo.addColorStop(0.75, `rgba(255, 220, 150, ${0.25 * fade})`);
      flashHalo.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = flashHalo;
      ctx.fillRect(0, 0, 1080, 1080);
    } else if (effect.id === "motion-blur") {
      const streak = ctx.createLinearGradient(0, 0, 1080, 0);
      streak.addColorStop(0, `rgba(249, 115, 22, ${0.45 * fade})`);
      streak.addColorStop(0.4, `rgba(255, 255, 255, ${0.4 * fade})`);
      streak.addColorStop(0.8, `rgba(249, 115, 22, ${0.2 * fade})`);
      streak.addColorStop(1, "rgba(249, 115, 22, 0)");
      ctx.fillStyle = streak;
      ctx.fillRect(0, 0, 1080, 1080);
    } else if (effect.id === "light-sweep") {
      const sweepX = -450 + progress * 2000;
      const sweep = ctx.createLinearGradient(sweepX - 220, 0, sweepX + 220, 1080);
      sweep.addColorStop(0, "rgba(253, 224, 71, 0)");
      sweep.addColorStop(0.45, `rgba(253, 224, 71, ${0.5 * fade})`);
      sweep.addColorStop(0.5, `rgba(255, 255, 255, ${0.95 * fade})`);
      sweep.addColorStop(0.55, `rgba(253, 224, 71, ${0.5 * fade})`);
      sweep.addColorStop(1, "rgba(253, 224, 71, 0)");
      ctx.fillStyle = sweep;
      ctx.fillRect(0, 0, 1080, 1080);
    } else if (effect.id === "film-burn") {
      const filmLeak = ctx.createLinearGradient(0, 0, 1080, 1080);
      filmLeak.addColorStop(0, `rgba(245, 158, 11, ${0.65 * fade})`);
      filmLeak.addColorStop(0.35, `rgba(239, 68, 68, ${0.4 * fade})`);
      filmLeak.addColorStop(0.7, "rgba(245, 158, 11, 0)");
      ctx.fillStyle = filmLeak;
      ctx.fillRect(0, 0, 1080, 1080);

      // Sparks
      for (const [x, y, r] of [[180, 200, 110], [880, 420, 140], [280, 780, 90]] as const) {
        const spark = ctx.createRadialGradient(x, y, 0, x, y, r);
        spark.addColorStop(0, `rgba(255, 240, 180, ${0.85 * fade})`);
        spark.addColorStop(0.5, `rgba(245, 158, 11, ${0.45 * fade})`);
        spark.addColorStop(1, "rgba(245, 158, 11, 0)");
        ctx.fillStyle = spark;
        ctx.fillRect(0, 0, 1080, 1080);
      }
    } else if (effect.id === "bokeh-bloom") {
      for (const [x, y, radius] of [
        [240, 240, 110],
        [850, 360, 130],
        [380, 720, 95],
        [780, 180, 85],
        [720, 780, 105],
        [160, 560, 100],
      ] as const) {
        const bokeh = ctx.createRadialGradient(x, y, 0, x, y, radius);
        bokeh.addColorStop(0, `rgba(255, 235, 140, ${0.85 * fade})`);
        bokeh.addColorStop(0.45, `rgba(251, 191, 36, ${0.45 * fade})`);
        bokeh.addColorStop(1, "rgba(251, 191, 36, 0)");
        ctx.fillStyle = bokeh;
        ctx.fillRect(0, 0, 1080, 1080);
      }
    } else if (effect.id === "glitch-shutter") {
      const glitchGrad = ctx.createLinearGradient(0, 0, 1080, 0);
      glitchGrad.addColorStop(0, `rgba(6, 182, 212, ${0.4 * fade})`);
      glitchGrad.addColorStop(0.5, `rgba(236, 72, 153, ${0.3 * fade})`);
      glitchGrad.addColorStop(1, `rgba(59, 130, 246, ${0.4 * fade})`);
      ctx.fillStyle = glitchGrad;
      ctx.fillRect(0, 0, 1080, 1080);

      // Scanlines
      ctx.fillStyle = `rgba(255, 255, 255, ${0.12 * fade})`;
      for (let y = 0; y < 1080; y += 6) {
        ctx.fillRect(0, y, 1080, 2);
      }
    }
  }

  ctx.restore();
}
