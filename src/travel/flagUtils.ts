/**
 * flagUtils.ts
 * ============
 * Utilities for the "Country Flag Arrival" feature.
 *
 * Responsibilities:
 *  1. Convert a country name (e.g. "India") to an ISO-3166-1 alpha-2 code
 *     (e.g. "in") using the offline `i18n-iso-countries` library.
 *  2. Build a flagcdn.com image URL from that code.
 *  3. Decide whether the flag should be shown on a given city arrival
 *     (only when the country changes compared to the previous city).
 */

import isoCountries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import type { Location } from "./types";

// Register the English locale once at module load time.
// This is the only locale we need; it maps names like "India" → "IND".
isoCountries.registerLocale(enLocale);

// ---------------------------------------------------------------------------
// Normalised country-name lookup map (built once, reused for every call)
// Key: lower-cased country name (with all diacritics stripped for fuzzy match)
// Value: ISO alpha-2 code in lower-case, e.g. "in"
// ---------------------------------------------------------------------------
let normalisedMap: Map<string, string> | null = null;

function buildNormalisedMap(): Map<string, string> {
  const map = new Map<string, string>();
  const alpha2List = Object.keys(isoCountries.getAlpha2Codes());

  for (const code of alpha2List) {
    // Primary name (English)
    const name = isoCountries.getName(code, "en");
    if (name) {
      map.set(normaliseKey(name), code.toLowerCase());
    }
    // All alternative names (some countries have several)
    const names = isoCountries.getNames("en");
    for (const [, n] of Object.entries(names)) {
      if (!map.has(normaliseKey(n))) {
        // We don't know the code from the names-loop directly, so skip — primary is enough
      }
    }
  }

  // Extra manual aliases that travellers commonly type but the lib
  // doesn't enumerate by default:
  const ALIASES: Record<string, string> = {
    "united arab emirates": "ae",
    "uae": "ae",
    "uk": "gb",
    "great britain": "gb",
    "england": "gb",
    "scotland": "gb",
    "wales": "gb",
    "south korea": "kr",
    "north korea": "kp",
    "russia": "ru",
    "iran": "ir",
    "syria": "sy",
    "taiwan": "tw",
    "usa": "us",
    "united states": "us",
    "america": "us",
    "vietnam": "vn",
    "laos": "la",
    "ivory coast": "ci",
    "cote d ivoire": "ci",
    "czech republic": "cz",
    "czechia": "cz",
    "slovakia": "sk",
    "cape verde": "cv",
    "timor leste": "tl",
    "east timor": "tl",
    "tanzania": "tz",
    "bolivia": "bo",
    "palestine": "ps",
  };

  for (const [alias, code] of Object.entries(ALIASES)) {
    map.set(alias, code);
  }

  return map;
}

/** Strip diacritics and convert to lower-case for fuzzy matching. */
function normaliseKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")                      // decompose diacritics (é → e + ́)
    .replace(/[\u0300-\u036f]/g, "")       // remove combining diacritics
    .replace(/[^a-z0-9 ]/g, " ")           // collapse any remaining punctuation to space
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * getFlagUrl(countryName)
 * -----------------------
 * Converts a country name to a flagcdn.com PNG URL (320px wide).
 *
 * Returns `null` if:
 *  - The country name is empty / unknown.
 *  - The library has no mapping for it.
 *
 * @example
 *   getFlagUrl("India")                 // "https://flagcdn.com/w320/in.png"
 *   getFlagUrl("United Arab Emirates")  // "https://flagcdn.com/w320/ae.png"
 *   getFlagUrl("Narnia")               // null
 */
export function getFlagUrl(countryName: string): string | null {
  if (!countryName?.trim()) return null;

  if (!normalisedMap) {
    normalisedMap = buildNormalisedMap();
  }

  // 1. Try exact normalised name
  const key = normaliseKey(countryName);
  let iso2 = normalisedMap.get(key);

  // 2. Try via i18n-iso-countries getAlpha2Code (it does its own fuzzy lookup)
  if (!iso2) {
    const code = isoCountries.getAlpha2Code(countryName, "en");
    if (code) iso2 = code.toLowerCase();
  }

  if (!iso2) return null;

  return `https://flagcdn.com/w320/${iso2}.png`;
}

/**
 * getIso2(countryName)
 * --------------------
 * Returns the ISO alpha-2 code (lower-case) for a country name, or null.
 * Useful for constructing other CDN URLs or running comparisons.
 */
export function getIso2(countryName: string): string | null {
  if (!countryName?.trim()) return null;

  if (!normalisedMap) {
    normalisedMap = buildNormalisedMap();
  }

  const key = normaliseKey(countryName);
  let iso2 = normalisedMap.get(key);

  if (!iso2) {
    const code = isoCountries.getAlpha2Code(countryName, "en");
    if (code) iso2 = code.toLowerCase();
  }

  return iso2 ?? null;
}

/**
 * isNewCountry(currentCity, previousCity)
 * ----------------------------------------
 * Returns `true` when the flag arrival animation should play.
 *
 * Rules:
 *  - If there is no previous city (first stop), always show the flag.
 *  - If either city has no country field, skip the flag (fail-safe).
 *  - Otherwise, compare ISO-2 codes (case-insensitive). Show flag only
 *    when they differ.
 *
 * @example
 *   isNewCountry({ country: "India" },    null)           // true  (first stop)
 *   isNewCountry({ country: "India" },    { country: "India" })    // false
 *   isNewCountry({ country: "UAE" },      { country: "India" })    // true
 *   isNewCountry({ country: "Mumbai" },   { country: "" })         // false (no info)
 */
export function isNewCountry(
  currentCity: Pick<Location, "country">,
  previousCity: Pick<Location, "country"> | null | undefined
): boolean {
  // First destination in the trip → always show flag
  if (!previousCity) return true;

  const prevCountry = previousCity.country?.trim();
  const curCountry  = currentCity.country?.trim();

  // Can't determine country → skip animation
  if (!prevCountry || !curCountry) return false;

  // Same string (case-insensitive) fast path
  if (prevCountry.toLowerCase() === curCountry.toLowerCase()) return false;

  // Resolve both to ISO codes for robust comparison
  // (e.g. "UK" and "United Kingdom" both map to "gb")
  const prevIso = getIso2(prevCountry);
  const curIso  = getIso2(curCountry);

  // If we can resolve both: compare codes
  if (prevIso && curIso) return prevIso !== curIso;

  // Fallback: plain string comparison
  return prevCountry.toLowerCase() !== curCountry.toLowerCase();
}

/**
 * buildFlagArrivalPlan(locations)
 * --------------------------------
 * Processes the full cities array and returns a per-city decision object:
 * whether to show the flag, and what flag URL to use.
 *
 * This is the "loop" helper that wires everything together for the sequence
 * controller in MapboxGlobe / the video export pipeline.
 *
 * @example
 *   const plan = buildFlagArrivalPlan(journey.locations);
 *   // plan[2] === { showFlag: true, flagUrl: "https://flagcdn.com/w320/ae.png", country: "UAE" }
 */
export interface FlagArrivalEntry {
  /** Index in the original locations array. */
  index: number;
  /** Destination city name. */
  cityName: string;
  /** Country string as provided in the data. */
  country: string;
  /** Whether the flag animation should play at this stop. */
  showFlag: boolean;
  /** The flagcdn.com URL, or null if the country couldn't be resolved. */
  flagUrl: string | null;
}

export function buildFlagArrivalPlan(locations: Location[]): FlagArrivalEntry[] {
  return locations.map((city, idx) => {
    const previousCity = idx > 0 ? locations[idx - 1] : null;
    const showFlag = isNewCountry(city, previousCity);
    const flagUrl = showFlag ? getFlagUrl(city.country) : null;

    return {
      index: idx,
      cityName: city.name,
      country: city.country,
      showFlag,
      flagUrl,
    };
  });
}

