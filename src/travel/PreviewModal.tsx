import { Download, Expand, Loader2, Pause, Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import type { Map as MapboxMap } from "mapbox-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { calculateDistanceKm, formatDistanceKm, MapboxGlobe, type MapboxGlobeHandle } from "./MapboxGlobe";
import { RouteOverviewMap, type RouteOverviewMapHandle } from "./RouteOverviewMap";
import { getLocationImages, getLocationVideo, type Location, type Transport } from "./types";
import { vehicleSvgTemplates } from "./Vehicle3D";
import "./map-video.css";
import "./video-controls.css";

const vehicleMarks: Record<Transport, string> = {
  car: "🚗",
  bike: "🏍️",
  flight: "✈️",
  train: "🚆",
  taxi: "🚕",
  bicycle: "🚲",
  bus: "🚌",
  walking: "🚶",
  ship: "🚢",
};

const BACKGROUND_MUSIC_URL = "/sounds/background.mp3";
const BACKGROUND_MUSIC_VOLUME = 0.6;
const BACKGROUND_MUSIC_DUCK_VOLUME = 0.15;
const BRAND_LOGO_URL = "/picture/App-logo.png";
const INTRO_VIDEO_URL = "/videos/intro.mp4";
const DEFAULT_INTRO_DURATION_MS = 6500;

// Stage Durations
const SUMMARY_DURATION_MS = 3600;
const OUTRO_DURATION_MS = 2500;
const FADE_TRANSITION_MS = 500;
const VEHICLE_LEG_DURATION_MS = 4000;
const PHOTO_DURATION_MS = 2000;
const PHOTO_TRANSITION_MS = 480;
const ROUTE_MAP_DURATION_MS = 3200;
const COLLAGE_DURATION_MS = 8000;
const COLLAGE_ENTRY_DURATION_MS = 800;
const COLLAGE_STAGGER_MS = 50;
const EXPORT_FRAME_RATE = 30;

const COLLAGE_ENTRY_VECTORS = [
  { x: -780, y: -640, rotate: -14 },
  { x: 0, y: -760, rotate: -8 },
  { x: 780, y: -640, rotate: 14 },
  { x: 860, y: 0, rotate: 10 },
  { x: 780, y: 640, rotate: -12 },
  { x: 0, y: 760, rotate: 8 },
  { x: -780, y: 640, rotate: 12 },
  { x: -860, y: 0, rotate: -10 },
] as const;

function getCollageColumns(imageCount: number) {
  if (imageCount <= 1) return 1;
  if (imageCount <= 4) return 2;
  if (imageCount <= 8) return 4;
  if (imageCount <= 12) return 4;
  return 5;
}

const audioBufferCache = new Map<string, Promise<AudioBuffer>>();

function getAudioBuffer(context: AudioContext, url: string): Promise<AudioBuffer> {
  let buffer = audioBufferCache.get(url);
  if (!buffer) {
    buffer = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load audio: ${url}`);
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data));
    buffer.catch(() => audioBufferCache.delete(url));
    audioBufferCache.set(url, buffer);
  }
  return buffer;
}

function playPreviewAudio(audio: HTMLAudioElement) {
  void audio.play().catch((error) => console.warn("Vehicle sound autoplay was blocked.", error));
}

const vehicleCanvasCache = new Map<Transport, HTMLCanvasElement>();

async function preloadVehicleImages(): Promise<Map<Transport, HTMLCanvasElement>> {
  const transports = Object.keys(vehicleSvgTemplates) as Transport[];
  await Promise.all(
    transports.map(
      (transport) =>
        new Promise<void>((resolve) => {
          if (vehicleCanvasCache.has(transport)) {
            resolve();
            return;
          }
          const rawSvg = vehicleSvgTemplates[transport];
          if (!rawSvg) {
            resolve();
            return;
          }
          let svgClean = rawSvg.trim();
          if (!svgClean.includes("xmlns=")) {
            svgClean = svgClean.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
          }

          // Extract viewBox dimensions to give the SVG concrete pixel width/height (avoid 0x0 naturalWidth in Chromium)
          const vbMatch = svgClean.match(
            /viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*["']/i
          );
          const vbWidth = vbMatch ? parseFloat(vbMatch[3]) : 100;
          const vbHeight = vbMatch ? parseFloat(vbMatch[4]) : 100;
          const targetSize = 256;
          const maxDim = Math.max(vbWidth, vbHeight, 1);
          const scale = targetSize / maxDim;
          const pixelWidth = Math.round(vbWidth * scale);
          const pixelHeight = Math.round(vbHeight * scale);

          // Replace width="..." and height="..." with concrete pixel dimensions
          svgClean = svgClean.replace(/<svg\b([^>]*)>/i, (_match, attrs) => {
            const cleaned = attrs
              .replace(/\bwidth=["'][^"']*["']/gi, "")
              .replace(/\bheight=["'][^"']*["']/gi, "")
              .trim();
            return `<svg ${cleaned} width="${pixelWidth}" height="${pixelHeight}">`;
          });

          let done = false;
          const finish = () => {
            if (!done) {
              done = true;
              resolve();
            }
          };
          const timer = setTimeout(finish, 1500);

          const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgClean)}`;
          const img = new Image();

          img.onload = () => {
            clearTimeout(timer);
            try {
              const cvs = document.createElement("canvas");
              cvs.width = pixelWidth;
              cvs.height = pixelHeight;
              const cctx = cvs.getContext("2d");
              if (cctx) {
                cctx.drawImage(img, 0, 0, pixelWidth, pixelHeight);
                vehicleCanvasCache.set(transport, cvs);
              }
            } catch (err) {
              console.warn("Could not bake vehicle to canvas:", transport, err);
            }
            finish();
          };

          img.onerror = (e) => {
            clearTimeout(timer);
            console.warn(`Failed to preload vehicle SVG for ${transport}:`, e);
            finish();
          };

          img.src = dataUrl;
        })
    )
  );
  return vehicleCanvasCache;
}

// Calculate smooth fade-in and fade-out opacity envelope (0 -> 1 -> 0)
function getFadeOpacity(
  elapsedInPhase: number,
  phaseDuration: number,
  fadeInDuration = FADE_TRANSITION_MS,
  fadeOutDuration = FADE_TRANSITION_MS
): number {
  if (elapsedInPhase < 0 || elapsedInPhase > phaseDuration) return 0;
  if (elapsedInPhase < fadeInDuration) {
    return Math.min(1, Math.max(0, elapsedInPhase / fadeInDuration));
  }
  const timeRemaining = phaseDuration - elapsedInPhase;
  if (timeRemaining < fadeOutDuration) {
    return Math.min(1, Math.max(0, timeRemaining / fadeOutDuration));
  }
  return 1;
}

type PhotoTransitionDirection = "left" | "right" | "top";

function getPhotoTransitionDirection(photoIndex: number): PhotoTransitionDirection {
  return (["left", "right", "top"] as const)[photoIndex % 3];
}

function getPhotoTransitionAnimation(photoIndex: number): string {
  const direction = getPhotoTransitionDirection(photoIndex);
  return `photoSlideFrom${direction[0].toUpperCase()}${direction.slice(1)} ${PHOTO_TRANSITION_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards`;
}

// Canvas drawing helper for rounded rectangles
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill?: string,
  stroke?: string,
  lineWidth = 1
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

// Canvas drawing helper for clipped rounded images
function drawRoundedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

function drawBrandingCard(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement | undefined,
  title: string,
  subtitle: string,
  opacity: number
) {
  if (opacity <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = "rgba(2, 12, 27, 0.92)";
  ctx.fillRect(0, 0, 1080, 1080);

  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = 28;
  drawRoundedRect(ctx, 290, 190, 500, 700, 36, "#ffffff");
  ctx.shadowBlur = 0;

  if (logo) {
    drawRoundedImage(ctx, logo, 350, 245, 380, 380, 26);
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#0f2d5c";
  ctx.font = "800 18px system-ui, sans-serif";
  ctx.fillText("BEFORE WE DIE", 540, 680);
  ctx.fillStyle = "#102a4f";
  ctx.font = "700 36px Georgia, serif";
  ctx.fillText(title, 540, 735);
  ctx.fillStyle = "#5b6b83";
  ctx.font = "600 17px system-ui, sans-serif";
  ctx.fillText(subtitle, 540, 785);
  ctx.restore();
}

interface SummaryCardOptions {
  ctx: CanvasRenderingContext2D;
  locations: Location[];
  legs: Transport[];
  totalTripDistance: string;
  preloadedImgs: Map<string, HTMLImageElement>;
  opacity: number;
  elapsedInSummary?: number;
  summaryDuration?: number;
}

function drawTravelSummaryCard(options: SummaryCardOptions) {
  const {
    ctx,
    locations,
    legs,
    totalTripDistance,
    preloadedImgs,
    opacity,
    elapsedInSummary = 0,
    summaryDuration = SUMMARY_DURATION_MS,
  } = options;
  const currentElapsed = elapsedInSummary;
  const currentDuration = summaryDuration;
  if (opacity <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = opacity;

  ctx.fillStyle = "rgba(2, 12, 27, 0.94)";
  ctx.fillRect(0, 0, 1080, 1080);

  ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
  ctx.shadowBlur = 36;
  drawRoundedRect(ctx, 60, 50, 960, 980, 32, "#ffffff");
  ctx.shadowBlur = 0;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#0284c7";
  ctx.font = "800 15px system-ui, sans-serif";
  ctx.fillText("✨ TRAVEL SUMMARY · ITINERARY RECAP", 540, 95);

  ctx.fillStyle = "#0f172a";
  ctx.font = "700 34px Georgia, serif";
  const startLoc = locations[0]?.name || "Start";
  const endLoc = locations[locations.length - 1]?.name || "Destination";
  ctx.fillText(`${startLoc} → ${endLoc}`, 540, 138);

  ctx.fillStyle = "#64748b";
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.fillText("Complete journey overview & route statistics", 540, 172);

  const statBoxY = 196;
  const statW = 205;
  const statH = 82;
  const statGap = 16;
  const statStartX = 540 - (4 * statW + 3 * statGap) / 2;

  const distinctTransports = Array.from(new Set(legs)).map((l) => vehicleMarks[l] || "✈️");

  const stats = [
    { label: "TOTAL DISTANCE", val: totalTripDistance, icon: "🌍" },
    { label: "DESTINATIONS", val: `${locations.length} Cities`, icon: "📍" },
    { label: "ROUTE LEGS", val: `${Math.max(1, locations.length - 1)} Legs`, icon: "🗺️" },
    { label: "TRANSPORTS", val: distinctTransports.join(" ") || "✈️", icon: "🚀" },
  ];

  stats.forEach((stat, idx) => {
    const sx = statStartX + idx * (statW + statGap);
    drawRoundedRect(ctx, sx, statBoxY, statW, statH, 16, "#f8fafc", "#e2e8f0", 1.5);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#0284c7";
    ctx.font = "800 11px system-ui, sans-serif";
    ctx.fillText(`${stat.icon} ${stat.label}`, sx + statW / 2, statBoxY + 26);
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 17px Georgia, serif";
    ctx.fillText(stat.val, sx + statW / 2, statBoxY + 54);
  });

  const stopsListY = 296;
  const stopsListH = 710;
  const headerH = 46;
  const clipY = stopsListY + headerH;
  const clipH = stopsListH - headerH - 14;

  drawRoundedRect(ctx, 90, stopsListY, 900, stopsListH, 22, "#f8fafc", "#e2e8f0", 1.5);

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#1e293b";
  ctx.font = "800 14px system-ui, sans-serif";
  ctx.fillText(`📍 ALL ${locations.length} DESTINATIONS & CONNECTING ROUTES`, 120, stopsListY + 24);

  const rowH = 68;
  const rowPadding = 8;
  const totalContentH = locations.length * rowH;
  const maxScroll = Math.max(0, totalContentH - clipH + 12);
  const scrollProgress = maxScroll > 0 ? Math.min(1, Math.max(0, (currentElapsed - 500) / (currentDuration - 1200))) : 0;
  const easeProgress = 0.5 - 0.5 * Math.cos(Math.PI * scrollProgress);
  const scrollY = easeProgress * maxScroll;

  ctx.save();
  ctx.beginPath();
  ctx.rect(90, clipY, 900, clipH);
  ctx.clip();

  locations.forEach((loc, i) => {
    const ry = clipY + i * rowH - scrollY;
    if (ry + rowH < clipY - 10 || ry > clipY + clipH + 10) return;

    const isFirst = i === 0;
    const isLast = i === locations.length - 1;

    drawRoundedRect(
      ctx,
      115,
      ry,
      850,
      rowH - rowPadding,
      14,
      "#ffffff",
      isLast ? "#86efac" : isFirst ? "#bae6fd" : "#e2e8f0",
      1.5
    );

    const circleSize = 30;
    const circleX = 130;
    const circleY = ry + (rowH - rowPadding - circleSize) / 2;
    const numColor = isLast ? "#16a34a" : isFirst ? "#0284c7" : "#475569";
    drawRoundedRect(ctx, circleX, circleY, circleSize, circleSize, 15, numColor);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 13px system-ui, sans-serif";
    ctx.fillText(`${i + 1}`, circleX + 15, circleY + 15);

    const img = preloadedImgs.get(loc.imageUrl || "");
    if (img) {
      drawRoundedImage(ctx, img, 172, ry + (rowH - rowPadding - 44) / 2, 54, 44, 8);
    }

    const textStartX = img ? 236 : 178;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 16px Georgia, serif";
    ctx.fillText(loc.name, textStartX, ry + 10);

    ctx.fillStyle = "#64748b";
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.fillText(`${loc.country} · ${loc.code}`, textStartX, ry + 32);

    const badgeW = 160;
    const badgeH = 28;
    const badgeX = 965 - 115 - badgeW;
    const badgeY = ry + (rowH - rowPadding - badgeH) / 2;

    if (i < locations.length - 1) {
      const legTransport = legs[i] || "flight";
      const tEmoji = vehicleMarks[legTransport] || "✈️";
      const tLabel = legTransport.toUpperCase();
      drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 14, "#e0f2fe", "#bae6fd", 1);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#0369a1";
      ctx.font = "800 11px system-ui, sans-serif";
      ctx.fillText(`${tEmoji} Next: ${tLabel}`, badgeX + badgeW / 2, badgeY + badgeH / 2);
    } else {
      drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 14, "#dcfce7", "#86efac", 1);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#15803d";
      ctx.font = "800 11px system-ui, sans-serif";
      ctx.fillText("🏁 Final Destination", badgeX + badgeW / 2, badgeY + badgeH / 2);
    }
  });

  ctx.restore();

  if (maxScroll > 0) {
    const topGrad = ctx.createLinearGradient(0, clipY, 0, clipY + 28);
    topGrad.addColorStop(0, "rgba(248, 250, 252, 0.96)");
    topGrad.addColorStop(1, "rgba(248, 250, 252, 0)");
    ctx.fillStyle = topGrad;
    ctx.fillRect(90, clipY, 900, 28);

    const btmGrad = ctx.createLinearGradient(0, clipY + clipH - 32, 0, clipY + clipH);
    btmGrad.addColorStop(0, "rgba(248, 250, 252, 0)");
    btmGrad.addColorStop(1, "rgba(248, 250, 252, 0.96)");
    ctx.fillStyle = btmGrad;
    ctx.fillRect(90, clipY + clipH - 32, 900, 32);
  }

  ctx.restore();
}

// Updated drawPhotoCollage function with proper parameters
function drawPhotoCollage(
  ctx: CanvasRenderingContext2D,
  images: HTMLImageElement[],
  locationNames: string[],
  opacity: number,
  elapsedInCollage: number,
  collageDuration: number,
  totalBatches: number,
  currentBatchIndex: number,
  batchTransitionProgress: number,
  totalLocations: number
) {
  if (opacity <= 0.001 || images.length === 0) return;
  
  const startIdx = 0;
  const endIdx = images.length;
  const batchImages = images;
  const batchNames = locationNames;
  
  if (batchImages.length === 0) return;
  
  const totalImages = batchImages.length;
  const padding = 54;
  const gap = 12;
  const headerHeight = 158;
  const footerHeight = 60;
  const gridWidth = 1080 - padding * 2;
  const gridHeight = 1080 - padding * 2 - headerHeight - footerHeight;
  const columns = getCollageColumns(totalImages);
  const gridRows = Math.ceil(totalImages / columns);
  const cell = Math.min(
    (gridWidth - gap * (columns - 1)) / columns,
    (gridHeight - gap * (gridRows - 1)) / gridRows
  );
  const gridContentWidth = cell * columns + gap * (columns - 1);
  const gridContentHeight = cell * gridRows + gap * (gridRows - 1);
  const gridStartX = padding + (gridWidth - gridContentWidth) / 2;
  const gridStartY = padding + headerHeight + (gridHeight - gridContentHeight) / 2;
  
  ctx.save();
  ctx.globalAlpha = opacity;
  
  // Background and a restrained colour wash for depth.
  ctx.fillStyle = "#07131f";
  ctx.fillRect(0, 0, 1080, 1080);
  const wash = ctx.createRadialGradient(950, 30, 0, 950, 30, 900);
  wash.addColorStop(0, "rgba(22, 97, 127, 0.32)");
  wash.addColorStop(1, "rgba(7, 19, 31, 0)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, 1080, 1080);
  
  // Header
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = "#38bdf8";
  ctx.font = "700 14px system-ui, sans-serif";
  ctx.fillText("📸 JOURNEY PHOTO COLLAGE", 540, 20);
  
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 34px Georgia, serif";
  const headerText = totalBatches > 1 ? `Moments ${startIdx + 1}–${endIdx}` : "The moments in between";
  ctx.fillText(headerText, 540, 44);
  
  // Subtitle
  ctx.fillStyle = "#94a3b8";
  ctx.font = "500 13px system-ui, sans-serif";
  const subtitleText = totalBatches > 1 
    ? `Showing ${startIdx + 1}-${Math.min(endIdx, images.length)} of ${images.length} memories`
    : `${images.length} memories captured · ${totalLocations} destinations`;
  ctx.fillText(subtitleText, 540, 72);
  
  // Batch indicator dots
  if (totalBatches > 1) {
    const dotSize = 8;
    const dotGap = 12;
    const totalDotsWidth = totalBatches * (dotSize + dotGap) - dotGap;
    const dotsStartX = 540 - totalDotsWidth / 2;
    const dotsY = 96;
    
    for (let i = 0; i < totalBatches; i++) {
      const isActive = i === currentBatchIndex;
      const dotX = dotsStartX + i * (dotSize + dotGap);
      ctx.beginPath();
      ctx.arc(dotX, dotsY, isActive ? dotSize : dotSize * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? "#38bdf8" : "rgba(56, 189, 248, 0.3)";
      ctx.fill();
      if (isActive) {
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }
  
  // Draw images with proper spacing
  const transitionProgress = batchTransitionProgress;
  
  batchImages.forEach((img, idx) => {
    if (idx >= totalImages) return;
    
    const col = idx % columns;
    const row = Math.floor(idx / columns);
    const finalWidth = cell;
    const finalHeight = cell;
    const x = gridStartX + col * (cell + gap);
    const y = gridStartY + row * (cell + gap);
    
    // Staggered animation capped so all photos complete entry promptly
    const staggerDelay = Math.min(idx * COLLAGE_STAGGER_MS, 2000);
    const progress = Math.max(0, Math.min(1, (elapsedInCollage - staggerDelay) / COLLAGE_ENTRY_DURATION_MS));
    const entry = COLLAGE_ENTRY_VECTORS[idx % COLLAGE_ENTRY_VECTORS.length];
    const scale = 0.72 + 0.28 * progress;
    const alpha = progress;
    
    if (alpha <= 0) return;
    
    ctx.save();
    
    // Apply batch transition effects
    let finalAlpha = opacity * alpha;
    let finalScale = scale;
    
    if (transitionProgress > 0 && transitionProgress < 1) {
      if (transitionProgress < 0.5) {
        finalAlpha = finalAlpha * (1 - transitionProgress * 2);
      } else {
        finalAlpha = finalAlpha * ((transitionProgress - 0.5) * 2);
        finalScale = scale * (0.8 + 0.2 * ((transitionProgress - 0.5) * 2));
      }
    }
    
    if (finalAlpha <= 0) {
      ctx.restore();
      return;
    }
    
    ctx.globalAlpha = finalAlpha;
    
    // Calculate position with scaling
    const scaledW = finalWidth * finalScale;
    const scaledH = finalHeight * finalScale;
    const offsetX = (finalWidth - scaledW) / 2;
    const offsetY = (finalHeight - scaledH) / 2;
    const drawX = x + offsetX + entry.x * (1 - progress);
    const drawY = y + offsetY + entry.y * (1 - progress);
    
    // Shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.48)";
    ctx.shadowBlur = 18;
    
    // Draw rounded image
    drawRoundedImage(ctx, img, drawX, drawY, scaledW, scaledH, 16);
    
    // Location label
    if (batchNames[idx]) {
      ctx.shadowBlur = 0;
      const labelHeight = 36;
      const labelY = drawY + scaledH - labelHeight;
      const gradient = ctx.createLinearGradient(0, labelY - 16, 0, labelY + labelHeight + 4);
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, "rgba(0,0,0,0.75)");
      ctx.fillStyle = gradient;
      ctx.fillRect(drawX, labelY - 16, scaledW, labelHeight + 20);
      
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.font = "700 12px system-ui, sans-serif";
      ctx.fillText(batchNames[idx] || "", drawX + 16, drawY + scaledH - 12);
    }
    
    ctx.restore();
  });
  
  // Bottom gradient fade
  const btmGrad = ctx.createLinearGradient(0, 1040, 0, 1080);
  btmGrad.addColorStop(0, "rgba(2, 12, 27, 0)");
  btmGrad.addColorStop(1, "rgba(2, 12, 27, 0.9)");
  ctx.fillStyle = btmGrad;
  ctx.fillRect(0, 1040, 1080, 40);
  
  ctx.restore();
}

function drawRouteOverviewFrame(options: {
  ctx: CanvasRenderingContext2D;
  routeCanvas: HTMLCanvasElement | null;
  routeMap: MapboxMap | null;
  locations: Location[];
  opacity: number;
  totalTripDistance: string;
}) {
  const { ctx, routeCanvas, routeMap, locations, opacity, totalTripDistance } = options;
  if (opacity <= 0.001 || locations.length === 0) return;

  try {
    ctx.save();
    ctx.globalAlpha = opacity;

    if (routeCanvas && routeCanvas.width > 0 && routeCanvas.height > 0) {
      ctx.drawImage(routeCanvas, 0, 0, 1080, 1080);
    } else {
      ctx.fillStyle = "#eef6ff";
      ctx.fillRect(0, 0, 1080, 1080);
    }

    const topGrad = ctx.createLinearGradient(0, 0, 0, 160);
    topGrad.addColorStop(0, "rgba(0,0,0,0.65)");
    topGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, 1080, 160);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#38bdf8";
    ctx.font = "800 15px system-ui, sans-serif";
    ctx.fillText("🗺️ FULL ROUTE OVERVIEW", 540, 40);

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 30px Georgia, serif";
    ctx.fillText(`${locations[0]?.name ?? "Start"} → ${locations.at(-1)?.name ?? "Destination"}`, 540, 78);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.fillText(`Complete 2D route map · ${totalTripDistance} travelled`, 540, 110);

    if (routeMap) {
      const canvasEl = routeMap.getCanvas();
      const clientW = canvasEl?.clientWidth || canvasEl?.width || 1;
      const clientH = canvasEl?.clientHeight || canvasEl?.height || 1;
      const scaleX = 1080 / clientW;
      const scaleY = 1080 / clientH;

      locations.forEach((loc, i) => {
        const isFirst = i === 0;
        const isLast = i === locations.length - 1;
        const p = routeMap.project([loc.lng, loc.lat]);
        if (!p || typeof p.x !== "number" || typeof p.y !== "number" || Number.isNaN(p.x) || Number.isNaN(p.y)) return;
        const px = p.x * scaleX;
        const py = p.y * scaleY;

        if (!isFirst && !isLast) {
          ctx.beginPath();
          ctx.arc(px, py, 8, 0, Math.PI * 2);
          ctx.fillStyle = "#64748b";
          ctx.fill();
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();
          ctx.fillStyle = "#ffffff";
          ctx.font = "700 10px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(`${i + 1}`, px, py + 0.5);
          return;
        }

        ctx.font = "28px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(isFirst ? "🚩" : "🏁", px, py - 14);

        const label = loc.name;
        ctx.font = "800 13px system-ui, sans-serif";
        const labelW = ctx.measureText(label).width + 20;
        const labelY = py + 26;
        drawRoundedRect(ctx, px - labelW / 2, labelY, labelW, 24, 12, isFirst ? "#0284c7" : "#16a34a");
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, px, labelY + 12);
      });
    }

    const btmGrad = ctx.createLinearGradient(0, 940, 0, 1080);
    btmGrad.addColorStop(0, "rgba(0,0,0,0)");
    btmGrad.addColorStop(1, "rgba(0,0,0,0.65)");
    ctx.fillStyle = btmGrad;
    ctx.fillRect(0, 940, 1080, 140);

    ctx.font = "700 15px system-ui, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.fillText(`🚩 Start: ${locations[0]?.name}`, 60, 1005);
    ctx.textAlign = "right";
    ctx.fillText(`🏁 Finish: ${locations.at(-1)?.name}`, 1020, 1005);

    ctx.restore();
  } catch (err) {
    console.warn("drawRouteOverviewFrame error:", err);
    ctx.restore();
  }
}

async function preloadImages(urls: string[]): Promise<Map<string, HTMLImageElement>> {
  const map = new Map<string, HTMLImageElement>();
  await Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          if (!url) {
            resolve();
            return;
          }
          let done = false;
          const finish = () => {
            if (!done) {
              done = true;
              resolve();
            }
          };
          const timer = setTimeout(finish, 2500);
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            clearTimeout(timer);
            map.set(url, img);
            finish();
          };
          img.onerror = () => {
            clearTimeout(timer);
            finish();
          };
          img.src = url;
        })
    )
  );
  return map;
}

async function preloadVideos(urls: string[]): Promise<Map<string, HTMLVideoElement>> {
  const videos = new Map<string, HTMLVideoElement>();
  await Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          let done = false;
          const finish = () => {
            if (!done) {
              done = true;
              resolve();
            }
          };
          const timer = setTimeout(finish, 3000);
          const video = document.createElement("video");
          video.crossOrigin = "anonymous";
          video.preload = "auto";
          video.muted = true;
          video.playsInline = true;
          video.oncanplay = () => {
            clearTimeout(timer);
            videos.set(url, video);
            finish();
          };
          video.onerror = () => {
            clearTimeout(timer);
            finish();
          };
          video.src = url;
          video.load();
        })
    )
  );
  return videos;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export function PreviewModal({
  locations,
  legs,
  onClose,
  autoRecord = false,
  duration = 20,
}: {
  locations: Location[];
  legs: Transport[];
  onClose: () => void;
  autoRecord?: boolean;
  duration?: number;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const routeOverviewRef = useRef<RouteOverviewMapHandle>(null);
  const mapboxGlobeRef = useRef<MapboxGlobeHandle>(null);
  const [playing, setPlaying] = useState(true);
  const [timelineElapsed, setTimelineElapsed] = useState(0);
  const [restartKey, setRestartKey] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  const [unavailableVideos, setUnavailableVideos] = useState<string[]>([]);
  const [clipDurations, setClipDurations] = useState<Record<string, number>>({});
  const [introDurationMs, setIntroDurationMs] = useState<number>(DEFAULT_INTRO_DURATION_MS);
  const introVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const media = document.createElement("video");
    media.preload = "metadata";
    media.src = INTRO_VIDEO_URL;
    const updateDuration = () => {
      if (Number.isFinite(media.duration) && media.duration > 0) {
        setIntroDurationMs(Math.round(media.duration * 1000));
      }
    };
    media.addEventListener("loadedmetadata", updateDuration);
    media.load();
    return () => {
      media.removeEventListener("loadedmetadata", updateDuration);
      media.removeAttribute("src");
      media.load();
    };
  }, []);

  const INTRO_DURATION_MS = introDurationMs;

  // Collect all unique photos from all locations
  const allPhotos = useMemo(() => {
    const photoMap = new Map<string, { url: string; locationName: string }>();
    locations.forEach((loc) => {
      const images = getLocationImages(loc);
      if (loc.imageUrl) {
        photoMap.set(loc.imageUrl, { url: loc.imageUrl, locationName: loc.name });
      }
      images.forEach((img) => {
        photoMap.set(img, { url: img, locationName: loc.name });
      });
    });
    return Array.from(photoMap.values());
  }, [locations]);

  // Keep the entire trip together in one final memory wall.
  const totalBatches = allPhotos.length > 0 ? 1 : 0;
  const COLLAGE_TOTAL_DURATION = allPhotos.length > 0 ? COLLAGE_DURATION_MS : 0;

  useEffect(() => {
    const clips = locations
      .map(getLocationVideo)
      .filter((clip): clip is { url: string; duration?: number; credit?: string } => clip !== null);
    const cleanups = clips.map((clip) => {
      const media = document.createElement("video");
      media.preload = "metadata";
      media.src = clip.url;
      const updateDuration = () => {
        if (Number.isFinite(media.duration) && media.duration > 0) {
          setClipDurations((current) =>
            current[clip.url] === media.duration ? current : { ...current, [clip.url]: media.duration }
          );
        }
      };
      media.addEventListener("loadedmetadata", updateDuration);
      media.load();
      return () => {
        media.removeEventListener("loadedmetadata", updateDuration);
        media.removeAttribute("src");
        media.load();
      };
    });
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [locations]);

  const totalLegs = Math.max(1, locations.length - 1);
  const legSchedule = useMemo(
    () =>
      locations.slice(1).map((stop, index) => {
        const images = getLocationImages(stop);
        const video = getLocationVideo(stop);
        const photoCount = Math.max(1, images.length);
        const videoDurationMs = video ? (clipDurations[video.url] ?? video.duration ?? 5) * 1000 : 0;
        const photosDurationMs = photoCount * PHOTO_DURATION_MS;
        return {
          index,
          stop,
          images,
          video,
          photoCount,
          videoDurationMs,
          photosDurationMs,
          duration: VEHICLE_LEG_DURATION_MS + videoDurationMs + photosDurationMs,
        };
      }),
    [locations, clipDurations]
  );
  const totalJourneyDuration = legSchedule.reduce((total, leg) => total + leg.duration, 0);
  const totalPlaybackDuration =
    INTRO_DURATION_MS + totalJourneyDuration + ROUTE_MAP_DURATION_MS + SUMMARY_DURATION_MS + COLLAGE_TOTAL_DURATION + OUTRO_DURATION_MS;
  const effectiveDurationSec = totalPlaybackDuration / 1000;

  const journeyStartTime = INTRO_DURATION_MS;
  const routeMapStartTime = journeyStartTime + totalJourneyDuration;
  const summaryStartTime = routeMapStartTime + ROUTE_MAP_DURATION_MS;
  const collageStartTime = summaryStartTime + SUMMARY_DURATION_MS;
  const outroStartTime = collageStartTime + COLLAGE_TOTAL_DURATION;

  const isIntro = timelineElapsed < journeyStartTime;
  const isJourney = timelineElapsed >= journeyStartTime && timelineElapsed < routeMapStartTime;
  const isRouteMap = timelineElapsed >= routeMapStartTime && timelineElapsed < summaryStartTime;
  const isSummary = timelineElapsed >= summaryStartTime && timelineElapsed < collageStartTime;
  const isCollage = timelineElapsed >= collageStartTime && timelineElapsed < outroStartTime;
  const isOutro = timelineElapsed >= outroStartTime;

  // The single collage is held on screen as one complete set of memories.
  const collageElapsed = Math.max(0, timelineElapsed - collageStartTime);
  const currentBatchIndex = 0;
  const batchTransitionProgress = 0;

  const introOpacity = isIntro ? getFadeOpacity(timelineElapsed, INTRO_DURATION_MS, 0, 400) : 0;
  const routeMapOpacity = isRouteMap ? getFadeOpacity(timelineElapsed - routeMapStartTime, ROUTE_MAP_DURATION_MS) : 0;
  const summaryOpacity = isSummary ? getFadeOpacity(timelineElapsed - summaryStartTime, SUMMARY_DURATION_MS) : 0;
  const collageOpacity = isCollage ? getFadeOpacity(collageElapsed, COLLAGE_TOTAL_DURATION) : 0;
  const outroOpacity = isOutro ? getFadeOpacity(timelineElapsed - outroStartTime, OUTRO_DURATION_MS) : 0;

  const journeyElapsed = Math.min(totalJourneyDuration, Math.max(0, timelineElapsed - journeyStartTime));
  const internalProgress = totalJourneyDuration > 0 ? (journeyElapsed / totalJourneyDuration) * 100 : 0;

  let scheduleOffset = 0;
  let activeSchedule = legSchedule.at(-1);
  let elapsedInLeg = 0;
  for (const schedule of legSchedule) {
    if (journeyElapsed < scheduleOffset + schedule.duration) {
      activeSchedule = schedule;
      elapsedInLeg = journeyElapsed - scheduleOffset;
      break;
    }
    scheduleOffset += schedule.duration;
  }
  const currentLegIndex = activeSchedule?.index ?? 0;
  const destination = activeSchedule?.stop ?? locations.at(-1)!;
  const isArrivalPhase = elapsedInLeg >= VEHICLE_LEG_DURATION_MS;
  const videoDurationMs = activeSchedule?.videoDurationMs ?? 0;
  const isVideoScheduled = isArrivalPhase && videoDurationMs > 0 && (elapsedInLeg - VEHICLE_LEG_DURATION_MS < videoDurationMs);
  const isVideoShowcase = isVideoScheduled && Boolean(activeSchedule?.video) && !unavailableVideos.includes(activeSchedule?.video?.url ?? "");
  const isPhotoShowcase = isArrivalPhase && (!isVideoShowcase || !activeSchedule?.video);
  const isMediaShowcase = isArrivalPhase;
  const arrivalMediaDuration = Math.max(0, (activeSchedule?.duration ?? VEHICLE_LEG_DURATION_MS) - VEHICLE_LEG_DURATION_MS);
  const arrivalMediaOpacity = isArrivalPhase
    ? getFadeOpacity(elapsedInLeg - VEHICLE_LEG_DURATION_MS, arrivalMediaDuration, FADE_TRANSITION_MS, FADE_TRANSITION_MS)
    : 0;
  const travelProgress = Math.min(1, elapsedInLeg / VEHICLE_LEG_DURATION_MS);
  const photoElapsedInLeg = Math.max(0, elapsedInLeg - VEHICLE_LEG_DURATION_MS - videoDurationMs);
  const photoIndex = isPhotoShowcase
    ? Math.min(Math.max(0, (activeSchedule?.photoCount ?? 1) - 1), Math.floor(photoElapsedInLeg / PHOTO_DURATION_MS))
    : 0;
  const activePhotoUrl = activeSchedule?.images[photoIndex] || destination?.imageUrl || "";
  const mapProgress = Math.min(
    1,
    (currentLegIndex + (isMediaShowcase ? 0.999999 : travelProgress * 0.55)) / totalLegs
  );

  const totalTripDistance = useMemo(
    () =>
      formatDistanceKm(
        locations.slice(1).reduce(
          (total, dest, index) => total + calculateDistanceKm(locations[index], dest),
          0
        )
      ),
    [locations]
  );

  const elapsedSec = Math.min(effectiveDurationSec, Math.floor((internalProgress / 100) * effectiveDurationSec));
  const journeyIsPlaying = playing && isJourney;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !recording) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, recording]);

  useEffect(() => {
    if (!playing || recording) return;
    const intervalMs = 30;
    const timer = window.setInterval(() => {
      setTimelineElapsed((value) => Math.min(totalPlaybackDuration, value + intervalMs));
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [playing, totalPlaybackDuration, recording]);

  useEffect(() => {
    if (playing && !recording && timelineElapsed >= totalPlaybackDuration) {
      setPlaying(false);
    }
  }, [playing, recording, timelineElapsed, totalPlaybackDuration]);

  useEffect(() => {
    if (recording) return;

    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    audio.loop = true;
    audio.muted = muted;

    // Only duck volume if an actual video showcase is playing; during photos keep full music volume
    const targetVolume = isVideoShowcase ? BACKGROUND_MUSIC_DUCK_VOLUME : BACKGROUND_MUSIC_VOLUME;
    audio.volume = muted ? 0 : targetVolume;

    const musicUrl = new URL(BACKGROUND_MUSIC_URL, window.location.href).href;
    if (audio.src !== musicUrl) {
      audio.src = BACKGROUND_MUSIC_URL;
      audio.currentTime = 0;
      audio.load();
    }

    if (playing && !isIntro) {
      playPreviewAudio(audio);
    } else {
      audio.pause();
    }
  }, [playing, isIntro, isVideoShowcase, muted, recording]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
      if (audio) {
        audio.removeAttribute("src");
        audio.load();
      }
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playing && isVideoShowcase) {
      void video.play().catch((error) => console.warn("Destination video could not start.", error));
    } else {
      video.pause();
    }
  }, [playing, isVideoShowcase, restartKey, muted]);

  useEffect(() => {
    const video = introVideoRef.current;
    if (!video) return;

    if (playing && isIntro) {
      void video.play().catch((error) => console.warn("Intro video could not start.", error));
    } else {
      video.pause();
    }
  }, [playing, isIntro, restartKey, muted]);

  useEffect(() => {
    const video = introVideoRef.current;
    if (!video || !isIntro) return;
    const targetTime = timelineElapsed / 1000;
    if (Math.abs(video.currentTime - targetTime) > 0.3) {
      video.currentTime = targetTime;
    }
  }, [timelineElapsed, isIntro]);

  const restart = () => {
    if (recording) return;
    audioRef.current?.pause();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.load();
    }
    if (introVideoRef.current) {
      introVideoRef.current.currentTime = 0;
    }
    setTimelineElapsed(0);
    setRestartKey((value) => value + 1);
    setPlaying(true);
  };

  const togglePlayback = () => {
    if (recording) return;
    if (playing) {
      setPlaying(false);
      audioRef.current?.pause();
    } else {
      if (timelineElapsed >= totalPlaybackDuration) setTimelineElapsed(0);
      setPlaying(true);
    }
  };

  const fullscreen = () => frame.current?.requestFullscreen?.().catch(() => undefined);

  const startDownloadRecording = async () => {
    if (locations.length < 2 || recording) return;

    if (!window.MediaRecorder) {
      alert("This browser does not support video downloads.");
      return;
    }

    try {
      setRecording(true);
      setRecordProgress(0);
      setTimelineElapsed(0);
      setPlaying(false);
      audioRef.current?.pause();

      let mapCanvas =
        frame.current?.querySelector<HTMLCanvasElement>(".mapboxgl-canvas") ||
        mapboxGlobeRef.current?.getMap()?.getCanvas() ||
        document.querySelector<HTMLCanvasElement>(".mapboxgl-canvas");

      if (!mapCanvas) {
        for (let i = 0; i < 25; i++) {
          await new Promise((r) => setTimeout(r, 100));
          mapCanvas =
            frame.current?.querySelector<HTMLCanvasElement>(".mapboxgl-canvas") ||
            mapboxGlobeRef.current?.getMap()?.getCanvas() ||
            document.querySelector<HTMLCanvasElement>(".mapboxgl-canvas");
          if (mapCanvas) break;
        }
      }

      if (!mapCanvas) {
        alert("Map is initializing. Please wait a moment and try again.");
        setRecording(false);
        setPlaying(true);
        return;
      }

      const allPhotoUrls = [
        ...locations.flatMap((loc) => [loc.imageUrl || "", ...getLocationImages(loc)]),
        BRAND_LOGO_URL,
      ];
      const preloadedImgs = await preloadImages(allPhotoUrls.filter(Boolean));
      const preloadedVehicles = await preloadVehicleImages();
      const preloadedVideos = await preloadVideos([
        INTRO_VIDEO_URL,
        ...legSchedule.flatMap((schedule) => (schedule.video ? [schedule.video.url] : []))
      ]);
      let activeExportVideoUrl: string | null = null;

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      setRecording(false);
      setPlaying(true);
      return;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const canvasStream = canvas.captureStream(EXPORT_FRAME_RATE);
    const audioContext = new AudioContext();
    const audioDestination = audioContext.createMediaStreamDestination();
    let audioStartTime = 0;
    await audioContext.resume();

    const arrivalWindows: { start: number; end: number; hasVideo: boolean; videoUrl?: string }[] = [];
    legSchedule.forEach((schedule, index) => {
      const legStart = INTRO_DURATION_MS + legSchedule.slice(0, index).reduce((sum, leg) => sum + leg.duration, 0);
      const arrivalStart = legStart + VEHICLE_LEG_DURATION_MS;
      const arrivalEnd = legStart + schedule.duration;
      arrivalWindows.push({
        start: arrivalStart,
        end: arrivalEnd,
        hasVideo: Boolean(schedule.video),
        videoUrl: schedule.video?.url,
      });
    });

    const videoWindows = arrivalWindows.filter(
      (w): w is { start: number; end: number; hasVideo: boolean; videoUrl: string } =>
        Boolean(w.hasVideo && w.videoUrl)
    );

    const audioBuffers = new Map<string, AudioBuffer>();
    await Promise.all(
      [BACKGROUND_MUSIC_URL, INTRO_VIDEO_URL, ...videoWindows.map((window) => window.videoUrl)].map(async (url) => {
        try {
          audioBuffers.set(url, await getAudioBuffer(audioContext, url));
        } catch (error) {
          console.warn(`Unable to prepare audio for ${url}.`, error);
        }
      })
    );
    audioStartTime = audioContext.currentTime + 0.08;

    const music = audioBuffers.get(BACKGROUND_MUSIC_URL);
    if (music) {
      const source = audioContext.createBufferSource();
      const gain = audioContext.createGain();
      source.buffer = music;
      source.loop = true;
      source.connect(gain).connect(audioDestination);

      const musicStart = audioStartTime + INTRO_DURATION_MS / 1000;
      const musicEnd = audioStartTime + totalPlaybackDuration / 1000;
      gain.gain.setValueAtTime(BACKGROUND_MUSIC_VOLUME, musicStart);
      // Only duck background music when an actual video clip with audio is playing; photos keep full music volume
      for (const w of videoWindows) {
        const duckAt = audioStartTime + w.start / 1000;
        const restoreAt = audioStartTime + w.end / 1000;
        gain.gain.setValueAtTime(BACKGROUND_MUSIC_VOLUME, Math.max(musicStart, duckAt - 0.08));
        gain.gain.linearRampToValueAtTime(BACKGROUND_MUSIC_DUCK_VOLUME, duckAt);
        gain.gain.setValueAtTime(BACKGROUND_MUSIC_DUCK_VOLUME, Math.max(duckAt, restoreAt - 0.08));
        gain.gain.linearRampToValueAtTime(BACKGROUND_MUSIC_VOLUME, restoreAt);
      }
      gain.gain.setValueAtTime(BACKGROUND_MUSIC_VOLUME, musicEnd - 0.4);
      gain.gain.linearRampToValueAtTime(0, musicEnd);
      source.start(musicStart);
      source.stop(musicEnd);
    }
    const introAudio = audioBuffers.get(INTRO_VIDEO_URL);
    if (introAudio) {
      const source = audioContext.createBufferSource();
      source.buffer = introAudio;
      source.connect(audioDestination);
      source.start(audioStartTime);
      source.stop(audioStartTime + INTRO_DURATION_MS / 1000);
    }
    for (const window of videoWindows) {
      const clipAudio = audioBuffers.get(window.videoUrl);
      if (!clipAudio) continue;
      const source = audioContext.createBufferSource();
      source.buffer = clipAudio;
      source.connect(audioDestination);
      source.start(audioStartTime + window.start / 1000);
      source.stop(audioStartTime + window.end / 1000);
    }

    const mime =
      ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((type) =>
        MediaRecorder.isTypeSupported(type)
      ) ?? "video/webm";
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioDestination.stream.getAudioTracks(),
    ]);
    const recorder = new MediaRecorder(combinedStream, {
      mimeType: mime,
      videoBitsPerSecond: 14000000,
    });
    const chunks: BlobPart[] = [];

    const videoPromise = new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
      recorder.onerror = () => reject(new Error("Video rendering failed."));
    });

    recorder.start();

    const length = totalPlaybackDuration;
    const started = performance.now();
    const frameInterval = 1000 / EXPORT_FRAME_RATE;
    let lastRenderedAt = started - frameInterval;

    await new Promise<void>((resolve) => {
      const anim = (now: number) => {
        const elapsed = now - started;

        if (elapsed < length && now - lastRenderedAt < frameInterval) {
          requestAnimationFrame(anim);
          return;
        }
        lastRenderedAt = now;

        setTimelineElapsed(Math.min(elapsed, length));
        setRecordProgress(Math.min(100, Math.round((elapsed / length) * 100)));

        const recJourneyElapsed = Math.min(totalJourneyDuration, Math.max(0, elapsed - journeyStartTime));
        const currentP = totalJourneyDuration > 0 ? recJourneyElapsed / totalJourneyDuration : 0;
        let recOffset = 0;
        let recSchedule = legSchedule.at(-1);
        let recElapsedInLeg = 0;
        for (const schedule of legSchedule) {
          if (recJourneyElapsed < recOffset + schedule.duration) {
            recSchedule = schedule;
            recElapsedInLeg = recJourneyElapsed - recOffset;
            break;
          }
          recOffset += schedule.duration;
        }
        const legIdx = recSchedule?.index ?? 0;
        const isArrival = recElapsedInLeg >= VEHICLE_LEG_DURATION_MS;
        const curTransport = legs[legIdx] ?? "flight";
        const vehicleMark = vehicleMarks[curTransport] ?? "✈️";
        const arrivalStop = recSchedule?.stop || locations[locations.length - 1];
        const arrivalImages = recSchedule?.images || getLocationImages(arrivalStop);
        const totalPhotos = Math.max(1, recSchedule?.photoCount ?? arrivalImages.length);
        const recVideoDurationMs = recSchedule?.videoDurationMs ?? 0;
        const recArrivalElapsed = Math.max(0, recElapsedInLeg - VEHICLE_LEG_DURATION_MS);
        const isRecVideoActive = isArrival && recVideoDurationMs > 0 && (recArrivalElapsed < recVideoDurationMs);
        const recVideo = isRecVideoActive && recSchedule?.video ? recSchedule.video : null;
        const isRecPhotoPhase = isArrival && (!recSchedule?.video || recArrivalElapsed >= recVideoDurationMs);
        const recPhotoElapsed = isRecPhotoPhase ? Math.max(0, recArrivalElapsed - recVideoDurationMs) : 0;
        const recArrivalDuration = Math.max(0, (recSchedule?.duration ?? VEHICLE_LEG_DURATION_MS) - VEHICLE_LEG_DURATION_MS);
        const recArrivalOpacity = isArrival
          ? getFadeOpacity(recElapsedInLeg - VEHICLE_LEG_DURATION_MS, recArrivalDuration, FADE_TRANSITION_MS, FADE_TRANSITION_MS)
          : 0;
        const isRecIntro = elapsed < INTRO_DURATION_MS;
        const introExportVideo = preloadedVideos.get(INTRO_VIDEO_URL);
        const currentActiveVideoUrl = isRecIntro ? INTRO_VIDEO_URL : (recVideo?.url ?? null);
        const currentActiveVideo = isRecIntro ? introExportVideo : (recVideo ? preloadedVideos.get(recVideo.url) : undefined);

        if (currentActiveVideoUrl !== activeExportVideoUrl) {
          if (activeExportVideoUrl) preloadedVideos.get(activeExportVideoUrl)?.pause();
          activeExportVideoUrl = currentActiveVideoUrl;
          if (currentActiveVideo) {
            currentActiveVideo.currentTime = isRecIntro ? elapsed / 1000 : 0;
            currentActiveVideo.playbackRate = 1;
            void currentActiveVideo.play().catch(() => undefined);
          }
        }
        if (isRecIntro && introExportVideo) {
          const targetSec = elapsed / 1000;
          if (Math.abs(introExportVideo.currentTime - targetSec) > 0.25) {
            introExportVideo.currentTime = targetSec;
          }
        }
        const exportVideo = !isRecIntro && recVideo ? preloadedVideos.get(recVideo.url) : undefined;
        const photoIdx = isRecPhotoPhase
          ? Math.min(totalPhotos - 1, Math.floor(recPhotoElapsed / PHOTO_DURATION_MS))
          : 0;
        const curSec = Math.floor(elapsed / 1000);

        const recCollageElapsed = Math.max(0, elapsed - collageStartTime);
        const recCurrentBatchIndex = 0;
        const recBatchTransitionProgress = 0;

        const activeMap = frame.current?.querySelector<HTMLCanvasElement>(".mapboxgl-canvas") || mapCanvas;
        if (activeMap && activeMap.width > 0 && activeMap.height > 0) {
          ctx.drawImage(activeMap, 0, 0, 1080, 1080);
        } else {
          ctx.fillStyle = "#030e18";
          ctx.fillRect(0, 0, 1080, 1080);
        }

        if (!isArrival && elapsed >= journeyStartTime && elapsed < routeMapStartTime) {
          const globeHandle = mapboxGlobeRef.current;
          const liveMap = globeHandle?.getMap();
          const vehicleState = globeHandle?.getVehicleState();

          // Compute screen position: use live projected coordinate if available
          let screenX = 540;
          let screenY = 540;
          let vehicleAngle = 0;

          if (liveMap && vehicleState?.point) {
            try {
              const proj = liveMap.project([vehicleState.point.lng, vehicleState.point.lat]);
              if (proj && Number.isFinite(proj.x) && Number.isFinite(proj.y)) {
                const mapEl = liveMap.getCanvas();
                const scaleX = 1080 / (mapEl?.clientWidth || 1080);
                const scaleY = 1080 / (mapEl?.clientHeight || 1080);
                screenX = proj.x * scaleX;
                screenY = proj.y * scaleY;
              }
            } catch {
              // fallback to center
            }
          }

          if (vehicleState) {
            vehicleAngle = vehicleState.screenBearing ?? vehicleState.bearing ?? 0;
          }

          ctx.save();

          // Draw High-Quality 3D Vehicle SVG Model (only vehicle, no circle background, no outline)
          const vehicleCanvas =
            preloadedVehicles.get(curTransport) ||
            preloadedVehicles.get("flight") ||
            vehicleCanvasCache.get(curTransport) ||
            vehicleCanvasCache.get("flight");

          if (vehicleCanvas && vehicleCanvas.width > 0 && vehicleCanvas.height > 0) {
            const aspect = vehicleCanvas.height / vehicleCanvas.width;
            const baseSize =
              curTransport === "flight" ? 76 : curTransport === "ship" ? 72 : curTransport === "train" ? 72 : 62;
            const vWidth = baseSize;
            const vHeight = baseSize * aspect;

            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate((vehicleAngle * Math.PI) / 180);
            ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
            ctx.shadowBlur = 14;
            ctx.drawImage(vehicleCanvas, -vWidth / 2, -vHeight / 2, vWidth, vHeight);
            ctx.restore();
          } else {
            // Modern sleek 3D directional arrow fallback (never the old emoji circle)
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate((vehicleAngle * Math.PI) / 180);
            ctx.beginPath();
            ctx.moveTo(0, -28);
            ctx.lineTo(18, 20);
            ctx.lineTo(0, 10);
            ctx.lineTo(-18, 20);
            ctx.closePath();
            ctx.fillStyle = "#38bdf8";
            ctx.shadowColor = "rgba(56, 189, 248, 0.8)";
            ctx.shadowBlur = 16;
            ctx.fill();
            ctx.restore();
          }

          const destNameText = `📍 Next: ${arrivalStop.name} (${arrivalStop.code})`;
          ctx.font = "700 15px system-ui, -apple-system, sans-serif";
          const textWidth = ctx.measureText(destNameText).width;
          const pillWidth = textWidth + 32;
          const pillY = Math.max(70, screenY - 56);

          drawRoundedRect(
            ctx,
            screenX - pillWidth / 2,
            pillY,
            pillWidth,
            36,
            18,
            "rgba(3, 16, 29, 0.95)",
            "#38bdf8",
            2
          );

          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(destNameText, screenX, pillY + 18);
          ctx.restore();
        }

        if (elapsed >= journeyStartTime && elapsed < routeMapStartTime) {
          drawRoundedRect(ctx, 40, 40, 460, 110, 22, "rgba(3, 16, 29, 0.95)", "rgba(56, 189, 248, 0.75)", 2);

          const bannerImg = preloadedImgs.get(arrivalStop?.imageUrl || "");
          if (bannerImg) {
            drawRoundedImage(ctx, bannerImg, 56, 56, 76, 76, 14);
          }

          ctx.save();
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          ctx.fillStyle = "#38bdf8";
          ctx.font = "800 13px system-ui, sans-serif";
          ctx.fillText(
            isArrival
              ? `🎉 ARRIVED · STOP ${legIdx + 2} OF ${totalLegs + 1}`
              : `🎯 EN ROUTE · STOP ${legIdx + 2} OF ${totalLegs + 1}`,
            146,
            56
          );

          ctx.fillStyle = "#ffffff";
          ctx.font = "700 24px Georgia, serif";
          ctx.shadowColor = "rgba(0,0,0,0.9)";
          ctx.shadowBlur = 8;
          ctx.fillText(arrivalStop?.name || "Destination", 146, 76);
          ctx.shadowBlur = 0;

          ctx.fillStyle = "#94a3b8";
          ctx.font = "700 13px system-ui, sans-serif";
          ctx.fillText(`${arrivalStop?.country || ""} · ${arrivalStop?.code || ""}`, 146, 108);
          ctx.restore();
        }

        if (isArrival && arrivalStop && elapsed >= journeyStartTime && elapsed < routeMapStartTime) {
          ctx.save();
          ctx.globalAlpha = recArrivalOpacity;

          if (recVideo && exportVideo && exportVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const popMs = 400;
            const t = Math.min(1, Math.max(0, recArrivalElapsed / popMs));
            const c1 = 1.35;
            const c3 = c1 + 1;
            const springEased = t === 1 ? 1 : 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
            const scale = 0.35 + 0.65 * springEased;
            const dw = 1080 * scale, dh = 1080 * scale;
            const dx = (1080 - dw) / 2, dy = (1080 - dh) / 2;
            ctx.drawImage(exportVideo, dx, dy, dw, dh);
          } else {
            const activePhotoUrl = arrivalImages[photoIdx] || arrivalStop.imageUrl || "";
            const activeImg = preloadedImgs.get(activePhotoUrl);
            const photoElapsed = recPhotoElapsed - photoIdx * PHOTO_DURATION_MS;

            const transitionProgress = Math.min(1, Math.max(0, photoElapsed / PHOTO_TRANSITION_MS));
            const easedProgress = 1 - Math.pow(1 - transitionProgress, 3);
            const transitionDirection = getPhotoTransitionDirection(photoIdx);
            const dx = transitionDirection === "left" ? -1080 * (1 - easedProgress) : transitionDirection === "right" ? 1080 * (1 - easedProgress) : 0;
            const dy = transitionDirection === "top" ? -1080 * (1 - easedProgress) : 0;

            if (photoIdx > 0 && photoElapsed < PHOTO_TRANSITION_MS) {
              const prevPhotoUrl = arrivalImages[photoIdx - 1] || "";
              const prevImg = preloadedImgs.get(prevPhotoUrl);
              if (prevImg) {
                ctx.drawImage(prevImg, 0, 0, 1080, 1080);
              }
            }

            if (activeImg) {
              ctx.drawImage(activeImg, dx, dy, 1080, 1080);
            } else {
              ctx.fillStyle = "#030e18";
              ctx.fillRect(0, 0, 1080, 1080);
            }

            if (photoElapsed < 100) {
              const flashAlpha = (1 - photoElapsed / 100) * 0.35;
              ctx.save();
              ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
              ctx.fillRect(0, 0, 1080, 1080);
              ctx.restore();
            }
          }

          const gradient = ctx.createLinearGradient(0, 800, 0, 1080);
          gradient.addColorStop(0, "rgba(3, 16, 29, 0)");
          gradient.addColorStop(1, "rgba(3, 16, 29, 0.88)");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 800, 1080, 280);

          ctx.textAlign = "left";
          ctx.textBaseline = "alphabetic";
          ctx.fillStyle = "#38bdf8";
          ctx.font = "800 15px system-ui, sans-serif";
          ctx.fillText(`✨ ARRIVED · STOP ${legIdx + 2} OF ${totalLegs + 1}`, 60, 905);

          ctx.fillStyle = "#ffffff";
          ctx.font = "700 46px Georgia, serif";
          ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
          ctx.shadowBlur = 14;
          ctx.fillText(arrivalStop.name, 60, 962);
          ctx.shadowBlur = 0;

          ctx.fillStyle = "#d9f4ff";
          ctx.font = "700 19px system-ui, sans-serif";
          ctx.fillText(
            recVideo
              ? `${arrivalStop.country} · Travel video`
              : `${arrivalStop.country} · Photo ${photoIdx + 1} of ${totalPhotos}`,
            60,
            996
          );

          ctx.restore();
        }

        if (elapsed >= journeyStartTime && elapsed < routeMapStartTime) {
          ctx.save();
          ctx.textAlign = "center";
          ctx.textBaseline = "alphabetic";
          ctx.fillStyle = "#ffffff";
          ctx.font = "700 30px Georgia, serif";
          ctx.shadowColor = "rgba(0,0,0,0.9)";
          ctx.shadowBlur = 16;
          ctx.fillText(
            `${locations[0].name} → ${locations[locations.length - 1].name} · ${totalTripDistance} total`,
            540,
            995
          );

          ctx.fillStyle = "#38bdf8";
          ctx.font = "700 15px system-ui, sans-serif";
          ctx.fillText(
            `${formatTime(curSec)} / ${formatTime(effectiveDurationSec)} · 1080p HD ${EXPORT_FRAME_RATE}FPS STORY`,
            540,
            1028
          );
          ctx.shadowBlur = 0;

          ctx.fillStyle = "rgba(255,255,255,0.2)";
          ctx.fillRect(60, 1052, 960, 4);
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(60, 1052, 960 * currentP, 4);
          ctx.restore();
        }

        if (elapsed < INTRO_DURATION_MS) {
          const introFade = getFadeOpacity(elapsed, INTRO_DURATION_MS, 0, 300);
          ctx.save();
          ctx.fillStyle = "#030e18";
          ctx.fillRect(0, 0, 1080, 1080);
          if (introExportVideo && introExportVideo.readyState >= 2) {
            ctx.globalAlpha = introFade;
            const vw = introExportVideo.videoWidth || 1280;
            const vh = introExportVideo.videoHeight || 720;
            const scale = Math.max(1080 / vw, 1080 / vh);
            const dw = vw * scale;
            const dh = vh * scale;
            const dx = (1080 - dw) / 2;
            const dy = (1080 - dh) / 2;
            ctx.drawImage(introExportVideo, dx, dy, dw, dh);
          }
          ctx.restore();
        }

        if (elapsed >= routeMapStartTime && elapsed < summaryStartTime) {
          const routeFade = getFadeOpacity(elapsed - routeMapStartTime, ROUTE_MAP_DURATION_MS);
          const routeMap = routeOverviewRef.current?.getMap() ?? null;
          const routeCanvas =
            frame.current?.querySelector<HTMLCanvasElement>(".route-overview-map .mapboxgl-canvas") ?? null;
          drawRouteOverviewFrame({
            ctx,
            routeCanvas,
            routeMap,
            locations,
            opacity: routeFade,
            totalTripDistance,
          });
        }

        if (elapsed >= summaryStartTime && elapsed < collageStartTime) {
          const sumFade = getFadeOpacity(elapsed - summaryStartTime, SUMMARY_DURATION_MS);
          drawTravelSummaryCard({
            ctx,
            locations,
            legs,
            totalTripDistance,
            preloadedImgs,
            opacity: sumFade,
            elapsedInSummary: elapsed - summaryStartTime,
            summaryDuration: SUMMARY_DURATION_MS,
          });
        }

        // Photo Collage with batching - FIXED with totalLocations parameter
        if (elapsed >= collageStartTime && elapsed < outroStartTime) {
          const collageElapsed = elapsed - collageStartTime;
          const collageFade = getFadeOpacity(collageElapsed, COLLAGE_TOTAL_DURATION);
          
          const collageImages: HTMLImageElement[] = [];
          const collageNames: string[] = [];
          
          allPhotos.forEach(({ url, locationName }) => {
            const img = preloadedImgs.get(url);
            if (img) {
              collageImages.push(img);
              collageNames.push(locationName);
            }
          });
          
          drawPhotoCollage(
            ctx,
            collageImages,
            collageNames,
            collageFade,
            collageElapsed,
            COLLAGE_DURATION_MS,
            totalBatches,
            recCurrentBatchIndex,
            recBatchTransitionProgress,
            locations.length // This was missing - now fixed
          );
        }

        if (elapsed >= outroStartTime) {
          const outroFade = getFadeOpacity(elapsed - outroStartTime, OUTRO_DURATION_MS);
          drawBrandingCard(
            ctx,
            preloadedImgs.get(BRAND_LOGO_URL),
            "Journey complete",
            "Thanks for travelling with us",
            outroFade
          );
        }

        if (elapsed < length) {
          requestAnimationFrame(anim);
        } else {
          recorder.stop();
          resolve();
        }
      };
      requestAnimationFrame(anim);
    });

    let blob: Blob;
    try {
      blob = await videoPromise;
    } finally {
      canvasStream.getTracks().forEach((track) => track.stop());
      audioDestination.stream.getTracks().forEach((track) => track.stop());
      await audioContext.close();
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const startName = locations[0]?.name ? locations[0].name.toLowerCase().replace(/\s+/g, "-") : "start";
    const endName = locations[locations.length - 1]?.name
      ? locations[locations.length - 1].name.toLowerCase().replace(/\s+/g, "-")
      : "end";
    link.download = `before-we-die-${startName}-to-${endName}-1080p-journey.${mime.startsWith("video/mp4") ? "mp4" : "webm"}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);

      setRecording(false);
      setPlaying(false);
    } catch (error) {
      console.error("Recording failed:", error);
      alert("Failed to export video. " + (error instanceof Error ? error.message : ""));
      setRecording(false);
      setPlaying(true);
    }
  };

  useEffect(() => {
    if (autoRecord && !recording) {
      const timer = window.setTimeout(() => {
        startDownloadRecording();
      }, 500);
      return () => window.clearTimeout(timer);
    }
  }, [autoRecord]);

  return (
    <div
      className="modal map-video-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Route video preview"
      onClick={() => !recording && onClose()}
    >
      <div className="map-video" ref={frame} onClick={(e) => e.stopPropagation()}>
        {!recording && (
          <button
            className="close-video-button"
            aria-label="Close video preview"
            title="Close video (Esc)"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        )}

        {recording && (
          <div
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "rgba(220, 38, 38, 0.92)",
              backdropFilter: "blur(12px)",
              border: "1.5px solid #ef4444",
              borderRadius: "20px",
              padding: "6px 14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 800,
              zIndex: 110,
              boxShadow: "0 0 20px rgba(239, 68, 68, 0.6)",
              letterSpacing: "0.05em",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#ffffff",
                boxShadow: "0 0 8px #ffffff",
                animation: "pulse 1s infinite",
              }}
            />
            RECORDING HD VIDEO ({recordProgress}%)
          </div>
        )}

        {!isCollage && (
          <MapboxGlobe
            ref={mapboxGlobeRef}
            isRecording={recording}
            key={restartKey}
            locations={locations}
            legs={legs}
            progress={mapProgress}
            activeLocation={destination}
            playing={journeyIsPlaying || recording}
            className="map-video-globe"
            hideOverlays
            showVehicle={!isMediaShowcase}
          />
        )}

        {isJourney && isPhotoShowcase && !isVideoShowcase && (
          <section
            className="arrival-photo-fullscreen"
            style={{ opacity: arrivalMediaOpacity }}
            aria-label={`${destination.name} travel photo`}
          >
            <div className="micro-flash-overlay" key={`flash-${currentLegIndex}-${photoIndex}`} />
            {(activeSchedule?.images.length ? activeSchedule.images : [destination.imageUrl || ""]).map((url, idx) => {
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
                    animation: isCurrent ? getPhotoTransitionAnimation(photoIndex) : "none",
                  }}
                />
              );
            })}
            <div className="arrival-photo-caption" style={{ position: "relative", zIndex: 3 }}>
              <span>ARRIVED · STOP {currentLegIndex + 2} OF {totalLegs + 1}</span>
              <h2>{destination.name}</h2>
              <p>
                {destination.country} · Photo {photoIndex + 1} of {activeSchedule?.photoCount ?? 1} · 2 seconds
              </p>
            </div>
          </section>
        )}

        {isJourney && isVideoShowcase && activeSchedule?.video && (
          <section
            className="arrival-video-fullscreen"
            style={{ opacity: arrivalMediaOpacity }}
            aria-label={`${destination.name} travel video`}
          >
            <div className="micro-flash-overlay" key={`flash-${currentLegIndex}`} />
            {activePhotoUrl ? (
              <img
                src={activePhotoUrl}
                alt={`${destination.name} travel moment`}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "brightness(0.55) saturate(0.8)",
                  zIndex: 0,
                }}
              />
            ) : null}
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
              onError={() =>
                setUnavailableVideos((current) =>
                  current.includes(activeSchedule.video!.url) ? current : [...current, activeSchedule.video!.url]
                )
              }
            />
            <div className="arrival-photo-caption" style={{ position: "relative", zIndex: 2 }}>
              <span>{muted ? "TRAVEL VIDEO · TAP SOUND FOR ORIGINAL AUDIO" : "TRAVEL VIDEO · ORIGINAL AUDIO"}</span>
              <h2>{destination.name}</h2>
              <p>{destination.country}</p>
              {activeSchedule.video.credit && <small className="video-credit">{activeSchedule.video.credit}</small>}
            </div>
          </section>
        )}

        {isIntro && (
          <section
            className="intro-video-fullscreen"
            style={{ opacity: introOpacity, transition: "opacity 0.05s linear" }}
            aria-label="Journey intro video"
          >
            <video
              ref={introVideoRef}
              src={INTRO_VIDEO_URL}
              autoPlay
              playsInline
              muted={muted}
            />
          </section>
        )}

        <div
          className="video-summary-card"
          style={{
            opacity: routeMapOpacity,
            transition: "opacity 0.05s linear",
            pointerEvents: isRouteMap ? "auto" : "none",
            zIndex: isRouteMap ? 20 : -1,
            padding: 0,
            background: "transparent",
            backdropFilter: "none",
          }}
          aria-live="polite"
          aria-hidden={!isRouteMap}
        >
          <div style={{ position: "absolute", inset: 0 }}>
            <RouteOverviewMap ref={routeOverviewRef} locations={locations} />
          </div>

          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              textAlign: "center",
              padding: "24px 20px 36px",
              background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)",
              zIndex: 2,
              pointerEvents: "none",
            }}
          >
            <span
              className="summary-pill"
              style={{
                background: "rgba(2, 132, 199, 0.9)",
                color: "#ffffff",
                border: "1px solid rgba(56, 189, 248, 0.5)",
              }}
            >
              🗺️ ROUTE OVERVIEW
            </span>
            <h2
              style={{
                color: "#ffffff",
                margin: "8px 0 2px",
                font: "700 clamp(22px, 3.5vw, 30px) Georgia, serif",
                textShadow: "0 2px 10px rgba(0,0,0,0.8)",
              }}
            >
              {locations[0]?.name} → {locations.at(-1)?.name}
            </h2>
            <p
              style={{
                color: "#e2e8f0",
                margin: 0,
                fontSize: "14px",
                fontWeight: 600,
                textShadow: "0 1px 8px rgba(0,0,0,0.8)",
              }}
            >
              Complete 2D route map · {totalTripDistance} travelled
            </p>
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "space-between",
              padding: "36px 24px 20px",
              background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              zIndex: 2,
              pointerEvents: "none",
              textShadow: "0 1px 8px rgba(0,0,0,0.8)",
            }}
          >
            <span>
              🚩 Start: <strong>{locations[0]?.name}</strong>
            </span>
            <span>
              🏁 Finish: <strong>{locations.at(-1)?.name}</strong>
            </span>
          </div>
        </div>

        {isSummary && (
          <div
            className="video-summary-card"
            style={{ opacity: summaryOpacity, transition: "opacity 0.05s linear" }}
            aria-live="polite"
          >
            <div className="video-summary-content">
              <div className="video-summary-header">
                <span className="summary-pill">✨ TRAVEL SUMMARY</span>
                <h2>
                  {locations[0]?.name} → {locations[locations.length - 1]?.name}
                </h2>
                <p>Complete trip recap & itinerary statistics</p>
              </div>

              <div className="summary-stats-grid">
                <div className="summary-stat-box">
                  <span className="stat-label">🌍 TOTAL DISTANCE</span>
                  <strong className="stat-value">{totalTripDistance}</strong>
                </div>
                <div className="summary-stat-box">
                  <span className="stat-label">📍 DESTINATIONS</span>
                  <strong className="stat-value">{locations.length} Cities</strong>
                </div>
                <div className="summary-stat-box">
                  <span className="stat-label">🗺️ ROUTE LEGS</span>
                  <strong className="stat-value">{Math.max(1, locations.length - 1)} Legs</strong>
                </div>
                <div className="summary-stat-box">
                  <span className="stat-label">🚀 TRANSPORTS</span>
                  <strong className="stat-value">
                    {Array.from(new Set(legs)).map((l) => vehicleMarks[l] || "✈️").join(" ") || "✈️"}
                  </strong>
                </div>
              </div>

              <div className="summary-stops-list">
                <div className="stops-list-title">📍 ITINERARY STOPS & CONNECTING LEGS</div>
                <div className="stops-scrollable">
                  {locations.map((loc, idx) => (
                    <div key={loc.id || idx} className="summary-stop-item">
                      <div className={`stop-index-circle ${idx === locations.length - 1 ? "final" : idx === 0 ? "start" : ""}`}>
                        {idx + 1}
                      </div>
                      {loc.imageUrl && (
                        <img src={loc.imageUrl} alt={loc.name} className="summary-stop-thumb" />
                      )}
                      <div className="summary-stop-info">
                        <strong>{loc.name}</strong>
                        <small>{loc.country} · {loc.code}</small>
                      </div>
                      {idx < locations.length - 1 ? (
                        <div className="summary-leg-badge">
                          <span>{vehicleMarks[legs[idx] || "flight"]} Next: {(legs[idx] || "flight").toUpperCase()}</span>
                        </div>
                      ) : (
                        <div className="summary-leg-badge final-badge">
                          <span>🏁 Final Stop</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Photo Collage Section with Batching */}
        {isCollage && (
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
              overflow: "hidden"
            }}
            aria-live="polite"
          >
            <div className="collage-header" style={{ 
              width: "100%", 
              maxWidth: "900px",
              textAlign: "center",
              marginBottom: "16px",
              zIndex: 2,
              flexShrink: 0
            }}>
              <span style={{
                color: "#38bdf8",
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase"
              }}>
                📸 JOURNEY PHOTO COLLAGE
              </span>
              <h2 className="collage-title" style={{
                color: "#ffffff",
                fontSize: "24px",
                fontWeight: 700,
                margin: "6px 0 2px",
                fontFamily: "Georgia, serif"
              }}>
                {'All Travel Memories'}
              </h2>
              <p className="collage-subtitle" style={{
                color: "#94a3b8",
                fontSize: "13px",
                fontWeight: 500,
                margin: "4px 0 8px"
              }}>
                {`${allPhotos.length} memories · ${locations.length} destinations · one journey`}
              </p>
              
              {/* Batch indicator dots */}
              {totalBatches > 1 && (
                <div style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "8px",
                  marginTop: "8px"
                }}>
                  {Array.from({ length: totalBatches }).map((_, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: idx === currentBatchIndex ? "24px" : "8px",
                        height: "8px",
                        borderRadius: "4px",
                        background: idx === currentBatchIndex ? "#38bdf8" : "rgba(56, 189, 248, 0.3)",
                        transition: "all 0.3s ease",
                        boxShadow: idx === currentBatchIndex ? "0 0 12px rgba(56, 189, 248, 0.5)" : "none"
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="collage-grid" style={{
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
              zIndex: 2
            }}>
              {allPhotos.map(({ url, locationName }, idx) => {
                const staggerDelay = Math.min(idx * COLLAGE_STAGGER_MS, 2000);
                const progress = Math.max(0, Math.min(1, (collageElapsed - staggerDelay) / COLLAGE_ENTRY_DURATION_MS));
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
                      border: "1px solid rgba(255,255,255,0.12)"
                    }}
                  >
                    <img
                      src={url}
                      alt={locationName}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block"
                      }}
                      loading="lazy"
                    />
                    <div className="collage-caption"
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
                        fontFamily: "system-ui, sans-serif"
                      }}
                    >
                      {locationName}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="collage-footer" style={{
              marginTop: "12px",
              color: "#64748b",
              fontSize: "12px",
              fontWeight: 400,
              textAlign: "center",
              zIndex: 2,
              letterSpacing: "0.03em",
              flexShrink: 0
            }}>
              ✨ Every moment captured along the journey
            </div>
          </div>
        )}

        {isOutro && (
          <div
            className="video-branding-card"
            style={{ opacity: outroOpacity, transition: "opacity 0.05s linear" }}
            aria-live="polite"
          >
            <div className="video-branding-content">
              <img src={BRAND_LOGO_URL} alt="Roamly Studio logo" />
              <span>Before We Die</span>
              <strong>Journey complete</strong>
              <small>Thanks for travelling with us</small>
            </div>
          </div>
        )}

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
                      ? `Photo Collage · ${totalBatches > 1 ? `Batch ${currentBatchIndex + 1}/${totalBatches}` : `${allPhotos.length} Photos`}`
                      : isOutro
                        ? "Outro · Journey Complete"
                        : `${formatTime(elapsedSec)} / ${formatTime(effectiveDurationSec)} · Stop ${currentLegIndex + 1} of ${totalLegs} · ${destination.name}`}
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
      </div>
    </div>
  );
}
