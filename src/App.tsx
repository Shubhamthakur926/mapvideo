import { Download, Play, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { JourneyBuilder } from "./travel/JourneyBuilder";
import { JourneyMap } from "./travel/JourneyMap";
import { PreviewModal } from "./travel/PreviewModal";
import { destinations, type Location, type Transport } from "./travel/types";

const initialLocations: Location[] = [];

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

  // Full HD 1080p Mapbox 3D Globe Video Generator (Exact Preview Match)
  const generate = async () => {
    if (locations.length < 2) {
      setError("Please select at least 2 destinations to generate a video.");
      return;
    }
    if (!window.MediaRecorder) {
      setError("This browser does not support video downloads.");
      return;
    }

    const mapboxCanvas = document.querySelector<HTMLCanvasElement>(".mapboxgl-canvas");
    if (!mapboxCanvas) {
      setError("Map canvas is loading. Please wait a moment and try again.");
      return;
    }

    setRendering(true);
    setError("");

    try {
      // 1080x1080 High Definition Composite Recording Canvas
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

      const length = 35 * 1000; // 35 seconds
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

      const draw = (elapsed: number) => {
        const progress = Math.min(elapsed / length, 0.999999);
        const curSec = Math.floor(progress * 35);

        // 1. Draw Live Mapbox 3D Globe WebGL Canvas Frame
        const activeMapCanvas = document.querySelector<HTMLCanvasElement>(".mapboxgl-canvas") || mapboxCanvas;
        if (activeMapCanvas && activeMapCanvas.width > 0 && activeMapCanvas.height > 0) {
          context.drawImage(activeMapCanvas, 0, 0, 1080, 1080);
        } else {
          context.fillStyle = "#030e18";
          context.fillRect(0, 0, 1080, 1080);
        }

        // 2. Cinematic Video Frame Header & Progress
        context.save();
        context.textAlign = "center";
        context.textBaseline = "alphabetic";
        context.fillStyle = "#ffffff";
        context.font = "700 32px Georgia, serif";
        context.shadowColor = "rgba(0,0,0,0.85)";
        context.shadowBlur = 14;
        context.fillText(
          `${locations[0].name} → ${end?.name || locations[locations.length - 1].name}`,
          540,
          995
        );

        context.fillStyle = "#38bdf8";
        context.font = "700 15px system-ui, sans-serif";
        context.fillText(
          `0:${curSec < 10 ? "0" : ""}${curSec} / 0:35 · 1080p HD JOURNEY STORY`,
          540,
          1028
        );
        context.shadowBlur = 0;

        // Bottom Progress Bar
        context.fillStyle = "rgba(255,255,255,0.2)";
        context.fillRect(60, 1052, 960, 4);
        context.fillStyle = "#38bdf8";
        context.fillRect(60, 1052, 960 * progress, 4);
        context.restore();
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
      const endName = end?.name ? end.name.toLowerCase().replace(/\s+/g, "-") : "destination";
      const startName = locations[0]?.name ? locations[0].name.toLowerCase().replace(/\s+/g, "-") : "start";
      link.download = `roamly-${startName}-to-${endName}-3d-journey.${
        mime.startsWith("video/mp4") ? "mp4" : "webm"
      }`;
      document.body.appendChild(link);
      link.click();
      link.remove();
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
