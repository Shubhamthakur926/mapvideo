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
