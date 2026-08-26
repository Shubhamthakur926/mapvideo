import { Download, Play, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { JourneyBuilder } from "./travel/JourneyBuilder";
import { JourneyMap } from "./travel/JourneyMap";
import { PreviewModal } from "./travel/PreviewModal";
import { destinations, type Location, type Transport } from "./travel/types";

const initialLocations: Location[] = [];

const vehicleMarks: Record<Transport, string> = {
  car: "🚗",
  flight: "✈️",
  train: "🚆",
  taxi: "🚕",
  bicycle: "🚲",
  bus: "🚌",
  walking: "🚶",
  ship: "🚢",
};

export default function App() {
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [legs, setLegs] = useState<Transport[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState("");
  const duration = 35;
  const end = locations.at(-1);

  const addLocation = (location: Location) => {
    setLocations((value) => [...value, { ...location, id: `${location.id}-${Date.now()}` }]);
    if (locations.length >= 1) {
      setLegs((value) => [...value, "flight"]);
    }
  };

  const removeLocation = (index: number) => {
    setLocations((value) => value.filter((_, current) => current !== index));
    setLegs((value) => {
      if (value.length === 0) return [];
      if (index === 0) return value.slice(1);
      return value.filter((_, current) => current !== index - 1);
    });
  };

  const selectDestination = (location: Location) => {
    addLocation(location);
  };

  const updateTransport = (index: number, transport: Transport) =>
    setLegs((value) => value.map((leg, current) => (current === index ? transport : leg)));

  // Full HD 1080p Ultra-Clear Video Generator
  const generate = async () => {
    if (locations.length < 2) {
      setError("Please select at least 2 destinations to generate a video.");
      return;
    }
    if (!window.MediaRecorder) {
      setError("This browser does not support video downloads.");
      return;
    }
    setRendering(true);
    setError("");

    try {
      // 1. Preload Earth texture
      const earth = new Image();
      earth.crossOrigin = "anonymous";
      earth.src = "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg";
      await new Promise<void>((resolve) => {
        earth.onload = () => resolve();
        earth.onerror = () => resolve();
      });

      // 2. Preload Destination Images
      const loadedImages = new Map<string, HTMLImageElement>();
      await Promise.all(
        locations.map((loc) => {
          if (!loc.imageUrl) return Promise.resolve();
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = loc.imageUrl;
          return new Promise<void>((resolve) => {
            img.onload = () => {
              loadedImages.set(loc.id, img);
              resolve();
            };
            img.onerror = () => resolve();
          });
        })
      );

      // High Definition 1080x1080 Canvas
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1080;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Could not prepare the video canvas.");

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      const mime =
        ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm"].find((type) =>
          MediaRecorder.isTypeSupported(type)
        ) ?? "video/webm";

      const numLegs = Math.max(1, locations.length - 1);
      const length = 35 * 1000;
      const started = performance.now();

      // 60 FPS recording with 12 Mbps bitrate for crystal-clear HD video
      const recorder = new MediaRecorder(canvas.captureStream(60), {
        mimeType: mime,
        videoBitsPerSecond: 12000000,
      });
      const chunks: BlobPart[] = [];

      const video = new Promise<Blob>((resolve, reject) => {
        recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
        recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
        recorder.onerror = () => reject(new Error("Video rendering failed."));
      });

      const project = (place: Location) => ({
        x: 540 + (place.lng / 180) * 315,
        y: 520 - (place.lat / 90) * 230,
      });

      const draw = (elapsed: number) => {
        const progress = Math.min(elapsed / length, 0.999999);
        const scaled = progress * numLegs;
        const currentLeg = Math.floor(scaled);
        const legProgress = scaled - currentLeg;

        const fromLoc = locations[currentLeg];
        const toLoc = locations[currentLeg + 1] || locations[locations.length - 1];
        const fromPoint = project(fromLoc);
        const toPoint = project(toLoc);
        const currentTransport = legs[currentLeg] ?? "flight";
        const vehicleEmoji = vehicleMarks[currentTransport] ?? "✈️";

        const activeDisplayStop = legProgress < 0.25 ? fromLoc : toLoc;
        const activePhoto = loadedImages.get(activeDisplayStop.id);

        // Deep Space Gradient Background
        const sky = context.createLinearGradient(0, 0, 1080, 1080);
        sky.addColorStop(0, "#020712");
        sky.addColorStop(0.55, "#082c4b");
        sky.addColorStop(1, "#01050c");
        context.fillStyle = sky;
        context.fillRect(0, 0, 1080, 1080);

        // Crisp Starfield
        for (let index = 0; index < 120; index += 1) {
          const x = (index * 137) % 1080;
          const y = (index * 83) % 900;
          context.fillStyle = `rgba(210,240,255,${0.25 + (index % 4) / 6})`;
          context.fillRect(x, y, 1.5 + (index % 2), 1.5 + (index % 2));
        }

        // 3D Earth Globe Sphere
        const radius = 378;
        context.save();
        context.beginPath();
        context.arc(540, 520, radius, 0, Math.PI * 2);
        context.clip();

        if (earth.complete && earth.naturalWidth) {
          const offset = (elapsed / 25) % 1080;
          context.drawImage(earth, -offset, 144, 2160, 756);
          context.drawImage(earth, 2160 - offset, 144, 2160, 756);
        } else {
          const ocean = context.createRadialGradient(412, 375, 15, 540, 520, radius);
          ocean.addColorStop(0, "#58b8dd");
          ocean.addColorStop(1, "#062c59");
          context.fillStyle = ocean;
          context.fillRect(162, 144, 756, 756);
        }

        // Atmospheric Shadow & 3D Shading
        const shade = context.createRadialGradient(397, 345, 67, 645, 630, 495);
        shade.addColorStop(0.45, "rgba(0,0,0,0)");
        shade.addColorStop(1, "rgba(0,4,16,0.85)");
        context.fillStyle = shade;
        context.fillRect(162, 144, 756, 756);
        context.restore();

        // Atmospheric Blue Rim Glow
        context.strokeStyle = "rgba(116,225,255,0.45)";
        context.lineWidth = 3;
        context.beginPath();
        context.arc(540, 520, radius, 0, Math.PI * 2);
        context.stroke();

        // Draw Completed Trajectory Routes
        for (let l = 0; l < currentLeg; l++) {
          const p1 = project(locations[l]);
          const p2 = project(locations[l + 1]);
          context.strokeStyle = "#38bdf8";
          context.lineWidth = 4.5;
          context.beginPath();
          context.moveTo(p1.x, p1.y);
          context.quadraticCurveTo((p1.x + p2.x) / 2, Math.min(p1.y, p2.y) - 60, p2.x, p2.y);
          context.stroke();
        }

        // Draw Current Leg Active Trajectory
        const currentMidY = Math.min(fromPoint.y, toPoint.y) - 60;
        const curX = fromPoint.x + (toPoint.x - fromPoint.x) * legProgress;
        const curY =
          fromPoint.y +
          (toPoint.y - fromPoint.y) * legProgress -
          (currentTransport === "flight" ? Math.sin(legProgress * Math.PI) * 65 : 0);

        // Neon Glow Trail
        context.strokeStyle = "#67e8f9";
        context.lineWidth = 6;
        context.shadowColor = "#06b6d4";
        context.shadowBlur = 18;
        context.beginPath();
        context.moveTo(fromPoint.x, fromPoint.y);
        context.quadraticCurveTo((fromPoint.x + curX) / 2, currentMidY, curX, curY);
        context.stroke();
        context.shadowBlur = 0;

        // Draw Location Pins with Crisp Thumbnail Photos
        locations.forEach((place, index) => {
          const point = project(place);
          const isVisited = index <= currentLeg;
          const isCurrent = place.id === activeDisplayStop.id;

          context.fillStyle = isCurrent ? "#ffffff" : isVisited ? "#38bdf8" : "rgba(148,163,184,0.6)";
          context.beginPath();
          context.arc(point.x, point.y, isCurrent ? 11 : 7, 0, Math.PI * 2);
          context.fill();

          // Mini Photo Pin on Map
          const thumb = loadedImages.get(place.id);
          if (thumb && thumb.complete && thumb.naturalWidth) {
            context.save();
            context.beginPath();
            context.arc(point.x, point.y - 26, 18, 0, Math.PI * 2);
            context.clip();
            context.drawImage(thumb, point.x - 18, point.y - 44, 36, 36);
            context.restore();

            context.strokeStyle = isCurrent ? "#38bdf8" : "#ffffff";
            context.lineWidth = 2.5;
            context.beginPath();
            context.arc(point.x, point.y - 26, 18, 0, Math.PI * 2);
            context.stroke();
          }
        });

        // Draw Moving Vehicle Emoji along its path
        context.font = "48px system-ui, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.shadowColor = "rgba(0,0,0,0.8)";
        context.shadowBlur = 10;
        context.fillText(vehicleEmoji, curX, curY);
        context.shadowBlur = 0;

        // Ultra-Clear Arrival Landmark Photo Card Popup (Top Left)
        if (activePhoto && activePhoto.complete && activePhoto.naturalWidth) {
          context.save();
          const cardX = 45;
          const cardY = 110;
          const cardW = 390;
          const cardH = 105;
          const cardRadius = 22;

          // Glassmorphism Card
          context.fillStyle = "rgba(3, 16, 29, 0.94)";
          context.strokeStyle = "rgba(56, 189, 248, 0.7)";
          context.lineWidth = 2;
          context.shadowColor = "rgba(0,0,0,0.7)";
          context.shadowBlur = 20;

          context.beginPath();
          context.roundRect(cardX, cardY, cardW, cardH, cardRadius);
          context.fill();
          context.stroke();
          context.shadowBlur = 0;

          // High Resolution Destination Photo
          context.save();
          context.beginPath();
          context.roundRect(cardX + 14, cardY + 14, 76, 76, 14);
          context.clip();
          context.drawImage(activePhoto, cardX + 14, cardY + 14, 76, 76);
          context.restore();

          // Border around photo
          context.strokeStyle = "#ffffff";
          context.lineWidth = 2;
          context.beginPath();
          context.roundRect(cardX + 14, cardY + 14, 76, 76, 14);
          context.stroke();

          // Destination Text
          context.textAlign = "left";
          context.textBaseline = "top";
          context.fillStyle = "#38bdf8";
          context.font = "800 13px system-ui, sans-serif";
          context.fillText(
            legProgress < 0.25 ? "📍 DEPARTING STOP" : "🎯 DESTINATION ARRIVAL",
            cardX + 105,
            cardY + 18
          );

          context.fillStyle = "#ffffff";
          context.font = "700 20px Georgia, serif";
          context.fillText(activeDisplayStop.name.slice(0, 20), cardX + 105, cardY + 38);

          context.fillStyle = "#94a3b8";
          context.font = "600 14px system-ui, sans-serif";
          context.fillText(`${activeDisplayStop.country} · ${activeDisplayStop.code}`, cardX + 105, cardY + 68);

          context.restore();
        }

        // Top & Bottom Cinematic Typography
        context.textAlign = "center";
        context.textBaseline = "alphabetic";
        context.fillStyle = "#bdeaff";
        context.font = "800 20px system-ui, sans-serif";
        context.letterSpacing = "3px";
        context.fillText("ROAMLY · CINEMATIC JOURNEY", 540, 70);

        context.fillStyle = "#ffffff";
        context.font = "700 48px Georgia, serif";
        context.fillText(`${locations[0].name} → ${end?.name || ""}`, 540, 990);

        context.fillStyle = "#93c5fd";
        context.font = "600 22px system-ui, sans-serif";
        context.fillText(
          `${fromLoc.name} to ${toLoc.name} (${currentTransport.toUpperCase()})  ·  LEG ${currentLeg + 1} OF ${numLegs}`,
          540,
          1035
        );
      };

      recorder.start();

      await new Promise<void>((resolve) => {
        const frame = (now: number) => {
          const elapsed = now - started;
          draw(elapsed);
          if (elapsed < length) {
            requestAnimationFrame(frame);
          } else {
            recorder.stop();
            resolve();
          }
        };
        requestAnimationFrame(frame);
      });

      const url = URL.createObjectURL(await video);
      const link = document.createElement("a");
      link.href = url;
      const endName = end?.name ? end.name.toLowerCase() : "destination";
      link.download = `${locations[0].name.toLowerCase()}-to-${endName}-hd-journey.${
        mime.startsWith("video/mp4") ? "mp4" : "webm"
      }`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Video rendering failed.");
    } finally {
      setRendering(false);
    }
  };

  return (
    <div className="app">
      <header>
        <div className="brand">
          <span className="brand-icon">
            <Sparkles size={18} />
          </span>
          <b>roamly</b>
          <em>studio</em>
        </div>
        <nav>My journeys Templates Help center</nav>
        <button
          className="dark-button"
          onClick={() => {
            if (locations.length >= 2) setPreviewOpen(true);
            else setError("Please select at least 2 destinations to preview the video.");
          }}
          disabled={locations.length < 2}
          style={{ opacity: locations.length < 2 ? 0.6 : 1, cursor: locations.length < 2 ? "not-allowed" : "pointer" }}
        >
          Preview
        </button>
      </header>
      <main>
        <div className="heading">
          <div>
            <p>JOURNEY BUILDER</p>
            <h1>
              {locations.length >= 2 ? (
                <>
                  {locations[0].name} to {end?.name} <small>· {duration}s story</small>
                </>
              ) : locations.length === 1 ? (
                <>
                  {locations[0].name} <small>· 1 destination selected</small>
                </>
              ) : (
                <>
                  Plan your journey <small>· 0 destinations selected</small>
                </>
              )}
            </h1>
          </div>
          <span className="saved">
            {locations.length === 0
              ? "● 0 destinations selected"
              : `● ${locations.length} destination${locations.length > 1 ? "s" : ""} selected`}
          </span>
        </div>
        <div className="workspace">
          <JourneyBuilder
            locations={locations}
            legs={legs}
            onAdd={addLocation}
            onRemove={removeLocation}
            onTransport={updateTransport}
          />
          <JourneyMap
            locations={locations}
            legs={legs}
            onPreview={() => setPreviewOpen(true)}
            onSelectDestination={selectDestination}
            isPaused={previewOpen}
          />
        </div>
        <section className="video-card">
          <div className="film">
            <button
              onClick={() => {
                if (locations.length >= 2) setPreviewOpen(true);
                else setError("Please select at least 2 destinations to preview.");
              }}
              disabled={locations.length < 2}
              style={{ opacity: locations.length < 2 ? 0.5 : 1, cursor: locations.length < 2 ? "not-allowed" : "pointer" }}
            >
              <Play size={17} fill="currentColor" />
            </button>
            <div>
              <b>Your journey film (1080p HD)</b>
              <small>
                {locations.length >= 2
                  ? `${locations.length - 1} legs · ${locations.length} destinations · ${duration} sec`
                  : "Select at least 2 destinations to preview and generate your video"}
              </small>
            </div>
          </div>
          <div className="video-actions">
            <span>0:00 / 0:{duration}</span>
            <button
              className="generate"
              onClick={generate}
              disabled={rendering || locations.length < 2}
              style={{ opacity: locations.length < 2 ? 0.5 : 1, cursor: locations.length < 2 ? "not-allowed" : "pointer" }}
            >
              {rendering ? (
                "Rendering HD…"
              ) : (
                <>
                  <Download size={16} /> Generate HD video
                </>
              )}
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </section>
      </main>
      {previewOpen && (
        <PreviewModal locations={locations} legs={legs} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}
