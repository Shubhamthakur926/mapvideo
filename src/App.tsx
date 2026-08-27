import { Download, Play, Sparkles } from "lucide-react";
import { useState } from "react";
import { JourneyBuilder } from "./travel/JourneyBuilder";
import { JourneyMap } from "./travel/JourneyMap";
import { PreviewModal } from "./travel/PreviewModal";
import type { Location, Transport } from "./travel/types";

const initialLocations: Location[] = [];

export default function App() {
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [legs, setLegs] = useState<Transport[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [autoRecord, setAutoRecord] = useState(false);
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

  const handleGenerateClick = () => {
    if (locations.length < 2) {
      setError("Please select at least 2 destinations to generate a video.");
      return;
    }
    setError("");
    setAutoRecord(true);
    setPreviewOpen(true);
  };

  const handlePreviewClick = () => {
    if (locations.length < 2) {
      setError("Please select at least 2 destinations to preview.");
      return;
    }
    setError("");
    setAutoRecord(false);
    setPreviewOpen(true);
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
        <button className="dark-button" onClick={handlePreviewClick}>
          Preview
        </button>
      </header>
      <main>
        <section className="title">
          <div className="title-row">
            <h1>Travel 3D Route Map Generator</h1>
            <span className="pill">3D Mapbox Satellite Studio</span>
          </div>
          <p>
            Animate your trip itinerary on an interactive 3D globe with real satellite terrain, animated road & flight
            paths, destination photos showcase and smooth 60fps HD video downloads.
          </p>
        </section>
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
            onPreview={handlePreviewClick}
            onSelectDestination={selectDestination}
            isPaused={previewOpen}
          />
        </div>
        <section className="video-card">
          <div className="film">
            <button
              onClick={handlePreviewClick}
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
              onClick={handleGenerateClick}
              disabled={locations.length < 2}
              style={{ opacity: locations.length < 2 ? 0.5 : 1, cursor: locations.length < 2 ? "not-allowed" : "pointer" }}
            >
              <Download size={16} /> Generate HD video
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </section>
      </main>
      {previewOpen && (
        <PreviewModal
          locations={locations}
          legs={legs}
          onClose={() => {
            setPreviewOpen(false);
            setAutoRecord(false);
          }}
          autoRecord={autoRecord}
        />
      )}
    </div>
  );
}
