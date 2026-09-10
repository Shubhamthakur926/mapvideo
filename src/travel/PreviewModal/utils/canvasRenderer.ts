import type { Map as MapboxMap } from "mapbox-gl";
import type { Location } from "../../types";
import {
  COLLAGE_ENTRY_DURATION_MS,
  COLLAGE_ENTRY_VECTORS,
  COLLAGE_STAGGER_MS,
  SUMMARY_DURATION_MS,
  vehicleMarks,
} from "../constants/preview.constants";
import type { SummaryCardOptions } from "../types/preview.types";
import { getCollageColumns } from "./previewFormatters";

// Canvas drawing helper for rounded rectangles
export function drawRoundedRect(
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
export function drawRoundedImage(
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

export function drawBrandingCard(
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

export function drawTravelSummaryCard(options: SummaryCardOptions) {
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
export function drawPhotoCollage(
  ctx: CanvasRenderingContext2D,
  images: HTMLImageElement[],
  locationNames: string[],
  opacity: number,
  elapsedInCollage: number,
  _collageDuration: number,
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

export function drawRouteOverviewFrame(options: {
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

