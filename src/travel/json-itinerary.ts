import type { Location, Transport } from "./types";

type JsonStop = Partial<Location> & { transport?: Transport };
type JsonItinerary = { locations?: JsonStop[]; stops?: JsonStop[]; legs?: Transport[] };

const validTransports = new Set<Transport>([
  "flight", "car", "bike", "taxi", "train", "bicycle", "bus", "walking", "ship",
]);

/** Converts supplied itinerary JSON into route data used by the video renderer. */
export function parseJsonItinerary(source: string): { locations: Location[]; legs: Transport[] } {
  let data: JsonItinerary;
  try {
    data = JSON.parse(source) as JsonItinerary;
  } catch {
    throw new Error("JSON is not valid. Please check commas, quotes and brackets.");
  }

  const stops = data.locations ?? data.stops;
  if (!Array.isArray(stops) || stops.length < 2) {
    throw new Error("Add at least two items in the locations (or stops) array.");
  }

  const locations = stops.map((stop, index): Location => {
    const lat = Number(stop.lat);
    const lng = Number(stop.lng);
    if (!stop.name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error(`Stop ${index + 1} needs name, lat and lng.`);
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error(`Stop ${index + 1} has invalid latitude or longitude.`);
    }
    const images = Array.isArray(stop.images) ? stop.images.filter((image): image is string => typeof image === "string") : [];
    return {
      id: String(stop.id || `${stop.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}-${Date.now()}`),
      name: String(stop.name), country: String(stop.country || ""), code: String(stop.code || ""), lat, lng,
      imageUrl: typeof stop.imageUrl === "string" ? stop.imageUrl : images[0], images,
      videoUrl: typeof stop.videoUrl === "string" ? stop.videoUrl : undefined,
      videoDuration: Number.isFinite(Number(stop.videoDuration)) ? Number(stop.videoDuration) : undefined,
      description: typeof stop.description === "string" ? stop.description : undefined,
    };
  });
  const fallbackLegs = stops.slice(1).map((stop) =>
    validTransports.has(stop.transport as Transport) ? (stop.transport as Transport) : "flight"
  );
  const legs = Array.isArray(data.legs)
    ? locations.slice(1).map((_, index) => validTransports.has(data.legs![index]) ? data.legs![index] : fallbackLegs[index])
    : fallbackLegs;
  return { locations, legs };
}
