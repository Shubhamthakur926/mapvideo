import { Download, Play, Sparkles } from "lucide-react";
import { useState } from "react";
import { JourneyBuilder } from "./travel/JourneyBuilder";
import { JourneyMap } from "./travel/JourneyMap";
import { PreviewModal } from "./travel/PreviewModal";
import { getLocationImages, type Location, type Transport } from "./travel/types";

const initialLocations: Location[] = [];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function App() {
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const [legs, setLegs] = useState<Transport[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [autoRecord, setAutoRecord] = useState(false);
  const [error, setError] = useState("");

  // Every route leg takes 4s, then each destination photo is shown for 2s.
  // The extra time is the short intro, recap and outro in the generated film.
  const journeyDuration = locations.slice(1).reduce(
    (total, location) => total + 4 + Math.max(1, getLocationImages(location).length) * 2,
    0
  );
  const duration = 8.6 + journeyDuration;
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

  // 1-Click Multi-Transport 2-Minute Demo Trip (Flight ✈️ -> Train 🚆 -> Car 🚗 -> Bicycle 🚲 -> Walk 🚶)
  const loadMultiTransportDemo = () => {
    const demo: Location[] = [
      {
        id: "delhi",
        name: "Delhi",
        country: "India",
        code: "DEL",
        lat: 28.6139,
        lng: 77.209,
        imageUrl: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=600&auto=format&fit=crop&q=80",
        description: "India Gate & historic capital landmarks",
      },
      {
        id: "mumbai",
        name: "Mumbai",
        country: "India",
        code: "BOM",
        lat: 19.076,
        lng: 72.8777,
        imageUrl: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=600&auto=format&fit=crop&q=80",
        description: "Gateway of India & Marine Drive coast",
      },
      {
        id: "goa",
        name: "Goa Beach",
        country: "India",
        code: "GOI",
        lat: 15.2993,
        lng: 74.124,
        imageUrl: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=600&auto=format&fit=crop&q=80",
        description: "Palolem Beach & tropical palm shores",
      },
      {
        id: "jaipur",
        name: "Jaipur",
        country: "India",
        code: "JAI",
        lat: 26.9124,
        lng: 75.7873,
        imageUrl: "https://images.unsplash.com/photo-1599661046289-e31897846e41?w=600&auto=format&fit=crop&q=80",
        description: "Hawa Mahal & royal pink palaces",
      },
      {
        id: "shimla",
        name: "Shimla Hills",
        country: "India",
        code: "SLV",
        lat: 31.1048,
        lng: 77.1734,
        imageUrl: "https://images.unsplash.com/photo-1597074866923-dc0589150358?w=600&auto=format&fit=crop&q=80",
        description: "Himalayan Ridge & alpine pine forests",
      },
    ];
    setLocations(demo);
    setLegs(["flight", "train", "car", "bicycle"]); // ✈️ Flight -> 🚆 Train -> 🚗 Car -> 🚲 Bicycle
    setError("");
  };

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
            paths, destination photos showcase and smooth 60fps HD video downloads (20s to 4 min).
          </p>
        </section>
        <div className="workspace">
          <JourneyBuilder
            locations={locations}
            legs={legs}
            onAdd={addLocation}
            onRemove={removeLocation}
            onTransport={updateTransport}
            onLoadDemo={loadMultiTransportDemo}
            duration={duration}
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
              <b>Your journey film ({formatTime(duration)} · 1080p HD)</b>
              <small>
                {locations.length >= 2
                  ? `${locations.length - 1} legs · ${locations.length} destinations · ${formatTime(duration)} total`
                  : "Select at least 2 destinations to preview and generate your video"}
              </small>
            </div>
          </div>

          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 700 }}>
            4s travel per leg · 2s per photo
          </div>

          <div className="video-actions">
            <span>0:00 / {formatTime(duration)}</span>
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
          duration={duration}
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
