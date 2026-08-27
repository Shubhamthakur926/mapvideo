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

const vehicleSounds: Record<Transport, string> = {
  car: "/sounds/car.mp3",
  bike: "/sounds/bike.mp3",
  flight: "/sounds/flight.mp3",
  train: "/sounds/train.mp3",
  taxi: "/sounds/taxi.mp3",
  bicycle: "/sounds/bicycle.mp3",
  bus: "/sounds/bus.mp3",
  walking: "/sounds/walking.mp3",
  ship: "/sounds/ship.mp3",
};

const VEHICLE_VOLUME = 0.6;
const JOURNEY_DURATION_MS = 35 * 1000;
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
  const [internalProgress, setInternalProgress] = useState(0);
  const [restartKey, setRestartKey] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [muted, setMuted] = useState(false);
  
  const totalLegs = Math.max(1, locations.length - 1);
  const totalDuration = duration * 1000;
  const currentLegIndex = Math.min(totalLegs - 1, Math.floor((internalProgress / 100) * totalLegs));
  const destination = locations[currentLegIndex + 1] ?? locations.at(-1)!;
  const elapsedSec = Math.min(35, Math.floor((internalProgress / 100) * 35));

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
    const step = (intervalMs / totalDuration) * 100;
    const timer = window.setInterval(() => {
      setInternalProgress((value) => (value >= 100 ? 0 : value + step));
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [playing, totalDuration, recording]);


  // Keep the live transport sound aligned with the currently active leg.
  useEffect(() => {
    if (recording) return;

    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    audio.loop = true;
    audio.muted = muted;
    audio.volume = VEHICLE_VOLUME;

    const nextSource = vehicleSounds[currentTransport];
    if (audio.src !== new URL(nextSource, window.location.href).href) {
      audio.pause();
      audio.src = nextSource;
      audio.currentTime = 0;
      audio.load();
    }

    if (playing) playPreviewAudio(audio);
    else audio.pause();
  }, [currentTransport, muted, playing, recording]);

  useEffect(() => () => {
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);
  const restart = () => {
    if (recording) return;
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setInternalProgress(0);
    setRestartKey((value) => value + 1);
    setPlaying(true);
  };

  const fullscreen = () => frame.current?.requestFullscreen?.().catch(() => undefined);

  // 100% Synchronized HD Video Generator & Downloader
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
    const allPhotoUrls = locations.flatMap((loc) => [loc.imageUrl || "", ...getLocationImages(loc)]);
    const preloadedImgs = await preloadImages(allPhotoUrls.filter(Boolean));

    setRecording(true);
    setRecordProgress(0);
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
    const legDurationSeconds = JOURNEY_DURATION_MS / 1000 / totalLegs;
    const audioStartTime = audioContext.currentTime + 0.08;

    await Promise.all(
      Array.from({ length: totalLegs }, async (_, index) => {
        const transport = legs[index] ?? "flight";
        try {
          const buffer = await getVehicleAudioBuffer(audioContext, vehicleSounds[transport]);
          const source = audioContext.createBufferSource();
          const gain = audioContext.createGain();
          source.buffer = buffer;
          source.loop = true;
          gain.gain.value = VEHICLE_VOLUME;
          source.connect(gain).connect(audioDestination);
          source.start(audioStartTime + index * legDurationSeconds);
          source.stop(audioStartTime + (index + 1) * legDurationSeconds);
        } catch (error) {
          console.warn(`Unable to prepare ${transport} vehicle sound for export.`, error);
        }
      })
    );

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

    // 3. Run synchronized recording loop with dynamic duration (min 20s, max 4 min)
    const length = duration * 1000;
    const started = performance.now();

    await new Promise<void>((resolve) => {
      const anim = (now: number) => {
        const elapsed = now - started;
        const currentP = Math.min(elapsed / length, 0.999999);
        const curProgressPercent = currentP * 100;

        // Drive Preview player state frame-by-frame
        setInternalProgress(curProgressPercent);
        setRecordProgress(Math.min(100, Math.round(curProgressPercent)));

        // Calculate exact arrival and motion state
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
        const curSec = Math.floor(currentP * 35);

        // 1. Draw Live Mapbox 3D Globe WebGL Canvas Frame
        const activeMap = frame.current?.querySelector<HTMLCanvasElement>(".mapboxgl-canvas") || mapCanvas;
        if (activeMap && activeMap.width > 0 && activeMap.height > 0) {
          ctx.drawImage(activeMap, 0, 0, 1080, 1080);
        } else {
          ctx.fillStyle = "#030e18";
          ctx.fillRect(0, 0, 1080, 1080);
        }

        // 2. Draw Moving Vehicle Marker & Destination Target Pill
        if (!isArrival) {
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

        // 3. Top-Left Active Status Banner
        drawRoundedRect(ctx, 40, 40, 460, 110, 22, "rgba(3, 16, 29, 0.95)", "rgba(56, 189, 248, 0.75)", 2);
        
        // Thumbnail image in banner
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

        // 4. Cinematic Arrival Photo Showcase Card (When Vehicle Arrives at Stop)
        if (isArrival && arrivalStop) {
          drawRoundedRect(ctx, 270, 390, 540, 530, 26, "rgba(3, 16, 29, 0.98)", "rgba(56, 189, 248, 0.85)", 3);

          ctx.save();
          // Header Badge inside Card
          ctx.fillStyle = "#38bdf8";
          ctx.font = "800 14px system-ui, sans-serif";
          ctx.fillText(`✨ ARRIVED AT DESTINATION · STOP ${legIdx + 2} OF ${totalLegs + 1}`, 296, 412);

          ctx.fillStyle = "#ffffff";
          ctx.font = "700 28px Georgia, serif";
          ctx.shadowColor = "rgba(0,0,0,0.9)";
          ctx.shadowBlur = 8;
          ctx.fillText(arrivalStop.name, 296, 436);
          ctx.shadowBlur = 0;

          // Country & Code Subtitle
          ctx.fillStyle = "#94a3b8";
          ctx.font = "700 13px system-ui, sans-serif";
          ctx.fillText(`${arrivalStop.country} · ${arrivalStop.code}`, 296, 470);

          // Hero Featured Landmark Image
          const activePhotoUrl = arrivalImages[photoIdx] || arrivalStop.imageUrl || "";
          const activeImg = preloadedImgs.get(activePhotoUrl);
          if (activeImg) {
            drawRoundedImage(ctx, activeImg, 296, 495, 488, 250, 16);
          } else {
            drawRoundedRect(ctx, 296, 495, 488, 250, 16, "#0a2238");
          }

          // Photo Tag Overlay on Hero Image
          drawRoundedRect(ctx, 642, 510, 126, 32, 12, "rgba(3, 16, 29, 0.92)", "rgba(255, 255, 255, 0.35)", 1);
          ctx.fillStyle = "#ffffff";
          ctx.font = "700 12px system-ui, sans-serif";
          ctx.fillText(`📸 Photo ${photoIdx + 1} of ${Math.max(1, arrivalImages.length)}`, 654, 520);

          // 3 Thumbnail Previews Below
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

          // Bottom Continuing Notice
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

        // 5. Bottom Cinematic Movie Bar
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
          `0:${curSec < 10 ? "0" : ""}${curSec} / 0:35 · 1080p HD 60FPS STORY`,
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
    setPlaying(true);
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
              zIndex: 100,
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
          playing={playing || recording}
          className="map-video-globe"
        />

        <div className="video-controls">
          <div className="video-progress" aria-label="Video progress">
            <i style={{ width: `${internalProgress}%` }} />
          </div>
          <div className="video-actions">
            <button
              aria-label={playing ? "Pause video" : "Play video"}
              onClick={() => setPlaying((value) => !value)}
              disabled={recording}
            >
              {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
            </button>
            <button aria-label="Restart video" onClick={restart} disabled={recording}>
              <RotateCcw />
            </button>
            <button
              aria-label={muted ? "Unmute vehicle sound" : "Mute vehicle sound"}
              title={muted ? "Unmute vehicle sound" : "Mute vehicle sound"}
              onClick={() => setMuted((value) => !value)}
              disabled={recording}
            >
              {muted ? <VolumeX /> : <Volume2 />}
            </button>
            <span>
              0:{elapsedSec < 10 ? "0" : ""}{elapsedSec} / 0:35 · Stop {currentLegIndex + 1} of {totalLegs} · {destination.name}
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
