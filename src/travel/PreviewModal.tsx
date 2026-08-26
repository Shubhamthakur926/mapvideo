import { Download, Expand, Pause, Play, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MapboxGlobe } from "./MapboxGlobe";
import type { Location, Transport } from "./types";
import "./map-video.css";
import "./video-controls.css";

export function PreviewModal({ locations, legs, onClose }: { locations: Location[]; legs: Transport[]; onClose: () => void }) {
  const frame = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [restartKey, setRestartKey] = useState(0);
  const totalLegs = Math.max(1, locations.length - 1);
  const totalDuration = 35 * 1000; // 35-second story
  const currentLegIndex = Math.min(totalLegs - 1, Math.floor((progress / 100) * totalLegs));
  const destination = locations[currentLegIndex + 1] ?? locations.at(-1)!;
  const elapsedSec = Math.min(35, Math.floor((progress / 100) * 35));

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!playing) return;
    const intervalMs = 30;
    const step = (intervalMs / totalDuration) * 100;
    const timer = window.setInterval(() => {
      setProgress((value) => (value >= 100 ? 0 : value + step));
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [playing, totalDuration]);

  const restart = () => {
    setProgress(0);
    setRestartKey((value) => value + 1);
    setPlaying(true);
  };
  const download = () => document.querySelector<HTMLButtonElement>(".generate")?.click();
  const fullscreen = () => frame.current?.requestFullscreen?.().catch(() => undefined);

  return (
    <div
      className="modal map-video-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Route video preview"
      onClick={onClose}
    >
      <div className="map-video" ref={frame} onClick={(e) => e.stopPropagation()}>
        <button
          className="close-video-button"
          aria-label="Close video preview"
          title="Close video (Esc)"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <MapboxGlobe
          key={restartKey}
          locations={locations}
          legs={legs}
          progress={progress / 100}
          activeLocation={destination}
          playing={playing}
          className="map-video-globe"
        />
        <div className="video-controls">
          <div className="video-progress" aria-label="Video progress">
            <i style={{ width: `${progress}%` }} />
          </div>
          <div className="video-actions">
            <button aria-label={playing ? "Pause video" : "Play video"} onClick={() => setPlaying((value) => !value)}>
              {playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
            </button>
            <button aria-label="Restart video" onClick={restart}>
              <RotateCcw />
            </button>
            <span>
              0:{elapsedSec < 10 ? "0" : ""}{elapsedSec} / 0:35 · Stop {currentLegIndex + 1} of {totalLegs} · {destination.name}
            </span>
            <button aria-label="Fullscreen" onClick={fullscreen}>
              <Expand />
            </button>
            <button className="download-video" onClick={download}>
              <Download size={16} /> Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
