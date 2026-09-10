import { PHOTO_TRANSITION_MS } from "../constants/preview.constants";
import {
  clamp,
  easeInOutCubic,
  easeInOutQuad,
  easeOutBack,
  easeOutCubic,
  easeOutQuad,
  smoothstep,
} from "./easing";
import type {
  TransitionCategory,
  TransitionConfig,
  TransitionContext,
  TransitionId,
} from "./types";

// Helper to draw image covering entire canvas preserving aspect ratio
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx = 0,
  dy = 0,
  dw = 1080,
  dh = 1080
) {
  if (!img) return;
  try {
    ctx.drawImage(img, dx, dy, dw, dh);
  } catch {
    // image may not be fully loaded or cross-origin
  }
}

// Helper to create a unified TransitionConfig
function defineTransition(
  id: TransitionId,
  name: string,
  category: TransitionCategory,
  options: {
    durationMs?: number;
    weight: number;
    excludeOnFirstPhoto?: boolean;
    isHeavy?: boolean;
    hasFlashOverlay?: boolean;
    applyDOM: (progress: number, currentEl: HTMLElement, prevEl?: HTMLElement | null) => void;
    applyCanvas: (
      progress: number,
      ctx: CanvasRenderingContext2D,
      currentImg: HTMLImageElement,
      prevImg: HTMLImageElement | null,
      width: number,
      height: number
    ) => void;
  }
): TransitionConfig {
  const durationMs = options.durationMs ?? PHOTO_TRANSITION_MS;
  return {
    id,
    name,
    category,
    durationMs,
    weight: options.weight,
    excludeOnFirstPhoto: options.excludeOnFirstPhoto ?? false,
    isHeavy: options.isHeavy ?? false,
    hasFlashOverlay: options.hasFlashOverlay ?? false,
    applyDOM: options.applyDOM,
    applyCanvas: options.applyCanvas,
    apply: (
      progress: number,
      target: HTMLElement | CanvasRenderingContext2D,
      context?: Partial<TransitionContext>
    ) => {
      const p = clamp(progress);
      if (typeof HTMLElement !== "undefined" && target instanceof HTMLElement) {
        options.applyDOM(p, target, null);
      } else if (typeof CanvasRenderingContext2D !== "undefined" && target instanceof CanvasRenderingContext2D) {
        const w = context?.width ?? 1080;
        const h = context?.height ?? 1080;
        const cur = context?.currentImg as HTMLImageElement;
        const prev = (context?.prevImg as HTMLImageElement) || null;
        if (cur) {
          options.applyCanvas(p, target, cur, prev, w, h);
        }
      }
    },
  };
}

// ============================================================================
// 1. SLIDES (8)
// ============================================================================
const slideTransitions: Record<string, TransitionConfig> = {
  slideFromLeft: defineTransition("slideFromLeft", "Slide From Left", "slides", {
    weight: 9,
    applyDOM: (p, el) => {
      const ep = easeOutCubic(p);
      el.style.transform = `translate3d(${-100 * (1 - ep)}%, 0, 0)`;
      el.style.opacity = "1";
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev && p < 1) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeOutCubic(p);
      drawImageCover(ctx, cur, -w * (1 - ep), 0, w, h);
    },
  }),

  slideFromRight: defineTransition("slideFromRight", "Slide From Right", "slides", {
    weight: 9,
    applyDOM: (p, el) => {
      const ep = easeOutCubic(p);
      el.style.transform = `translate3d(${100 * (1 - ep)}%, 0, 0)`;
      el.style.opacity = "1";
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev && p < 1) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeOutCubic(p);
      drawImageCover(ctx, cur, w * (1 - ep), 0, w, h);
    },
  }),

  slideFromTop: defineTransition("slideFromTop", "Slide From Top", "slides", {
    weight: 9,
    applyDOM: (p, el) => {
      const ep = easeOutCubic(p);
      el.style.transform = `translate3d(0, ${-100 * (1 - ep)}%, 0)`;
      el.style.opacity = "1";
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev && p < 1) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeOutCubic(p);
      drawImageCover(ctx, cur, 0, -h * (1 - ep), w, h);
    },
  }),

  slideFromBottom: defineTransition("slideFromBottom", "Slide From Bottom", "slides", {
    weight: 9,
    applyDOM: (p, el) => {
      const ep = easeOutCubic(p);
      el.style.transform = `translate3d(0, ${100 * (1 - ep)}%, 0)`;
      el.style.opacity = "1";
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev && p < 1) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeOutCubic(p);
      drawImageCover(ctx, cur, 0, h * (1 - ep), w, h);
    },
  }),

  slideFromTopLeft: defineTransition("slideFromTopLeft", "Slide From Top-Left", "slides", {
    weight: 8,
    applyDOM: (p, el) => {
      const ep = easeOutCubic(p);
      el.style.transform = `translate3d(${-100 * (1 - ep)}%, ${-100 * (1 - ep)}%, 0)`;
      el.style.opacity = "1";
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev && p < 1) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeOutCubic(p);
      drawImageCover(ctx, cur, -w * (1 - ep), -h * (1 - ep), w, h);
    },
  }),

  slideFromTopRight: defineTransition("slideFromTopRight", "Slide From Top-Right", "slides", {
    weight: 8,
    applyDOM: (p, el) => {
      const ep = easeOutCubic(p);
      el.style.transform = `translate3d(${100 * (1 - ep)}%, ${-100 * (1 - ep)}%, 0)`;
      el.style.opacity = "1";
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev && p < 1) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeOutCubic(p);
      drawImageCover(ctx, cur, w * (1 - ep), -h * (1 - ep), w, h);
    },
  }),

  slideFromBottomLeft: defineTransition("slideFromBottomLeft", "Slide From Bottom-Left", "slides", {
    weight: 8,
    applyDOM: (p, el) => {
      const ep = easeOutCubic(p);
      el.style.transform = `translate3d(${-100 * (1 - ep)}%, ${100 * (1 - ep)}%, 0)`;
      el.style.opacity = "1";
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev && p < 1) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeOutCubic(p);
      drawImageCover(ctx, cur, -w * (1 - ep), h * (1 - ep), w, h);
    },
  }),

  slideFromBottomRight: defineTransition("slideFromBottomRight", "Slide From Bottom-Right", "slides", {
    weight: 8,
    applyDOM: (p, el) => {
      const ep = easeOutCubic(p);
      el.style.transform = `translate3d(${100 * (1 - ep)}%, ${100 * (1 - ep)}%, 0)`;
      el.style.opacity = "1";
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev && p < 1) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeOutCubic(p);
      drawImageCover(ctx, cur, w * (1 - ep), h * (1 - ep), w, h);
    },
  }),
};

// ============================================================================
// 2. WIPES (8)
// ============================================================================
const wipeTransitions: Record<string, TransitionConfig> = {
  wipeLeftToRight: defineTransition("wipeLeftToRight", "Wipe Left to Right", "wipes", {
    weight: 8,
    applyDOM: (p, el) => {
      const ep = easeInOutQuad(p);
      el.style.clipPath = `inset(0 ${100 * (1 - ep)}% 0 0)`;
      el.style.opacity = "1";
      el.style.transform = "none";
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeInOutQuad(p);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w * ep, h);
      ctx.clip();
      drawImageCover(ctx, cur, 0, 0, w, h);
      ctx.restore();
    },
  }),

  wipeRightToLeft: defineTransition("wipeRightToLeft", "Wipe Right to Left", "wipes", {
    weight: 8,
    applyDOM: (p, el) => {
      const ep = easeInOutQuad(p);
      el.style.clipPath = `inset(0 0 0 ${100 * (1 - ep)}%)`;
      el.style.opacity = "1";
      el.style.transform = "none";
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeInOutQuad(p);
      ctx.save();
      ctx.beginPath();
      ctx.rect(w * (1 - ep), 0, w * ep, h);
      ctx.clip();
      drawImageCover(ctx, cur, 0, 0, w, h);
      ctx.restore();
    },
  }),

  wipeTopToBottom: defineTransition("wipeTopToBottom", "Wipe Top to Bottom", "wipes", {
    weight: 8,
    applyDOM: (p, el) => {
      const ep = easeInOutQuad(p);
      el.style.clipPath = `inset(0 0 ${100 * (1 - ep)}% 0)`;
      el.style.opacity = "1";
      el.style.transform = "none";
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeInOutQuad(p);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h * ep);
      ctx.clip();
      drawImageCover(ctx, cur, 0, 0, w, h);
      ctx.restore();
    },
  }),

  wipeBottomToTop: defineTransition("wipeBottomToTop", "Wipe Bottom to Top", "wipes", {
    weight: 8,
    applyDOM: (p, el) => {
      const ep = easeInOutQuad(p);
      el.style.clipPath = `inset(${100 * (1 - ep)}% 0 0 0)`;
      el.style.opacity = "1";
      el.style.transform = "none";
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeInOutQuad(p);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, h * (1 - ep), w, h * ep);
      ctx.clip();
      drawImageCover(ctx, cur, 0, 0, w, h);
      ctx.restore();
    },
  }),

  wipeDiagonal: defineTransition("wipeDiagonal", "Diagonal Wipe", "wipes", {
    weight: 7,
    applyDOM: (p, el) => {
      const ep = easeInOutQuad(p);
      const val = ep * 200;
      el.style.clipPath = `polygon(0 0, ${val}% 0, 0 ${val}%)`;
      el.style.opacity = "1";
      el.style.transform = "none";
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeInOutQuad(p);
      const val = ep * 2;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w * val, 0);
      ctx.lineTo(0, h * val);
      ctx.closePath();
      ctx.clip();
      drawImageCover(ctx, cur, 0, 0, w, h);
      ctx.restore();
    },
  }),

  irisWipeExpand: defineTransition("irisWipeExpand", "Iris Wipe Expand", "wipes", {
    weight: 8,
    applyDOM: (p, el) => {
      const ep = easeOutCubic(p);
      el.style.clipPath = `circle(${ep * 85}% at 50% 50%)`;
      el.style.opacity = "1";
      el.style.transform = "none";
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeOutCubic(p);
      const maxRadius = Math.hypot(w / 2, h / 2);
      ctx.save();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, maxRadius * ep, 0, Math.PI * 2);
      ctx.clip();
      drawImageCover(ctx, cur, 0, 0, w, h);
      ctx.restore();
    },
  }),

  irisWipeContract: defineTransition("irisWipeContract", "Iris Wipe Contract", "wipes", {
    weight: 7,
    applyDOM: (p, el, prevEl) => {
      const ep = easeInOutQuad(p);
      el.style.opacity = "1";
      el.style.transform = "none";
      el.style.clipPath = "none";
      if (prevEl) {
        prevEl.style.clipPath = `circle(${(1 - ep) * 85}% at 50% 50%)`;
      }
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      drawImageCover(ctx, cur, 0, 0, w, h);
      if (prev && p < 1) {
        const ep = easeInOutQuad(p);
        const maxRadius = Math.hypot(w / 2, h / 2);
        ctx.save();
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, maxRadius * (1 - ep), 0, Math.PI * 2);
        ctx.clip();
        drawImageCover(ctx, prev, 0, 0, w, h);
        ctx.restore();
      }
    },
  }),

  clockWipe: defineTransition("clockWipe", "Clock Wipe", "wipes", {
    weight: 7,
    applyDOM: (p, el) => {
      const ep = easeInOutQuad(p);
      const deg = ep * 360;
      el.style.clipPath = `conic-gradient(from 0deg at 50% 50%, #000 ${deg}deg, transparent ${deg}deg)`;
      el.style.opacity = "1";
      el.style.transform = "none";
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeInOutQuad(p);
      const angle = ep * Math.PI * 2 - Math.PI / 2;
      const maxR = Math.hypot(w, h);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2);
      ctx.arc(w / 2, h / 2, maxR, -Math.PI / 2, angle);
      ctx.closePath();
      ctx.clip();
      drawImageCover(ctx, cur, 0, 0, w, h);
      ctx.restore();
    },
  }),
};

// ============================================================================
// 3. ZOOM / SCALE (4)
// ============================================================================
const zoomTransitions: Record<string, TransitionConfig> = {
  zoomInFade: defineTransition("zoomInFade", "Zoom In & Fade", "zoom", {
    weight: 9,
    applyDOM: (p, el) => {
      const ep = easeOutCubic(p);
      const scale = 0.65 + 0.35 * ep;
      el.style.transform = `scale(${scale})`;
      el.style.opacity = `${ep}`;
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev && p < 1) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeOutCubic(p);
      const scale = 0.65 + 0.35 * ep;
      ctx.save();
      ctx.globalAlpha = ep;
      ctx.translate(w / 2, h / 2);
      ctx.scale(scale, scale);
      drawImageCover(ctx, cur, -w / 2, -h / 2, w, h);
      ctx.restore();
    },
  }),

  zoomOutFade: defineTransition("zoomOutFade", "Zoom Out & Fade", "zoom", {
    weight: 8,
    applyDOM: (p, el) => {
      const ep = easeOutCubic(p);
      const scale = 1.35 - 0.35 * ep;
      el.style.transform = `scale(${scale})`;
      el.style.opacity = `${ep}`;
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev && p < 1) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeOutCubic(p);
      const scale = 1.35 - 0.35 * ep;
      ctx.save();
      ctx.globalAlpha = ep;
      ctx.translate(w / 2, h / 2);
      ctx.scale(scale, scale);
      drawImageCover(ctx, cur, -w / 2, -h / 2, w, h);
      ctx.restore();
    },
  }),

  kenBurnsPan: defineTransition("kenBurnsPan", "Cinematic Ken Burns Pan", "zoom", {
    weight: 8,
    durationMs: 650,
    applyDOM: (p, el) => {
      const ep = easeInOutCubic(p);
      const scale = 1.14 - 0.08 * ep;
      const tx = (1 - ep) * 20;
      el.style.transform = `scale(${scale}) translate3d(${tx}px, 0, 0)`;
      el.style.opacity = `${ep}`;
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev && p < 1) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeInOutCubic(p);
      const scale = 1.14 - 0.08 * ep;
      const tx = (1 - ep) * 20;
      ctx.save();
      ctx.globalAlpha = ep;
      ctx.translate(w / 2 + tx, h / 2);
      ctx.scale(scale, scale);
      drawImageCover(ctx, cur, -w / 2, -h / 2, w, h);
      ctx.restore();
    },
  }),

  pushZoomOut: defineTransition("pushZoomOut", "Push Zoom Out", "zoom", {
    weight: 7,
    applyDOM: (p, el, prevEl) => {
      const ep = easeOutCubic(p);
      el.style.transform = `scale(${0.75 + 0.25 * ep})`;
      el.style.opacity = `${ep}`;
      if (prevEl) {
        prevEl.style.transform = `scale(${1 + 0.3 * ep})`;
        prevEl.style.opacity = `${1 - ep}`;
      }
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      const ep = easeOutCubic(p);
      if (prev && p < 1) {
        ctx.save();
        ctx.globalAlpha = 1 - ep;
        const prevScale = 1 + 0.3 * ep;
        ctx.translate(w / 2, h / 2);
        ctx.scale(prevScale, prevScale);
        drawImageCover(ctx, prev, -w / 2, -h / 2, w, h);
        ctx.restore();
      }
      ctx.save();
      ctx.globalAlpha = ep;
      const scale = 0.75 + 0.25 * ep;
      ctx.translate(w / 2, h / 2);
      ctx.scale(scale, scale);
      drawImageCover(ctx, cur, -w / 2, -h / 2, w, h);
      ctx.restore();
    },
  }),
};

// ============================================================================
// 4. ROTATION / 3D (12)
// ============================================================================
const rotation3DTransitions: Record<string, TransitionConfig> = {
  cubeRotateLeft: defineTransition("cubeRotateLeft", "3D Cube Rotate Left", "rotation3d", {
    weight: 10,
    isHeavy: false,
    applyDOM: (p, el, prevEl) => {
      const ep = easeInOutCubic(p);
      el.style.transformOrigin = "right center";
      el.style.transform = `perspective(1200px) rotateY(${90 * (1 - ep)}deg)`;
      el.style.opacity = `${ep > 0.1 ? 1 : ep * 10}`;
      if (prevEl) {
        prevEl.style.transformOrigin = "left center";
        prevEl.style.transform = `perspective(1200px) rotateY(${-90 * ep}deg)`;
        prevEl.style.opacity = `${1 - ep > 0.1 ? 1 : (1 - ep) * 10}`;
      }
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      const ep = easeInOutCubic(p);
      if (prev && ep < 0.5) {
        const prevP = ep * 2;
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.transform(1 - prevP * 0.45, 0, -prevP * 0.2, 1, -w * prevP * 0.5, 0);
        ctx.globalAlpha = 1 - prevP * 0.3;
        drawImageCover(ctx, prev, -w / 2, -h / 2, w, h);
        ctx.restore();
      } else {
        const curP = (ep - 0.5) * 2;
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.transform(0.55 + curP * 0.45, 0, (1 - curP) * 0.2, 1, w * (1 - curP) * 0.5, 0);
        ctx.globalAlpha = 0.7 + curP * 0.3;
        drawImageCover(ctx, cur, -w / 2, -h / 2, w, h);
        ctx.restore();
      }
    },
  }),

  cubeRotateRight: defineTransition("cubeRotateRight", "3D Cube Rotate Right", "rotation3d", {
    weight: 10,
    isHeavy: false,
    applyDOM: (p, el, prevEl) => {
      const ep = easeInOutCubic(p);
      el.style.transformOrigin = "left center";
      el.style.transform = `perspective(1200px) rotateY(${-90 * (1 - ep)}deg)`;
      el.style.opacity = `${ep > 0.1 ? 1 : ep * 10}`;
      if (prevEl) {
        prevEl.style.transformOrigin = "right center";
        prevEl.style.transform = `perspective(1200px) rotateY(${90 * ep}deg)`;
        prevEl.style.opacity = `${1 - ep > 0.1 ? 1 : (1 - ep) * 10}`;
      }
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      const ep = easeInOutCubic(p);
      if (prev && ep < 0.5) {
        const prevP = ep * 2;
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.transform(1 - prevP * 0.45, 0, prevP * 0.2, 1, w * prevP * 0.5, 0);
        ctx.globalAlpha = 1 - prevP * 0.3;
        drawImageCover(ctx, prev, -w / 2, -h / 2, w, h);
        ctx.restore();
      } else {
        const curP = (ep - 0.5) * 2;
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.transform(0.55 + curP * 0.45, 0, -(1 - curP) * 0.2, 1, -w * (1 - curP) * 0.5, 0);
        ctx.globalAlpha = 0.7 + curP * 0.3;
        drawImageCover(ctx, cur, -w / 2, -h / 2, w, h);
        ctx.restore();
      }
    },
  }),

  cubeRotateUp: defineTransition("cubeRotateUp", "3D Cube Rotate Up", "rotation3d", {
    weight: 10,
    isHeavy: false,
    applyDOM: (p, el) => {
      const ep = easeInOutCubic(p);
      el.style.transformOrigin = "center bottom";
      el.style.transform = `perspective(1200px) rotateX(${-90 * (1 - ep)}deg)`;
      el.style.opacity = `${ep}`;
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev && p < 1) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeInOutCubic(p);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(1, ep);
      ctx.globalAlpha = ep;
      drawImageCover(ctx, cur, -w / 2, -h / 2, w, h);
      ctx.restore();
    },
  }),

  cubeRotateDown: defineTransition("cubeRotateDown", "3D Cube Rotate Down", "rotation3d", {
    weight: 10,
    isHeavy: false,
    applyDOM: (p, el) => {
      const ep = easeInOutCubic(p);
      el.style.transformOrigin = "center top";
      el.style.transform = `perspective(1200px) rotateX(${90 * (1 - ep)}deg)`;
      el.style.opacity = `${ep}`;
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev && p < 1) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeInOutCubic(p);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(1, ep);
      ctx.globalAlpha = ep;
      drawImageCover(ctx, cur, -w / 2, -h / 2, w, h);
      ctx.restore();
    },
  }),

  flipHorizontal: defineTransition("flipHorizontal", "Flip Horizontal", "rotation3d", {
    weight: 10,
    isHeavy: false,
    applyDOM: (p, el) => {
      const ep = easeInOutQuad(p);
      el.style.transform = `perspective(1000px) rotateY(${180 * (1 - ep)}deg)`;
      el.style.opacity = `${ep < 0.5 ? ep * 2 : 1}`;
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      const ep = easeInOutQuad(p);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      if (ep < 0.5) {
        if (prev) {
          ctx.scale(1 - ep * 2, 1);
          drawImageCover(ctx, prev, -w / 2, -h / 2, w, h);
        }
      } else {
        ctx.scale((ep - 0.5) * 2, 1);
        drawImageCover(ctx, cur, -w / 2, -h / 2, w, h);
      }
      ctx.restore();
    },
  }),

  flipVertical: defineTransition("flipVertical", "Flip Vertical", "rotation3d", {
    weight: 10,
    isHeavy: false,
    applyDOM: (p, el) => {
      const ep = easeInOutQuad(p);
      el.style.transform = `perspective(1000px) rotateX(${180 * (1 - ep)}deg)`;
      el.style.opacity = `${ep < 0.5 ? ep * 2 : 1}`;
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      const ep = easeInOutQuad(p);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      if (ep < 0.5) {
        if (prev) {
          ctx.scale(1, 1 - ep * 2);
          drawImageCover(ctx, prev, -w / 2, -h / 2, w, h);
        }
      } else {
        ctx.scale(1, (ep - 0.5) * 2);
        drawImageCover(ctx, cur, -w / 2, -h / 2, w, h);
      }
      ctx.restore();
    },
  }),

  tiltInFromLeft: defineTransition("tiltInFromLeft", "Tilt In From Left", "rotation3d", {
    weight: 10,
    isHeavy: false,
    applyDOM: (p, el) => {
      const ep = easeOutBack(p);
      const rotY = -28 * (1 - ep);
      const rotZ = -6 * (1 - ep);
      const tx = -60 * (1 - ep);
      el.style.transform = `perspective(1000px) translate3d(${tx}%, 0, 0) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`;
      el.style.opacity = `${p}`;
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev && p < 1) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeOutCubic(p);
      ctx.save();
      ctx.globalAlpha = p;
      ctx.translate(w * 0.3 * (1 - ep), 0);
      drawImageCover(ctx, cur, -w * 0.6 * (1 - ep), 0, w, h);
      ctx.restore();
    },
  }),

  tiltInFromRight: defineTransition("tiltInFromRight", "Tilt In From Right", "rotation3d", {
    weight: 10,
    isHeavy: false,
    applyDOM: (p, el) => {
      const ep = easeOutBack(p);
      const rotY = 28 * (1 - ep);
      const rotZ = 6 * (1 - ep);
      const tx = 60 * (1 - ep);
      el.style.transform = `perspective(1000px) translate3d(${tx}%, 0, 0) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`;
      el.style.opacity = `${p}`;
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev && p < 1) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeOutCubic(p);
      ctx.save();
      ctx.globalAlpha = p;
      ctx.translate(-w * 0.3 * (1 - ep), 0);
      drawImageCover(ctx, cur, w * 0.6 * (1 - ep), 0, w, h);
      ctx.restore();
    },
  }),

  pageCurl: defineTransition("pageCurl", "Page Curl 3D", "rotation3d", {
    weight: 9,
    isHeavy: false,
    applyDOM: (p, el, prevEl) => {
      const ep = easeInOutCubic(p);
      el.style.opacity = "1";
      el.style.clipPath = `polygon(0 0, 100% 0, 100% 100%, 0 100%)`;
      if (prevEl) {
        prevEl.style.transformOrigin = "left center";
        prevEl.style.transform = `perspective(1000px) rotateY(${-65 * ep}deg) skewY(${10 * ep}deg)`;
        prevEl.style.opacity = `${1 - ep * 0.7}`;
      }
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      drawImageCover(ctx, cur, 0, 0, w, h);
      if (prev && p < 1) {
        const ep = easeInOutCubic(p);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w * (1 - ep), 0);
        ctx.lineTo(0, h * (1 - ep));
        ctx.closePath();
        ctx.clip();
        drawImageCover(ctx, prev, 0, 0, w, h);
        ctx.restore();
      }
    },
  }),

  pageCurlReverse: defineTransition("pageCurlReverse", "Page Curl Reverse", "rotation3d", {
    weight: 9,
    isHeavy: false,
    applyDOM: (p, el, prevEl) => {
      const ep = easeInOutCubic(p);
      el.style.opacity = "1";
      if (prevEl) {
        prevEl.style.transformOrigin = "right center";
        prevEl.style.transform = `perspective(1000px) rotateY(${65 * ep}deg) skewY(${-10 * ep}deg)`;
        prevEl.style.opacity = `${1 - ep * 0.7}`;
      }
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      drawImageCover(ctx, cur, 0, 0, w, h);
      if (prev && p < 1) {
        const ep = easeInOutCubic(p);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(w, 0);
        ctx.lineTo(w * ep, 0);
        ctx.lineTo(w, h * (1 - ep));
        ctx.closePath();
        ctx.clip();
        drawImageCover(ctx, prev, 0, 0, w, h);
        ctx.restore();
      }
    },
  }),

  doorSwingOpen: defineTransition("doorSwingOpen", "Door Swing Open", "rotation3d", {
    weight: 10,
    isHeavy: false,
    applyDOM: (p, el) => {
      const ep = easeOutCubic(p);
      el.style.transformOrigin = "left center";
      el.style.transform = `perspective(1000px) rotateY(${-90 * (1 - ep)}deg)`;
      el.style.opacity = `${ep}`;
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev && p < 1) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeOutCubic(p);
      ctx.save();
      ctx.translate(0, h / 2);
      ctx.scale(ep, 1);
      ctx.globalAlpha = ep;
      drawImageCover(ctx, cur, 0, -h / 2, w, h);
      ctx.restore();
    },
  }),

  foldReveal: defineTransition("foldReveal", "3D Fold Reveal", "rotation3d", {
    weight: 10,
    isHeavy: false,
    applyDOM: (p, el) => {
      const ep = easeInOutCubic(p);
      el.style.transform = `perspective(800px) scaleX(${ep}) rotateY(${45 * (1 - ep)}deg)`;
      el.style.opacity = `${ep}`;
    },

    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev && p < 1) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeInOutCubic(p);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(ep, 1);
      ctx.globalAlpha = ep;
      drawImageCover(ctx, cur, -w / 2, -h / 2, w, h);
      ctx.restore();
    },
  }),
};

// ============================================================================
// 5. FADE / BLEND (4)
// ============================================================================
const fadeTransitions: Record<string, TransitionConfig> = {
  crossfade: defineTransition("crossfade", "Smooth Crossfade", "fade", {
    weight: 10,
    applyDOM: (p, el) => {
      el.style.opacity = `${p}`;
      el.style.transform = "none";
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev && p < 1) drawImageCover(ctx, prev, 0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = p;
      drawImageCover(ctx, cur, 0, 0, w, h);
      ctx.restore();
    },
  }),

  fadeThroughWhite: defineTransition("fadeThroughWhite", "Fade Through White", "fade", {
    weight: 7,
    applyDOM: (p, el, prevEl) => {
      if (p < 0.5) {
        const p1 = p * 2;
        el.style.opacity = "0";
        if (prevEl) {
          prevEl.style.filter = `brightness(${1 + p1 * 3})`;
          prevEl.style.opacity = `${1 - p1}`;
        }
      } else {
        const p2 = (p - 0.5) * 2;
        el.style.filter = `brightness(${1 + (1 - p2) * 3})`;
        el.style.opacity = `${p2}`;
      }
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (p < 0.5) {
        const p1 = p * 2;
        if (prev) {
          ctx.save();
          ctx.globalAlpha = 1 - p1;
          drawImageCover(ctx, prev, 0, 0, w, h);
          ctx.fillStyle = `rgba(255, 255, 255, ${p1})`;
          ctx.fillRect(0, 0, w, h);
          ctx.restore();
        }
      } else {
        const p2 = (p - 0.5) * 2;
        ctx.save();
        ctx.globalAlpha = p2;
        drawImageCover(ctx, cur, 0, 0, w, h);
        ctx.fillStyle = `rgba(255, 255, 255, ${(1 - p2) * 0.8})`;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    },
  }),

  fadeThroughBlack: defineTransition("fadeThroughBlack", "Fade Through Black", "fade", {
    weight: 7,
    applyDOM: (p, el, prevEl) => {
      if (p < 0.5) {
        const p1 = p * 2;
        el.style.opacity = "0";
        if (prevEl) prevEl.style.opacity = `${1 - p1}`;
      } else {
        const p2 = (p - 0.5) * 2;
        el.style.opacity = `${p2}`;
      }
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, w, h);
      if (p < 0.5) {
        const p1 = p * 2;
        if (prev) {
          ctx.save();
          ctx.globalAlpha = 1 - p1;
          drawImageCover(ctx, prev, 0, 0, w, h);
          ctx.restore();
        }
      } else {
        const p2 = (p - 0.5) * 2;
        ctx.save();
        ctx.globalAlpha = p2;
        drawImageCover(ctx, cur, 0, 0, w, h);
        ctx.restore();
      }
    },
  }),

  blurCrossfade: defineTransition("blurCrossfade", "Blur Crossfade", "fade", {
    weight: 8,
    applyDOM: (p, el) => {
      const ep = easeOutQuad(p);
      const blurPx = (1 - ep) * 16;
      el.style.filter = `blur(${blurPx}px)`;
      el.style.opacity = `${ep}`;
      el.style.transform = `scale(${1.05 - 0.05 * ep})`;
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev && p < 1) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeOutQuad(p);
      ctx.save();
      ctx.globalAlpha = ep;
      const blurPx = Math.round((1 - ep) * 12);
      if (blurPx > 0 && "filter" in ctx) {
        (ctx as unknown as { filter: string }).filter = `blur(${blurPx}px)`;
      }
      drawImageCover(ctx, cur, 0, 0, w, h);
      ctx.restore();
    },
  }),
};

// ============================================================================
// 6. PUSH (4)
// ============================================================================
const pushTransitions: Record<string, TransitionConfig> = {
  pushLeft: defineTransition("pushLeft", "Push Left", "push", {
    weight: 8,
    applyDOM: (p, el, prevEl) => {
      const ep = easeOutCubic(p);
      el.style.transform = `translate3d(${100 * (1 - ep)}%, 0, 0)`;
      el.style.opacity = "1";
      if (prevEl) prevEl.style.transform = `translate3d(${-100 * ep}%, 0, 0)`;
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      const ep = easeOutCubic(p);
      if (prev && p < 1) drawImageCover(ctx, prev, -w * ep, 0, w, h);
      drawImageCover(ctx, cur, w * (1 - ep), 0, w, h);
    },
  }),

  pushRight: defineTransition("pushRight", "Push Right", "push", {
    weight: 8,
    applyDOM: (p, el, prevEl) => {
      const ep = easeOutCubic(p);
      el.style.transform = `translate3d(${-100 * (1 - ep)}%, 0, 0)`;
      el.style.opacity = "1";
      if (prevEl) prevEl.style.transform = `translate3d(${100 * ep}%, 0, 0)`;
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      const ep = easeOutCubic(p);
      if (prev && p < 1) drawImageCover(ctx, prev, w * ep, 0, w, h);
      drawImageCover(ctx, cur, -w * (1 - ep), 0, w, h);
    },
  }),

  pushUp: defineTransition("pushUp", "Push Up", "push", {
    weight: 8,
    applyDOM: (p, el, prevEl) => {
      const ep = easeOutCubic(p);
      el.style.transform = `translate3d(0, ${100 * (1 - ep)}%, 0)`;
      el.style.opacity = "1";
      if (prevEl) prevEl.style.transform = `translate3d(0, ${-100 * ep}%, 0)`;
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      const ep = easeOutCubic(p);
      if (prev && p < 1) drawImageCover(ctx, prev, 0, -h * ep, w, h);
      drawImageCover(ctx, cur, 0, h * (1 - ep), w, h);
    },
  }),

  pushDown: defineTransition("pushDown", "Push Down", "push", {
    weight: 8,
    applyDOM: (p, el, prevEl) => {
      const ep = easeOutCubic(p);
      el.style.transform = `translate3d(0, ${-100 * (1 - ep)}%, 0)`;
      el.style.opacity = "1";
      if (prevEl) prevEl.style.transform = `translate3d(0, ${100 * ep}%, 0)`;
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      const ep = easeOutCubic(p);
      if (prev && p < 1) drawImageCover(ctx, prev, 0, h * ep, w, h);
      drawImageCover(ctx, cur, 0, -h * (1 - ep), w, h);
    },
  }),
};

// ============================================================================
// 7. GLITCH / STYLIZED (10)
// ============================================================================
const stylizedTransitions: Record<string, TransitionConfig> = {
  glitchCut: defineTransition("glitchCut", "Glitch Cut", "stylized", {
    weight: 2,
    excludeOnFirstPhoto: true,
    applyDOM: (p, el) => {
      if (p < 0.6) {
        const jitter = Math.sin(p * 50) * 12;
        el.style.transform = `translate3d(${jitter}px, ${-jitter / 2}px, 0) skewX(${jitter}deg)`;
        el.style.filter = `hue-rotate(${p * 90}deg) saturate(2)`;
        el.style.opacity = `${p > 0.1 ? 0.9 : 0}`;
      } else {
        el.style.transform = "none";
        el.style.filter = "none";
        el.style.opacity = "1";
      }
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev && p < 0.5) {
        const jitter = Math.sin(p * 40) * 16;
        drawImageCover(ctx, prev, jitter, -jitter / 2, w, h);
      } else {
        const ep = clamp((p - 0.4) / 0.6);
        const jitter = (1 - ep) * Math.sin(p * 50) * 18;
        drawImageCover(ctx, cur, jitter, 0, w, h);
      }
    },
  }),

  shutterFlashCut: defineTransition("shutterFlashCut", "Shutter Flash Cut", "stylized", {
    weight: 5,
    hasFlashOverlay: true,
    applyDOM: (p, el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      drawImageCover(ctx, cur, 0, 0, w, h);
      if (p < 0.35) {
        const flashAlpha = (1 - p / 0.35) * 0.6;
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    },
  }),

  shatterDissolve: defineTransition("shatterDissolve", "Shatter Dissolve", "stylized", {
    weight: 2,
    isHeavy: true,
    excludeOnFirstPhoto: true,
    applyDOM: (p, el, prevEl) => {
      const ep = easeInOutCubic(p);
      el.style.opacity = `${ep}`;
      el.style.transform = `scale(${0.9 + 0.1 * ep})`;
      if (prevEl) {
        prevEl.style.opacity = `${1 - ep}`;
        prevEl.style.transform = `scale(${1 + 0.15 * ep}) rotate(${ep * 4}deg)`;
      }
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      const ep = easeInOutCubic(p);
      if (prev && p < 1) {
        ctx.save();
        ctx.globalAlpha = 1 - ep;
        drawImageCover(ctx, prev, 0, 0, w, h);
        ctx.restore();
      }
      // Draw shattered grid tiles
      const cols = 4;
      const rows = 4;
      const tileW = w / cols;
      const tileH = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const tileProgress = clamp((ep - (r + c) * 0.05) / 0.7);
          if (tileProgress <= 0) continue;
          ctx.save();
          ctx.beginPath();
          const tx = c * tileW;
          const ty = r * tileH;
          ctx.rect(tx, ty, tileW, tileH);
          ctx.clip();
          ctx.globalAlpha = tileProgress;
          const offset = (1 - tileProgress) * 30 * ((r + c) % 2 === 0 ? 1 : -1);
          drawImageCover(ctx, cur, offset, offset, w, h);
          ctx.restore();
        }
      }
    },
  }),

  splitReveal: defineTransition("splitReveal", "Split Center Reveal", "stylized", {
    weight: 6,
    applyDOM: (p, el) => {
      const ep = easeOutCubic(p);
      const half = 50 * (1 - ep);
      el.style.clipPath = `polygon(0 0, 100% 0, 100% ${50 - half}%, 0 ${50 - half}%, 0 ${50 + half}%, 100% ${50 + half}%, 100% 100%, 0 100%)`;
      el.style.opacity = "1";
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeOutCubic(p);
      const halfH = (h / 2) * ep;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, h / 2 - halfH, w, halfH * 2);
      ctx.clip();
      drawImageCover(ctx, cur, 0, 0, w, h);
      ctx.restore();
    },
  }),

  vhsStatic: defineTransition("vhsStatic", "VHS Tape Static", "stylized", {
    weight: 2,
    excludeOnFirstPhoto: true,
    applyDOM: (p, el) => {
      if (p < 0.7) {
        const offset = Math.sin(p * 60) * 15;
        el.style.transform = `translate3d(${offset}px, 0, 0)`;
        el.style.filter = `contrast(1.5) saturate(1.8) hue-rotate(${p * 45}deg)`;
        el.style.opacity = `${p > 0.2 ? 1 : p * 5}`;
      } else {
        el.style.transform = "none";
        el.style.filter = "none";
        el.style.opacity = "1";
      }
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (p < 0.5 && prev) {
        drawImageCover(ctx, prev, 0, 0, w, h);
      } else {
        drawImageCover(ctx, cur, 0, 0, w, h);
      }
      if (p < 0.8) {
        const noiseAlpha = (1 - p / 0.8) * 0.35;
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${noiseAlpha * 0.3})`;
        for (let y = 0; y < h; y += 8) {
          ctx.fillRect(0, y, w, 2);
        }
        ctx.restore();
      }
    },
  }),

  scanlineWipe: defineTransition("scanlineWipe", "CRT Scanline Wipe", "stylized", {
    weight: 4,
    applyDOM: (p, el) => {
      const ep = easeInOutQuad(p);
      el.style.clipPath = `inset(0 0 ${100 * (1 - ep)}% 0)`;
      el.style.opacity = "1";
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeInOutQuad(p);
      const scanY = h * ep;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, scanY);
      ctx.clip();
      drawImageCover(ctx, cur, 0, 0, w, h);
      ctx.restore();
      if (ep > 0 && ep < 1) {
        ctx.save();
        ctx.fillStyle = "#38bdf8";
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 12;
        ctx.fillRect(0, scanY - 3, w, 6);
        ctx.restore();
      }
    },
  }),

  chromaticPulse: defineTransition("chromaticPulse", "Chromatic Pulse", "stylized", {
    weight: 3,
    excludeOnFirstPhoto: true,
    applyDOM: (p, el) => {
      const pulse = Math.sin(p * Math.PI);
      el.style.filter = `drop-shadow(${pulse * 8}px 0 0 rgba(255,0,0,0.6)) drop-shadow(${-pulse * 8}px 0 0 rgba(0,255,255,0.6))`;
      el.style.opacity = `${p}`;
      el.style.transform = `scale(${1 + pulse * 0.05})`;
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev && p < 1) drawImageCover(ctx, prev, 0, 0, w, h);
      const pulse = Math.sin(p * Math.PI);
      ctx.save();
      ctx.globalAlpha = p;
      if (pulse > 0.2) {
        ctx.save();
        ctx.globalAlpha = p * 0.5;
        drawImageCover(ctx, cur, pulse * 10, 0, w, h);
        drawImageCover(ctx, cur, -pulse * 10, 0, w, h);
        ctx.restore();
      }
      drawImageCover(ctx, cur, 0, 0, w, h);
      ctx.restore();
    },
  }),

  pixelateDissolve: defineTransition("pixelateDissolve", "Pixelate Dissolve", "stylized", {
    weight: 3,
    isHeavy: true,
    excludeOnFirstPhoto: true,
    applyDOM: (p, el) => {
      const ep = easeOutCubic(p);
      const blur = Math.sin(p * Math.PI) * 14;
      el.style.filter = `blur(${blur}px)`;
      el.style.opacity = `${ep}`;
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev && p < 1) drawImageCover(ctx, prev, 0, 0, w, h);
      const ep = easeOutCubic(p);
      ctx.save();
      ctx.globalAlpha = ep;
      drawImageCover(ctx, cur, 0, 0, w, h);
      ctx.restore();
    },
  }),

  lightLeakTransition: defineTransition("lightLeakTransition", "Vintage Light Leak", "stylized", {
    weight: 5,
    applyDOM: (p, el) => {
      el.style.opacity = `${p}`;
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev && p < 1) drawImageCover(ctx, prev, 0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = p;
      drawImageCover(ctx, cur, 0, 0, w, h);
      ctx.restore();
      const leakIntensity = Math.sin(p * Math.PI);
      if (leakIntensity > 0.05) {
        ctx.save();
        const grad = ctx.createRadialGradient(
          w * (0.2 + p * 0.6),
          h * 0.2,
          10,
          w * (0.2 + p * 0.6),
          h * 0.2,
          w * 0.75
        );
        grad.addColorStop(0, `rgba(255, 180, 50, ${leakIntensity * 0.7})`);
        grad.addColorStop(0.5, `rgba(255, 80, 20, ${leakIntensity * 0.4})`);
        grad.addColorStop(1, "rgba(255, 80, 20, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    },
  }),

  filmBurnTransition: defineTransition("filmBurnTransition", "Film Burn Transition", "stylized", {
    weight: 3,
    excludeOnFirstPhoto: true,
    applyDOM: (p, el) => {
      el.style.opacity = `${p}`;
    },
    applyCanvas: (p, ctx, cur, prev, w, h) => {
      if (prev && p < 1) drawImageCover(ctx, prev, 0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = p;
      drawImageCover(ctx, cur, 0, 0, w, h);
      ctx.restore();
      const burn = Math.sin(p * Math.PI);
      if (burn > 0.08) {
        ctx.save();
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, `rgba(255, 230, 150, ${burn * 0.6})`);
        grad.addColorStop(0.4, `rgba(255, 120, 20, ${burn * 0.5})`);
        grad.addColorStop(1, `rgba(180, 30, 0, ${burn * 0.3})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    },
  }),
};

// ============================================================================
// COMPLETE 50 TRANSITIONS REGISTRY
// ============================================================================
export const TRANSITIONS: Record<TransitionId, TransitionConfig> = {
  // Slides (8)
  slideFromLeft: slideTransitions.slideFromLeft,
  slideFromRight: slideTransitions.slideFromRight,
  slideFromTop: slideTransitions.slideFromTop,
  slideFromBottom: slideTransitions.slideFromBottom,
  slideFromTopLeft: slideTransitions.slideFromTopLeft,
  slideFromTopRight: slideTransitions.slideFromTopRight,
  slideFromBottomLeft: slideTransitions.slideFromBottomLeft,
  slideFromBottomRight: slideTransitions.slideFromBottomRight,

  // Wipes (8)
  wipeLeftToRight: wipeTransitions.wipeLeftToRight,
  wipeRightToLeft: wipeTransitions.wipeRightToLeft,
  wipeTopToBottom: wipeTransitions.wipeTopToBottom,
  wipeBottomToTop: wipeTransitions.wipeBottomToTop,
  wipeDiagonal: wipeTransitions.wipeDiagonal,
  irisWipeExpand: wipeTransitions.irisWipeExpand,
  irisWipeContract: wipeTransitions.irisWipeContract,
  clockWipe: wipeTransitions.clockWipe,

  // Zoom / Scale (4)
  zoomInFade: zoomTransitions.zoomInFade,
  zoomOutFade: zoomTransitions.zoomOutFade,
  kenBurnsPan: zoomTransitions.kenBurnsPan,
  pushZoomOut: zoomTransitions.pushZoomOut,

  // Rotation / 3D (12)
  cubeRotateLeft: rotation3DTransitions.cubeRotateLeft,
  cubeRotateRight: rotation3DTransitions.cubeRotateRight,
  cubeRotateUp: rotation3DTransitions.cubeRotateUp,
  cubeRotateDown: rotation3DTransitions.cubeRotateDown,
  flipHorizontal: rotation3DTransitions.flipHorizontal,
  flipVertical: rotation3DTransitions.flipVertical,
  tiltInFromLeft: rotation3DTransitions.tiltInFromLeft,
  tiltInFromRight: rotation3DTransitions.tiltInFromRight,
  pageCurl: rotation3DTransitions.pageCurl,
  pageCurlReverse: rotation3DTransitions.pageCurlReverse,
  doorSwingOpen: rotation3DTransitions.doorSwingOpen,
  foldReveal: rotation3DTransitions.foldReveal,

  // Fade / Blend (4)
  crossfade: fadeTransitions.crossfade,
  fadeThroughWhite: fadeTransitions.fadeThroughWhite,
  fadeThroughBlack: fadeTransitions.fadeThroughBlack,
  blurCrossfade: fadeTransitions.blurCrossfade,

  // Push (4)
  pushLeft: pushTransitions.pushLeft,
  pushRight: pushTransitions.pushRight,
  pushUp: pushTransitions.pushUp,
  pushDown: pushTransitions.pushDown,

  // Glitch / Stylized (10)
  glitchCut: stylizedTransitions.glitchCut,
  shutterFlashCut: stylizedTransitions.shutterFlashCut,
  shatterDissolve: stylizedTransitions.shatterDissolve,
  splitReveal: stylizedTransitions.splitReveal,
  vhsStatic: stylizedTransitions.vhsStatic,
  scanlineWipe: stylizedTransitions.scanlineWipe,
  chromaticPulse: stylizedTransitions.chromaticPulse,
  pixelateDissolve: stylizedTransitions.pixelateDissolve,
  lightLeakTransition: stylizedTransitions.lightLeakTransition,
  filmBurnTransition: stylizedTransitions.filmBurnTransition,
};

export const TRANSITION_LIST = Object.values(TRANSITIONS);

