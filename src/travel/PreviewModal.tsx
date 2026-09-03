import { Download, Expand, Loader2, Pause, Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { calculateBearing, calculateDistanceKm, formatDistanceKm, getLegCoordinates, getPointAlongPolyline, MapboxGlobe } from "./MapboxGlobe";
import { getLocationImages, getLocationVideo, type Location, type Transport } from "./types";
import { drawRealisticVehicleOnCanvas, getCachedVehicleImage, getVehicleName } from "./vehicleRender";
import "./map-video.css";
import "./video-controls.css";

const BACKGROUND_MUSIC_URL = "/sounds/background.mp3";
const BACKGROUND_MUSIC_VOLUME = 0.6;
const BRAND_LOGO_URL = "/picture/App-logo.png";

// Stage Durations (Relaxed, smooth cinematic pacing)
const INTRO_DURATION_MS = 3000;
const SUMMARY_DURATION_MS = 4500;
const OUTRO_DURATION_MS = 3000;
const FADE_TRANSITION_MS = 600;
const VEHICLE_LEG_DURATION_MS = 6500; // 6.5s per leg: smooth, clearly visible vehicle travel
const PHOTO_DURATION_MS = 3000; // 3.0s per destination photo: comfortable landmark showcase
const EXPORT_FRAME_RATE = 30;

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
  ctx.fillText("ROAMLY STUDIO", 540, 680);
  ctx.fillStyle = "#102a4f";
  ctx.font = "700 36px Georgia, serif";
  ctx.fillText(title, 540, 735);
  ctx.fillStyle = "#5b6b83";
  ctx.font = "600 17px system-ui, sans-serif";
  ctx.fillText(subtitle, 540, 785);
  ctx.restore();
}

function drawTravelSummaryCard(
  ctx: CanvasRenderingContext2D,
  locations: Location[],
  legs: Transport[],
  totalTripDistance: string,
  preloadedImgs: Map<string, HTMLImageElement>,
  opacity: number
) {
  if (opacity <= 0.001) return;
  ctx.save();
  ctx.globalAlpha = opacity;

  // Dark background overlay
  ctx.fillStyle = "rgba(2, 12, 27, 0.94)";
  ctx.fillRect(0, 0, 1080, 1080);

  // Main container card
  ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
  ctx.shadowBlur = 36;
  drawRoundedRect(ctx, 60, 60, 960, 960, 32, "#ffffff");
  ctx.shadowBlur = 0;

  // Header Title
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#0284c7";
  ctx.font = "800 15px system-ui, sans-serif";
  ctx.fillText("✨ TRAVEL SUMMARY · ITINERARY RECAP", 540, 115);

  ctx.fillStyle = "#0f172a";
  ctx.font = "700 36px Georgia, serif";
  const startLoc = locations[0]?.name || "Start";
  const endLoc = locations[locations.length - 1]?.name || "Destination";
  ctx.fillText(`${startLoc} → ${endLoc}`, 540, 160);

  ctx.fillStyle = "#64748b";
  ctx.font = "600 15px system-ui, sans-serif";
  ctx.fillText("Complete journey overview & route statistics", 540, 198);

  // 4 Key Statistics Cards in a grid row
  const statBoxY = 230;
  const statW = 205;
  const statH = 88;
  const statGap = 16;
  const statStartX = 540 - (4 * statW + 3 * statGap) / 2;

  const distinctTransports = Array.from(new Set(legs)).map(getVehicleName);

  const stats = [
    { label: "TOTAL DISTANCE", val: totalTripDistance, icon: "🌍" },
    { label: "DESTINATIONS", val: `${locations.length} Cities`, icon: "📍" },
    { label: "ROUTE LEGS", val: `${Math.max(1, locations.length - 1)} Legs`, icon: "🗺️" },
    { label: "TRANSPORTS", val: distinctTransports.join(" · ") || "Flight", icon: "🚀" },
  ];

  stats.forEach((stat, idx) => {
    const sx = statStartX + idx * (statW + statGap);
    drawRoundedRect(ctx, sx, statBoxY, statW, statH, 16, "#f8fafc", "#e2e8f0", 1.5);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#0284c7";
    ctx.font = "800 11px system-ui, sans-serif";
    ctx.fillText(`${stat.icon} ${stat.label}`, sx + statW / 2, statBoxY + 28);
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 18px Georgia, serif";
    ctx.fillText(stat.val, sx + statW / 2, statBoxY + 58);
  });

  // Stops list container - DYNAMIC height based on number of locations
  const stopsListY = 338;
  const maxStopsListH = 645;

  // Calculate how many stops can fit with adaptive row height
  const headerHeight = 45;
  const minRowHeight = 52;
  const maxRowHeight = 84;

  // Calculate optimal row height based on number of locations
  const availableHeight = maxStopsListH - headerHeight - 10;
  const calculatedRowH = Math.min(maxRowHeight, Math.max(minRowHeight, availableHeight / locations.length));
  const totalStopsHeight = Math.min(maxStopsListH, headerHeight + 10 + (locations.length * calculatedRowH));

  drawRoundedRect(ctx, 90, stopsListY, 900, totalStopsHeight, 22, "#f8fafc", "#e2e8f0", 1.5);

  ctx.textAlign = "left";
  ctx.fillStyle = "#1e293b";
  ctx.font = "800 14px system-ui, sans-serif";
  ctx.fillText(`📍 ALL ${locations.length} DESTINATIONS & CONNECTING ROUTES`, 120, stopsListY + 32);

  // Render ALL stops with adaptive sizing
  const displayStops = locations; // Show ALL locations
  const availableRowHeight = totalStopsHeight - headerHeight - 10;
  const rowH = Math.min(maxRowHeight, Math.max(minRowHeight, availableRowHeight / displayStops.length));
  const startRowY = stopsListY + 55;

  displayStops.forEach((loc, i) => {
    const ry = startRowY + i * rowH;
    const isFirst = i === 0;
    const isLast = i === locations.length - 1;

    // Row card with reduced padding for many stops
    const rowPadding = locations.length > 10 ? 4 : 8;
    drawRoundedRect(ctx, 115, ry, 850, rowH - rowPadding, 14, "#ffffff", isLast ? "#86efac" : isFirst ? "#bae6fd" : "#e2e8f0", 1.5);

    // Stop number circle - adaptive size
    const circleSize = locations.length > 12 ? 24 : locations.length > 8 ? 28 : 34;
    const circleX = 130;
    const circleY = ry + (rowH - rowPadding - circleSize) / 2;
    const numColor = isLast ? "#16a34a" : isFirst ? "#0284c7" : "#475569";
    drawRoundedRect(ctx, circleX, circleY, circleSize, circleSize, circleSize / 2, numColor);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    const circleFontSize = locations.length > 12 ? 9 : locations.length > 8 ? 11 : 14;
    ctx.font = `800 ${circleFontSize}px system-ui, sans-serif`;
    ctx.fillText(`${i + 1}`, circleX + circleSize / 2, circleY + circleSize / 2);

    // Stop thumbnail image - adaptive size
    const img = preloadedImgs.get(loc.imageUrl || "");
    const thumbSize = locations.length > 12 ? 32 : locations.length > 8 ? 40 : 48;
    if (img) {
      drawRoundedImage(ctx, img, 178, ry + (rowH - rowPadding - thumbSize) / 2, thumbSize, thumbSize, 6);
    }

    // Stop Name & Country - adaptive font sizes
    const textStartX = img ? 178 + thumbSize + 10 : 180;
    const nameFontSize = locations.length > 12 ? 12 : locations.length > 8 ? 14 : 17;
    const countryFontSize = locations.length > 12 ? 9 : locations.length > 8 ? 10 : 12;

    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#0f172a";
    ctx.font = `700 ${nameFontSize}px system-ui, sans-serif`;

    // Truncate long names to prevent overflow
    const maxNameWidth = locations.length > 12 ? 120 : 200;
    let displayName = loc.name;
    if (ctx.measureText(displayName).width > maxNameWidth) {
      while (ctx.measureText(displayName + "...").width > maxNameWidth && displayName.length > 1) {
        displayName = displayName.slice(0, -1);
      }
      displayName += "...";
    }
    ctx.fillText(displayName, textStartX, ry + 6);

    ctx.fillStyle = "#64748b";
    ctx.font = `600 ${countryFontSize}px system-ui, sans-serif`;
    ctx.fillText(`${loc.country} · ${loc.code}`, textStartX, ry + 6 + nameFontSize + 2);

    // Connecting Transport or Arrival badge - adaptive size
    const badgeWidth = locations.length > 12 ? 120 : locations.length > 8 ? 150 : 175;
    const badgeHeight = locations.length > 12 ? 20 : locations.length > 8 ? 24 : 28;
    const badgeFontSize = locations.length > 12 ? 8 : locations.length > 8 ? 9 : 11;
    const badgeX = 950 - badgeWidth - 20;

    if (i < locations.length - 1) {
      const legTransport = legs[i] || "flight";
      const tLabel = getVehicleName(legTransport).toUpperCase();
      drawRoundedRect(ctx, badgeX, ry + (rowH - rowPadding - badgeHeight) / 2, badgeWidth, badgeHeight, 12, "#e0f2fe", "#bae6fd", 1);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#0369a1";
      ctx.font = `800 ${badgeFontSize}px system-ui, sans-serif`;
      const badgeText = locations.length > 12 ? tLabel : `NEXT: ${tLabel}`;
      ctx.fillText(badgeText, badgeX + badgeWidth / 2, ry + (rowH - rowPadding) / 2);
    } else {
      drawRoundedRect(ctx, badgeX, ry + (rowH - rowPadding - badgeHeight) / 2, badgeWidth, badgeHeight, 12, "#dcfce7", "#86efac", 1);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#15803d";
      ctx.font = `800 ${badgeFontSize}px system-ui, sans-serif`;
      ctx.fillText("🏁 Final", badgeX + badgeWidth / 2, ry + (rowH - rowPadding) / 2);
    }
  });

  ctx.restore();
}

// Preload images into memory for smooth video generation
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
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            map.set(url, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = url;
        })
    )
  );
  return map;
}

// The export canvas can only draw media that has finished loading. Wikimedia
// serves these clips with CORS headers, so the rendered download stays usable.
async function preloadVideos(urls: string[]): Promise<Map<string, HTMLVideoElement>> {
  const videos = new Map<string, HTMLVideoElement>();
  await Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const video = document.createElement("video");
          video.crossOrigin = "anonymous";
          video.preload = "auto";
          video.muted = true;
          video.playsInline = true;
          video.oncanplay = () => {
            videos.set(url, video);
            resolve();
          };
          video.onerror = () => resolve();
          video.src = url;
          video.load();
        })
    )
  );
  return videos;
}

// Helper to format seconds as M:SS (e.g. 0:45, 2:00, 3:30)
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
  const [playing, setPlaying] = useState(true);
  const [timelineElapsed, setTimelineElapsed] = useState(0);
  const [restartKey, setRestartKey] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  const [unavailableVideos, setUnavailableVideos] = useState<string[]>([]);
  const [clipDurations, setClipDurations] = useState<Record<string, number>>({});

  // Start loading the realistic vector vehicle assets before recording, so
  // the first frame of every transport leg is sharp in the exported video.
  useEffect(() => {
    Array.from(new Set(legs)).forEach((transport) => getCachedVehicleImage(transport));
  }, [legs]);

  // Use each file's intrinsic duration. A fixed duration would either cut the
  // clip short or make it play at the wrong speed.
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
        return {
          index,
          stop,
          images,
          video,
          photoCount,
          // A destination clip replaces the still-photo section. This makes the
          // travel footage visible as soon as the vehicle arrives.
          duration:
            VEHICLE_LEG_DURATION_MS +
            (video ? (clipDurations[video.url] ?? video.duration ?? 6) * 1000 : photoCount * PHOTO_DURATION_MS),
        };
      }),
    [locations, clipDurations]
  );
  const totalJourneyDuration = legSchedule.reduce((total, leg) => total + leg.duration, 0);
  const totalPlaybackDuration = INTRO_DURATION_MS + totalJourneyDuration + SUMMARY_DURATION_MS + OUTRO_DURATION_MS;
  const effectiveDurationSec = totalPlaybackDuration / 1000;

  // Timestamps
  const journeyStartTime = INTRO_DURATION_MS;
  const summaryStartTime = journeyStartTime + totalJourneyDuration;
  const outroStartTime = summaryStartTime + SUMMARY_DURATION_MS;

  // Active Phase Checks
  const isIntro = timelineElapsed < journeyStartTime;
  const isJourney = timelineElapsed >= journeyStartTime && timelineElapsed < summaryStartTime;
  const isSummary = timelineElapsed >= summaryStartTime && timelineElapsed < outroStartTime;
  const isOutro = timelineElapsed >= outroStartTime;

  // Smooth Opacity Envelopes (Fade In & Fade Out)
  const introOpacity = isIntro ? getFadeOpacity(timelineElapsed, INTRO_DURATION_MS) : 0;
  const summaryOpacity = isSummary ? getFadeOpacity(timelineElapsed - summaryStartTime, SUMMARY_DURATION_MS) : 0;
  const outroOpacity = isOutro ? getFadeOpacity(timelineElapsed - outroStartTime, OUTRO_DURATION_MS) : 0;

  // Journey internal progress [0 to 100]
  const journeyElapsed = Math.min(totalJourneyDuration, Math.max(0, timelineElapsed - journeyStartTime));
  const internalProgress = totalJourneyDuration > 0 ? (journeyElapsed / totalJourneyDuration) * 100 : 0;

  // Work through the itinerary in fixed stages: 4s moving, then 2s per photo.
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
  const isPhotoShowcase = elapsedInLeg >= VEHICLE_LEG_DURATION_MS;
  const isVideoScheduled = isPhotoShowcase && Boolean(activeSchedule?.video);
  const isVideoShowcase = isVideoScheduled && !unavailableVideos.includes(activeSchedule?.video?.url ?? "");
  const isMediaShowcase = isPhotoShowcase || isVideoScheduled;
  const arrivalMediaDuration = Math.max(0, (activeSchedule?.duration ?? VEHICLE_LEG_DURATION_MS) - VEHICLE_LEG_DURATION_MS);
  const arrivalMediaOpacity = isPhotoShowcase
    ? getFadeOpacity(elapsedInLeg - VEHICLE_LEG_DURATION_MS, arrivalMediaDuration, FADE_TRANSITION_MS, FADE_TRANSITION_MS)
    : 0;
  const travelProgress = Math.min(1, elapsedInLeg / VEHICLE_LEG_DURATION_MS);
  const photoIndex = isPhotoShowcase
    ? Math.min(activeSchedule?.photoCount! - 1, Math.floor((elapsedInLeg - VEHICLE_LEG_DURATION_MS) / PHOTO_DURATION_MS))
    : 0;
  const activePhotoUrl = activeSchedule?.images[photoIndex] || destination?.imageUrl || "";
  
  // Continuous smooth progress across travel and arrival showcase (no sudden snap jumps)
  const arrivalFraction = arrivalMediaDuration > 0
    ? Math.min(1.0, (elapsedInLeg - VEHICLE_LEG_DURATION_MS) / arrivalMediaDuration)
    : 0;
  const legTotalProgress = !isPhotoShowcase
    ? (travelProgress * 0.55)
    : (0.55 + arrivalFraction * 0.44999);
  const mapProgress = Math.min(1, (currentLegIndex + legTotalProgress) / totalLegs);

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

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !recording) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, recording]);

  // High-precision smooth 60fps preview playback timer using requestAnimationFrame
  useEffect(() => {
    if (!playing || recording) return;
    let animFrame: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(100, Math.max(0, now - lastTime));
      lastTime = now;

      setTimelineElapsed((prev) => {
        const next = prev + dt;
        if (next >= totalPlaybackDuration) {
          setPlaying(false);
          return totalPlaybackDuration;
        }
        return next;
      });

      animFrame = requestAnimationFrame(tick);
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [playing, totalPlaybackDuration, recording]);

  // Background music audio playback during preview
  useEffect(() => {
    if (recording) return;

    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    audio.loop = true;
    audio.muted = muted;
    audio.volume = BACKGROUND_MUSIC_VOLUME;

    const musicUrl = new URL(BACKGROUND_MUSIC_URL, window.location.href).href;
    if (audio.src !== musicUrl) {
      audio.src = BACKGROUND_MUSIC_URL;
      audio.currentTime = 0;
      audio.load();
    }

    if (playing && !isIntro && !isVideoShowcase) {
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

  // Keep the destination clip in sync with the preview controls. `autoPlay` is
  // not enough after a pause/restart, and browsers only allow unmuted playback
  // after a user interaction.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playing && isVideoShowcase) {
      void video.play().catch((error) => console.warn("Destination video could not start.", error));
    } else {
      video.pause();
    }
  }, [playing, isVideoShowcase, restartKey, muted]);

  const restart = () => {
    if (recording) return;
    audioRef.current?.pause();
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.load();
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

  // Synchronized HD Video Generator & Downloader with Intro, Journey, Summary & Outro
  const startDownloadRecording = async () => {
    if (locations.length < 2 || recording) return;

    if (!window.MediaRecorder) {
      alert("This browser does not support video downloads.");
      return;
    }

    const mapCanvas = frame.current?.querySelector<HTMLCanvasElement>(".mapboxgl-canvas");
    if (!mapCanvas) {
      alert("Map is initializing. Please wait a moment and try again.");
      return;
    }

    // 1. Preload all destination landmark photos into memory
    const allPhotoUrls = [
      ...locations.flatMap((loc) => [loc.imageUrl || "", ...getLocationImages(loc)]),
      BRAND_LOGO_URL,
    ];
    const preloadedImgs = await preloadImages(allPhotoUrls.filter(Boolean));
    const preloadedVideos = await preloadVideos(
      legSchedule.flatMap((schedule) => (schedule.video ? [schedule.video.url] : []))
    );
    let activeExportVideoUrl: string | null = null;

    setRecording(true);
    setRecordProgress(0);
    setTimelineElapsed(0);
    setPlaying(false);
    audioRef.current?.pause();

    // 2. Prepare 1080x1080 composite canvas
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

    // A 30fps composition is smooth for the travel movement and lets the
    // browser encode every frame reliably (instead of dropping 1080p frames).
    const canvasStream = canvas.captureStream(EXPORT_FRAME_RATE);
    const audioContext = new AudioContext();
    const audioDestination = audioContext.createMediaStreamDestination();
    let audioStartTime = 0;
    await audioContext.resume();

    // Mix the export on one Web Audio timeline. Background music occupies only
    // the gaps; the original destination soundtrack owns the full clip window.
    const videoWindows = legSchedule.reduce<{ start: number; end: number; url: string }[]>(
      (windows, schedule, index) => {
        if (!schedule.video) return windows;
        const legStart = INTRO_DURATION_MS + legSchedule.slice(0, index).reduce((sum, leg) => sum + leg.duration, 0);
        windows.push({ start: legStart + VEHICLE_LEG_DURATION_MS, end: legStart + schedule.duration, url: schedule.video.url });
        return windows;
      },
      []
    );
    const connectLoop = (buffer: AudioBuffer, startMs: number, endMs: number, volume: number) => {
      if (endMs <= startMs) return;
      const source = audioContext.createBufferSource();
      const gain = audioContext.createGain();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.value = volume;
      source.connect(gain).connect(audioDestination);
      source.start(audioStartTime + startMs / 1000);
      source.stop(audioStartTime + endMs / 1000);
    };

    // Decoding is completed before the common clock is selected. Without this,
    // a large video can make its audio start late in the exported file.
    const audioBuffers = new Map<string, AudioBuffer>();
    await Promise.all(
      [BACKGROUND_MUSIC_URL, ...videoWindows.map((window) => window.url)].map(async (url) => {
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
      let cursor = INTRO_DURATION_MS;
      for (const window of videoWindows) {
        connectLoop(music, cursor, window.start, BACKGROUND_MUSIC_VOLUME);
        cursor = window.end;
      }
      connectLoop(music, cursor, totalPlaybackDuration, BACKGROUND_MUSIC_VOLUME);
    }
    for (const window of videoWindows) {
      const clipAudio = audioBuffers.get(window.url);
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

    // 3. Record Intro, Journey, Travel Summary, and Outro
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

        // Drive player state frame-by-frame
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
        const arrivalStop = recSchedule?.stop || locations[locations.length - 1];
        const arrivalImages = recSchedule?.images || getLocationImages(arrivalStop);
        const totalPhotos = Math.max(1, recSchedule?.photoCount ?? arrivalImages.length);
        const recVideoStart = VEHICLE_LEG_DURATION_MS;
        const recVideo =
          recElapsedInLeg >= recVideoStart && recSchedule?.video ? recSchedule.video : null;
        const recArrivalDuration = Math.max(0, (recSchedule?.duration ?? VEHICLE_LEG_DURATION_MS) - VEHICLE_LEG_DURATION_MS);
        const recArrivalOpacity = isArrival
          ? getFadeOpacity(recElapsedInLeg - VEHICLE_LEG_DURATION_MS, recArrivalDuration, FADE_TRANSITION_MS, FADE_TRANSITION_MS)
          : 0;
        const exportVideo = recVideo ? preloadedVideos.get(recVideo.url) : undefined;
        if (recVideo?.url !== activeExportVideoUrl) {
          if (activeExportVideoUrl) preloadedVideos.get(activeExportVideoUrl)?.pause();
          activeExportVideoUrl = recVideo?.url ?? null;
          if (exportVideo) {
            exportVideo.currentTime = 0;
            // The schedule uses metadata duration, so rendering at normal speed
            // keeps every frame of the source clip instead of time-stretching it.
            exportVideo.playbackRate = 1;
            void exportVideo.play().catch(() => undefined);
          }
        }
        const photoIdx = isArrival
          ? Math.min(totalPhotos - 1, Math.floor((recElapsedInLeg - VEHICLE_LEG_DURATION_MS) / PHOTO_DURATION_MS))
          : 0;
        const curSec = Math.floor(elapsed / 1000);

        // 1. Draw Live Mapbox 3D Globe WebGL Canvas Frame
        const activeMap = frame.current?.querySelector<HTMLCanvasElement>(".mapboxgl-canvas") || mapCanvas;
        if (activeMap && activeMap.width > 0 && activeMap.height > 0) {
          ctx.drawImage(activeMap, 0, 0, 1080, 1080);
        } else {
          ctx.fillStyle = "#030e18";
          ctx.fillRect(0, 0, 1080, 1080);
        }

        // 2. Draw Moving Realistic Vehicle Marker & Destination Target Pill (during journey)
        if (!isArrival && elapsed >= journeyStartTime && elapsed < summaryStartTime) {
          ctx.save();
          const travelFraction = Math.min(1.0, recElapsedInLeg / VEHICLE_LEG_DURATION_MS);
          const startLoc = locations[legIdx] || locations[0];
          const endLoc = locations[legIdx + 1] || locations[locations.length - 1];
          const curLegCoords = getLegCoordinates(startLoc, endLoc, curTransport);
          const { bearing: recBearing } = getPointAlongPolyline(curLegCoords, travelFraction);

          drawRealisticVehicleOnCanvas(ctx, curTransport, 540, 540, recBearing, 1.2);

          // Destination Name Tag Pill floating above the vehicle
          const destNameText = `📍 Next: ${arrivalStop.name} (${arrivalStop.code})`;
          ctx.font = "700 15px system-ui, -apple-system, sans-serif";
          const textWidth = ctx.measureText(destNameText).width;
          const pillWidth = textWidth + 32;

          drawRoundedRect(
            ctx,
            540 - pillWidth / 2,
            464,
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
          ctx.fillText(destNameText, 540, 482);
          ctx.restore();
        }

        // 3. Top-Left Active Status Banner (during journey)
        if (elapsed >= journeyStartTime && elapsed < summaryStartTime) {
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

        // 4. Full-screen Arrival Media (photo or video) with fade & crossfade transitions
        if (isArrival && arrivalStop && elapsed >= journeyStartTime && elapsed < summaryStartTime) {
          ctx.save();
          ctx.globalAlpha = recArrivalOpacity;

          if (recVideo && exportVideo && exportVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            // Destination video fills the entire frame
            ctx.drawImage(exportVideo, 0, 0, 1080, 1080);
          } else {
            const activePhotoUrl = arrivalImages[photoIdx] || arrivalStop.imageUrl || "";
            const activeImg = preloadedImgs.get(activePhotoUrl);
            if (activeImg) {
              ctx.drawImage(activeImg, 0, 0, 1080, 1080);
            } else {
              ctx.fillStyle = "#030e18";
              ctx.fillRect(0, 0, 1080, 1080);
            }

            // Smooth crossfade dissolve into the next full-screen photo during
            // the last 25% of each photo's on-screen duration
            const photoElapsed = recElapsedInLeg - VEHICLE_LEG_DURATION_MS - photoIdx * PHOTO_DURATION_MS;
            const photoLocalProgress = Math.min(1, Math.max(0, photoElapsed / PHOTO_DURATION_MS));
            if (photoLocalProgress > 0.75 && photoIdx < totalPhotos - 1) {
              const nextPhotoUrl = arrivalImages[photoIdx + 1] || "";
              const nextImg = preloadedImgs.get(nextPhotoUrl);
              if (nextImg) {
                const crossFadeAlpha = (photoLocalProgress - 0.75) / 0.25;
                ctx.save();
                ctx.globalAlpha = recArrivalOpacity * crossFadeAlpha;
                ctx.drawImage(nextImg, 0, 0, 1080, 1080);
                ctx.restore();
              }
            }
          }

          // Soft bottom gradient so the caption stays readable over any photo/video
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

        // 5. Bottom Cinematic Movie Bar (during journey)
        if (elapsed >= journeyStartTime && elapsed < summaryStartTime) {
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

          // Bottom Progress Bar
          ctx.fillStyle = "rgba(255,255,255,0.2)";
          ctx.fillRect(60, 1052, 960, 4);
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(60, 1052, 960 * currentP, 4);
          ctx.restore();
        }

        // 6. Smooth Intro Card (Fade In & Fade Out)
        if (elapsed < INTRO_DURATION_MS) {
          const introFade = getFadeOpacity(elapsed, INTRO_DURATION_MS);
          drawBrandingCard(
            ctx,
            preloadedImgs.get(BRAND_LOGO_URL),
            "Your journey starts here",
            `${locations[0]?.name ?? "Start"} to ${locations.at(-1)?.name ?? "Destination"}`,
            introFade
          );
        }

        // 7. Travel Summary Card Before Outro (Fade In & Fade Out)
        if (elapsed >= summaryStartTime && elapsed < outroStartTime) {
          const sumFade = getFadeOpacity(elapsed - summaryStartTime, SUMMARY_DURATION_MS);
          drawTravelSummaryCard(
            ctx,
            locations,
            legs,
            totalTripDistance,
            preloadedImgs,
            sumFade
          );
        }

        // 8. Smooth Outro Card (Fade In & Fade Out)
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
    link.download = `roamly-${startName}-to-${endName}-1080p-journey.${
      mime.startsWith("video/mp4") ? "mp4" : "webm"
    }`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);

    setRecording(false);
    setPlaying(false);
  };

  // Auto-record if triggered from main page
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

        {/* Live Recording Status Badge */}
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

        <MapboxGlobe
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

        {isJourney && isPhotoShowcase && !isVideoShowcase && (
          <section
            className="arrival-photo-fullscreen"
            style={{ opacity: arrivalMediaOpacity }}
            aria-label={`${destination.name} travel photo`}
          >
            {activePhotoUrl ? <img src={activePhotoUrl} alt={`${destination.name} travel moment`} /> : null}
            <div className="arrival-photo-caption">
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
            <video
              ref={videoRef}
              key={activeSchedule.video.url}
              src={activeSchedule.video.url}
              autoPlay
              playsInline
              muted={muted}
              onError={() =>
                setUnavailableVideos((current) =>
                  current.includes(activeSchedule.video!.url) ? current : [...current, activeSchedule.video!.url]
                )
              }
            />
            <div className="arrival-photo-caption">
              <span>{muted ? "TRAVEL VIDEO · TAP SOUND FOR ORIGINAL AUDIO" : "TRAVEL VIDEO · ORIGINAL AUDIO"}</span>
              <h2>{destination.name}</h2>
              <p>{destination.country}</p>
              {activeSchedule.video.credit && <small className="video-credit">{activeSchedule.video.credit}</small>}
            </div>
          </section>
        )}

        {/* Intro Branding Card with Smooth Fade In & Fade Out */}
        {isIntro && (
          <div
            className="video-branding-card"
            style={{ opacity: introOpacity, transition: "opacity 0.05s linear" }}
            aria-live="polite"
          >
            <div className="video-branding-content">
              <img src={BRAND_LOGO_URL} alt="Roamly Studio logo" />
              <span>ROAMLY STUDIO</span>
              <strong>Your journey starts here</strong>
              <small>{`${locations[0]?.name ?? "Start"} to ${locations.at(-1)?.name ?? "Destination"}`}</small>
            </div>
          </div>
        )}

        {/* Travel Summary Card (Before Outro) with Smooth Fade In & Fade Out */}
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
                    {Array.from(new Set(legs)).map(getVehicleName).join(" · ") || "Flight"}
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
                          <span>Next: {getVehicleName(legs[idx] || "flight").toUpperCase()}</span>
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

        {/* Outro Branding Card with Smooth Fade In & Fade Out */}
        {isOutro && (
          <div
            className="video-branding-card"
            style={{ opacity: outroOpacity, transition: "opacity 0.05s linear" }}
            aria-live="polite"
          >
            <div className="video-branding-content">
              <img src={BRAND_LOGO_URL} alt="Roamly Studio logo" />
              <span>ROAMLY STUDIO</span>
              <strong>Journey complete</strong>
              <small>Thanks for travelling with us</small>
            </div>
          </div>
        )}

        {/* Video Player Bottom Controls */}
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
                ? "Intro · Roamly Studio"
                : isSummary
                ? `Travel Summary · ${totalTripDistance}`
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
