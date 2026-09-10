import { RouteOverviewMap, type RouteOverviewMapHandle } from "../../RouteOverviewMap";
import type { Location } from "../../types";

interface RouteOverviewOverlayProps {
  isRouteMap: boolean;
  routeMapOpacity: number;
  routeOverviewRef: React.RefObject<RouteOverviewMapHandle | null>;
  locations: Location[];
  totalTripDistance: string;
}

export function RouteOverviewOverlay({
  isRouteMap,
  routeMapOpacity,
  routeOverviewRef,
  locations,
  totalTripDistance,
}: RouteOverviewOverlayProps) {
  return (
    <div
      className="video-summary-card"
      style={{
        opacity: routeMapOpacity,
        transition: "opacity 0.05s linear",
        pointerEvents: isRouteMap ? "auto" : "none",
        zIndex: isRouteMap ? 20 : -1,
        padding: 0,
        background: "transparent",
        backdropFilter: "none",
      }}
      aria-live="polite"
      aria-hidden={!isRouteMap}
    >
      <div style={{ position: "absolute", inset: 0 }}>
        <RouteOverviewMap ref={routeOverviewRef} locations={locations} />
      </div>

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          textAlign: "center",
          padding: "24px 20px 36px",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        <span
          className="summary-pill"
          style={{
            background: "rgba(2, 132, 199, 0.9)",
            color: "#ffffff",
            border: "1px solid rgba(56, 189, 248, 0.5)",
          }}
        >
          🗺️ ROUTE OVERVIEW
        </span>
        <h2
          style={{
            color: "#ffffff",
            margin: "8px 0 2px",
            font: "700 clamp(22px, 3.5vw, 30px) Georgia, serif",
            textShadow: "0 2px 10px rgba(0,0,0,0.8)",
          }}
        >
          {locations[0]?.name} → {locations.at(-1)?.name}
        </h2>
        <p
          style={{
            color: "#e2e8f0",
            margin: 0,
            fontSize: "14px",
            fontWeight: 600,
            textShadow: "0 1px 8px rgba(0,0,0,0.8)",
          }}
        >
          Complete 2D route map · {totalTripDistance} travelled
        </p>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "space-between",
          padding: "36px 24px 20px",
          background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)",
          color: "#ffffff",
          fontSize: "14px",
          fontWeight: 600,
          zIndex: 2,
          pointerEvents: "none",
          textShadow: "0 1px 8px rgba(0,0,0,0.8)",
        }}
      >
        <span>
          🚩 Start: <strong>{locations[0]?.name}</strong>
        </span>
        <span>
          🏁 Finish: <strong>{locations.at(-1)?.name}</strong>
        </span>
      </div>
    </div>
  );
}

