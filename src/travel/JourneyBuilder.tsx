import { Image as ImageIcon, MapPin, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { destinations, transportLabels, type Location, type Transport } from "./types";

type Props = {
  locations: Location[];
  legs: Transport[];
  onAdd: (location: Location) => void;
  onRemove: (index: number) => void;
  onTransport: (index: number, transport: Transport) => void;
};

export function JourneyBuilder({ locations, legs, onAdd, onRemove, onTransport }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountryFilter, setSelectedCountryFilter] = useState("ALL");

  // Get unique sorted list of all available countries
  const availableCountries: string[] = useMemo(() => {
    const countries = Array.from(new Set(destinations.map((d: Location) => d.country))).sort();
    return ["ALL", ...countries];
  }, []);

  // Filter available destinations that are not yet added
  const filteredDestinations: Location[] = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return destinations
      .filter((place: Location) => !locations.some((location) => location.id.startsWith(place.id)))
      .filter((place: Location) => {
        const matchesCountryFilter = selectedCountryFilter === "ALL" || place.country === selectedCountryFilter;
        const matchesQuery =
          !query ||
          place.name.toLowerCase().includes(query) ||
          place.country.toLowerCase().includes(query) ||
          place.code.toLowerCase().includes(query) ||
          (place.description && place.description.toLowerCase().includes(query));
        return matchesCountryFilter && matchesQuery;
      });
  }, [locations, searchQuery, selectedCountryFilter]);

  return (
    <aside className="route-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2>Your itinerary</h2>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: locations.length === 0 ? "#64748b" : "#0284c7",
            background: locations.length === 0 ? "#f1f5f9" : "#e0f2fe",
            padding: "3px 9px",
            borderRadius: "12px",
          }}
        >
          {locations.length} selected
        </span>
      </div>
      <p className="muted">
        {locations.length === 0
          ? "Select your starting point, then pick where to go next"
          : "Stops show landmark photos upon arrival before traveling to the next stop"}
      </p>

      {locations.length === 0 && (
        <div
          style={{
            padding: "24px 16px",
            textAlign: "center",
            background: "#f8fafc",
            borderRadius: "16px",
            border: "1.5px dashed #cbd5e1",
            margin: "14px 0",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#e0f2fe",
              color: "#0284c7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 8px",
            }}
          >
            <MapPin size={20} />
          </div>
          <b style={{ display: "block", color: "#1e293b", fontSize: "14px" }}>0 destinations selected</b>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>
            Choose where your journey begins, then select where you want to go!
          </p>
        </div>
      )}

      {locations.map((location, index) => (
        <div key={location.id}>
          <div className="place">
            {location.imageUrl ? (
              <img
                src={location.imageUrl}
                alt={location.name}
                className="pin"
                style={{ objectFit: "cover", padding: 0, overflow: "hidden", border: "1.5px solid #0fa7ff" }}
              />
            ) : (
              <span className="pin">{index ? `${index + 1}` : <MapPin size={17} />}</span>
            )}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: index === 0 ? "#059669" : "#0284c7",
                    letterSpacing: "0.06em",
                  }}
                >
                  {index === 0 ? "📍 Start" : `🎯 Stop ${index + 1}`}
                </span>
              </div>
              <b>{location.name}</b>
              <small>
                {location.country} · <span style={{ color: "#078fe3" }}>{location.code}</span>
              </small>
            </div>
            <button className="remove" aria-label={`Remove ${location.name}`} onClick={() => onRemove(index)}>
              ×
            </button>
          </div>
          {index < locations.length - 1 && (
            <div className="leg">
              <select
                aria-label={`Transport to ${locations[index + 1]?.name}`}
                value={legs[index] || "flight"}
                onChange={(event) => onTransport(index, event.target.value as Transport)}
              >
                {Object.entries(transportLabels).map(([type, label]) => (
                  <option value={type} key={type}>
                    {label}
                  </option>
                ))}
              </select>
              <small>0:18</small>
            </div>
          )}
        </div>
      ))}

      <div className="picker">
        <button
          className="add"
          onClick={() => {
            setPickerOpen((open) => !open);
            setSearchQuery("");
            setSelectedCountryFilter("ALL");
          }}
        >
          <Plus size={16} />
          {locations.length === 0
            ? "Select starting location"
            : locations.length === 1
            ? "Add destination (Where to go next)"
            : "Add destination"}
        </button>

        {pickerOpen && (
          <div
            className="menu"
            style={{
              maxHeight: "360px",
              overflowY: "hidden",
              display: "flex",
              flexDirection: "column",
              padding: "10px",
            }}
          >
            {/* Search Country or City Input */}
            <div style={{ position: "relative", marginBottom: "8px" }}>
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Search country (e.g. India, Japan, France) or city..."
                style={{
                  width: "100%",
                  padding: "9px 32px 9px 12px",
                  borderRadius: "10px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                  background: "#ffffff",
                  color: "#0f172a",
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    fontSize: "16px",
                    cursor: "pointer",
                    padding: "0 4px",
                  }}
                >
                  ×
                </button>
              )}
            </div>

            {/* Quick Country Filter Pills */}
            <div
              style={{
                display: "flex",
                gap: "6px",
                overflowX: "auto",
                paddingBottom: "8px",
                marginBottom: "6px",
                borderBottom: "1px solid #e2e8f0",
                scrollbarWidth: "none",
              }}
            >
              {availableCountries.slice(0, 16).map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCountryFilter(c)}
                  style={{
                    padding: "3px 10px",
                    borderRadius: "14px",
                    fontSize: "11px",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    border: "1px solid",
                    borderColor: selectedCountryFilter === c ? "#0284c7" : "#e2e8f0",
                    background: selectedCountryFilter === c ? "#e0f2fe" : "#f8fafc",
                    color: selectedCountryFilter === c ? "#0284c7" : "#64748b",
                    cursor: "pointer",
                  }}
                >
                  {c === "ALL" ? "🌍 All Countries" : c}
                </button>
              ))}
            </div>

            {/* Destination List */}
            <div style={{ overflowY: "auto", maxHeight: "230px", display: "flex", flexDirection: "column", gap: "3px" }}>
              {filteredDestinations.length > 0 ? (
                filteredDestinations.map((place) => (
                  <button
                    key={place.id}
                    onClick={() => {
                      onAdd(place);
                      setPickerOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "7px 10px",
                      borderRadius: "10px",
                      textAlign: "left",
                      width: "100%",
                    }}
                  >
                    {place.imageUrl && (
                      <img
                        src={place.imageUrl}
                        alt={place.name}
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "8px",
                          objectFit: "cover",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ display: "block", fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {place.name}
                      </b>
                      <small style={{ color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ color: "#0284c7", fontWeight: 600 }}>{place.country}</span>
                        {place.description && <span>· {place.description.slice(0, 32)}</span>}
                      </small>
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        color: "#0369a1",
                        background: "#e0f2fe",
                        padding: "2px 6px",
                        borderRadius: "6px",
                        flexShrink: 0,
                      }}
                    >
                      {place.code}
                    </span>
                  </button>
                ))
              ) : (
                <div style={{ padding: "20px 10px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                  No destinations found matching "<b>{searchQuery}</b>"
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
