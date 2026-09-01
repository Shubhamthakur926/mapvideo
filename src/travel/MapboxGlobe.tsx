import mapboxgl from "mapbox-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { getLocationImages, type Location, type Transport } from "./types";

export const MAPBOX_TOKEN =
  (import.meta as { env?: { VITE_MAPBOX_TOKEN?: string } }).env?.VITE_MAPBOX_TOKEN ||
  (typeof process !== "undefined" && process.env ? process.env.REACT_APP_MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN : "") ||
  "";

type Props = {
  locations: Location[];
  legs?: Transport[];
  progress?: number;
  activeLocation?: Location;
  playing?: boolean;
  className?: string;
  onSelectDestination?: (location: Location) => void;
  hideOverlays?: boolean;
  showVehicle?: boolean;
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

// Global Maritime Nautical Waypoint Graph (100% Water / Sea-Lanes)
const SEA_NODES: Record<string, { lng: number; lat: number; neighbors: string[] }> = {
  // Indian Ocean & South Asia
  colombo_offshore: { lng: 79.7, lat: 6.8, neighbors: ["sri_lanka_south", "mumbai_offshore", "bay_bengal_mid"] },
  sri_lanka_south: { lng: 80.5, lat: 5.7, neighbors: ["colombo_offshore", "andaman_south", "bay_bengal_mid", "arabian_sea_mid"] },
  mumbai_offshore: { lng: 71.5, lat: 18.5, neighbors: ["colombo_offshore", "arabian_sea_mid", "hormuz_strait"] },
  arabian_sea_mid: { lng: 64.0, lat: 14.0, neighbors: ["sri_lanka_south", "mumbai_offshore", "gulf_of_aden", "hormuz_strait"] },
  hormuz_strait: { lng: 56.5, lat: 26.2, neighbors: ["mumbai_offshore", "arabian_sea_mid", "dubai_offshore"] },
  dubai_offshore: { lng: 55.1, lat: 25.4, neighbors: ["hormuz_strait"] },
  gulf_of_aden: { lng: 48.0, lat: 12.5, neighbors: ["arabian_sea_mid", "bab_el_mandeb"] },
  bab_el_mandeb: { lng: 43.4, lat: 12.6, neighbors: ["gulf_of_aden", "red_sea_mid"] },
  red_sea_mid: { lng: 37.5, lat: 21.0, neighbors: ["bab_el_mandeb", "suez_south"] },
  suez_south: { lng: 32.55, lat: 29.95, neighbors: ["red_sea_mid", "suez_north"] },
  suez_north: { lng: 32.35, lat: 31.25, neighbors: ["suez_south", "med_east"] },

  // Mediterranean & Europe
  med_east: { lng: 28.0, lat: 34.0, neighbors: ["suez_north", "med_mid", "athens_offshore"] },
  athens_offshore: { lng: 23.8, lat: 37.5, neighbors: ["med_east", "med_mid"] },
  med_mid: { lng: 15.0, lat: 36.0, neighbors: ["med_east", "athens_offshore", "rome_offshore", "med_west"] },
  rome_offshore: { lng: 12.0, lat: 41.5, neighbors: ["med_mid", "med_west"] },
  med_west: { lng: 4.0, lat: 38.0, neighbors: ["med_mid", "rome_offshore", "barcelona_offshore", "gibraltar"] },
  barcelona_offshore: { lng: 2.3, lat: 41.3, neighbors: ["med_west", "gibraltar"] },
  gibraltar: { lng: -5.6, lat: 36.0, neighbors: ["med_west", "barcelona_offshore", "portugal_coast", "atlantic_mid"] },

  // Atlantic & North Sea
  portugal_coast: { lng: -9.8, lat: 38.7, neighbors: ["gibraltar", "biscay_offshore", "atlantic_mid"] },
  biscay_offshore: { lng: -6.0, lat: 45.0, neighbors: ["portugal_coast", "english_channel"] },
  english_channel: { lng: -1.5, lat: 50.0, neighbors: ["biscay_offshore", "dover_strait", "atlantic_north_east"] },
  dover_strait: { lng: 1.5, lat: 51.1, neighbors: ["english_channel", "north_sea"] },
  north_sea: { lng: 3.5, lat: 54.0, neighbors: ["dover_strait", "atlantic_north_east"] },
  atlantic_north_east: { lng: -12.0, lat: 52.0, neighbors: ["english_channel", "north_sea", "atlantic_mid"] },
  atlantic_mid: { lng: -35.0, lat: 36.0, neighbors: ["atlantic_north_east", "gibraltar", "portugal_coast", "us_east_coast", "caribbean_east"] },

  // Americas
  us_east_coast: { lng: -73.0, lat: 39.0, neighbors: ["atlantic_mid", "florida_strait"] },
  florida_strait: { lng: -80.0, lat: 25.0, neighbors: ["us_east_coast", "caribbean_east", "caribbean_west"] },
  caribbean_east: { lng: -65.0, lat: 18.0, neighbors: ["atlantic_mid", "florida_strait", "caribbean_west"] },
  caribbean_west: { lng: -78.0, lat: 12.0, neighbors: ["caribbean_east", "florida_strait", "panama_caribbean"] },
  panama_caribbean: { lng: -79.9, lat: 9.35, neighbors: ["caribbean_west", "panama_pacific"] },
  panama_pacific: { lng: -79.5, lat: 8.8, neighbors: ["panama_caribbean", "pacific_mexico", "pacific_mid"] },
  pacific_mexico: { lng: -105.0, lat: 18.0, neighbors: ["panama_pacific", "us_west_coast_la"] },
  us_west_coast_la: { lng: -118.5, lat: 33.7, neighbors: ["pacific_mexico", "us_west_coast_sf", "pacific_mid"] },
  us_west_coast_sf: { lng: -123.0, lat: 37.5, neighbors: ["us_west_coast_la", "pacific_north"] },

  // Southeast Asia & East Asia
  bay_bengal_mid: { lng: 88.0, lat: 12.0, neighbors: ["colombo_offshore", "sri_lanka_south", "andaman_south"] },
  andaman_south: { lng: 95.5, lat: 5.8, neighbors: ["sri_lanka_south", "bay_bengal_mid", "malacca_mid"] },
  malacca_mid: { lng: 100.5, lat: 3.2, neighbors: ["andaman_south", "singapore_strait"] },
  singapore_strait: { lng: 103.85, lat: 1.25, neighbors: ["malacca_mid", "south_china_sea_south", "java_sea"] },
  java_sea: { lng: 110.0, lat: -5.0, neighbors: ["singapore_strait", "australia_north"] },
  australia_north: { lng: 130.0, lat: -10.0, neighbors: ["java_sea", "sydney_offshore"] },
  sydney_offshore: { lng: 152.5, lat: -34.0, neighbors: ["australia_north", "pacific_mid"] },

  south_china_sea_south: { lng: 106.5, lat: 4.5, neighbors: ["singapore_strait", "south_china_sea_mid"] },
  south_china_sea_mid: { lng: 112.5, lat: 12.5, neighbors: ["south_china_sea_south", "south_china_sea_north", "luzon_strait"] },
  south_china_sea_north: { lng: 115.0, lat: 19.5, neighbors: ["south_china_sea_mid", "hong_kong_offshore", "taiwan_strait"] },
  hong_kong_offshore: { lng: 114.5, lat: 21.8, neighbors: ["south_china_sea_north", "taiwan_strait"] },
  taiwan_strait: { lng: 119.5, lat: 24.0, neighbors: ["hong_kong_offshore", "south_china_sea_north", "east_china_sea"] },
  luzon_strait: { lng: 121.5, lat: 20.5, neighbors: ["south_china_sea_mid", "east_china_sea", "philippine_sea"] },
  east_china_sea: { lng: 124.5, lat: 28.5, neighbors: ["taiwan_strait", "luzon_strait", "shanghai_offshore", "korea_strait", "japan_south"] },
  shanghai_offshore: { lng: 122.5, lat: 31.0, neighbors: ["east_china_sea", "korea_strait"] },
  korea_strait: { lng: 129.5, lat: 34.0, neighbors: ["east_china_sea", "shanghai_offshore", "japan_south"] },
  philippine_sea: { lng: 130.0, lat: 22.0, neighbors: ["luzon_strait", "japan_south", "pacific_mid"] },
  japan_south: { lng: 136.0, lat: 33.0, neighbors: ["east_china_sea", "korea_strait", "philippine_sea", "tokyo_bay_entry"] },
  tokyo_bay_entry: { lng: 139.75, lat: 35.0, neighbors: ["japan_south", "pacific_north", "pacific_mid"] },
  pacific_north: { lng: 160.0, lat: 40.0, neighbors: ["tokyo_bay_entry", "us_west_coast_sf"] },
  pacific_mid: { lng: -160.0, lat: 20.0, neighbors: ["tokyo_bay_entry", "philippine_sea", "us_west_coast_la", "panama_pacific", "sydney_offshore"] },
};

function findClosestSeaNode(loc: Location): string {
  let closestId = "colombo_offshore";
  let minDistance = Infinity;

  for (const [id, node] of Object.entries(SEA_NODES)) {
    const dist = Math.hypot(node.lng - loc.lng, node.lat - loc.lat);
    if (dist < minDistance) {
      minDistance = dist;
      closestId = id;
    }
  }
  return closestId;
}

function findSeaPath(startNodeId: string, endNodeId: string): [number, number][] {
  if (startNodeId === endNodeId) {
    return [[SEA_NODES[startNodeId].lng, SEA_NODES[startNodeId].lat]];
  }

  const queue: Array<{ id: string; path: string[] }> = [{ id: startNodeId, path: [startNodeId] }];
  const visited = new Set<string>([startNodeId]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.id === endNodeId) {
      return current.path.map((nodeId) => [SEA_NODES[nodeId].lng, SEA_NODES[nodeId].lat]);
    }

    const neighbors = SEA_NODES[current.id]?.neighbors || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor) && SEA_NODES[neighbor]) {
        visited.add(neighbor);
        queue.push({ id: neighbor, path: [...current.path, neighbor] });
      }
    }
  }

  return [
    [SEA_NODES[startNodeId].lng, SEA_NODES[startNodeId].lat],
    [SEA_NODES[endNodeId].lng, SEA_NODES[endNodeId].lat],
  ];
}

function generateNauticalSeaRoute(start: Location, end: Location, segments = 100): [number, number][] {
  const startNodeId = findClosestSeaNode(start);
  const endNodeId = findClosestSeaNode(end);

  const seaWaypoints = findSeaPath(startNodeId, endNodeId);
  const fullWaypoints: [number, number][] = [[start.lng, start.lat], ...seaWaypoints, [end.lng, end.lat]];

  const result: [number, number][] = [];
  const totalWaypoints = fullWaypoints.length;
  const totalLegs = totalWaypoints - 1;
  const segsPerLeg = Math.max(8, Math.round(segments / totalLegs));

  for (let i = 0; i < totalLegs; i++) {
    const p0 = fullWaypoints[Math.max(0, i - 1)];
    const p1 = fullWaypoints[i];
    const p2 = fullWaypoints[i + 1];
    const p3 = fullWaypoints[Math.min(totalLegs, i + 2)];

    for (let s = i === 0 ? 0 : 1; s <= segsPerLeg; s++) {
      const t = s / segsPerLeg;
      const t2 = t * t;
      const t3 = t2 * t;

      const lng =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);

      const lat =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);

      result.push([lng, lat]);
    }
  }

  return result;
}

function getLegCoordinates(
  start: Location,
  end: Location,
  transport: Transport,
  cached?: [number, number][]
): [number, number][] {
  if (transport === "flight") {
    return generateArcCoordinates(start, end, 60);
  }
  if (transport === "ship") {
    return generateNauticalSeaRoute(start, end, 100);
  }
  return cached || generateCurvedRoadCoordinates(start, end, 60);
}

const directionsCache = new Map<string, [number, number][]>();

async function fetchLegRoute(start: Location, end: Location, transport: Transport): Promise<[number, number][]> {
  if (transport === "flight") {
    return generateArcCoordinates(start, end, 60);
  }
  if (transport === "ship") {
    return generateNauticalSeaRoute(start, end, 100);
  }

  const profile =
    transport === "walking"
      ? "mapbox/walking"
      : transport === "bicycle" || transport === "bike"
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

export function calculateDistanceKm(start: Location, end: Location): number {
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

export function formatDistanceKm(distanceKm: number): string {
  return distanceKm < 10
    ? distanceKm.toFixed(1) + " km"
    : Math.round(distanceKm).toLocaleString() + " km";
}

function getCinematicCamera(start: Location, end: Location, fraction: number, transport: Transport) {
  const dist = calculateDistanceKm(start, end);
  const arc = Math.sin(fraction * Math.PI);

  if (transport === "flight") {
    if (dist >= 3000) {
      return {
        zoom: 3.8 - arc * 1.5,
        pitch: 38 - arc * 8,
      };
    } else if (dist >= 1000) {
      return {
        zoom: 4.6 - arc * 1.1,
        pitch: 40 - arc * 6,
      };
    } else if (dist >= 300) {
      return {
        zoom: 5.6 - arc * 0.8,
        pitch: 42 - arc * 5,
      };
    } else {
      return {
        zoom: 6.8 - arc * 0.6,
        pitch: 44 - arc * 4,
      };
    }
  }

  if (dist >= 2500) {
    return { zoom: 3.5, pitch: 35 };
  } else if (dist >= 1200) {
    return { zoom: 4.4, pitch: 38 };
  } else if (dist >= 500) {
    return { zoom: 5.3, pitch: 40 };
  } else if (dist >= 150) {
    return { zoom: 6.5, pitch: 44 };
  } else if (dist >= 50) {
    return { zoom: 8.0, pitch: 48 };
  } else if (dist >= 15) {
    return { zoom: 9.8, pitch: 50 };
  } else {
    return { zoom: 11.8, pitch: 52 };
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
  hideOverlays = false,
  showVehicle = true,
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
  const legDistances = useMemo(
    () => locations.slice(0, -1).map((start, index) => calculateDistanceKm(start, locations[index + 1])),
    [locations]
  );

  const [legRoutes, setLegRoutes] = useState<[number, number][][]>(() => {
    const initial: [number, number][][] = [];
    for (let i = 0; i < locations.length - 1; i++) {
      const tr = legs[i] ?? "flight";
      initial.push(getLegCoordinates(locations[i], locations[i + 1], tr));
    }
    return initial;
  });

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

  const {
    currentPoint,
    currentMark,
    currentStop,
    activeLegIndex,
    legFraction,
    bearing,
    transport,
    currentStart,
    currentEnd,
    isArrival,
    arrivalStop,
    activePhotoIndex,
    arrivalImages,
    pathFraction,
  } = useMemo(() => {
    if (locations.length < 2) {
      return {
        currentPoint: locations[0] ? { lat: locations[0].lat, lng: locations[0].lng } : null,
        currentMark: "✈️",
        currentStop: locations[0],
        activeLegIndex: 0,
        legFraction: 0,
        pathFraction: 0,
        bearing: 0,
        transport: "flight" as Transport,
        currentStart: locations[0] || { id: "0", name: "", country: "", code: "", lat: 0, lng: 0 },
        currentEnd: locations[0] || { id: "0", name: "", country: "", code: "", lat: 0, lng: 0 },
        isArrival: false,
        arrivalStop: null,
        activePhotoIndex: 0,
        arrivalImages: [],
      };
    }

    const scaled = Math.min(totalLegs - 0.000001, Math.max(0, currentProgress * totalLegs));
    const legIdx = Math.floor(scaled);
    const fraction = scaled - legIdx;

    const start = locations[legIdx];
    const end = locations[legIdx + 1] || locations[locations.length - 1];
    const curTransport = legs[legIdx] ?? "flight";
    const mark = vehicleMarks[curTransport] ?? "✈️";

    const coords = legRoutes[legIdx] || getLegCoordinates(start, end, curTransport);

    const TRAVEL_SPLIT = 0.55;
    const arrivalActive = fraction >= TRAVEL_SPLIT;
    const pathFraction = arrivalActive ? 1.0 : Math.min(1.0, fraction / TRAVEL_SPLIT);

    const { pt: point, bearing: calculatedBearing } = getPointAlongPolyline(coords, pathFraction);
    const activeDisplayStop = fraction < 0.35 ? start : end;

    const arrivalShowcaseFraction = arrivalActive ? (fraction - TRAVEL_SPLIT) / (1 - TRAVEL_SPLIT) : 0;
    const destImages = arrivalActive ? getLocationImages(end) : [];
    const totalImgCount = Math.max(1, destImages.length);
    const photoIdx = Math.min(totalImgCount - 1, Math.floor(arrivalShowcaseFraction * totalImgCount));

    return {
      currentPoint: arrivalActive ? { lat: end.lat, lng: end.lng } : point,
      currentMark: mark,
      currentStop: activeDisplayStop,
      activeLegIndex: legIdx,
      legFraction: fraction,
      pathFraction,
      bearing: calculatedBearing,
      transport: curTransport,
      currentStart: start,
      currentEnd: end,
      isArrival: arrivalActive,
      arrivalStop: arrivalActive ? end : null,
      activePhotoIndex: photoIdx,
      arrivalImages: destImages,
    };
  }, [totalLegs, currentProgress, legs, locations, legRoutes]);

  useEffect(() => {
    if (!mapContainerRef.current || !MAPBOX_TOKEN) return;

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
      preserveDrawingBuffer: true,
      maxZoom: 12,
      renderWorldCopies: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      setMapLoaded(true);
      map.resize();

      map.setFog({
        color: "rgb(186, 210, 240)",
        "high-color": "rgb(36, 92, 223)",
        "horizon-blend": 0.03,
        "space-color": "rgb(11, 11, 25)",
        "star-intensity": 0.6,
      });

      if (!map.getSource("journey-route-base")) {
        map.addSource("journey-route-base", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });

        map.addLayer({
          id: "journey-route-line-glow",
          type: "line",
          source: "journey-route-base",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#0284c7",
            "line-width": 8,
            "line-opacity": 0.6,
            "line-blur": 4,
          },
        });

        map.addLayer({
          id: "journey-route-line-base",
          type: "line",
          source: "journey-route-base",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#38bdf8",
            "line-width": 3.5,
            "line-opacity": 0.9,
          },
        });
      }
    });

    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.remove();
      vehicleMarkerRef.current = null;
      vehicleIconRef.current = null;
    }

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const baseSource = map.getSource("journey-route-base") as mapboxgl.GeoJSONSource | undefined;
    if (!baseSource) return;

    if (locations.length < 2) {
      baseSource.setData({
        type: "FeatureCollection",
        features: [],
      });
      return;
    }

    const traveledFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = [];

    // 1. Add all fully completed prior legs
    for (let i = 0; i < activeLegIndex; i++) {
      const coords = legRoutes[i] || getLegCoordinates(locations[i], locations[i + 1], legs[i] ?? "flight");
      if (coords.length >= 2) {
        traveledFeatures.push({
          type: "Feature",
          properties: { leg: i },
          geometry: {
            type: "LineString",
            coordinates: coords,
          },
        });
      }
    }

    // 2. Add current active leg up to vehicle's current position (only previous path traveled)
    if (activeLegIndex < locations.length - 1) {
      const activeCoords =
        legRoutes[activeLegIndex] ||
        getLegCoordinates(locations[activeLegIndex], locations[activeLegIndex + 1], legs[activeLegIndex] ?? "flight");

      if (pathFraction > 0.001) {
        const partialCoords = getPolylineUpTo(activeCoords, pathFraction);
        if (partialCoords.length >= 2) {
          traveledFeatures.push({
            type: "Feature",
            properties: { leg: activeLegIndex },
            geometry: {
              type: "LineString",
              coordinates: partialCoords,
            },
          });
        }
      }
    }

    baseSource.setData({
      type: "FeatureCollection",
      features: traveledFeatures,
    });
  }, [locations, mapLoaded, legRoutes, legs, activeLegIndex, pathFraction]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    stopMarkersRef.current.forEach((item) => item.marker.remove());
    stopMarkersRef.current = [];

    locations.forEach((loc, idx) => {
      const wrapper = document.createElement("div");
      wrapper.className = "mapbox-destination-marker";
      wrapper.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        user-select: none;
        z-index: 15;
      `;

      const card = document.createElement("div");
      card.className = "mapbox-destination-card";
      card.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 10px 4px 5px;
        border-radius: 20px;
        background: rgba(3, 16, 29, 0.92);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1.5px solid rgba(56, 189, 248, 0.45);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.7), 0 0 12px rgba(56, 189, 248, 0.2);
        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
        white-space: nowrap;
      `;

      if (loc.imageUrl) {
        const img = document.createElement("img");
        img.src = loc.imageUrl;
        img.alt = loc.name;
        img.style.cssText = `
          width: 26px;
          height: 26px;
          border-radius: 50%;
          object-fit: cover;
          border: 1.5px solid #38bdf8;
          flex-shrink: 0;
          display: block;
        `;
        card.appendChild(img);
      } else {
        const numBadge = document.createElement("span");
        numBadge.style.cssText = `
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #0284c7;
          color: #ffffff;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid #38bdf8;
          flex-shrink: 0;
        `;
        numBadge.textContent = `${idx + 1}`;
        card.appendChild(numBadge);
      }

      const labelDiv = document.createElement("div");
      labelDiv.style.cssText = `
        display: flex;
        align-items: center;
        gap: 6px;
      `;

      const nameSpan = document.createElement("span");
      nameSpan.style.cssText = `
        font-size: 12px;
        font-weight: 700;
        color: #ffffff;
        font-family: Inter, system-ui, -apple-system, sans-serif;
        text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
      `;
      nameSpan.textContent = loc.name;
      labelDiv.appendChild(nameSpan);

      if (loc.code) {
        const codeSpan = document.createElement("span");
        codeSpan.style.cssText = `
          font-size: 9px;
          font-weight: 800;
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.18);
          border: 1px solid rgba(56, 189, 248, 0.4);
          padding: 1px 5px;
          border-radius: 6px;
          letter-spacing: 0.05em;
        `;
        codeSpan.textContent = loc.code;
        labelDiv.appendChild(codeSpan);
      }

      card.appendChild(labelDiv);
      wrapper.appendChild(card);

      const needle = document.createElement("div");
      needle.style.cssText = `
        width: 2px;
        height: 10px;
        background: linear-gradient(to bottom, #38bdf8, rgba(56, 189, 248, 0.2));
        box-shadow: 0 0 6px rgba(56, 189, 248, 0.8);
      `;
      wrapper.appendChild(needle);

      const pinDot = document.createElement("div");
      pinDot.style.cssText = `
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #38bdf8;
        border: 2px solid #ffffff;
        box-shadow: 0 0 10px rgba(56, 189, 248, 1), 0 0 4px #ffffff;
        margin-top: -2px;
      `;
      wrapper.appendChild(pinDot);

      wrapper.onmouseenter = () => {
        card.style.transform = "scale(1.08)";
        card.style.borderColor = "#38bdf8";
        card.style.boxShadow = "0 10px 28px rgba(0,0,0,0.8), 0 0 16px rgba(56, 189, 248, 0.6)";
        wrapper.style.zIndex = "30";
      };
      wrapper.onmouseleave = () => {
        card.style.transform = "scale(1.0)";
        card.style.borderColor = "rgba(56, 189, 248, 0.45)";
        card.style.background = "rgba(3, 16, 29, 0.92)";
        card.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.7), 0 0 12px rgba(56, 189, 248, 0.2)";
        wrapper.style.zIndex = "15";
      };

      wrapper.onclick = (e) => {
        e.stopPropagation();
        onSelectDestination?.(loc);
        map.flyTo({ center: [loc.lng, loc.lat], zoom: 4.5, pitch: 40, duration: 1200 });
      };

      const marker = new mapboxgl.Marker({ element: wrapper, anchor: "bottom" })
        .setLngLat([loc.lng, loc.lat])
        .addTo(map);

      stopMarkersRef.current.push({ marker, badgeEl: card, id: loc.id });
    });
  }, [locations, onSelectDestination]);

  useEffect(() => {
    stopMarkersRef.current.forEach((item) => {
      const isTarget = currentStop && currentStop.id === item.id;
      if (isTarget) {
        item.badgeEl.style.borderColor = "#38bdf8";
        item.badgeEl.style.background = "rgba(7, 30, 53, 0.96)";
        item.badgeEl.style.boxShadow = "0 0 20px rgba(56, 189, 248, 0.95), 0 10px 28px rgba(0,0,0,0.85)";
        item.badgeEl.style.transform = "scale(1.12)";
        item.marker.getElement().style.zIndex = "35";
      } else {
        item.badgeEl.style.borderColor = "rgba(56, 189, 248, 0.45)";
        item.badgeEl.style.background = "rgba(3, 16, 29, 0.92)";
        item.badgeEl.style.boxShadow = "0 6px 20px rgba(0, 0, 0, 0.7), 0 0 12px rgba(56, 189, 248, 0.2)";
        item.badgeEl.style.transform = "scale(1.0)";
        item.marker.getElement().style.zIndex = "15";
      }
    });
  }, [currentStop]);

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
        vMarker.getElement().style.display = showVehicle ? "flex" : "none";
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

    if (vMarker) {
      vMarker.setLngLat([currentPoint.lng, currentPoint.lat]);
      vMarker.getElement().style.display = showVehicle ? "flex" : "none";
    }
    if (vehicleIconRef.current) {
      vehicleIconRef.current.textContent = currentMark;
    }

    if (isArrival && currentEnd) {
      if (playing) {
        map.easeTo({
          center: [currentEnd.lng, currentEnd.lat],
          zoom: 7.0,
          pitch: 42,
          bearing: 0,
          duration: 140,
          easing: (t) => t,
        });
      }
    } else {
      const { zoom: targetZoom, pitch: targetPitch } = getCinematicCamera(
        currentStart,
        currentEnd,
        Math.min(1, legFraction / 0.55),
        transport
      );

      if (playing) {
        map.easeTo({
          center: [currentPoint.lng, currentPoint.lat],
          zoom: targetZoom,
          pitch: targetPitch,
          bearing: 0,
          duration: 120,
          easing: (t) => t,
        });
      }
    }
  }, [currentPoint, currentMark, transport, playing, currentStart, currentEnd, legFraction, isArrival, locations, showVehicle]);

  useEffect(() => {
    if (!playing || externalProgress !== undefined) return;
    let frame = 0;
    const duration = 20 * 1000;
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

      {!MAPBOX_TOKEN && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            padding: "24px",
            color: "#dbeafe",
            textAlign: "center",
            background: "radial-gradient(circle at center, rgba(8, 47, 73, 0.9), #030e18 70%)",
          }}
        >
          <div>
            <strong style={{ display: "block", fontSize: "18px", marginBottom: "8px" }}>Map preview unavailable</strong>
            <span style={{ color: "#93c5fd", fontSize: "13px" }}>Add VITE_MAPBOX_TOKEN to a .env file to enable the 3D globe.</span>
          </div>
        </div>
      )}

      {!hideOverlays && (
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
      )}

      {!hideOverlays && currentStop && locations.length > 0 && (
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
                : isArrival
                ? `🎉 Arrived (Stop ${activeLegIndex + 2} of ${totalLegs + 1})`
                : legFraction < 0.25
                ? `📍 Departing (Stop ${activeLegIndex + 1} of ${totalLegs + 1})`
                : `🎯 En Route (Stop ${activeLegIndex + 2} of ${totalLegs + 1})`}
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
            {locations.length > 1 && (
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                {formatDistanceKm(legDistances[activeLegIndex] ?? 0)}
              </div>
            )}
          </div>
        </div>
      )}

      {!hideOverlays && isArrival && arrivalStop && (
        <div
          style={{
            position: "absolute",
            bottom: "22px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(460px, calc(100% - 32px))",
            borderRadius: "22px",
            background: "rgba(3, 16, 29, 0.95)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1.5px solid rgba(56, 189, 248, 0.7)",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.85), 0 0 25px rgba(56, 189, 248, 0.4)",
            padding: "14px 16px",
            zIndex: 40,
            color: "#ffffff",
            animation: "fadeIn 0.3s ease-out",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "10px",
                  fontWeight: 800,
                  color: "#38bdf8",
                  background: "rgba(56, 189, 248, 0.15)",
                  border: "1px solid rgba(56, 189, 248, 0.4)",
                  padding: "3px 8px",
                  borderRadius: "20px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#38bdf8",
                    display: "inline-block",
                    boxShadow: "0 0 8px #38bdf8",
                  }}
                />
                Arrived · Stop {activeLegIndex + 2} of {totalLegs + 1}
              </span>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>{arrivalStop.country}</span>
            </div>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 800,
                background: "#0284c7",
                color: "#ffffff",
                padding: "2px 7px",
                borderRadius: "8px",
              }}
            >
              {arrivalStop.code}
            </span>
          </div>

          <div style={{ fontSize: "18px", fontWeight: 700, fontFamily: "Georgia, serif", marginBottom: "10px" }}>
            {arrivalStop.name}
          </div>

          <div
            style={{
              position: "relative",
              width: "100%",
              height: "175px",
              borderRadius: "14px",
              overflow: "hidden",
              marginBottom: "10px",
              border: "1.5px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            <img
              src={arrivalImages[activePhotoIndex] || arrivalStop.imageUrl}
              alt={`${arrivalStop.name} photo ${activePhotoIndex + 1}`}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transition: "opacity 0.4s ease-in-out",
                display: "block",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "rgba(3, 16, 29, 0.85)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255, 255, 255, 0.3)",
                color: "#ffffff",
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              }}
            >
              📸 Photo {activePhotoIndex + 1} of {Math.max(1, arrivalImages.length)}
            </div>

            {arrivalStop.description && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: "8px 12px",
                  background: "linear-gradient(to top, rgba(3, 16, 29, 0.92) 0%, rgba(3, 16, 29, 0) 100%)",
                  fontSize: "12px",
                  color: "#e2e8f0",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {arrivalStop.description}
              </div>
            )}
          </div>

          {arrivalImages.length > 1 && (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {arrivalImages.slice(0, 3).map((imgUrl, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    position: "relative",
                    height: "44px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: idx === activePhotoIndex ? "2px solid #38bdf8" : "1.5px solid rgba(255, 255, 255, 0.2)",
                    boxShadow: idx === activePhotoIndex ? "0 0 12px rgba(56, 189, 248, 0.8)" : "none",
                    transform: idx === activePhotoIndex ? "scale(1.03)" : "scale(1.0)",
                    transition: "all 0.25s ease",
                    opacity: idx === activePhotoIndex ? 1 : 0.65,
                  }}
                >
                  <img src={imgUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  {idx === activePhotoIndex && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        height: "3px",
                        width: "100%",
                        background: "#38bdf8",
                        boxShadow: "0 0 6px #38bdf8",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "8px",
              fontSize: "11px",
              color: "#94a3b8",
            }}
          >
            <span>
              {activeLegIndex + 1 < totalLegs
                ? `Continuing to ${locations[activeLegIndex + 2]?.name || "next stop"}...`
                : "Journey route complete!"}
            </span>
            <span style={{ color: "#38bdf8", fontWeight: 600 }}>3D Tour Active</span>
          </div>
        </div>
      )}
    </div>
  );
}