import mapboxgl from "mapbox-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Location, Transport } from "./types";

export const MAPBOX_TOKEN =
  (import.meta as { env?: { VITE_MAPBOX_TOKEN?: string } }).env?.VITE_MAPBOX_TOKEN;

type Props = {
  locations: Location[];
  legs?: Transport[];
  progress?: number; // 0 to 1
  activeLocation?: Location;
  playing?: boolean;
  className?: string;
  onSelectDestination?: (location: Location) => void;
};

const vehicleMarks: Record<Transport, string> = {
  car: "🚗",
  flight: "✈️",
  train: "🚆",
  taxi: "🚕",
  bicycle: "🚲",
  bus: "🚌",
  walking: "🚶",
  ship: "🚢",
};

function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

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
  return {
    lat: (Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI,
    lng: (Math.atan2(y, x) * 180) / Math.PI,
  };
}

function generateArcCoordinates(start: Location, end: Location, segments = 50): [number, number][] {
  const coords: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const pt = greatCirclePoint(start, end, i / segments);
    coords.push([pt.lng, pt.lat]);
  }
  return coords;
}

function generateCurvedRoadCoordinates(start: Location, end: Location, segments = 60): [number, number][] {
  const coords: [number, number][] = [];
  const dLng = end.lng - start.lng;
  const dLat = end.lat - start.lat;
  const dist = Math.hypot(dLng, dLat);

  // Perpendicular curvature offset for realistic highway turns
  const perpLng = -dLat * 0.12;
  const perpLat = dLng * 0.12;
  const midLng = (start.lng + end.lng) / 2 + perpLng;
  const midLat = (start.lat + end.lat) / 2 + perpLat;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const wave = Math.sin(t * Math.PI * 4) * 0.015 * dist;
    const lng = (1 - t) * (1 - t) * start.lng + 2 * (1 - t) * t * midLng + t * t * end.lng + wave;
    const lat = (1 - t) * (1 - t) * start.lat + 2 * (1 - t) * t * midLat + t * t * end.lat + wave;
    coords.push([lng, lat]);
  }
  return coords;
}

const directionsCache = new Map<string, [number, number][]>();

async function fetchLegRoute(start: Location, end: Location, transport: Transport): Promise<[number, number][]> {
  if (transport === "flight") {
    return generateArcCoordinates(start, end, 60);
  }

  const profile =
    transport === "walking"
      ? "mapbox/walking"
      : transport === "bicycle"
      ? "mapbox/cycling"
      : "mapbox/driving";

  const cacheKey = `${profile}-${start.lng.toFixed(4)},${start.lat.toFixed(4)}-${end.lng.toFixed(4)},${end.lat.toFixed(4)}`;
  if (directionsCache.has(cacheKey)) {
    return directionsCache.get(cacheKey)!;
  }

  try {
    const url = `https://api.mapbox.com/directions/v5/${profile}/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0 && data.routes[0].geometry?.coordinates) {
        const coords = data.routes[0].geometry.coordinates as [number, number][];
        if (coords.length > 1) {
          directionsCache.set(cacheKey, coords);
          return coords;
        }
      }
    }
  } catch {
    // Network or offline fallback
  }

  const fallback = generateCurvedRoadCoordinates(start, end, 60);
  directionsCache.set(cacheKey, fallback);
  return fallback;
}

function getPointAlongPolyline(
  coords: [number, number][],
  fraction: number
): { pt: { lat: number; lng: number }; bearing: number } {
  if (!coords || coords.length === 0) {
    return { pt: { lat: 0, lng: 0 }, bearing: 0 };
  }
  if (coords.length === 1 || fraction <= 0) {
    const bearing = coords.length > 1 ? calculateBearing(coords[0][1], coords[0][0], coords[1][1], coords[1][0]) : 0;
    return { pt: { lat: coords[0][1], lng: coords[0][0] }, bearing };
  }
  if (fraction >= 1) {
    const last = coords[coords.length - 1];
    const prev = coords[coords.length - 2] || last;
    const bearing = calculateBearing(prev[1], prev[0], last[1], last[0]);
    return { pt: { lat: last[1], lng: last[0] }, bearing };
  }

  const dists: number[] = [0];
  let totalDist = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const d = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    totalDist += d;
    dists.push(totalDist);
  }

  if (totalDist === 0) {
    return { pt: { lat: coords[0][1], lng: coords[0][0] }, bearing: 0 };
  }

  const targetDist = fraction * totalDist;
  let segIdx = 0;
  for (let i = 0; i < dists.length - 1; i++) {
    if (targetDist >= dists[i] && targetDist <= dists[i + 1]) {
      segIdx = i;
      break;
    }
  }

  const segStart = dists[segIdx];
  const segEnd = dists[segIdx + 1];
  const segFraction = segEnd > segStart ? (targetDist - segStart) / (segEnd - segStart) : 0;

  const p1 = coords[segIdx];
  const p2 = coords[segIdx + 1] || p1;

  const lng = p1[0] + (p2[0] - p1[0]) * segFraction;
  const lat = p1[1] + (p2[1] - p1[1]) * segFraction;
  const bearing = calculateBearing(p1[1], p1[0], p2[1], p2[0]);

  return { pt: { lat, lng }, bearing };
}

function getPolylineUpTo(coords: [number, number][], fraction: number): [number, number][] {
  if (!coords || coords.length === 0) return [];
  if (fraction <= 0) return [coords[0]];
  if (fraction >= 1) return coords;

  const dists: number[] = [0];
  let totalDist = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const d = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    totalDist += d;
    dists.push(totalDist);
  }

  const targetDist = fraction * totalDist;
  const result: [number, number][] = [];

  for (let i = 0; i < dists.length - 1; i++) {
    result.push(coords[i]);
    if (targetDist >= dists[i] && targetDist <= dists[i + 1]) {
      const segStart = dists[i];
      const segEnd = dists[i + 1];
      const segFraction = segEnd > segStart ? (targetDist - segStart) / (segEnd - segStart) : 0;
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const lng = p1[0] + (p2[0] - p1[0]) * segFraction;
      const lat = p1[1] + (p2[1] - p1[1]) * segFraction;
      result.push([lng, lat]);
      break;
    }
  }

  return result;
}

function calculateDistanceKm(start: Location, end: Location): number {
  const R = 6371;
  const dLat = ((end.lat - start.lat) * Math.PI) / 180;
  const dLng = ((end.lng - start.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((start.lat * Math.PI) / 180) *
      Math.cos((end.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getCinematicCamera(start: Location, end: Location, fraction: number, transport: Transport) {
  const dist = calculateDistanceKm(start, end);
  const arc = Math.sin(fraction * Math.PI);

  if (transport === "flight") {
    if (dist >= 3000) {
      return {
        zoom: 3.8 - arc * 1.5, // 3.8 at takeoff/landing -> 2.3 cruising
        pitch: 38 - arc * 8,    // 38° -> 30°
      };
    } else if (dist >= 1000) {
      return {
        zoom: 4.3 - arc * 1.1, // 4.3 -> 3.2
        pitch: 40 - arc * 6,   // 40° -> 34°
      };
    } else {
      return {
        zoom: 4.8 - arc * 0.8, // 4.8 -> 4.0
        pitch: 42 - arc * 5,   // 42° -> 37°
      };
    }
  }

  // Overland / Surface Transports (Train, Car, Bus, Ship, etc.)
  if (dist >= 2000) {
    return { zoom: 3.4, pitch: 35 };
  } else if (dist >= 600) {
    return { zoom: 4.2, pitch: 38 };
  } else if (dist >= 150) {
    return { zoom: 4.8, pitch: 40 };
  } else {
    // Local / city travel - clear road level
    return { zoom: 5.3, pitch: 42 };
  }
}

export function MapboxGlobe({
  locations,
  legs = [],
  progress: externalProgress,
  activeLocation,
  playing = true,
  className = "",
  onSelectDestination,
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const vehicleMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const vehicleIconRef = useRef<HTMLSpanElement | null>(null);
  const stopMarkersRef = useRef<Array<{ marker: mapboxgl.Marker; badgeEl: HTMLElement; id: string }>>([]);
  const [internalProgress, setInternalProgress] = useState(0);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapStyle, setMapStyle] = useState<string>("mapbox://styles/mapbox/satellite-streets-v12");

  const totalLegs = Math.max(1, locations.length - 1);
  const currentProgress = externalProgress !== undefined ? externalProgress : internalProgress;

  // Real road coordinates for all legs
  const [legRoutes, setLegRoutes] = useState<[number, number][][]>(() => {
    const initial: [number, number][][] = [];
    for (let i = 0; i < locations.length - 1; i++) {
      const tr = legs[i] ?? "flight";
      if (tr === "flight") {
        initial.push(generateArcCoordinates(locations[i], locations[i + 1], 50));
      } else {
        initial.push(generateCurvedRoadCoordinates(locations[i], locations[i + 1], 50));
      }
    }
    return initial;
  });

  // Fetch real road turn-by-turn geometry
  useEffect(() => {
    let active = true;
    const fetchAllRoutes = async () => {
      const promises = [];
      for (let i = 0; i < locations.length - 1; i++) {
        promises.push(fetchLegRoute(locations[i], locations[i + 1], legs[i] ?? "flight"));
      }
      const results = await Promise.all(promises);
      if (active) {
        setLegRoutes(results);
      }
    };
    fetchAllRoutes();
    return () => {
      active = false;
    };
  }, [locations, legs]);

  // Active leg & destination stop computation along real roads
  const { currentPoint, currentMark, currentStop, activeLegIndex, legFraction, bearing, transport, currentStart, currentEnd } = useMemo(() => {
    if (locations.length < 2) {
      return {
        currentPoint: locations[0] ? { lat: locations[0].lat, lng: locations[0].lng } : null,
        currentMark: "✈️",
        currentStop: locations[0],
        activeLegIndex: 0,
        legFraction: 0,
        bearing: 0,
        transport: "flight" as Transport,
        currentStart: locations[0] || { id: "0", name: "", country: "", code: "", lat: 0, lng: 0 },
        currentEnd: locations[0] || { id: "0", name: "", country: "", code: "", lat: 0, lng: 0 },
      };
    }

    const scaled = Math.min(totalLegs - 0.000001, Math.max(0, currentProgress * totalLegs));
    const legIdx = Math.floor(scaled);
    const fraction = scaled - legIdx;

    const start = locations[legIdx];
    const end = locations[legIdx + 1] || locations[locations.length - 1];
    const curTransport = legs[legIdx] ?? "flight";
    const mark = vehicleMarks[curTransport] ?? "✈️";

    const coords = legRoutes[legIdx] || (curTransport === "flight"
      ? generateArcCoordinates(start, end, 50)
      : generateCurvedRoadCoordinates(start, end, 50));

    const { pt: point, bearing: calculatedBearing } = getPointAlongPolyline(coords, fraction);
    const activeDisplayStop = fraction < 0.3 ? start : end;

    return {
      currentPoint: point,
      currentMark: mark,
      currentStop: activeDisplayStop,
      activeLegIndex: legIdx,
      legFraction: fraction,
      bearing: calculatedBearing,
      transport: curTransport,
      currentStart: start,
      currentEnd: end,
    };
  }, [totalLegs, currentProgress, legs, locations, legRoutes]);

  // Initialize Mapbox 3D Globe
  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const initialCenter: [number, number] = locations[0] ? [locations[0].lng, locations[0].lat] : [0, 20];

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      projection: "globe",
      center: initialCenter,
      zoom: 2.8,
      pitch: 38,
      bearing: 0,
      antialias: true,
      maxZoom: 9,
      renderWorldCopies: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      setMapLoaded(true);
      map.resize();

      // Atmospheric space background
      map.setFog({
        color: "rgb(186, 210, 240)",
        "high-color": "rgb(36, 92, 223)",
        "horizon-blend": 0.03,
        "space-color": "rgb(11, 11, 25)",
        "star-intensity": 0.6,
      });

      // Add full route geojson source & layers
      const fullRouteFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = [];
      for (let i = 0; i < locations.length - 1; i++) {
        fullRouteFeatures.push({
          type: "Feature",
          properties: { leg: i },
          geometry: {
            type: "LineString",
            coordinates: generateArcCoordinates(locations[i], locations[i + 1]),
          },
        });
      }

      if (!map.getSource("journey-route-base")) {
        map.addSource("journey-route-base", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: fullRouteFeatures,
          },
        });

        map.addLayer({
          id: "journey-route-line-glow",
          type: "line",
          source: "journey-route-base",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#0284c7",
            "line-width": 7,
            "line-opacity": 0.45,
            "line-blur": 3,
          },
        });

        map.addLayer({
          id: "journey-route-line-base",
          type: "line",
          source: "journey-route-base",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#38bdf8",
            "line-width": 2.5,
            "line-opacity": 0.55,
            "line-dasharray": [2, 2],
          },
        });
      }

      // Active completed trail layer
      if (!map.getSource("journey-route-active")) {
        map.addSource("journey-route-active", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });

        map.addLayer({
          id: "journey-route-active-glow",
          type: "line",
          source: "journey-route-active",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#38bdf8",
            "line-width": 8,
            "line-opacity": 0.7,
            "line-blur": 4,
          },
        });

        map.addLayer({
          id: "journey-route-active-core",
          type: "line",
          source: "journey-route-active",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#ffffff",
            "line-width": 3.5,
            "line-opacity": 1,
          },
        });
      }
    });

    // Remove any previous vehicle marker
    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.remove();
      vehicleMarkerRef.current = null;
      vehicleIconRef.current = null;
    }

    // Create Single Vehicle Marker with glowing badge
    const vehicleEl = document.createElement("div");
    vehicleEl.className = "mapbox-vehicle-marker";
    vehicleEl.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(3, 16, 29, 0.92);
      border: 2px solid #38bdf8;
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.9), 0 8px 24px rgba(0,0,0,0.85);
      pointer-events: none;
      z-index: 100;
    `;

    const iconSpan = document.createElement("span");
    iconSpan.style.cssText = "font-size: 26px; line-height: 1; display: block; user-select: none;";
    iconSpan.textContent = currentMark || "✈️";
    vehicleEl.appendChild(iconSpan);
    vehicleIconRef.current = iconSpan;

    const vehicleMarker = new mapboxgl.Marker({ element: vehicleEl, anchor: "center" })
      .setLngLat(initialCenter)
      .addTo(map);

    vehicleMarkerRef.current = vehicleMarker;

    // Resize observer to ensure map always fills its parent container
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    const timer = setTimeout(() => {
      map.resize();
    }, 200);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.remove();
        vehicleMarkerRef.current = null;
        vehicleIconRef.current = null;
      }
      stopMarkersRef.current.forEach((item) => item.marker.remove());
      stopMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [mapStyle]);

  // Update Route GeoJSON when locations or real road routes change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const baseSource = map.getSource("journey-route-base") as mapboxgl.GeoJSONSource | undefined;
    if (baseSource) {
      const fullRouteFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = [];
      for (let i = 0; i < locations.length - 1; i++) {
        const coords = legRoutes[i] || (legs[i] === "flight"
          ? generateArcCoordinates(locations[i], locations[i + 1], 50)
          : generateCurvedRoadCoordinates(locations[i], locations[i + 1], 50));

        fullRouteFeatures.push({
          type: "Feature",
          properties: { leg: i },
          geometry: {
            type: "LineString",
            coordinates: coords,
          },
        });
      }
      baseSource.setData({
        type: "FeatureCollection",
        features: fullRouteFeatures,
      });
    }
  }, [locations, mapLoaded, legRoutes, legs]);

  // Update Active Route Path GeoJSON as vehicle travels along real roads
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || locations.length < 2) return;

    const activeSource = map.getSource("journey-route-active") as mapboxgl.GeoJSONSource | undefined;
    if (!activeSource) return;

    const activeFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = [];

    // Full coordinates for all completed past legs
    for (let i = 0; i < activeLegIndex; i++) {
      const pastCoords = legRoutes[i] || (legs[i] === "flight"
        ? generateArcCoordinates(locations[i], locations[i + 1], 50)
        : generateCurvedRoadCoordinates(locations[i], locations[i + 1], 50));

      activeFeatures.push({
        type: "Feature",
        properties: { leg: i },
        geometry: {
          type: "LineString",
          coordinates: pastCoords,
        },
      });
    }

    // Partial road coordinates for the current active leg up to vehicle position
    if (locations[activeLegIndex] && locations[activeLegIndex + 1]) {
      const curCoords = legRoutes[activeLegIndex] || (legs[activeLegIndex] === "flight"
        ? generateArcCoordinates(locations[activeLegIndex], locations[activeLegIndex + 1], 50)
        : generateCurvedRoadCoordinates(locations[activeLegIndex], locations[activeLegIndex + 1], 50));

      const partialCoords = getPolylineUpTo(curCoords, legFraction);
      if (partialCoords.length > 1) {
        activeFeatures.push({
          type: "Feature",
          properties: { leg: activeLegIndex },
          geometry: {
            type: "LineString",
            coordinates: partialCoords,
          },
        });
      }
    }

    activeSource.setData({
      type: "FeatureCollection",
      features: activeFeatures,
    });
  }, [activeLegIndex, legFraction, locations, mapLoaded, legRoutes, legs]);

  // Initialize and update Clean Waypoint Pin Markers on the Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    stopMarkersRef.current.forEach((item) => item.marker.remove());
    stopMarkersRef.current = [];

    locations.forEach((loc, idx) => {
      const wrapper = document.createElement("div");
      wrapper.className = "mapbox-pin-wrapper";
      wrapper.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        user-select: none;
        z-index: 10;
      `;

      // Clean numbered circular pin badge
      const badge = document.createElement("div");
      badge.className = "mapbox-pin-badge";
      badge.style.cssText = `
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: #0284c7;
        color: #ffffff;
        font-size: 11px;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #ffffff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.6);
        transition: transform 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
      `;
      badge.textContent = `${idx + 1}`;
      wrapper.appendChild(badge);

      // Pin needle
      const needle = document.createElement("div");
      needle.style.cssText = `
        width: 2px;
        height: 8px;
        background: #38bdf8;
        box-shadow: 0 0 6px #38bdf8;
      `;
      wrapper.appendChild(needle);

      // Anchor dot
      const pinDot = document.createElement("div");
      pinDot.style.cssText = `
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #ffffff;
        box-shadow: 0 0 8px #38bdf8;
      `;
      wrapper.appendChild(pinDot);

      wrapper.onclick = () => {
        onSelectDestination?.(loc);
        map.flyTo({ center: [loc.lng, loc.lat], zoom: 4.5, pitch: 40, duration: 1200 });
      };

      const marker = new mapboxgl.Marker({ element: wrapper, anchor: "bottom" })
        .setLngLat([loc.lng, loc.lat])
        .addTo(map);

      stopMarkersRef.current.push({ marker, badgeEl: badge, id: loc.id });
    });
  }, [locations, onSelectDestination]);

  // Update active state styling for pin badges
  useEffect(() => {
    stopMarkersRef.current.forEach((item) => {
      const isTarget = currentStop && currentStop.id === item.id;
      if (isTarget) {
        item.badgeEl.style.background = "#38bdf8";
        item.badgeEl.style.boxShadow = "0 0 16px rgba(56, 189, 248, 1), 0 4px 12px rgba(0,0,0,0.8)";
        item.badgeEl.style.transform = "scale(1.2)";
        item.marker.getElement().style.zIndex = "35";
      } else {
        item.badgeEl.style.background = "#0284c7";
        item.badgeEl.style.boxShadow = "0 4px 12px rgba(0,0,0,0.6)";
        item.badgeEl.style.transform = "scale(1.0)";
        item.marker.getElement().style.zIndex = "10";
      }
    });
  }, [currentStop]);

  // Update Vehicle Marker & Cinematic 3D Camera Follow
  useEffect(() => {
    const map = mapRef.current;
    const vMarker = vehicleMarkerRef.current;
    if (!map) return;

    if (locations.length === 0) {
      if (vMarker) vMarker.getElement().style.display = "none";
      map.easeTo({
        center: [0, 20],
        zoom: 1.8,
        pitch: 35,
        duration: 1000,
      });
      return;
    }

    if (locations.length === 1) {
      if (vMarker) {
        vMarker.setLngLat([locations[0].lng, locations[0].lat]);
        vMarker.getElement().style.display = "flex";
      }
      if (vehicleIconRef.current) {
        vehicleIconRef.current.textContent = "📍";
      }
      map.easeTo({
        center: [locations[0].lng, locations[0].lat],
        zoom: 4.5,
        pitch: 38,
        duration: 1200,
      });
      return;
    }

    if (!currentPoint) return;

    // Update vehicle position and emoji
    if (vMarker) {
      vMarker.setLngLat([currentPoint.lng, currentPoint.lat]);
      vMarker.getElement().style.display = "flex";
    }
    if (vehicleIconRef.current) {
      vehicleIconRef.current.textContent = currentMark;
    }

    // Dynamic Cinematic Camera Tracking (Smooth Altitude Arc & Optimal Ground Framing)
    const { zoom: targetZoom, pitch: targetPitch } = getCinematicCamera(
      currentStart,
      currentEnd,
      legFraction,
      transport
    );

    if (playing) {
      map.easeTo({
        center: [currentPoint.lng, currentPoint.lat],
        zoom: targetZoom,
        pitch: targetPitch,
        bearing: 0, // Lock North-up so map is always right-side up
        duration: 120,
        easing: (t) => t,
      });
    }
  }, [currentPoint, currentMark, transport, playing, currentStart, currentEnd, legFraction, locations]);

  // Internal animation loop only if external progress is not provided
  useEffect(() => {
    if (!playing || externalProgress !== undefined) return;
    let frame = 0;
    const duration = 35 * 1000; // 35-second story
    const started = performance.now();
    const animate = (now: number) => {
      setInternalProgress(((now - started) % duration) / duration);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [totalLegs, externalProgress, playing]);

  return (
    <div
      className={`mapbox-globe-wrapper ${className}`}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "610px",
        overflow: "hidden",
        borderRadius: "22px",
        background: "#030e18",
      }}
    >
      {/* Mapbox Canvas Container */}
      <div
        ref={mapContainerRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%",
        }}
      />

      {/* Map Style Selector */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          right: className.includes("map-video-globe") ? "68px" : "16px",
          zIndex: 30,
          display: "flex",
          alignItems: "center",
          gap: "4px",
          background: "rgba(3, 16, 29, 0.85)",
          backdropFilter: "blur(10px)",
          padding: "6px 8px",
          borderRadius: "14px",
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
      >
        <button
          onClick={() => setMapStyle("mapbox://styles/mapbox/satellite-streets-v12")}
          style={{
            padding: "5px 10px",
            borderRadius: "8px",
            border: 0,
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            background: mapStyle.includes("satellite") ? "#078fe3" : "transparent",
            color: "#fff",
          }}
        >
          Satellite 3D
        </button>
        <button
          onClick={() => setMapStyle("mapbox://styles/mapbox/outdoors-v12")}
          style={{
            padding: "5px 10px",
            borderRadius: "8px",
            border: 0,
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            background: mapStyle.includes("outdoors") ? "#078fe3" : "transparent",
            color: "#fff",
          }}
        >
          Terrain
        </button>
        <button
          onClick={() => setMapStyle("mapbox://styles/mapbox/navigation-night-v1")}
          style={{
            padding: "5px 10px",
            borderRadius: "8px",
            border: 0,
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            background: mapStyle.includes("navigation-night") ? "#078fe3" : "transparent",
            color: "#fff",
          }}
        >
          Night
        </button>
      </div>

      {/* Single Active Destination Card (Top of Video) */}
      {currentStop && locations.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "16px",
            left: "16px",
            maxWidth: "360px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "8px 14px",
            borderRadius: "18px",
            background: "rgba(3, 16, 29, 0.92)",
            backdropFilter: "blur(16px)",
            border: "1.5px solid rgba(56, 189, 248, 0.6)",
            boxShadow: "0 12px 30px rgba(0,0,0,0.7)",
            color: "#ffffff",
            zIndex: 30,
            pointerEvents: "none",
          }}
        >
          {currentStop.imageUrl && (
            <img
              src={currentStop.imageUrl}
              alt={currentStop.name}
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "12px",
                objectFit: "cover",
                border: "1.5px solid rgba(255,255,255,0.4)",
                flexShrink: 0,
              }}
            />
          )}
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 800,
                color: "#38bdf8",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              {locations.length < 2
                ? "📍 Selected Destination"
                : legFraction < 0.3
                ? `📍 Departing (Stop ${activeLegIndex + 1} of ${totalLegs + 1})`
                : `🎯 Destination (Stop ${activeLegIndex + 2} of ${totalLegs + 1})`}
            </div>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 700,
                fontFamily: "Georgia, serif",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {currentStop.name}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>
              {currentStop.country} · <span style={{ color: "#38bdf8", fontWeight: 700 }}>{currentStop.code}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
