import Globe from "react-globe.gl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GlobeMethods } from "react-globe.gl";
import type { Location, Transport } from "./types";

type Props = {
  locations: Location[];
  legs?: Transport[];
  progress?: number; // 0 to 1
  activeLocation?: Location;
  playing?: boolean;
  className?: string;
};

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

function greatCirclePoint(start: Location, end: Location, progress: number) {
  const toVector = (place: Location) => {
    const lat = (place.lat * Math.PI) / 180;
    const lng = (place.lng * Math.PI) / 180;
    return [Math.cos(lat) * Math.cos(lng), Math.cos(lat) * Math.sin(lng), Math.sin(lat)] as const;
  };
  const from = toVector(start), to = toVector(end);
  const angle = Math.acos(Math.max(-1, Math.min(1, from[0] * to[0] + from[1] * to[1] + from[2] * to[2])));
  const divisor = Math.sin(angle) || 1;
  const fromWeight = Math.sin((1 - progress) * angle) / divisor;
  const toWeight = Math.sin(progress * angle) / divisor;
  const x = from[0] * fromWeight + to[0] * toWeight;
  const y = from[1] * fromWeight + to[1] * toWeight;
  const z = from[2] * fromWeight + to[2] * toWeight;
  return { lat: (Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI, lng: (Math.atan2(y, x) * 180) / Math.PI };
}

export function FlightGlobe({
  locations,
  legs = [],
  progress: externalProgress,
  activeLocation,
  playing = true,
  className = "",
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const globe = useRef<GlobeMethods | undefined>(undefined);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [internalProgress, setInternalProgress] = useState(0);

  const availableLegs = Math.max(1, locations.length - 1);
  const currentProgress = externalProgress !== undefined ? externalProgress : internalProgress;

  // Compute active leg, current position, and destination stop details
  const { currentPoint, currentMark, currentStop, activeLegIndex, legFraction } = useMemo(() => {
    if (locations.length < 2) {
      return {
        currentPoint: null,
        currentMark: "✈️",
        currentStop: locations[0],
        activeLegIndex: 0,
        legFraction: 0,
      };
    }

    const scaled = Math.min(availableLegs - 0.000001, Math.max(0, currentProgress * availableLegs));
    const legIdx = Math.floor(scaled);
    const fraction = scaled - legIdx;

    const start = locations[legIdx];
    const end = locations[legIdx + 1] || locations[locations.length - 1];
    const transport = legs[legIdx] ?? "flight";
    const mark = vehicleMarks[transport] ?? "✈️";

    const point = greatCirclePoint(start, end, fraction);
    const isFlight = transport === "flight";
    const altitude = isFlight ? Math.sin(fraction * Math.PI) * 0.22 + 0.03 : 0.03;

    // Show starting stop when at beginning of leg, destination stop as vehicle approaches/arrives
    const activeDisplayStop = fraction < 0.2 ? start : end;

    return {
      currentPoint: { ...point, altitude },
      currentMark: mark,
      currentStop: activeDisplayStop,
      activeLegIndex: legIdx,
      legFraction: fraction,
    };
  }, [availableLegs, currentProgress, legs, locations]);

  const arcs = useMemo(
    () =>
      locations.slice(1).map((end, index) => ({
        startLat: locations[index].lat,
        startLng: locations[index].lng,
        endLat: end.lat,
        endLng: end.lng,
      })),
    [locations]
  );

  // Combined HTML markers on the 3D globe: moving vehicle + destination photo markers
  const htmlElements = useMemo(() => {
    const list: Array<{
      lat: number;
      lng: number;
      altitude: number;
      type: "vehicle" | "destination";
      mark?: string;
      location?: Location;
      isActive?: boolean;
    }> = [];

    // 1. Moving Vehicle
    if (currentPoint) {
      list.push({
        lat: currentPoint.lat,
        lng: currentPoint.lng,
        altitude: currentPoint.altitude,
        type: "vehicle",
        mark: currentMark,
      });
    }

    // 2. Destination Photo Pins
    locations.forEach((loc, idx) => {
      const isTarget = currentStop && currentStop.id === loc.id;
      list.push({
        lat: loc.lat,
        lng: loc.lng,
        altitude: isTarget ? 0.06 : 0.02,
        type: "destination",
        location: loc,
        isActive: isTarget,
      });
    });

    return list;
  }, [currentPoint, currentMark, locations, currentStop]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const resize = () => setSize({ width: element.clientWidth || 1, height: element.clientHeight || 1 });
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Smooth camera tracking destination stop
  useEffect(() => {
    const target = activeLocation ?? currentStop ?? locations.at(-1);
    if (target) globe.current?.pointOfView({ lat: target.lat, lng: target.lng, altitude: 2.1 }, 900);
  }, [activeLocation, currentStop, locations]);

  // Internal animation loop only if external progress is not provided
  useEffect(() => {
    if (!playing || externalProgress !== undefined) return;
    let frame = 0;
    const duration = availableLegs * 4500;
    const started = performance.now();
    const animate = (now: number) => {
      setInternalProgress(((now - started) % duration) / duration);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [availableLegs, externalProgress, playing]);

  return (
    <div
      className={`flight-globe relative ${className}`}
      ref={container}
      aria-label={`Interactive earth showing ${locations.map((place) => place.name).join(", ")}`}
    >
      <Globe
        ref={globe}
        width={size.width}
        height={size.height}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
        showAtmosphere
        atmosphereColor="#65d7ff"
        atmosphereAltitude={0.18}
        pointsData={locations}
        pointLat="lat"
        pointLng="lng"
        pointColor={(point) => (point === activeLocation || point === currentStop ? "#ffffff" : "#53d7ff")}
        pointAltitude={0.06}
        pointRadius={0.22}
        arcsData={arcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor={() => ["#a7efff", "#049be5"]}
        arcAltitude={0.22}
        arcStroke={0.8}
        arcDashLength={0.35}
        arcDashGap={0.12}
        arcDashAnimateTime={1800}
        htmlElementsData={htmlElements}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude="altitude"
        htmlTransitionDuration={0}
        htmlElement={(item) => {
          const data = item as {
            type: "vehicle" | "destination";
            mark?: string;
            location?: Location;
            isActive?: boolean;
          };

          if (data.type === "vehicle") {
            const marker = document.createElement("div");
            marker.textContent = data.mark || "✈️";
            marker.setAttribute("aria-label", "Moving vehicle");
            marker.style.cssText =
              "font-size:34px;line-height:1;filter:drop-shadow(0 2px 6px #001a33);pointer-events:none;transform:translate(-50%,-50%);z-index:10;";
            return marker;
          }

          // Destination Photo Marker
          const loc = data.location;
          if (!loc) return document.createElement("div");

          const card = document.createElement("div");
          card.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px 8px 4px 4px;
            border-radius: 20px;
            background: rgba(3, 16, 29, 0.88);
            backdrop-filter: blur(8px);
            border: 1.5px solid ${data.isActive ? "#38bdf8" : "rgba(255,255,255,0.2)"};
            box-shadow: 0 4px 16px rgba(0,0,0,0.6);
            transform: translate(-50%, -120%) scale(${data.isActive ? 1.08 : 0.82});
            transition: all 0.3s ease;
            pointer-events: none;
          `;

          if (loc.imageUrl) {
            const img = document.createElement("img");
            img.src = loc.imageUrl;
            img.alt = loc.name;
            img.style.cssText = "width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1px solid #fff;";
            card.appendChild(img);
          }

          const label = document.createElement("div");
          label.style.cssText = "display: flex; flex-direction: column; font-family: system-ui, sans-serif;";
          label.innerHTML = `
            <span style="font-size: 11px; font-weight: 700; color: #fff; white-space: nowrap;">${loc.name}</span>
            <span style="font-size: 9px; color: #94a3b8; white-space: nowrap;">${loc.country}</span>
          `;
          card.appendChild(label);

          return card;
        }}
        enablePointerInteraction={!className.includes("preview")}
        onGlobeReady={() => {
          const target = activeLocation ?? locations.at(-1);
          if (target) globe.current?.pointOfView({ lat: target.lat, lng: target.lng, altitude: 2.1 }, 0);
        }}
      />

      {/* Prominent Arrival Destination Photo Popup Card */}
      {currentStop && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            maxWidth: "320px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 14px",
            borderRadius: "18px",
            background: "rgba(3, 16, 29, 0.92)",
            backdropFilter: "blur(12px)",
            border: "1.5px solid rgba(56, 189, 248, 0.5)",
            boxShadow: "0 12px 30px rgba(0,0,0,0.6)",
            color: "#fff",
            zIndex: 30,
            pointerEvents: "none",
            animation: "fadeIn 0.3s ease",
          }}
        >
          {currentStop.imageUrl && (
            <img
              src={currentStop.imageUrl}
              alt={currentStop.name}
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "12px",
                objectFit: "cover",
                border: "1.5px solid rgba(255,255,255,0.3)",
                flexShrink: 0,
              }}
            />
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "10px", fontWeight: 800, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {legFraction < 0.3 ? "📍 Departing Stop" : "🎯 Destination Stop"}
            </div>
            <div style={{ fontSize: "15px", fontWeight: 700, fontFamily: "Georgia, serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {currentStop.name}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>
              {currentStop.country} · <span style={{ color: "#38bdf8", fontWeight: 600 }}>{currentStop.code}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
