import type { Location, Transport } from "../../types";
import { vehicleMarks } from "../constants/preview.constants";

interface SummaryCardOverlayProps {
  summaryOpacity: number;
  locations: Location[];
  legs: Transport[];
  totalTripDistance: string;
}

export function SummaryCardOverlay({
  summaryOpacity,
  locations,
  legs,
  totalTripDistance,
}: SummaryCardOverlayProps) {
  return (
    <div
      className="video-summary-card"
      style={{ opacity: summaryOpacity, transition: "opacity 0.05s linear" }}
      aria-live="polite"
    >
      <div className="video-summary-content">
        <div className="video-summary-header">
          <span className="summary-pill">✨ TRAVEL SUMMARY</span>
          <h2>
            {locations[0]?.name} → {locations[locations.length - 1]?.name}
          </h2>
          <p>Complete trip recap & itinerary statistics</p>
        </div>

        <div className="summary-stats-grid">
          <div className="summary-stat-box">
            <span className="stat-label">🌍 TOTAL DISTANCE</span>
            <strong className="stat-value">{totalTripDistance}</strong>
          </div>
          <div className="summary-stat-box">
            <span className="stat-label">📍 DESTINATIONS</span>
            <strong className="stat-value">{locations.length} Cities</strong>
          </div>
          <div className="summary-stat-box">
            <span className="stat-label">🗺️ ROUTE LEGS</span>
            <strong className="stat-value">{Math.max(1, locations.length - 1)} Legs</strong>
          </div>
          <div className="summary-stat-box">
            <span className="stat-label">🚀 TRANSPORTS</span>
            <strong className="stat-value">
              {Array.from(new Set(legs)).map((l) => vehicleMarks[l] || "✈️").join(" ") || "✈️"}
            </strong>
          </div>
        </div>

        <div className="summary-stops-list">
          <div className="stops-list-title">📍 ITINERARY STOPS & CONNECTING LEGS</div>
          <div className="stops-scrollable">
            {locations.map((loc, idx) => (
              <div key={loc.id || idx} className="summary-stop-item">
                <div
                  className={`stop-index-circle ${idx === locations.length - 1 ? "final" : idx === 0 ? "start" : ""}`}
                >
                  {idx + 1}
                </div>
                {loc.imageUrl && (
                  <img src={loc.imageUrl} alt={loc.name} className="summary-stop-thumb" />
                )}
                <div className="summary-stop-info">
                  <strong>{loc.name}</strong>
                  <small>
                    {loc.country} · {loc.code}
                  </small>
                </div>
                {idx < locations.length - 1 ? (
                  <div className="summary-leg-badge">
                    <span>
                      {vehicleMarks[legs[idx] || "flight"]} Next: {(legs[idx] || "flight").toUpperCase()}
                    </span>
                  </div>
                ) : (
                  <div className="summary-leg-badge final-badge">
                    <span>🏁 Final Stop</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

