export type SlideTransitionId =
  | "slideFromLeft"
  | "slideFromRight"
  | "slideFromTop"
  | "slideFromBottom"
  | "slideFromTopLeft"
  | "slideFromTopRight"
  | "slideFromBottomLeft"
  | "slideFromBottomRight";

export type WipeTransitionId =
  | "wipeLeftToRight"
  | "wipeRightToLeft"
  | "wipeTopToBottom"
  | "wipeBottomToTop"
  | "wipeDiagonal"
  | "irisWipeExpand"
  | "irisWipeContract"
  | "clockWipe";

export type ZoomTransitionId =
  | "zoomInFade"
  | "zoomOutFade"
  | "kenBurnsPan"
  | "pushZoomOut";

export type Rotation3DTransitionId =
  | "cubeRotateLeft"
  | "cubeRotateRight"
  | "cubeRotateUp"
  | "cubeRotateDown"
  | "flipHorizontal"
  | "flipVertical"
  | "tiltInFromLeft"
  | "tiltInFromRight"
  | "pageCurl"
  | "pageCurlReverse"
  | "doorSwingOpen"
  | "foldReveal";

export type FadeTransitionId =
  | "crossfade"
  | "fadeThroughWhite"
  | "fadeThroughBlack"
  | "blurCrossfade";

export type PushTransitionId =
  | "pushLeft"
  | "pushRight"
  | "pushUp"
  | "pushDown";

export type StylizedTransitionId =
  | "glitchCut"
  | "shutterFlashCut"
  | "shatterDissolve"
  | "splitReveal"
  | "vhsStatic"
  | "scanlineWipe"
  | "chromaticPulse"
  | "pixelateDissolve"
  | "lightLeakTransition"
  | "filmBurnTransition";

export type TransitionId =
  | SlideTransitionId
  | WipeTransitionId
  | ZoomTransitionId
  | Rotation3DTransitionId
  | FadeTransitionId
  | PushTransitionId
  | StylizedTransitionId;

export type TransitionCategory =
  | "slides"
  | "wipes"
  | "zoom"
  | "rotation3d"
  | "fade"
  | "push"
  | "stylized";

export interface TransitionContext {
  width: number;
  height: number;
  isFirstPhotoInStop?: boolean;
  isLowEnd?: boolean;
  prevImg?: HTMLImageElement | null;
  currentImg?: HTMLImageElement | null;
}

export interface TransitionConfig {
  id: TransitionId;
  name: string;
  category: TransitionCategory;
  durationMs: number;
  weight: number; // 1 (rare/heavy) to 10 (frequent/clean)
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
  apply: (
    progress: number,
    target: HTMLElement | CanvasRenderingContext2D,
    context?: Partial<TransitionContext>
  ) => void;
}

export interface TransitionSelectionOptions {
  previousId?: TransitionId | null;
  isFirstPhotoInStop?: boolean;
  disableHeavy?: boolean;
  categoryWeights?: Partial<Record<TransitionCategory, number>>;
  allowedCategories?: TransitionCategory[];
  excludedIds?: TransitionId[];
}

