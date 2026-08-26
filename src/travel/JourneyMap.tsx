import { Play } from "lucide-react";
import { useMemo, useState } from "react";
import { MapboxGlobe } from "./MapboxGlobe";
import { destinations, type Location, type Transport } from "./types";

type Props = {
  locations: Location[];
  legs: Transport[];
  onPreview: () => void;
  onSelectDestination: (location: Location) => void;
  isPaused?: boolean;
};

export function JourneyMap({ locations, legs, onPreview, onSelectDestination, isPaused = false }: Props) {
  const [query, setQuery] = useState("");
  const matches = useMemo(
    () =>
      destinations.filter((place) =>
        `${place.name} ${place.country} ${place.code}`.toLowerCase().includes(query.toLowerCase())
      ),
    [query]
  );

  return (
    <section className="map">
      <MapboxGlobe
        locations={locations}
        legs={legs}
        activeLocation={locations.at(-1)}
        onSelectDestination={onSelectDestination}
        playing={!isPaused}
      />
      <div className="map-search">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="🔍 Search country (e.g. India, Japan, France) or city..."
        />
        {query && (
          <div style={{ maxHeight: "260px", overflowY: "auto" }}>
            {matches.length ? (
              matches.map((place) => (
                <button
                  onClick={() => {
                    onSelectDestination(place);
                    setQuery("");
                  }}
                  key={place.id}
                  style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", width: "100%", textAlign: "left" }}
                >
                  {place.imageUrl && (
                    <img
                      src={place.imageUrl}
                      alt={place.name}
                      style={{ width: "34px", height: "34px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ display: "block", fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {place.name}
                    </b>
                    <small style={{ color: "#64748b" }}>
                      <span style={{ color: "#0284c7", fontWeight: 600 }}>{place.country}</span> · {place.code}
                    </small>
                  </div>
                </button>
              ))
            ) : (
              <p style={{ padding: "10px", margin: 0 }}>No destination found.</p>
            )}
          </div>
        )}
      </div>
      <div className="map-info">
        <b>MAPBOX 3D SATELLITE GLOBE</b>
        <span>Real satellite imagery & dynamic 3D camera travel tracking</span>
      </div>
      <button className="watch" onClick={onPreview}>
        <Play size={15} fill="currentColor" /> Watch journey story
      </button>
    </section>
  );
}
