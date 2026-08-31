import { Download, Expand, Loader2, Pause, Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { calculateDistanceKm, formatDistanceKm, MapboxGlobe } from "./MapboxGlobe";
import { getLocationImages, type Location, type Transport } from "./types";
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
const BRAND_LOGO_URL = "/picture/App-logo.png";

// Stage Durations
const INTRO_DURATION_MS = 2500;
const SUMMARY_DURATION_MS = 3600;
const OUTRO_DURATION_MS = 2500;
const FADE_TRANSITION_MS = 500;

const audioBufferCache = new Map<string, Promise<AudioBuffer>>();

function getVehicleAudioBuffer(context: AudioContext, url: string): Promise<AudioBuffer> {
  let buffer = audioBufferCache.get(url);
  if (!buffer) {
    buffer = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load vehicle sound: ${url}`);
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
    ctx.fillText(`${stat.icon} ${stat.label}`, sx + statW / 2, statBoxY + 28);
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 18px Georgia, serif";
    ctx.fillText(stat.val, sx + statW / 2, statBoxY + 58);
  });

  // Stops list container
  const stopsListY = 338;
  const stopsListH = 645;
  drawRoundedRect(ctx, 90, stopsListY, 900, stopsListH, 22, "#f8fafc", "#e2e8f0", 1.5);

  ctx.textAlign = "left";
  ctx.fillStyle = "#1e293b";
  ctx.font = "800 14px system-ui, sans-serif";
  ctx.fillText("📍 ALL DESTINATIONS & CONNECTING ROUTES", 120, stopsListY + 32);

  // Render list of stops
  const displayStops = locations.slice(0, 6);
  const rowH = Math.min(84, (stopsListH - 65) / displayStops.length);
  const startRowY = stopsListY + 55;

  displayStops.forEach((loc, i) => {
    const ry = startRowY + i * rowH;
    const isFirst = i === 0;
    const isLast = i === locations.length - 1;

    // Row card
    drawRoundedRect(ctx, 115, ry, 850, rowH - 8, 14, "#ffffff", isLast ? "#86efac" : isFirst ? "#bae6fd" : "#e2e8f0", 1.5);

    // Stop number circle
    const numColor = isLast ? "#16a34a" : isFirst ? "#0284c7" : "#475569";
    drawRoundedRect(ctx, 130, ry + (rowH - 8 - 34) / 2, 34, 34, 17, numColor);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 14px system-ui, sans-serif";
    ctx.fillText(`${i + 1}`, 147, ry + (rowH - 8) / 2);

    // Stop thumbnail image if preloaded
    const img = preloadedImgs.get(loc.imageUrl || "");
    if (img) {
      drawRoundedImage(ctx, img, 178, ry + (rowH - 8 - 48) / 2, 60, 48, 8);
    }

    // Stop Name & Country
    const textStartX = img ? 250 : 180;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 17px Georgia, serif";
    ctx.fillText(loc.name, textStartX, ry + 12);

    ctx.fillStyle = "#64748b";
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.fillText(`${loc.country} · ${loc.code}`, textStartX, ry + 36);

    // Connecting Transport or Arrival badge
    if (i < locations.length - 1) {
      const legTransport = legs[i] || "flight";
      const tEmoji = vehicleMarks[legTransport] || "✈️";
      const tLabel = legTransport.toUpperCase();
      drawRoundedRect(ctx, 770, ry + (rowH - 8 - 28) / 2, 175, 28, 14, "#e0f2fe", "#bae6fd", 1);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#0369a1";
      ctx.font = "800 11px system-ui, sans-serif";
      ctx.fillText(`${tEmoji} Next: ${tLabel}`, 857, ry + (rowH - 8) / 2);
    } else {
      drawRoundedRect(ctx, 770, ry + (rowH - 8 - 28) / 2, 175, 28, 14, "#dcfce7", "#86efac", 1);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#15803d";
      ctx.font = "800 11px system-ui, sans-serif";
      ctx.fillText("🏁 Final Destination", 857, ry + (rowH - 8) / 2);
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
  const [playing, setPlaying] = useState(true);
  const [timelineElapsed, setTimelineElapsed] = useState(0);
  const [restartKey, setRestartKey] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [muted, setMuted] = useState(false);

  const totalLegs = Math.max(1, locations.length - 1);
  const totalJourneyDuration = duration * 1000;
  const totalPlaybackDuration = INTRO_DURATION_MS + totalJourneyDuration + SUMMARY_DURATION_MS + OUTRO_DURATION_MS;

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

  const currentLegIndex = Math.min(totalLegs - 1, Math.floor((internalProgress / 100) * totalLegs));
  const destination = locations[currentLegIndex + 1] ?? locations.at(-1)!;
  const elapsedSec = Math.min(duration, Math.floor((internalProgress / 100) * duration));

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

  // Regular preview playback timer (when not recording)
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

    if (playing && !isIntro) {
      playPreviewAudio(audio);
    } else {
      audio.pause();
    }
  }, [playing, isIntro, muted, recording]);

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

    const canvasStream = canvas.captureStream(60);
    const audioContext = new AudioContext();
    const audioDestination = audioContext.createMediaStreamDestination();
    const audioStartTime = audioContext.currentTime + 0.08;
    await audioContext.resume();

    try {
      const buffer = await getVehicleAudioBuffer(audioContext, BACKGROUND_MUSIC_URL);
      const source = audioContext.createBufferSource();
      const gain = audioContext.createGain();
      source.buffer = buffer;
      source.loop = true;
      gain.gain.value = BACKGROUND_MUSIC_VOLUME;
      source.connect(gain).connect(audioDestination);
      source.start(audioStartTime + INTRO_DURATION_MS / 1000);
      source.stop(audioStartTime + (totalPlaybackDuration) / 1000);
    } catch (error) {
      console.warn("Unable to prepare background music for export.", error);
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
      videoBitsPerSecond: 12000000,
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

    await new Promise<void>((resolve) => {
      const anim = (now: number) => {
        const elapsed = now - started;

        // Drive player state frame-by-frame
        setTimelineElapsed(Math.min(elapsed, length));
        setRecordProgress(Math.min(100, Math.round((elapsed / length) * 100)));

        const recJourneyElapsed = Math.min(
          totalJourneyDuration,
          Math.max(0, elapsed - journeyStartTime)
        );
        const currentP = totalJourneyDuration > 0 ? recJourneyElapsed / totalJourneyDuration : 0;

        // Calculate arrival and motion state
        const scaled = currentP * totalLegs;
        const legIdx = Math.min(totalLegs - 1, Math.floor(scaled));
        const legFraction = scaled - legIdx;
        const TRAVEL_SPLIT = 0.65;
        const isArrival = legFraction >= TRAVEL_SPLIT;
        const curTransport = legs[legIdx] ?? "flight";
        const vehicleMark = vehicleMarks[curTransport] ?? "✈️";
        const arrivalStop = locations[legIdx + 1] || locations[locations.length - 1];
        const arrivalImages = getLocationImages(arrivalStop);
        const photoIdx = Math.min(2, Math.floor(((legFraction - TRAVEL_SPLIT) / (1 - TRAVEL_SPLIT)) * 3));
        const curSec = Math.floor(currentP * duration);

        // 1. Draw Live Mapbox 3D Globe WebGL Canvas Frame
        const activeMap = frame.current?.querySelector<HTMLCanvasElement>(".mapboxgl-canvas") || mapCanvas;
        if (activeMap && activeMap.width > 0 && activeMap.height > 0) {
          ctx.drawImage(activeMap, 0, 0, 1080, 1080);
        } else {
          ctx.fillStyle = "#030e18";
          ctx.fillRect(0, 0, 1080, 1080);
        }

        // 2. Draw Moving Vehicle Marker & Destination Target Pill (during journey)
        if (!isArrival && elapsed >= journeyStartTime && elapsed < summaryStartTime) {
          ctx.save();
          // Outer halo pulse
          ctx.beginPath();
          ctx.arc(540, 540, 38, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
          ctx.fill();

          // Dark badge background
          ctx.beginPath();
          ctx.arc(540, 540, 26, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(3, 16, 29, 0.94)";
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = "#38bdf8";
          ctx.shadowColor = "#38bdf8";
          ctx.shadowBlur = 14;
          ctx.stroke();

          // Vehicle icon emoji
          ctx.shadowBlur = 0;
          ctx.font = "26px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(vehicleMark, 540, 541);

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

        // 4. Cinematic Arrival Photo Showcase Card (When Vehicle Arrives at Stop)
        if (isArrival && arrivalStop && elapsed >= journeyStartTime && elapsed < summaryStartTime) {
          drawRoundedRect(ctx, 270, 390, 540, 530, 26, "rgba(3, 16, 29, 0.98)", "rgba(56, 189, 248, 0.85)", 3);

          ctx.save();
          ctx.fillStyle = "#38bdf8";
          ctx.font = "800 14px system-ui, sans-serif";
          ctx.fillText(`✨ ARRIVED AT DESTINATION · STOP ${legIdx + 2} OF ${totalLegs + 1}`, 296, 412);

          ctx.fillStyle = "#ffffff";
          ctx.font = "700 28px Georgia, serif";
          ctx.shadowColor = "rgba(0,0,0,0.9)";
          ctx.shadowBlur = 8;
          ctx.fillText(arrivalStop.name, 296, 436);
          ctx.shadowBlur = 0;

          ctx.fillStyle = "#94a3b8";
          ctx.font = "700 13px system-ui, sans-serif";
          ctx.fillText(`${arrivalStop.country} · ${arrivalStop.code}`, 296, 470);

          const activePhotoUrl = arrivalImages[photoIdx] || arrivalStop.imageUrl || "";
          const activeImg = preloadedImgs.get(activePhotoUrl);
          if (activeImg) {
            drawRoundedImage(ctx, activeImg, 296, 495, 488, 250, 16);
          } else {
            drawRoundedRect(ctx, 296, 495, 488, 250, 16, "#0a2238");
          }

          drawRoundedRect(ctx, 642, 510, 126, 32, 12, "rgba(3, 16, 29, 0.92)", "rgba(255, 255, 255, 0.35)", 1);
          ctx.fillStyle = "#ffffff";
          ctx.font = "700 12px system-ui, sans-serif";
          ctx.fillText(`📸 Photo ${photoIdx + 1} of ${Math.max(1, arrivalImages.length)}`, 654, 520);

          if (arrivalImages.length > 1) {
            for (let i = 0; i < 3; i++) {
              const tUrl = arrivalImages[i] || "";
              const tImg = preloadedImgs.get(tUrl);
              const tx = 296 + i * 166;
              const ty = 760;
              if (tImg) {
                drawRoundedImage(ctx, tImg, tx, ty, 154, 76, 12);
              }
              if (i === photoIdx) {
                drawRoundedRect(ctx, tx, ty, 154, 76, 12, undefined, "#38bdf8", 3);
              } else {
                drawRoundedRect(ctx, tx, ty, 154, 76, 12, undefined, "rgba(255, 255, 255, 0.25)", 1.5);
              }
            }
          }

          ctx.fillStyle = "#94a3b8";
          ctx.font = "600 13px system-ui, sans-serif";
          ctx.fillText(
            legIdx + 1 < totalLegs
              ? `Continuing to ${locations[legIdx + 2]?.name || "next stop"}...`
              : "Journey route complete!",
            296,
            858
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
            `${formatTime(curSec)} / ${formatTime(duration)} · 1080p HD 60FPS STORY`,
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
          progress={internalProgress / 100}
          activeLocation={destination}
          playing={journeyIsPlaying || recording}
          className="map-video-globe"
        />

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
                : `${formatTime(elapsedSec)} / ${formatTime(duration)} · Stop ${currentLegIndex + 1} of ${totalLegs} · ${destination.name}`}
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
