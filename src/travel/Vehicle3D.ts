import type { Transport } from "./types";

export const vehicleLabels: Record<Transport, string> = {
  car: "3D Car",
  bike: "3D Motorcycle",
  flight: "3D Airplane",
  train: "3D Bullet Train",
  taxi: "3D Taxi",
  bicycle: "3D Bicycle",
  bus: "3D Bus",
  walking: "3D Traveller",
  ship: "3D Cruise Ship",
};

// High-detail borderless 3D SVG models with pure gradient fills and lighting highlights
export const vehicleSvgTemplates: Record<Transport, string> = {
  flight: `
    <svg class="vehicle-svg flight-svg" viewBox="0 0 100 100" width="100%" height="100%">
      <defs>
        <!-- Metallic Fuselage Gradient -->
        <linearGradient id="planeFuselage" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#94a3b8"/>
          <stop offset="25%" stop-color="#f8fafc"/>
          <stop offset="55%" stop-color="#ffffff"/>
          <stop offset="85%" stop-color="#cbd5e1"/>
          <stop offset="100%" stop-color="#64748b"/>
        </linearGradient>
        <!-- Wing Gradient with Aero Highlight -->
        <linearGradient id="planeWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="35%" stop-color="#0284c7"/>
          <stop offset="80%" stop-color="#0369a1"/>
          <stop offset="100%" stop-color="#075985"/>
        </linearGradient>
        <!-- Cockpit Glass Reflection -->
        <linearGradient id="cockpitVisor" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#7dd3fc"/>
          <stop offset="40%" stop-color="#0284c7"/>
          <stop offset="100%" stop-color="#082f49"/>
        </linearGradient>
        <!-- Jet Engine Turbine Core -->
        <linearGradient id="turbineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="50%" stop-color="#475569"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
        <!-- Tail Fin Shading -->
        <linearGradient id="tailGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#0284c7"/>
          <stop offset="50%" stop-color="#38bdf8"/>
          <stop offset="100%" stop-color="#0369a1"/>
        </linearGradient>
      </defs>

      <!-- Main Swept Wings -->
      <path d="M 50 38 L 8 58 L 8 64 L 50 54 L 92 64 L 92 58 Z" fill="url(#planeWingGrad)"/>

      <!-- Wingtips Blended Winglets (Upward curved tips) -->
      <path d="M 8 58 L 6 51 L 9 53 Z" fill="#0284c7"/>
      <path d="M 92 58 L 94 51 L 91 53 Z" fill="#0284c7"/>

      <!-- Wingtip Anti-Collision Navigation Strobe Lights -->
      <!-- Left (Port) Red Strobe -->
      <circle cx="6" cy="52" r="2.4" class="strobe-light strobe-red" fill="#ef4444"/>
      <!-- Right (Starboard) Green Strobe -->
      <circle cx="94" cy="52" r="2.4" class="strobe-light strobe-green" fill="#22c55e"/>

      <!-- Horizontal Stabilizers (Tail Wings) -->
      <path d="M 50 78 L 30 90 L 30 94 L 50 88 L 70 94 L 70 90 Z" fill="url(#planeWingGrad)"/>

      <!-- Jet Turbofan Engines Under Wings -->
      <rect x="27" y="52" width="7" height="17" rx="3.5" fill="url(#turbineGrad)"/>
      <ellipse cx="30.5" cy="52" rx="3.5" ry="2" fill="#94a3b8"/>
      <ellipse cx="30.5" cy="69" rx="2.5" ry="1.2" fill="#38bdf8" opacity="0.8"/>

      <rect x="66" y="52" width="7" height="17" rx="3.5" fill="url(#turbineGrad)"/>
      <ellipse cx="69.5" cy="52" rx="3.5" ry="2" fill="#94a3b8"/>
      <ellipse cx="69.5" cy="69" rx="2.5" ry="1.2" fill="#38bdf8" opacity="0.8"/>

      <!-- Aerodynamic Main Fuselage (Nose at TOP pointing forward) -->
      <path d="M 50 6 C 56 14, 59 34, 58 76 C 58 89, 54 95, 50 95 C 46 95, 42 89, 42 76 C 41 34, 44 14, 50 6 Z" fill="url(#planeFuselage)"/>
      <!-- Fuselage Dorsal Highlight Line -->
      <path d="M 50 10 L 50 82" stroke="rgba(255,255,255,0.7)" stroke-width="1.2" stroke-linecap="round"/>

      <!-- Cockpit Windshield (Multi-panel) -->
      <path d="M 45 19 C 48 16, 52 16, 55 19 L 56 25 C 53 27, 47 27, 44 25 Z" fill="url(#cockpitVisor)"/>

      <!-- Tail Vertical Fin -->
      <path d="M 49.2 70 L 50.8 70 L 50.8 92 L 49.2 92 Z" fill="url(#tailGrad)"/>
      <!-- Top Fuselage Strobe Light -->
      <circle cx="50" cy="46" r="2" class="strobe-light strobe-white" fill="#ffffff"/>
    </svg>
  `,

  car: `
    <svg class="vehicle-svg car-svg" viewBox="0 0 64 76" width="100%" height="100%">
      <defs>
        <linearGradient id="carGlossBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="35%" stop-color="#0284c7"/>
          <stop offset="80%" stop-color="#0369a1"/>
          <stop offset="100%" stop-color="#082f49"/>
        </linearGradient>
        <linearGradient id="carGlassGloss" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#e0f2fe"/>
          <stop offset="45%" stop-color="#38bdf8"/>
          <stop offset="100%" stop-color="#075985"/>
        </linearGradient>
        <linearGradient id="carRoofGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="50%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>

      <!-- Wheels -->
      <rect x="6" y="16" width="6" height="14" rx="2.5" fill="#0f172a"/>
      <rect x="52" y="16" width="6" height="14" rx="2.5" fill="#0f172a"/>
      <rect x="6" y="48" width="6" height="14" rx="2.5" fill="#0f172a"/>
      <rect x="52" y="48" width="6" height="14" rx="2.5" fill="#0f172a"/>

      <!-- Car Body Chassis (Front Hood at TOP) -->
      <path d="M 16 12 C 19 8, 45 8, 48 12 C 53 17, 54 36, 53 62 C 53 69, 47 71, 32 71 C 17 71, 11 69, 11 62 C 10 36, 11 17, 16 12 Z" fill="url(#carGlossBody)"/>

      <!-- Hood Aerodynamic Creases -->
      <path d="M 23 11 L 25 24 M 41 11 L 39 24" stroke="rgba(255,255,255,0.45)" stroke-width="1.3" stroke-linecap="round"/>

      <!-- Front Windshield -->
      <path d="M 18 25 L 46 25 L 42 36 L 22 36 Z" fill="url(#carGlassGloss)"/>

      <!-- Panoramic Roof Top -->
      <path d="M 22 36 L 42 36 L 41 51 L 23 51 Z" fill="url(#carRoofGrad)"/>
      <rect x="26" y="39" width="12" height="9" rx="1.5" fill="#38bdf8" opacity="0.3"/>

      <!-- Rear Windshield -->
      <path d="M 23 51 L 41 51 L 44 59 L 20 59 Z" fill="url(#carGlassGloss)"/>

      <!-- Side Mirrors -->
      <rect x="9" y="25" width="4.5" height="3.5" rx="1.5" fill="#0284c7"/>
      <rect x="50.5" y="25" width="4.5" height="3.5" rx="1.5" fill="#0284c7"/>

      <!-- Front LED Headlights (Glowing at TOP front) -->
      <ellipse cx="18" cy="11" rx="4" ry="2.2" fill="#ffffff"/>
      <ellipse cx="46" cy="11" rx="4" ry="2.2" fill="#ffffff"/>
      <circle cx="18" cy="11" r="1.5" fill="#38bdf8"/>
      <circle cx="46" cy="11" r="1.5" fill="#38bdf8"/>

      <!-- Rear LED Taillights (Red at bottom rear) -->
      <rect x="14" y="68" width="8" height="3" rx="1" fill="#ef4444"/>
      <rect x="42" y="68" width="8" height="3" rx="1" fill="#ef4444"/>
    </svg>
  `,

  taxi: `
    <svg class="vehicle-svg taxi-svg" viewBox="0 0 64 76" width="100%" height="100%">
      <defs>
        <linearGradient id="taxiBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="35%" stop-color="#f59e0b"/>
          <stop offset="85%" stop-color="#d97706"/>
          <stop offset="100%" stop-color="#b45309"/>
        </linearGradient>
        <linearGradient id="taxiGlass" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f0fdf4"/>
          <stop offset="45%" stop-color="#7dd3fc"/>
          <stop offset="100%" stop-color="#0369a1"/>
        </linearGradient>
      </defs>

      <!-- Wheels -->
      <rect x="6" y="16" width="6" height="14" rx="2.5" fill="#0f172a"/>
      <rect x="52" y="16" width="6" height="14" rx="2.5" fill="#0f172a"/>
      <rect x="6" y="48" width="6" height="14" rx="2.5" fill="#0f172a"/>
      <rect x="52" y="48" width="6" height="14" rx="2.5" fill="#0f172a"/>

      <!-- Body (Front at TOP) -->
      <path d="M 16 12 C 19 8, 45 8, 48 12 C 53 17, 54 36, 53 62 C 53 69, 47 71, 32 71 C 17 71, 11 69, 11 62 C 10 36, 11 17, 16 12 Z" fill="url(#taxiBodyGrad)"/>

      <!-- Iconic Checkerboard Stripe -->
      <path d="M 11 38 L 53 38 L 53 43 L 11 43 Z" fill="#0f172a"/>
      <rect x="15" y="38" width="4.5" height="5" fill="#ffffff"/>
      <rect x="24" y="38" width="4.5" height="5" fill="#ffffff"/>
      <rect x="33" y="38" width="4.5" height="5" fill="#ffffff"/>
      <rect x="42" y="38" width="4.5" height="5" fill="#ffffff"/>

      <!-- Windshields -->
      <path d="M 18 25 L 46 25 L 42 36 L 22 36 Z" fill="url(#taxiGlass)"/>
      <path d="M 23 51 L 41 51 L 44 59 L 20 59 Z" fill="url(#taxiGlass)"/>

      <!-- Roof TAXI Light Sign -->
      <rect x="22" y="42" width="20" height="8" rx="2.5" fill="#ffffff"/>
      <text x="32" y="47.5" font-size="4.5" font-family="sans-serif" font-weight="900" fill="#0f172a" text-anchor="middle" letter-spacing="0.5">TAXI</text>

      <!-- Headlights & Taillights -->
      <ellipse cx="18" cy="11" rx="4" ry="2.2" fill="#ffffff"/>
      <ellipse cx="46" cy="11" rx="4" ry="2.2" fill="#ffffff"/>
      <rect x="14" y="68" width="8" height="3" rx="1" fill="#ef4444"/>
      <rect x="42" y="68" width="8" height="3" rx="1" fill="#ef4444"/>
    </svg>
  `,

  train: `
    <svg class="vehicle-svg train-svg" viewBox="0 0 54 96" width="100%" height="100%">
      <defs>
        <linearGradient id="shinkansenBody" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#94a3b8"/>
          <stop offset="25%" stop-color="#ffffff"/>
          <stop offset="70%" stop-color="#f1f5f9"/>
          <stop offset="100%" stop-color="#64748b"/>
        </linearGradient>
        <linearGradient id="trainRedStripe" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ef4444"/>
          <stop offset="100%" stop-color="#991b1b"/>
        </linearGradient>
        <linearGradient id="trainBlueStripe" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#0284c7"/>
          <stop offset="100%" stop-color="#0369a1"/>
        </linearGradient>
      </defs>

      <!-- Bullet Train Aerodynamic Shell (Nose at TOP) -->
      <path d="M 27 3 C 37 16, 40 34, 40 88 C 40 93, 38 95, 27 95 C 16 95, 14 93, 14 88 C 14 34, 17 16, 27 3 Z" fill="url(#shinkansenBody)"/>

      <!-- Racing Speed Stripes -->
      <path d="M 14 42 L 40 42 L 40 47 L 14 47 Z" fill="url(#trainRedStripe)"/>
      <path d="M 14 65 L 40 65 L 40 68 L 14 68 Z" fill="url(#trainBlueStripe)"/>

      <!-- Streamlined Cockpit Visor -->
      <path d="M 27 8 C 33 15, 35 24, 27 27 C 19 24, 21 15, 27 8 Z" fill="#0f172a"/>
      <path d="M 27 10 C 31 16, 33 22, 27 24 C 21 22, 23 16, 27 10 Z" fill="#38bdf8" opacity="0.85"/>

      <!-- Passenger Windows Line -->
      <rect x="16" y="50" width="4.5" height="32" rx="1.5" fill="#0f172a"/>
      <rect x="33.5" y="50" width="4.5" height="32" rx="1.5" fill="#0f172a"/>

      <!-- High-speed Twin Nose Lamps -->
      <circle cx="22" cy="7" r="2.2" fill="#ffffff"/>
      <circle cx="32" cy="7" r="2.2" fill="#ffffff"/>
      <circle cx="27" cy="5" r="1.5" fill="#38bdf8"/>

      <!-- Roof Pantograph details -->
      <rect x="25" y="74" width="4" height="9" rx="1" fill="#334155"/>
      <line x1="22" y1="78" x2="32" y2="78" stroke="#94a3b8" stroke-width="1.8"/>
    </svg>
  `,

  ship: `
    <svg class="vehicle-svg ship-svg" viewBox="0 0 64 96" width="100%" height="100%">
      <defs>
        <linearGradient id="cruiseHull" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="35%" stop-color="#1e293b"/>
          <stop offset="70%" stop-color="#334155"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
        <linearGradient id="cruiseDeck" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="50%" stop-color="#f8fafc"/>
          <stop offset="100%" stop-color="#e2e8f0"/>
        </linearGradient>
        <linearGradient id="poolGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#06b6d4"/>
          <stop offset="100%" stop-color="#0284c7"/>
        </linearGradient>
      </defs>

      <!-- Ship Hull Structure (Bow at TOP) -->
      <path d="M 32 5 C 47 24, 49 56, 46 88 C 46 91, 42 93, 32 93 C 22 93, 18 91, 18 88 C 15 56, 17 24, 32 5 Z" fill="url(#cruiseHull)"/>

      <!-- Red Waterline Bow Bulb -->
      <path d="M 30 7 L 34 7 L 32 4 Z" fill="#ef4444"/>

      <!-- Multi-tier Upper Decks -->
      <path d="M 32 18 C 41 30, 42 56, 40 84 C 40 86, 38 87, 32 87 C 26 87, 24 86, 24 84 C 22 56, 23 30, 32 18 Z" fill="url(#cruiseDeck)"/>

      <!-- Bridge Navigation Windows -->
      <path d="M 28 29 C 30 27, 34 27, 36 29 L 36 32 L 28 32 Z" fill="#0284c7"/>

      <!-- Luxury Swimming Pool -->
      <rect x="29" y="70" width="6" height="10" rx="2" fill="url(#poolGrad)"/>

      <!-- Smokestacks / Red Funnel -->
      <rect x="29.5" y="50" width="5" height="8" rx="1.5" fill="#ef4444"/>
      <rect x="29.5" y="50" width="5" height="2.5" rx="0.5" fill="#0f172a"/>

      <!-- Radar Mast -->
      <circle cx="32" cy="40" r="1.8" fill="#0284c7"/>
    </svg>
  `,

  bus: `
    <svg class="vehicle-svg bus-svg" viewBox="0 0 56 86" width="100%" height="100%">
      <defs>
        <linearGradient id="busBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="40%" stop-color="#0284c7"/>
          <stop offset="100%" stop-color="#075985"/>
        </linearGradient>
      </defs>

      <!-- Wheels -->
      <rect x="5" y="18" width="6" height="13" rx="2" fill="#0f172a"/>
      <rect x="45" y="18" width="6" height="13" rx="2" fill="#0f172a"/>
      <rect x="5" y="58" width="6" height="13" rx="2" fill="#0f172a"/>
      <rect x="45" y="58" width="6" height="13" rx="2" fill="#0f172a"/>

      <!-- Bus Main Chassis (Front at TOP) -->
      <rect x="9" y="8" width="38" height="72" rx="8" fill="url(#busBodyGrad)"/>

      <!-- Roof AC Units & Ventilation -->
      <rect x="14" y="24" width="28" height="46" rx="4" fill="#f1f5f9"/>
      <rect x="18" y="34" width="20" height="14" rx="2" fill="#94a3b8"/>
      <rect x="18" y="52" width="20" height="10" rx="2" fill="#cbd5e1"/>

      <!-- Front Windshield & Destination LED -->
      <path d="M 12 12 C 14 9, 42 9, 44 12 L 42 22 L 14 22 Z" fill="#0f172a"/>
      <path d="M 15 13 L 41 13 L 40 18 L 16 18 Z" fill="#38bdf8" opacity="0.8"/>
      <rect x="18" y="10" width="20" height="3.5" rx="1" fill="#f59e0b"/>

      <!-- Front Headlights (At TOP front) -->
      <circle cx="14" cy="9" r="2.8" fill="#ffffff"/>
      <circle cx="42" cy="9" r="2.8" fill="#ffffff"/>
    </svg>
  `,

  bike: `
    <svg class="vehicle-svg bike-svg" viewBox="0 0 52 68" width="100%" height="100%">
      <defs>
        <linearGradient id="motoBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f43f5e"/>
          <stop offset="100%" stop-color="#9f1239"/>
        </linearGradient>
      </defs>

      <!-- Wheels (Front & Back) -->
      <rect x="23" y="7" width="6" height="16" rx="3" fill="#0f172a"/>
      <rect x="23" y="46" width="6" height="17" rx="3" fill="#0f172a"/>

      <!-- Handlebars & Mirrors (Front at TOP) -->
      <line x1="13" y1="20" x2="39" y2="20" stroke="#334155" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="13" cy="20" r="2.2" fill="#0f172a"/>
      <circle cx="39" cy="20" r="2.2" fill="#0f172a"/>

      <!-- Superbike Body Fairing -->
      <path d="M 26 17 L 33 30 L 31 48 L 21 48 L 19 30 Z" fill="url(#motoBody)"/>

      <!-- Rider in Leather Gear & Helmet -->
      <ellipse cx="26" cy="34" rx="6" ry="8" fill="#1e293b"/>
      <circle cx="26" cy="28" r="5" fill="#e11d48"/>
      <ellipse cx="26" cy="26" rx="4" ry="2.2" fill="#0f172a"/>

      <!-- Headlight Beam & Taillight -->
      <circle cx="26" cy="7" r="2.8" fill="#ffffff"/>
      <rect x="24" y="60" width="4" height="2.5" fill="#ef4444"/>
    </svg>
  `,

  bicycle: `
    <svg class="vehicle-svg bicycle-svg" viewBox="0 0 50 64" width="100%" height="100%">
      <!-- Narrow Wheels -->
      <rect x="23.5" y="7" width="3.5" height="15" rx="1.7" fill="#0f172a"/>
      <rect x="23.5" y="43" width="3.5" height="15" rx="1.7" fill="#0f172a"/>
      <!-- Frame -->
      <line x1="25" y1="18" x2="25" y2="46" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Handlebars -->
      <line x1="16" y1="18" x2="34" y2="18" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>
      <!-- Cyclist Helmet -->
      <circle cx="25" cy="32" r="5.5" fill="#0284c7"/>
      <circle cx="25" cy="26" r="4" fill="#fde047"/>
    </svg>
  `,

  walking: `
    <svg class="vehicle-svg walking-svg" viewBox="0 0 50 60" width="100%" height="100%">
      <!-- Backpack -->
      <rect x="18" y="24" width="14" height="15" rx="3.5" fill="#ea580c"/>
      <!-- Body Shoulders -->
      <ellipse cx="25" cy="26" rx="8" ry="5.5" fill="#0284c7"/>
      <!-- Head with Adventure Hat (Facing TOP) -->
      <circle cx="25" cy="17" r="5" fill="#fed7aa"/>
      <circle cx="25" cy="16" r="6" fill="#0369a1" opacity="0.9"/>
    </svg>
  `,
};

export function createVehicle3DElement(transport: Transport): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.className = `vehicle-3d vehicle-3d-${transport}`;
  wrapper.setAttribute("role", "img");
  wrapper.setAttribute("aria-label", vehicleLabels[transport] || "3D Vehicle");
  wrapper.dataset.transport = transport;

  wrapper.innerHTML = `
    <div class="vehicle-3d-shadow"></div>
    <div class="vehicle-3d-effects">
      <div class="flight-contrail flight-contrail-left"></div>
      <div class="flight-contrail flight-contrail-right"></div>
      <div class="ship-wake ship-wake-left"></div>
      <div class="ship-wake ship-wake-right"></div>
    </div>
    <div class="vehicle-3d-container">
      <div class="vehicle-3d-model">
        ${vehicleSvgTemplates[transport] || vehicleSvgTemplates.car}
      </div>
    </div>
  `;
  return wrapper;
}

// Track vehicle motion & physics state per marker
const vehiclePhysicsState = new WeakMap<
  HTMLElement,
  {
    lastBearing: number;
    smoothedBearing: number;
    currentRoll: number;
    currentPitch: number;
    currentAltitude: number;
    lastTime: number;
    initialized: boolean;
  }
>();

// Shortest signed angular difference [-180, 180] to avoid 360-degree flip spins
function shortestAngleDelta(a: number, b: number): number {
  let delta = b - a;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

export interface VehicleUpdateOptions {
  legFraction?: number;
  pathFraction?: number;
  isArrival?: boolean;
  isPlaying?: boolean;
}

export function updateVehicle3D(
  element: HTMLElement,
  transport: Transport,
  bearing: number,
  options?: VehicleUpdateOptions
): void {
  // Switch model if transport type changed
  if (element.dataset.transport !== transport) {
    element.className = `vehicle-3d vehicle-3d-${transport} mapbox-vehicle-marker`;
    element.setAttribute("aria-label", vehicleLabels[transport] || "3D Vehicle");
    element.dataset.transport = transport;
    const modelContainer = element.querySelector(".vehicle-3d-model");
    if (modelContainer) {
      modelContainer.innerHTML = vehicleSvgTemplates[transport] || vehicleSvgTemplates.car;
    }
  }

  let state = vehiclePhysicsState.get(element);
  const now = performance.now();
  if (!state) {
    state = {
      lastBearing: bearing,
      smoothedBearing: bearing,
      currentRoll: 0,
      currentPitch: 18,
      currentAltitude: 0,
      lastTime: now,
      initialized: true,
    };
    vehiclePhysicsState.set(element, state);
  }

  const turnDelta = shortestAngleDelta(state.lastBearing, bearing);
  state.lastBearing = bearing;

  // If turning sharply (e.g. new leg or sharp turn), immediately align to face the route direction
  if (Math.abs(turnDelta) > 60 || !state.initialized) {
    state.smoothedBearing = bearing;
    state.initialized = true;
  } else {
    // NOTE (fix): road vehicles (car/taxi/bus/bike/etc.) previously used 0.85,
    // which reacted almost instantly to every tiny bearing fluctuation coming
    // from the underlying route polyline (especially the wavy fallback road
    // path). That made the vehicle icon visibly twitch/tilt away from the
    // blue route line frame to frame. Lowering it smooths that jitter out
    // while still tracking real turns responsively. Flight keeps its own
    // smoother value since altitude/banking needs a different feel.
    const headingSmoothing = transport === "flight" ? 0.65 : 0.35;
    const headingDelta = shortestAngleDelta(state.smoothedBearing, bearing);
    state.smoothedBearing = state.smoothedBearing + headingDelta * headingSmoothing;
    state.smoothedBearing = ((state.smoothedBearing % 360) + 360) % 360;
  }

  // Banking Roll (Leaning into turns)
  const bankFactor = transport === "flight" ? 1.8 : transport === "bike" ? 1.4 : transport === "ship" ? 0.6 : 0.8;
  const targetRoll = Math.max(-26, Math.min(26, turnDelta * bankFactor));
  state.currentRoll = state.currentRoll * 0.8 + targetRoll * 0.2;

  // Physics calculation based on transport type and travel progress
  const progress = options?.pathFraction ?? 0.5;
  const isPlaying = options?.isPlaying ?? true;

  let targetPitch = 15; // Clean 3D perspective tilt
  let targetAltitude = 0; // Pixels offset above ground

  if (transport === "flight") {
    // Flight Altitude Curve (Climb -> Cruise -> Descent)
    const altitudeMultiplier = Math.sin(Math.max(0, Math.min(1, progress)) * Math.PI);
    targetAltitude = altitudeMultiplier * 36; // Up to 36px lift

    // Pitch Dynamics:
    // Takeoff (0..0.20): Nose UP (+12deg)
    // Cruise (0.20..0.80): Level
    // Landing (0.80..1.0): Nose DOWN (-8deg)
    if (progress < 0.20) {
      const climbFactor = 1 - progress / 0.20;
      targetPitch = 15 + climbFactor * 12;
    } else if (progress > 0.80) {
      const landFactor = (progress - 0.80) / 0.20;
      targetPitch = 15 - landFactor * 8;
    } else {
      targetPitch = 15;
    }

    const effectsEl = element.querySelector<HTMLElement>(".vehicle-3d-effects");
    if (effectsEl) {
      effectsEl.style.opacity = targetAltitude > 10 && isPlaying ? "1" : "0";
    }
  } else if (transport === "ship") {
    // Gentle nautical wave rocking
    const waveRoll = Math.sin(now * 0.0035) * 4;
    const wavePitch = Math.cos(now * 0.0025) * 2.5;
    state.currentRoll += waveRoll;
    targetPitch = 15 + wavePitch;
    targetAltitude = 0;

    const effectsEl = element.querySelector<HTMLElement>(".vehicle-3d-effects");
    if (effectsEl) {
      effectsEl.style.opacity = isPlaying ? "0.8" : "0";
    }
  } else {
    // Road vehicles (Car, Taxi, Bus, Bike):
    targetPitch = 15;
    targetAltitude = 0;

    const effectsEl = element.querySelector<HTMLElement>(".vehicle-3d-effects");
    if (effectsEl) {
      effectsEl.style.opacity = "0";
    }
  }

  // Smooth Pitch & Altitude transitions
  state.currentPitch = state.currentPitch * 0.85 + targetPitch * 0.15;
  state.currentAltitude = state.currentAltitude * 0.85 + targetAltitude * 0.15;
  state.lastTime = now;

  // Apply CSS Variables for dynamic 3D rendering
  element.style.setProperty("--vehicle-bearing", `${state.smoothedBearing.toFixed(1)}deg`);
  element.style.setProperty("--vehicle-roll", `${state.currentRoll.toFixed(1)}deg`);
  element.style.setProperty("--vehicle-pitch", `${state.currentPitch.toFixed(1)}deg`);
  element.style.setProperty("--vehicle-altitude", `${state.currentAltitude.toFixed(1)}px`);

  // Transform Heading container - directly faces forward along route
  const container = element.querySelector<HTMLElement>(".vehicle-3d-container");
  if (container) {
    container.style.transform = `rotateZ(${state.smoothedBearing.toFixed(1)}deg)`;
  }

  // Transform 3D Model with Altitude Lift & 3D Tilt
  const model = element.querySelector<HTMLElement>(".vehicle-3d-model");
  if (model) {
    const scale = transport === "flight" ? 1 + (state.currentAltitude / 36) * 0.25 : 1;
    model.style.transform = `translateY(${-state.currentAltitude.toFixed(1)}px) scale(${scale.toFixed(2)}) rotateX(${state.currentPitch.toFixed(1)}deg) rotateY(${state.currentRoll.toFixed(1)}deg)`;
  }

  // Shadow behavior: Stays grounded, expands & softens as vehicle gains altitude
  const shadow = element.querySelector<HTMLElement>(".vehicle-3d-shadow");
  if (shadow) {
    const shadowScale = 1 + (state.currentAltitude / 36) * 0.3;
    const shadowOpacity = Math.max(0.18, 0.55 - (state.currentAltitude / 36) * 0.3);
    const shadowBlur = 3 + (state.currentAltitude / 36) * 6;
    shadow.style.transform = `rotateZ(${state.smoothedBearing.toFixed(1)}deg) scale(${shadowScale.toFixed(2)})`;
    shadow.style.opacity = `${shadowOpacity.toFixed(2)}`;
    shadow.style.filter = `blur(${shadowBlur.toFixed(1)}px)`;
  }
}