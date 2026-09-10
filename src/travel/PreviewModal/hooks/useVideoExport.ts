import { useEffect, useState } from "react";
import type { MapboxGlobeHandle } from "../../MapboxGlobe";
import type { RouteOverviewMapHandle } from "../../RouteOverviewMap";
import { getLocationImages, type Location, type Transport } from "../../types";
import {
  BACKGROUND_MUSIC_DUCK_VOLUME,
  BACKGROUND_MUSIC_URL,
  BACKGROUND_MUSIC_VOLUME,
  BRAND_LOGO_URL,
  COLLAGE_DURATION_MS,
  EXPORT_FRAME_RATE,
  FADE_TRANSITION_MS,
  INTRO_VIDEO_URL,
  OUTRO_DURATION_MS,
  PHOTO_DURATION_MS,
  PHOTO_TRANSITION_MS,
  ROUTE_MAP_DURATION_MS,
  SUMMARY_DURATION_MS,
  VEHICLE_LEG_DURATION_MS,
  vehicleMarks,
} from "../constants/preview.constants";
import type { LegScheduleItem, PhotoItem } from "../types/preview.types";
import {
  drawBrandingCard,
  drawPhotoCollage,
  drawRoundedImage,
  drawRoundedRect,
  drawRouteOverviewFrame,
  drawTravelSummaryCard,
} from "../utils/canvasRenderer";
import {
  getAudioBuffer,
  preloadImages,
  preloadVehicleImages,
  preloadVideos,
  vehicleCanvasCache,
} from "../utils/mediaPreloader";
import { formatTime, getFadeOpacity, getPhotoTransitionDirection } from "../utils/previewFormatters";

interface UseVideoExportParams {
  locations: Location[];
  legs: Transport[];
  legSchedule: LegScheduleItem[];
  allPhotos: PhotoItem[];
  totalBatches: number;
  totalJourneyDuration: number;
  totalPlaybackDuration: number;
  effectiveDurationSec: number;
  journeyStartTime: number;
  routeMapStartTime: number;
  summaryStartTime: number;
  collageStartTime: number;
  outroStartTime: number;
  totalTripDistance: string;
  INTRO_DURATION_MS: number;
  COLLAGE_TOTAL_DURATION: number;
  frame: React.RefObject<HTMLDivElement | null>;
  mapboxGlobeRef: React.RefObject<MapboxGlobeHandle | null>;
  routeOverviewRef: React.RefObject<RouteOverviewMapHandle | null>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  setTimelineElapsed: (value: number) => void;
  setPlaying: (playing: boolean) => void;
  recording: boolean;
  setRecording: (recording: boolean) => void;
  recordProgress: number;
  setRecordProgress: (progress: number) => void;
  autoRecord?: boolean;
}

export function useVideoExport({
  locations,
  legs,
  legSchedule,
  allPhotos,
  totalBatches,
  totalJourneyDuration,
  totalPlaybackDuration,
  effectiveDurationSec,
  journeyStartTime,
  routeMapStartTime,
  summaryStartTime,
  collageStartTime,
  outroStartTime,
  totalTripDistance,
  INTRO_DURATION_MS,
  COLLAGE_TOTAL_DURATION,
  frame,
  mapboxGlobeRef,
  routeOverviewRef,
  audioRef,
  setTimelineElapsed,
  setPlaying,
  recording,
  setRecording,
  recordProgress,
  setRecordProgress,
  autoRecord = false,
}: UseVideoExportParams) {

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
        ...legSchedule.flatMap((schedule) => (schedule.video ? [schedule.video.url] : [])),
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
        const legStart =
          INTRO_DURATION_MS + legSchedule.slice(0, index).reduce((sum, leg) => sum + leg.duration, 0);
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
        [BACKGROUND_MUSIC_URL, INTRO_VIDEO_URL, ...videoWindows.map((window) => window.videoUrl)].map(
          async (url) => {
            try {
              audioBuffers.set(url, await getAudioBuffer(audioContext, url));
            } catch (error) {
              console.warn(`Unable to prepare audio for ${url}.`, error);
            }
          }
        )
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
          const arrivalStop = recSchedule?.stop || locations[locations.length - 1];
          const arrivalImages = recSchedule?.images || getLocationImages(arrivalStop);
          const totalPhotos = Math.max(1, recSchedule?.photoCount ?? arrivalImages.length);
          const recVideoDurationMs = recSchedule?.videoDurationMs ?? 0;
          const recArrivalElapsed = Math.max(0, recElapsedInLeg - VEHICLE_LEG_DURATION_MS);
          const isRecVideoActive =
            isArrival && recVideoDurationMs > 0 && recArrivalElapsed < recVideoDurationMs;
          const recVideo = isRecVideoActive && recSchedule?.video ? recSchedule.video : null;
          const isRecPhotoPhase =
            isArrival && (!recSchedule?.video || recArrivalElapsed >= recVideoDurationMs);
          const recPhotoElapsed = isRecPhotoPhase
            ? Math.max(0, recArrivalElapsed - recVideoDurationMs)
            : 0;
          const recArrivalDuration = Math.max(
            0,
            (recSchedule?.duration ?? VEHICLE_LEG_DURATION_MS) - VEHICLE_LEG_DURATION_MS
          );
          const recArrivalOpacity = isArrival
            ? getFadeOpacity(
                recElapsedInLeg - VEHICLE_LEG_DURATION_MS,
                recArrivalDuration,
                FADE_TRANSITION_MS,
                FADE_TRANSITION_MS
              )
            : 0;
          const isRecIntro = elapsed < INTRO_DURATION_MS;
          const introExportVideo = preloadedVideos.get(INTRO_VIDEO_URL);
          const currentActiveVideoUrl = isRecIntro ? INTRO_VIDEO_URL : (recVideo?.url ?? null);
          const currentActiveVideo = isRecIntro
            ? introExportVideo
            : recVideo
              ? preloadedVideos.get(recVideo.url)
              : undefined;

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

          const recCurrentBatchIndex = 0;
          const recBatchTransitionProgress = 0;

          const activeMap =
            frame.current?.querySelector<HTMLCanvasElement>(".mapboxgl-canvas") || mapCanvas;
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
                curTransport === "flight"
                  ? 76
                  : curTransport === "ship"
                    ? 72
                    : curTransport === "train"
                      ? 72
                      : 62;
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
                ? `🎉 ARRIVED · STOP ${legIdx + 2} OF ${locations.length}`
                : `🎯 EN ROUTE · STOP ${legIdx + 2} OF ${locations.length}`,
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
              const dw = 1080 * scale,
                dh = 1080 * scale;
              const dx = (1080 - dw) / 2,
                dy = (1080 - dh) / 2;
              ctx.drawImage(exportVideo, dx, dy, dw, dh);
            } else {
              const activePhotoUrl = arrivalImages[photoIdx] || arrivalStop.imageUrl || "";
              const activeImg = preloadedImgs.get(activePhotoUrl);
              const photoElapsed = recPhotoElapsed - photoIdx * PHOTO_DURATION_MS;

              const transitionProgress = Math.min(1, Math.max(0, photoElapsed / PHOTO_TRANSITION_MS));
              const easedProgress = 1 - Math.pow(1 - transitionProgress, 3);
              const transitionDirection = getPhotoTransitionDirection(photoIdx);
              const dx =
                transitionDirection === "left"
                  ? -1080 * (1 - easedProgress)
                  : transitionDirection === "right"
                    ? 1080 * (1 - easedProgress)
                    : 0;
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
            ctx.fillText(`✨ ARRIVED · STOP ${legIdx + 2} OF ${locations.length}`, 60, 905);

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
              frame.current?.querySelector<HTMLCanvasElement>(".route-overview-map .mapboxgl-canvas") ??
              null;
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

          // Photo Collage Section with batching - FIXED with totalLocations parameter
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
              locations.length
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

  return {
    recording,
    recordProgress,
    startDownloadRecording,
  };
}
