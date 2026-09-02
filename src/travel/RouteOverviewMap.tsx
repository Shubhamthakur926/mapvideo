import mapboxgl from "mapbox-gl";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { MAPBOX_TOKEN } from "./MapboxGlobe";
import type { Location } from "./types";

/**
 * Handle exposed to the parent (PreviewModal) so the HD video exporter can:
 *  1. Grab the live mapboxgl.Map instance to call map.project([lng, lat])
 *     and get EXACT pixel coordinates for drawing flags/markers on the
 *     composite export canvas (no manual crop-math, no coordinate drift).
 *  2. Grab the underlying <canvas class="mapboxgl-canvas"> for capture,
 *     the same pattern already used for the 3D globe in PreviewModal.
 */
export interface RouteOverviewMapHandle {
  getMap: () => mapboxgl.Map | null;
  project: (lng: number, lat: number) => { x: number; y: number } | null;
}

type Props = {
  locations: Location[];
  className?: string;
};

export const RouteOverviewMap = forwardRef<RouteOverviewMapHandle, Props>(
  ({ locations, className = "" }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<mapboxgl.Marker[]>([]);
    const [loaded, setLoaded] = useState(false);

    useImperativeHandle(ref, () => ({
      getMap: () => mapRef.current,
      project: (lng: number, lat: number) => {
        const map = mapRef.current;
        if (!map) return null;
        const p = map.project([lng, lat]);
        return { x: p.x, y: p.y };
      },
    }));

    // Create the flat Mapbox instance once. It stays mounted for the whole
    // preview lifecycle (parent controls visibility via opacity) so it has
    // plenty of time to load its style/tiles before the Route Overview
    // stage actually needs to be captured for the HD export.
    useEffect(() => {
      if (!containerRef.current || !MAPBOX_TOKEN) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      let map: mapboxgl.Map | null = null;
      try {
        map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/satellite-streets-v12",
          projection: "mercator",
          center: [0, 20],
          zoom: 1.5,
          pitch: 0,
          bearing: 0,
          interactive: false,
          attributionControl: false,
          preserveDrawingBuffer: true,
        });
      } catch (err) {
        console.warn("RouteOverviewMap initialization error:", err);
        return;
      }

      mapRef.current = map;

      map.on("error", (e) => {
        console.warn("Route overview mapbox warning:", e);
      });

      map.on("load", () => {
        if (!mapRef.current) return;
        try {
          if (!map.getSource("route-overview-line")) {
            map.addSource("route-overview-line", {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: [] },
              },
            });

            map.addLayer({
              id: "route-overview-line-glow",
              type: "line",
              source: "route-overview-line",
              layout: { "line-cap": "round", "line-join": "round" },
              paint: { "line-color": "#0284c7", "line-width": 6, "line-opacity": 0.35, "line-blur": 3 },
            });

            map.addLayer({
              id: "route-overview-line-dash",
              type: "line",
              source: "route-overview-line",
              layout: { "line-cap": "round", "line-join": "round" },
              paint: {
                "line-color": "#0284c7",
                "line-width": 3,
                "line-dasharray": [2, 1.5],
              },
            });
          }
          setLoaded(true);
          map.resize();
        } catch (e) {
          console.warn("Error setting up route overview layers:", e);
        }
      });

      const resizeObserver = new ResizeObserver(() => {
        try {
          mapRef.current?.resize();
        } catch {
          // ignore
        }
      });
      if (containerRef.current) resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
        markersRef.current.forEach((m) => {
          try {
            m.remove();
          } catch {
            // ignore
          }
        });
        markersRef.current = [];
        try {
          map?.remove();
        } catch {
          // ignore
        }
        mapRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Draw the route line + stop markers + start/finish flags whenever the
    // stop list changes, and fit the camera to frame every stop.
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !loaded || locations.length === 0) return;

      try {
        const source = map.getSource("route-overview-line") as mapboxgl.GeoJSONSource | undefined;
        if (source) {
          source.setData({
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: locations.map((l) => [l.lng, l.lat]),
            },
          });
        }

        markersRef.current.forEach((m) => {
          try {
            m.remove();
          } catch {
            // ignore
          }
        });
        markersRef.current = [];

        locations.forEach((loc, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === locations.length - 1;

          const dot = document.createElement("div");
          dot.style.cssText = `
            display:flex; align-items:center; justify-content:center;
            width: ${isFirst || isLast ? "30px" : "22px"};
            height: ${isFirst || isLast ? "30px" : "22px"};
            border-radius: 50%;
            background: ${isFirst ? "#0284c7" : isLast ? "#16a34a" : "#64748b"};
            border: 2.5px solid #ffffff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.35);
            color: #fff; font-weight: 800; font-size: 11px;
            font-family: system-ui, -apple-system, sans-serif;
          `;
          if (!isFirst && !isLast) dot.textContent = `${idx + 1}`;

          const dotMarker = new mapboxgl.Marker({ element: dot, anchor: "center" })
            .setLngLat([loc.lng, loc.lat])
            .addTo(map);
          markersRef.current.push(dotMarker);

          if (isFirst || isLast) {
            const flagEl = document.createElement("div");
            flagEl.style.cssText = "font-size: 26px; transform: translateY(-22px); pointer-events:none;";
            flagEl.textContent = isFirst ? "🚩" : "🏁";
            const flagMarker = new mapboxgl.Marker({ element: flagEl, anchor: "bottom" })
              .setLngLat([loc.lng, loc.lat])
              .addTo(map);
            markersRef.current.push(flagMarker);

            const labelEl = document.createElement("div");
            labelEl.style.cssText = `
              padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 800;
              font-family: system-ui, -apple-system, sans-serif; color: #fff; white-space: nowrap;
              background: ${isFirst ? "#0284c7" : "#16a34a"};
              transform: translateY(18px);
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              pointer-events: none;
            `;
            labelEl.textContent = loc.name;
            const labelMarker = new mapboxgl.Marker({ element: labelEl, anchor: "top" })
              .setLngLat([loc.lng, loc.lat])
              .addTo(map);
            markersRef.current.push(labelMarker);
          }
        });

        map.resize();
        if (locations.length === 1) {
          map.jumpTo({ center: [locations[0].lng, locations[0].lat], zoom: 4 });
        } else {
          const bounds = new mapboxgl.LngLatBounds();
          locations.forEach((l) => bounds.extend([l.lng, l.lat]));
          const canvas = map.getCanvas();
          if (canvas && canvas.clientWidth > 0 && canvas.clientHeight > 0) {
            map.fitBounds(bounds, { padding: 60, duration: 0, maxZoom: 10 });
          } else {
            const centerLng = (locations[0].lng + locations[locations.length - 1].lng) / 2;
            const centerLat = (locations[0].lat + locations[locations.length - 1].lat) / 2;
            map.jumpTo({ center: [centerLng, centerLat], zoom: 2 });
          }
        }
      } catch (err) {
        console.warn("RouteOverviewMap update error:", err);
      }
    }, [locations, loaded]);

    return (
      <div
        className={`route-overview-map ${className}`}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <div ref={containerRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
        {!MAPBOX_TOKEN && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              color: "#0f172a",
              fontSize: "13px",
              background: "#eef6ff",
            }}
          >
            Route map unavailable — add VITE_MAPBOX_TOKEN.
          </div>
        )}
      </div>
    );
  }
);

RouteOverviewMap.displayName = "RouteOverviewMap";