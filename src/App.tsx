import { Play, Sparkles } from "lucide-react";
import { useState } from "react";
import { PreviewModal } from "./travel/PreviewModal";
import { parseJsonItinerary } from "./travel/json-itinerary";
import mockJourney from "./travel/mock-journey.json";
import { getLocationImages } from "./travel/types";

const journey = parseJsonItinerary(JSON.stringify(mockJourney));

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
}

export default function App() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const journeyDuration = journey.locations.slice(1).reduce(
    (total, location) => total + 4 + Math.max(1, getLocationImages(location).length) * 2,
    0
  );
  const duration = 8.6 + journeyDuration;
  const startName = journey.locations[0]?.name ?? "Start";
  const endName = journey.locations.at(-1)?.name ?? "Destination";

  return (
    <div className="app">
      <header>
        <div className="brand">
          <span className="brand-icon"><Sparkles size={18} /></span>
          <b>roamly</b><em>studio</em>
        </div>
      </header>
      <main className="mock-journey-screen">
        <section className="title">
          <div className="title-row">
            <h1>Travel Route Video</h1>
            <span className="pill">JSON powered</span>
          </div>
          <p>The route, photos and videos are loaded from <code>mock-journey.json</code>.</p>
        </section>
        <section className="video-card mock-video-card">
          <div className="film">
            <button onClick={() => setPreviewOpen(true)} aria-label="Start video">
              <Play size={17} fill="currentColor" />
            </button>
            <div>
              <b>{startName} to {endName}</b>
              <small>{journey.locations.length} stops · {formatTime(duration)} video</small>
            </div>
          </div>
          <button className="generate" onClick={() => setPreviewOpen(true)}>
            <Play size={16} fill="currentColor" /> Start video
          </button>
        </section>
      </main>
      {previewOpen && (
        <PreviewModal
          locations={journey.locations}
          legs={journey.legs}
          duration={duration}
          onClose={() => setPreviewOpen(false)}
          autoRecord={false}
        />
      )}
    </div>
  );
}
