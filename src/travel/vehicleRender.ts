import type { Transport } from "./types";

/**
 * Ultra-Realistic 3D Isometric Animated Vehicle Engine
 * Engineered for photorealistic depth, multi-stop metallic automotive shaders,
 * realistic glass reflections, mechanical detailing, and prominent scaling for personal transports.
 */

export interface VehicleConfig {
  label: string;
  color: string;
  glowColor: string;
  shadowBlur: number;
}

// 🆕 REPLACE EMOJIS WITH SVG ICON GETTER
export function getVehicleIconSvg(transport: Transport, size: number = 32, bearingDeg: number = 0): string {
  const fullSvg = getRealisticVehicleSvg(transport);
  // Extract the inner SVG content and wrap with proper sizing
  const svgContent = fullSvg.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '');
  
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(${bearingDeg}, 50, 50)">
      ${svgContent}
    </g>
  </svg>`;
}

// 🆕 GET BEARING ARROW
export function getBearingArrow(deg: number): string {
  const directions = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  const index = Math.round(((deg % 360) / 45)) % 8;
  return directions[index];
}

// 🆕 GET VEHICLE MARK WITH SVG
export function getVehicleMark(transport: Transport, bearingDeg?: number): string {
  const svg = getVehicleIconSvg(transport, 28, bearingDeg || 0);
  const arrow = bearingDeg !== undefined ? ` ${getBearingArrow(bearingDeg)}` : "";
  return `${svg}${arrow}`;
}

// 🆕 GET HTML RENDERABLE VEHICLE MARK
export function getVehicleMarkHtml(transport: Transport, bearingDeg?: number): string {
  const svg = getVehicleIconSvg(transport, 32, bearingDeg || 0);
  const name = VEHICLE_CONFIGS[transport]?.label || transport;
  const arrow = bearingDeg !== undefined ? getBearingArrow(bearingDeg) : "";
  
  return `<div class="vehicle-marker" style="display:flex;align-items:center;gap:8px;">
    <div style="width:32px;height:32px;">${svg}</div>
    <span style="font-weight:600;">${name}</span>
    <span style="font-size:18px;">${arrow}</span>
  </div>`;
}

// Keep emojis for backward compatibility
export const vehicleMarks: Record<Transport, string> = {
  flight: "✈️",
  car: "🚗",
  taxi: "🚕",
  train: "🚆",
  bus: "🚌",
  bike: "🏍️",
  bicycle: "🚲",
  ship: "⛵",
  walking: "🚶",
};

export const VEHICLE_CONFIGS: Record<Transport, VehicleConfig> = {
  flight: {
    label: "Commercial Flight",
    color: "#38bdf8",
    glowColor: "rgba(56, 189, 248, 0.75)",
    shadowBlur: 22,
  },
  car: {
    label: "Road Trip Car",
    color: "#dc2626",
    glowColor: "rgba(220, 38, 38, 0.7)",
    shadowBlur: 16,
  },
  taxi: {
    label: "City Taxi",
    color: "#f59e0b",
    glowColor: "rgba(245, 158, 11, 0.75)",
    shadowBlur: 16,
  },
  train: {
    label: "High-Speed 5-Coach Train",
    color: "#0284c7",
    glowColor: "rgba(2, 132, 199, 0.75)",
    shadowBlur: 18,
  },
  bus: {
    label: "Tour Coach Bus",
    color: "#0d9488",
    glowColor: "rgba(13, 148, 136, 0.7)",
    shadowBlur: 16,
  },
  bike: {
    label: "Superbike Motorcycle",
    color: "#b91c1c",
    glowColor: "rgba(185, 28, 28, 0.8)",
    shadowBlur: 18,
  },
  bicycle: {
    label: "Road Bicycle",
    color: "#0891b2",
    glowColor: "rgba(8, 145, 178, 0.75)",
    shadowBlur: 14,
  },
  ship: {
    label: "Sailboat / Yacht",
    color: "#059669",
    glowColor: "rgba(5, 150, 105, 0.75)",
    shadowBlur: 18,
  },
  walking: {
    label: "Adventure Trek",
    color: "#10b981",
    glowColor: "rgba(16, 185, 129, 0.75)",
    shadowBlur: 14,
  },
};

/**
 * Returns ultra-realistic 3D animated SVG markup for each vehicle.
 */
export function getRealisticVehicleSvg(transport: Transport = "flight"): string {
  switch (transport) {
    case "car":
      // Ultra-Realistic 3D Red Touring Sedan with Rooftop Luggage
      return `
<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .luggage-anim { animation: carLuggageWobble 0.75s ease-in-out infinite alternate; transform-origin: 50px 52px; }
      .car-beam { animation: carBeamPulse 0.9s ease-in-out infinite alternate; }
      .exhaust-puff { animation: exhaustPuff 0.7s ease-out infinite; transform-origin: 32px 88px; }
      @keyframes carLuggageWobble {
        0% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-1.5px) rotate(1.2deg); }
        100% { transform: translateY(0px) rotate(-1.2deg); }
      }
      @keyframes carBeamPulse {
        0% { opacity: 0.35; transform: scaleY(0.94); }
        100% { opacity: 0.65; transform: scaleY(1.06); }
      }
      @keyframes exhaustPuff {
        0% { opacity: 0.6; transform: scale(0.6) translateY(0); }
        100% { opacity: 0; transform: scale(1.6) translateY(12px); }
      }
    </style>
    <linearGradient id="realCarRed" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7f1d1d" />
      <stop offset="12%" stop-color="#b91c1c" />
      <stop offset="35%" stop-color="#ef4444" />
      <stop offset="50%" stop-color="#fca5a5" />
      <stop offset="65%" stop-color="#ef4444" />
      <stop offset="88%" stop-color="#b91c1c" />
      <stop offset="100%" stop-color="#7f1d1d" />
    </linearGradient>
    <linearGradient id="realCarGlass" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#020617" />
      <stop offset="30%" stop-color="#0f172a" />
      <stop offset="70%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
    <linearGradient id="realChrome" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#94a3b8" />
      <stop offset="50%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#94a3b8" />
    </linearGradient>
    <linearGradient id="realBrownLeather" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#92400e" />
      <stop offset="50%" stop-color="#d97706" />
      <stop offset="100%" stop-color="#78350f" />
    </linearGradient>
    <linearGradient id="realPurpleSuitcase" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a855f7" />
      <stop offset="50%" stop-color="#7e22ce" />
      <stop offset="100%" stop-color="#581c87" />
    </linearGradient>
    <filter id="realCarShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000000" flood-opacity="0.6" />
    </filter>
  </defs>

  <g class="car-beam">
    <polygon points="34,10 18,-14 44,-14" fill="rgba(254, 240, 138, 0.45)" />
    <polygon points="66,10 56,-14 82,-14" fill="rgba(254, 240, 138, 0.45)" />
  </g>

  <circle cx="31" cy="90" r="3" fill="#cbd5e1" class="exhaust-puff" />

  <g filter="url(#realCarShadow)">
    <rect x="21" y="22" width="8" height="17" rx="3.5" fill="#0f172a" stroke="#334155" stroke-width="1.2" />
    <rect x="71" y="22" width="8" height="17" rx="3.5" fill="#0f172a" stroke="#334155" stroke-width="1.2" />
    <rect x="21" y="65" width="8" height="17" rx="3.5" fill="#0f172a" stroke="#334155" stroke-width="1.2" />
    <rect x="71" y="65" width="8" height="17" rx="3.5" fill="#0f172a" stroke="#334155" stroke-width="1.2" />
    <rect x="23.5" y="26" width="3" height="9" rx="1.5" fill="#94a3b8" />
    <rect x="73.5" y="26" width="3" height="9" rx="1.5" fill="#94a3b8" />
    <rect x="23.5" y="69" width="3" height="9" rx="1.5" fill="#94a3b8" />
    <rect x="73.5" y="69" width="3" height="9" rx="1.5" fill="#94a3b8" />

    <path d="M 30,15 Q 50,9 70,15 Q 75,25 75,76 Q 73,89 50,91 Q 27,89 25,76 Q 25,25 30,15 Z" 
          fill="url(#realCarRed)" stroke="#7f1d1d" stroke-width="1.2" />

    <line x1="50" y1="12" x2="50" y2="29" stroke="#ffffff" stroke-width="0.9" opacity="0.75" />

    <rect x="21" y="34" width="5" height="3" rx="1.5" fill="url(#realChrome)" />
    <rect x="74" y="34" width="5" height="3" rx="1.5" fill="url(#realChrome)" />

    <path d="M 32,31 Q 50,27 68,31 L 65,44 Q 50,42 35,44 Z" fill="url(#realCarGlass)" stroke="#0f172a" stroke-width="0.8" />
    <path d="M 36,33 Q 50,29 64,33" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round" fill="none" opacity="0.8" />

    <path d="M 34,65 Q 50,63 66,65 L 69,78 Q 50,81 31,78 Z" fill="url(#realCarGlass)" stroke="#0f172a" stroke-width="0.8" />

    <rect x="28" y="86" width="44" height="4" rx="2" fill="url(#realChrome)" stroke="#64748b" stroke-width="0.8" />
    <rect x="30" y="83" width="10" height="3.5" rx="1.5" fill="#ef4444" stroke="#ffffff" stroke-width="0.6" />
    <rect x="60" y="83" width="10" height="3.5" rx="1.5" fill="#ef4444" stroke="#ffffff" stroke-width="0.6" />

    <circle cx="33" cy="14" r="2.8" fill="#ffffff" stroke="#38bdf8" stroke-width="0.8" />
    <circle cx="67" cy="14" r="2.8" fill="#ffffff" stroke="#38bdf8" stroke-width="0.8" />

    <!-- ROOFTOP LUGGAGE RACK (Image 1 Style) -->
    <rect x="35" y="43" width="30" height="23" rx="2.5" fill="none" stroke="#64748b" stroke-width="1.6" />
    <line x1="35" y1="50" x2="65" y2="50" stroke="#94a3b8" stroke-width="1" />
    <line x1="35" y1="58" x2="65" y2="58" stroke="#94a3b8" stroke-width="1" />

    <g class="luggage-anim">
      <rect x="37" y="47" width="26" height="16" rx="3.5" fill="url(#realBrownLeather)" stroke="#451a03" stroke-width="1.2" />
      <line x1="43" y1="47" x2="43" y2="63" stroke="#fde68a" stroke-width="1" />
      <line x1="57" y1="47" x2="57" y2="63" stroke="#fde68a" stroke-width="1" />
      <rect x="42" y="53" width="2" height="3" rx="0.5" fill="#ca8a04" />
      <rect x="56" y="53" width="2" height="3" rx="0.5" fill="#ca8a04" />
      <rect x="47" y="45.5" width="6" height="2.5" rx="1" fill="#451a03" />

      <rect x="40" y="44" width="20" height="12" rx="3" fill="url(#realPurpleSuitcase)" stroke="#581c87" stroke-width="1" />
      <line x1="50" y1="44" x2="50" y2="56" stroke="#f0abfc" stroke-width="0.8" />
      <rect x="47" y="42.5" width="6" height="2" rx="1" fill="#581c87" />
    </g>
  </g>
</svg>
`;

    case "taxi":
      // Ultra-Realistic 3D City Taxi
      return `
<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .taxi-sign-glow { animation: taxiSignPulse 1.2s ease-in-out infinite alternate; }
      @keyframes taxiSignPulse {
        0% { filter: drop-shadow(0 0 2px rgba(250, 204, 21, 0.6)); }
        100% { filter: drop-shadow(0 0 8px rgba(250, 204, 21, 1)); }
      }
    </style>
    <linearGradient id="realTaxiYellow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#92400e" />
      <stop offset="15%" stop-color="#d97706" />
      <stop offset="35%" stop-color="#f59e0b" />
      <stop offset="50%" stop-color="#fef08a" />
      <stop offset="65%" stop-color="#f59e0b" />
      <stop offset="85%" stop-color="#d97706" />
      <stop offset="100%" stop-color="#92400e" />
    </linearGradient>
    <linearGradient id="realCarGlassTaxi" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#020617" />
      <stop offset="40%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
    <filter id="realTaxiShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000000" flood-opacity="0.6" />
    </filter>
  </defs>

  <polygon points="34,10 18,-14 44,-14" fill="rgba(254, 240, 138, 0.45)" />
  <polygon points="66,10 56,-14 82,-14" fill="rgba(254, 240, 138, 0.45)" />

  <g filter="url(#realTaxiShadow)">
    <rect x="21" y="22" width="8" height="17" rx="3.5" fill="#0f172a" stroke="#334155" stroke-width="1.2" />
    <rect x="71" y="22" width="8" height="17" rx="3.5" fill="#0f172a" stroke="#334155" stroke-width="1.2" />
    <rect x="21" y="65" width="8" height="17" rx="3.5" fill="#0f172a" stroke="#334155" stroke-width="1.2" />
    <rect x="71" y="65" width="8" height="17" rx="3.5" fill="#0f172a" stroke="#334155" stroke-width="1.2" />

    <path d="M 30,15 Q 50,9 70,15 Q 75,25 75,76 Q 73,89 50,91 Q 27,89 25,76 Q 25,25 30,15 Z" 
          fill="url(#realTaxiYellow)" stroke="#92400e" stroke-width="1.2" />

    <!-- Checkerboard Decals -->
    <rect x="26.5" y="44" width="3.5" height="4" fill="#000000" />
    <rect x="26.5" y="48" width="3.5" height="4" fill="#ffffff" />
    <rect x="26.5" y="52" width="3.5" height="4" fill="#000000" />
    <rect x="26.5" y="56" width="3.5" height="4" fill="#ffffff" />
    <rect x="70" y="44" width="3.5" height="4" fill="#000000" />
    <rect x="70" y="48" width="3.5" height="4" fill="#ffffff" />
    <rect x="70" y="52" width="3.5" height="4" fill="#000000" />
    <rect x="70" y="56" width="3.5" height="4" fill="#ffffff" />

    <path d="M 32,31 Q 50,27 68,31 L 65,44 Q 50,42 35,44 Z" fill="url(#realCarGlassTaxi)" stroke="#0f172a" stroke-width="0.8" />
    <path d="M 34,65 Q 50,63 66,65 L 69,78 Q 50,81 31,78 Z" fill="url(#realCarGlassTaxi)" stroke="#0f172a" stroke-width="0.8" />

    <!-- 3D TAXI Pod -->
    <g class="taxi-sign-glow">
      <rect x="35" y="47" width="30" height="15" rx="3.5" fill="#1e293b" stroke="#000000" stroke-width="1.2" />
      <rect x="37" y="48.5" width="26" height="12" rx="2.5" fill="#fef08a" stroke="#ca8a04" stroke-width="0.8" />
      <text x="50" y="57.5" font-size="7.5" font-weight="900" text-anchor="middle" fill="#000000" font-family="system-ui, sans-serif">TAXI</text>
    </g>

    <rect x="28" y="86" width="44" height="4" rx="2" fill="#e2e8f0" stroke="#64748b" stroke-width="0.8" />
    <rect x="30" y="83" width="10" height="3.5" rx="1.5" fill="#ef4444" stroke="#ffffff" stroke-width="0.6" />
    <rect x="60" y="83" width="10" height="3.5" rx="1.5" fill="#ef4444" stroke="#ffffff" stroke-width="0.6" />
  </g>
</svg>
`;

    case "train":
      // Hyper-Realistic 3D Shinkansen/Vande Bharat High-Speed Bullet Train
      return `
<svg viewBox="0 0 100 145" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .train-beam-anim { animation: trainBeamPulse 0.85s ease-in-out infinite alternate; }
      .pantograph-arc { animation: pantographArcing 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite; transform-origin: 50px 72px; }
      .train-vibe { animation: trainTrackSway 0.35s ease-in-out infinite alternate; transform-origin: 50px 70px; }
      .train-cabin-glow { animation: cabinGlowPulse 2.0s ease-in-out infinite alternate; }
      @keyframes trainBeamPulse {
        0% { opacity: 0.45; transform: scaleY(0.92); }
        100% { opacity: 0.85; transform: scaleY(1.1); }
      }
      @keyframes pantographArcing {
        0%, 78%, 100% { opacity: 0; transform: scale(0.3); }
        82% { opacity: 1; transform: scale(1.6); filter: drop-shadow(0 0 6px #38bdf8); }
        88% { opacity: 0.9; transform: scale(1.1); filter: drop-shadow(0 0 4px #fef08a); }
        94% { opacity: 1; transform: scale(1.8); }
      }
      @keyframes trainTrackSway {
        0% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-0.6px) rotate(0.25deg); }
        100% { transform: translateY(0.4px) rotate(-0.25deg); }
      }
      @keyframes cabinGlowPulse {
        0% { opacity: 0.75; }
        100% { opacity: 1.0; filter: drop-shadow(0 0 3px #fef08a); }
      }
    </style>
    <!-- Metallic Pearl White High-Speed Bullet Body -->
    <linearGradient id="bulletBodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="12%" stop-color="#0369a1" />
      <stop offset="25%" stop-color="#e2e8f0" />
      <stop offset="50%" stop-color="#ffffff" />
      <stop offset="75%" stop-color="#e2e8f0" />
      <stop offset="88%" stop-color="#0369a1" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <!-- Aerodynamic Charcoal & Blue Roof Fairing -->
    <linearGradient id="bulletRoofGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="15%" stop-color="#0284c7" />
      <stop offset="50%" stop-color="#38bdf8" />
      <stop offset="85%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <!-- Polarized Aerodynamic Windshield Glass -->
    <linearGradient id="bulletCockpitGlass" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#020617" />
      <stop offset="45%" stop-color="#0f172a" />
      <stop offset="85%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
    <!-- Forward Projector Beam Cone -->
    <linearGradient id="bulletTrackBeam" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="rgba(254, 240, 138, 0.7)" />
      <stop offset="50%" stop-color="rgba(56, 189, 248, 0.45)" />
      <stop offset="100%" stop-color="rgba(56, 189, 248, 0)" />
    </linearGradient>
    <filter id="bulletTrainShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="10" stdDeviation="7" flood-color="#000000" flood-opacity="0.65" />
    </filter>
  </defs>

  <!-- Forward High-Intensity Track Beams -->
  <g class="train-beam-anim">
    <polygon points="38,4 12,-24 46,-24" fill="url(#bulletTrackBeam)" />
    <polygon points="62,4 54,-24 88,-24" fill="url(#bulletTrackBeam)" />
  </g>

  <g class="train-vibe" filter="url(#bulletTrainShadow)">
    <!-- Undercarriage Bogie Skirts (Shadow Layer) -->
    <rect x="31" y="16" width="38" height="122" rx="5" fill="#090d16" />

    <!-- ==================== COACH 5 (Rear Aerodynamic Tail) ==================== -->
    <path d="M 33,118 L 67,118 L 67,136 Q 67,144 50,144 Q 33,144 33,136 Z" fill="url(#bulletBodyGrad)" stroke="#0369a1" stroke-width="1.2" />
    <rect x="37" y="119" width="26" height="18" rx="2" fill="url(#bulletRoofGrad)" opacity="0.9" />
    <!-- Rear Taillights (Red LED Ribbon) -->
    <rect x="40" y="139" width="7" height="2.5" rx="1" fill="#ef4444" stroke="#ffffff" stroke-width="0.5" />
    <rect x="53" y="139" width="7" height="2.5" rx="1" fill="#ef4444" stroke="#ffffff" stroke-width="0.5" />
    <g class="train-cabin-glow">
      <rect x="34.5" y="121" width="2" height="14" rx="0.8" fill="#fef08a" />
      <rect x="63.5" y="121" width="2" height="14" rx="0.8" fill="#fef08a" />
    </g>

    <!-- Articulated Bellows 4-5 -->
    <rect x="38" y="113" width="24" height="5.5" rx="1.5" fill="#1e293b" stroke="#0f172a" stroke-width="0.8" />
    <line x1="42" y1="113" x2="42" y2="118.5" stroke="#475569" stroke-width="0.8" />
    <line x1="58" y1="113" x2="58" y2="118.5" stroke="#475569" stroke-width="0.8" />

    <!-- ==================== COACH 4 (Standard Passenger Car) ==================== -->
    <rect x="33" y="90" width="34" height="23" rx="3.5" fill="url(#bulletBodyGrad)" stroke="#0369a1" stroke-width="1.2" />
    <rect x="37" y="91" width="26" height="21" rx="2" fill="url(#bulletRoofGrad)" opacity="0.9" />
    <!-- Roof HVAC Pod -->
    <rect x="44" y="95" width="12" height="13" rx="1.5" fill="#0f172a" stroke="#334155" stroke-width="0.6" />
    <line x1="46" y1="97" x2="54" y2="97" stroke="#64748b" stroke-width="0.6" />
    <line x1="46" y1="101" x2="54" y2="101" stroke="#64748b" stroke-width="0.6" />
    <line x1="46" y1="105" x2="54" y2="105" stroke="#64748b" stroke-width="0.6" />
    <!-- Windows -->
    <g class="train-cabin-glow">
      <rect x="34.5" y="93" width="2" height="17" rx="0.8" fill="#fef08a" />
      <rect x="63.5" y="93" width="2" height="17" rx="0.8" fill="#fef08a" />
    </g>

    <!-- Articulated Bellows 3-4 -->
    <rect x="38" y="84.5" width="24" height="5.5" rx="1.5" fill="#1e293b" stroke="#0f172a" stroke-width="0.8" />
    <line x1="42" y1="84.5" x2="42" y2="90" stroke="#475569" stroke-width="0.8" />
    <line x1="58" y1="84.5" x2="58" y2="90" stroke="#475569" stroke-width="0.8" />

    <!-- ==================== COACH 3 (High-Speed Pantograph Power Car) ==================== -->
    <rect x="33" y="61.5" width="34" height="23" rx="3.5" fill="url(#bulletBodyGrad)" stroke="#0369a1" stroke-width="1.2" />
    <rect x="37" y="62.5" width="26" height="21" rx="2" fill="url(#bulletRoofGrad)" opacity="0.9" />
    <g class="train-cabin-glow">
      <rect x="34.5" y="64.5" width="2" height="17" rx="0.8" fill="#fef08a" />
      <rect x="63.5" y="64.5" width="2" height="17" rx="0.8" fill="#fef08a" />
    </g>
    <!-- Pantograph Aerodynamic Shroud & Diamond Arm -->
    <rect x="42" y="65" width="16" height="15" rx="2" fill="#0f172a" stroke="#334155" stroke-width="0.6" />
    <polygon points="50,66 55,72 50,78 45,72" fill="none" stroke="#f59e0b" stroke-width="1.6" />
    <line x1="41" y1="66" x2="59" y2="66" stroke="#fbbf24" stroke-width="2.2" stroke-linecap="round" />
    <circle cx="50" cy="66" r="1.5" fill="#ffffff" />
    <!-- Dynamic Multi-Point Electric Arc Lightning Sparks -->
    <g class="pantograph-arc">
      <polygon points="50,62 52,65 56,66 53,68 55,71 50,69 47,72 48,67 44,66 48,64" fill="#38bdf8" />
      <circle cx="50" cy="66" r="3.8" fill="#ffffff" />
    </g>

    <!-- Articulated Bellows 2-3 -->
    <rect x="38" y="56" width="24" height="5.5" rx="1.5" fill="#1e293b" stroke="#0f172a" stroke-width="0.8" />
    <line x1="42" y1="56" x2="42" y2="61.5" stroke="#475569" stroke-width="0.8" />
    <line x1="58" y1="56" x2="58" y2="61.5" stroke="#475569" stroke-width="0.8" />

    <!-- ==================== COACH 2 (First-Class Passenger Car) ==================== -->
    <rect x="33" y="33" width="34" height="23" rx="3.5" fill="url(#bulletBodyGrad)" stroke="#0369a1" stroke-width="1.2" />
    <rect x="37" y="34" width="26" height="21" rx="2" fill="url(#bulletRoofGrad)" opacity="0.9" />
    <!-- Roof HVAC Pod -->
    <rect x="44" y="38" width="12" height="13" rx="1.5" fill="#0f172a" stroke="#334155" stroke-width="0.6" />
    <line x1="46" y1="40" x2="54" y2="40" stroke="#64748b" stroke-width="0.6" />
    <line x1="46" y1="44" x2="54" y2="44" stroke="#64748b" stroke-width="0.6" />
    <line x1="46" y1="48" x2="54" y2="48" stroke="#64748b" stroke-width="0.6" />
    <!-- Windows -->
    <g class="train-cabin-glow">
      <rect x="34.5" y="36" width="2" height="17" rx="0.8" fill="#fef08a" />
      <rect x="63.5" y="36" width="2" height="17" rx="0.8" fill="#fef08a" />
    </g>

    <!-- Articulated Bellows 1-2 -->
    <rect x="38" y="27.5" width="24" height="5.5" rx="1.5" fill="#1e293b" stroke="#0f172a" stroke-width="0.8" />
    <line x1="42" y1="27.5" x2="42" y2="33" stroke="#475569" stroke-width="0.8" />
    <line x1="58" y1="27.5" x2="58" y2="33" stroke="#475569" stroke-width="0.8" />

    <!-- ==================== COACH 1 (Lead Locomotive Streamliner Nose) ==================== -->
    <!-- 3D Sculpted Bullet Nose (Duckbill Streamliner) -->
    <path d="M 50,0 Q 56,3 63,12 Q 67,18 67,27.5 L 33,27.5 Q 33,18 37,12 Q 44,3 50,0 Z" 
          fill="url(#bulletBodyGrad)" stroke="#0369a1" stroke-width="1.4" />

    <!-- Streamlined Aerodynamic Cockpit Canopy Mask -->
    <path d="M 40,9 Q 50,4 60,9 L 61,17 Q 50,13 39,17 Z" fill="url(#bulletCockpitGlass)" stroke="#0284c7" stroke-width="1" />
    <!-- Glass Highlight Glint -->
    <path d="M 42,9.5 Q 50,6 58,9.5" stroke="#ffffff" stroke-width="0.9" stroke-linecap="round" fill="none" opacity="0.9" />

    <!-- Nose Cone Character Seams & Racing Speed Liveries -->
    <path d="M 50,1 Q 50,7 50,9" stroke="#0284c7" stroke-width="1" />
    <line x1="36" y1="18" x2="36" y2="27" stroke="#0284c7" stroke-width="1.4" />
    <line x1="64" y1="18" x2="64" y2="27" stroke="#0284c7" stroke-width="1.4" />
    <!-- Gold / Cyan Accent Stripe -->
    <line x1="38" y1="20" x2="38" y2="27" stroke="#38bdf8" stroke-width="0.8" />
    <line x1="62" y1="20" x2="62" y2="27" stroke="#38bdf8" stroke-width="0.8" />

    <!-- Triple High-Intensity Optical LED Projector Headlights -->
    <circle cx="39" cy="4.5" r="2.4" fill="#ffffff" stroke="#38bdf8" stroke-width="0.9" />
    <circle cx="61" cy="4.5" r="2.4" fill="#ffffff" stroke="#38bdf8" stroke-width="0.9" />
    <circle cx="50" cy="1.8" r="1.8" fill="#ffffff" stroke="#fde047" stroke-width="0.8" />
  </g>
</svg>
`;

    case "ship":
      // Ultra-Realistic 3D Emerald Yacht / Sailboat (Image 3 Style)
      return `
<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .sail-billow { animation: sailWindSway 2.2s ease-in-out infinite alternate; transform-origin: 50px 38px; }
      .ocean-wake-anim { animation: oceanWakePulse 1.4s ease-in-out infinite alternate; transform-origin: 50px 90px; }
      .mast-flag { animation: mastFlagFlutter 0.75s ease-in-out infinite alternate; transform-origin: 50px 10px; }
      @keyframes sailWindSway {
        0% { transform: skewX(-2deg) scaleX(0.98); }
        100% { transform: skewX(3.5deg) scaleX(1.05); }
      }
      @keyframes oceanWakePulse {
        0% { opacity: 0.35; transform: scale(0.92); }
        100% { opacity: 0.75; transform: scale(1.08); }
      }
      @keyframes mastFlagFlutter {
        0% { transform: rotate(-5deg); }
        100% { transform: rotate(18deg); }
      }
    </style>
    <linearGradient id="realBoatHull" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#064e3b" />
      <stop offset="25%" stop-color="#059669" />
      <stop offset="50%" stop-color="#10b981" />
      <stop offset="75%" stop-color="#059669" />
      <stop offset="100%" stop-color="#064e3b" />
    </linearGradient>
    <linearGradient id="realTeakDeck" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fef3c7" />
      <stop offset="50%" stop-color="#fde68a" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <filter id="realBoatShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000000" flood-opacity="0.55" />
    </filter>
  </defs>

  <g class="ocean-wake-anim">
    <polygon points="50,8 10,95 90,95" fill="rgba(224, 242, 254, 0.45)" />
    <polygon points="50,16 26,90 74,90" fill="rgba(255, 255, 255, 0.7)" />
  </g>

  <g filter="url(#realBoatShadow)">
    <path d="M 50,5 Q 68,22 68,82 Q 68,93 50,95 Q 32,93 32,82 Q 32,22 50,5 Z" 
          fill="url(#realBoatHull)" stroke="#064e3b" stroke-width="1.6" />

    <path d="M 50,7 Q 66,23 66,81 Q 66,91 50,93 Q 34,91 34,81 Q 34,23 50,7 Z" 
          fill="#ffffff" stroke="#cbd5e1" stroke-width="0.8" />

    <path d="M 50,11 Q 63,25 63,78 Q 50,82 37,78 Q 37,25 50,11 Z" 
          fill="url(#realTeakDeck)" stroke="#b45309" stroke-width="0.8" />
    <line x1="45" y1="20" x2="45" y2="76" stroke="#b45309" stroke-width="0.5" opacity="0.6" />
    <line x1="55" y1="20" x2="55" y2="76" stroke="#b45309" stroke-width="0.5" opacity="0.6" />

    <rect x="41" y="36" width="18" height="28" rx="4" fill="#f8fafc" stroke="#94a3b8" stroke-width="1" />
    <rect x="43" y="38" width="14" height="7" rx="1.5" fill="#0f172a" />
    <polygon points="45,56 55,56 50,62" fill="#d97706" />

    <circle cx="50" cy="74" r="3.5" fill="#ef4444" stroke="#ffffff" stroke-width="1.2" />
    <circle cx="50" cy="74" r="1.5" fill="#d97706" />

    <line x1="50" y1="10" x2="50" y2="68" stroke="#78350f" stroke-width="2.8" stroke-linecap="round" />
    <circle cx="50" cy="10" r="2" fill="#ca8a04" />
    <polygon points="50,10 60,13 50,16" fill="#ef4444" class="mast-flag" />

    <line x1="50" y1="12" x2="35" y2="54" stroke="#94a3b8" stroke-width="0.6" />
    <line x1="50" y1="12" x2="65" y2="54" stroke="#94a3b8" stroke-width="0.6" />

    <g class="sail-billow">
      <path d="M 50,12 Q 74,40 68,66 L 50,56 Z" fill="#ffffff" stroke="#047857" stroke-width="1.2" />
      <path d="M 50,24 Q 68,38 64,46 L 50,42 Z" fill="#047857" />
      <path d="M 50,36 Q 70,48 66,56 L 50,52 Z" fill="#047857" />
    </g>

    <polygon points="50,14 34,50 50,46" fill="#f1f5f9" stroke="#94a3b8" stroke-width="0.8" opacity="0.95" />
  </g>
</svg>
`;

    case "flight":
      // Ultra-Realistic 3D Commercial Jetliner
      return `
<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .engine-thrust-anim { animation: jetThrustPulse 0.4s ease-in-out infinite alternate; transform-origin: 50px 60px; }
      .strobe-red { animation: portWingStrobe 1.0s infinite; }
      .strobe-green { animation: stbdWingStrobe 1.0s infinite; }
      .tail-strobe { animation: tailBeaconStrobe 1.0s infinite; }
      @keyframes jetThrustPulse {
        0% { transform: scaleY(0.85); opacity: 0.7; }
        100% { transform: scaleY(1.3); opacity: 1; }
      }
      @keyframes portWingStrobe {
        0%, 75%, 100% { opacity: 0.3; }
        80%, 90% { opacity: 1; filter: drop-shadow(0 0 6px #ef4444); }
      }
      @keyframes stbdWingStrobe {
        0%, 75%, 100% { opacity: 0.3; }
        80%, 90% { opacity: 1; filter: drop-shadow(0 0 6px #22c55e); }
      }
      @keyframes tailBeaconStrobe {
        0%, 70%, 100% { opacity: 0.3; }
        75%, 85% { opacity: 1; filter: drop-shadow(0 0 4px #ffffff); }
      }
    </style>
    <linearGradient id="realPlaneFuselage" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#94a3b8" />
      <stop offset="20%" stop-color="#cbd5e1" />
      <stop offset="50%" stop-color="#ffffff" />
      <stop offset="80%" stop-color="#cbd5e1" />
      <stop offset="100%" stop-color="#94a3b8" />
    </linearGradient>
    <linearGradient id="realPlaneWing" x1="0%" y1="30%" x2="100%" y2="70%">
      <stop offset="0%" stop-color="#cbd5e1" />
      <stop offset="50%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#94a3b8" />
    </linearGradient>
    <linearGradient id="realJetPlasma" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.95" />
      <stop offset="60%" stop-color="#0284c7" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#0369a1" stop-opacity="0" />
    </linearGradient>
    <filter id="realPlaneShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="10" stdDeviation="7" flood-color="#000000" flood-opacity="0.5" />
    </filter>
  </defs>

  <g class="engine-thrust-anim">
    <polygon points="34,60 37,88 32,88" fill="url(#realJetPlasma)" />
    <polygon points="66,60 68,88 63,88" fill="url(#realJetPlasma)" />
  </g>

  <g filter="url(#realPlaneShadow)">
    <path d="M 50,42 L 95,64 L 92,69 L 55,54 L 55,72 L 72,83 L 70,86 L 50,80 L 30,86 L 28,83 L 45,72 L 45,54 L 8,69 L 5,64 Z" 
          fill="url(#realPlaneWing)" stroke="#64748b" stroke-width="0.75" stroke-linejoin="round" />
    <path d="M 95,64 L 96,60 L 92,62 L 92,69 Z" fill="#0284c7" />
    <path d="M 5,64 L 4,60 L 8,62 L 8,69 Z" fill="#0284c7" />

    <circle cx="6" cy="62" r="1.8" fill="#ef4444" class="strobe-red" />
    <circle cx="94" cy="62" r="1.8" fill="#22c55e" class="strobe-green" />
    <circle cx="50" cy="91" r="1.5" fill="#ffffff" class="tail-strobe" />

    <rect x="31" y="47" width="5.5" height="15" rx="2.5" fill="#334155" stroke="#1e293b" stroke-width="0.5" />
    <rect x="63.5" y="47" width="5.5" height="15" rx="2.5" fill="#334155" stroke="#1e293b" stroke-width="0.5" />

    <path d="M 50,8 Q 55,20 55,68 Q 55,86 50,92 Q 45,86 45,68 Q 45,20 50,8 Z" 
          fill="url(#realPlaneFuselage)" stroke="#64748b" stroke-width="0.75" />
    <path d="M 50,8 Q 53,14 50,16 Q 47,14 50,8 Z" fill="#0284c7" />
    <path d="M 47.5,19 Q 50,17 52.5,19 L 53.5,23 Q 50,22 46.5,23 Z" fill="#0f172a" />
    <polygon points="49,70 51,70 51.5,88 48.5,88" fill="#0284c7" />
  </g>
</svg>
`;

    case "bike":
      // Ultra-Realistic 3D High-End Superbike Motorcycle & Pro Racer (Enlarged & Detailed)
      return `
<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .bike-beam-anim { animation: bikeBeamPulse 0.8s ease-in-out infinite alternate; }
      @keyframes bikeBeamPulse {
        0% { opacity: 0.45; transform: scale(0.94); }
        100% { opacity: 0.85; transform: scale(1.06); }
      }
    </style>
    <!-- Metallic Ducati Racing Red -->
    <linearGradient id="realSuperbikeRed" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7f1d1d" />
      <stop offset="25%" stop-color="#dc2626" />
      <stop offset="50%" stop-color="#f87171" />
      <stop offset="75%" stop-color="#dc2626" />
      <stop offset="100%" stop-color="#7f1d1d" />
    </linearGradient>
    <!-- Iridescent Blue/Violet AGV Helmet Visor -->
    <linearGradient id="realVisorGlint" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#a855f7" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <filter id="realSuperbikeShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000000" flood-opacity="0.65" />
    </filter>
  </defs>

  <!-- Sharp Projector Headlight Beams -->
  <g class="bike-beam-anim">
    <polygon points="45,10 30,-12 50,-12" fill="rgba(254, 240, 138, 0.55)" />
    <polygon points="55,10 50,-12 70,-12" fill="rgba(254, 240, 138, 0.55)" />
  </g>

  <g filter="url(#realSuperbikeShadow)">
    <!-- Front Wide Treaded Tire with Alloy Rim -->
    <rect x="45" y="4" width="10" height="28" rx="5" fill="#0f172a" stroke="#1e293b" stroke-width="1.4" />
    <rect x="48.5" y="8" width="3" height="20" rx="1.5" fill="#334155" />
    <!-- Twin Drilled Stainless Brake Rotors -->
    <rect x="43" y="10" width="2.2" height="15" rx="1" fill="#94a3b8" />
    <rect x="54.8" y="10" width="2.2" height="15" rx="1" fill="#94a3b8" />

    <!-- Gold Öhlins Inverted Front Suspension Forks -->
    <rect x="40.5" y="14" width="3.5" height="18" rx="1.5" fill="#eab308" stroke="#ca8a04" stroke-width="0.8" />
    <rect x="56" y="14" width="3.5" height="18" rx="1.5" fill="#eab308" stroke="#ca8a04" stroke-width="0.8" />

    <!-- Rear Racing Slick Tire (Extra Wide 200mm Section) -->
    <rect x="43.5" y="66" width="13" height="30" rx="6" fill="#0f172a" stroke="#1e293b" stroke-width="1.4" />
    <rect x="48" y="70" width="4" height="22" rx="2" fill="#334155" />

    <!-- Aerodynamic Superbike Body Fairings with Ram-Air Ducts -->
    <path d="M 50,18 L 68,36 L 63,65 L 37,65 L 32,36 Z" fill="url(#realSuperbikeRed)" stroke="#991b1b" stroke-width="1.4" />
    <line x1="50" y1="20" x2="50" y2="38" stroke="#ffffff" stroke-width="1" opacity="0.8" />

    <!-- Clip-on Alloy Handlebars with Bar-End Mirrors -->
    <line x1="24" y1="26" x2="76" y2="26" stroke="#0f172a" stroke-width="4" stroke-linecap="round" />
    <circle cx="24" cy="26" r="3" fill="#64748b" stroke="#0f172a" stroke-width="0.8" />
    <circle cx="76" cy="26" r="3" fill="#64748b" stroke="#0f172a" stroke-width="0.8" />

    <!-- Digital TFT Instrument Dashboard -->
    <rect x="44" y="21" width="12" height="6" rx="1.5" fill="#0284c7" stroke="#0f172a" stroke-width="0.8" />

    <!-- Muscular Sculpted Fuel Tank with Knee Indents -->
    <ellipse cx="50" cy="38" rx="10.5" ry="12.5" fill="#dc2626" stroke="#991b1b" stroke-width="1.2" />
    <ellipse cx="50" cy="36" rx="6" ry="7" fill="#ef4444" />
    <!-- Fuel Cap -->
    <circle cx="50" cy="32" r="2.2" fill="#94a3b8" stroke="#334155" stroke-width="0.6" />

    <!-- Pro Rider with Racing Leather Suit & Knee Sliders -->
    <path d="M 34,46 Q 50,40 66,46 L 64,63 Q 50,67 36,63 Z" fill="#0f172a" stroke="#334155" stroke-width="1.2" />
    <!-- Aerodynamic Racing Helmet & Iridescent Visor -->
    <circle cx="50" cy="50" r="10.5" fill="#0f172a" stroke="#ffffff" stroke-width="1.4" />
    <path d="M 42,46 Q 50,41 58,46 L 58,50 Q 50,46 42,50 Z" fill="url(#realVisorGlint)" stroke="#0284c7" stroke-width="0.8" />

    <!-- Dual Under-Tail Carbon Akrapovič Exhausts with Titanium Blue Heat Tip -->
    <ellipse cx="44" cy="78" rx="3" ry="5" fill="#475569" stroke="#1e293b" stroke-width="0.8" />
    <ellipse cx="56" cy="78" rx="3" ry="5" fill="#475569" stroke="#1e293b" stroke-width="0.8" />
    <circle cx="44" cy="78" r="1.5" fill="#38bdf8" />
    <circle cx="56" cy="78" r="1.5" fill="#38bdf8" />
  </g>
</svg>
`;

    case "bicycle":
      // Ultra-Realistic 3D Carbon Aero Road Bicycle & Cyclist (Enlarged & Detailed)
      return `
<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .bike-rear-strobe { animation: cycleRearFlash 0.6s infinite; }
      @keyframes cycleRearFlash {
        0%, 40%, 100% { opacity: 0.2; }
        50%, 80% { opacity: 1; filter: drop-shadow(0 0 6px #ef4444); }
      }
    </style>
    <!-- Cyan & Carbon Monocoque Frame -->
    <linearGradient id="realCarbonFrame" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0e7490" />
      <stop offset="50%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#0891b2" />
    </linearGradient>
    <filter id="realCycleShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#000000" flood-opacity="0.55" />
    </filter>
  </defs>

  <!-- Front LED Cycling Projector Light Beam -->
  <polygon points="50,12 34,-6 66,-6" fill="rgba(255, 255, 255, 0.55)" />

  <g filter="url(#realCycleShadow)">
    <!-- 700c Deep Carbon Aero Wheels with High-Tension Spokes -->
    <rect x="47.5" y="4" width="5" height="30" rx="2.5" fill="#0f172a" stroke="#0891b2" stroke-width="1" />
    <rect x="47.5" y="66" width="5" height="30" rx="2.5" fill="#0f172a" stroke="#0891b2" stroke-width="1" />

    <!-- Carbon Aero Top Tube -->
    <line x1="50" y1="24" x2="50" y2="74" stroke="url(#realCarbonFrame)" stroke-width="4.2" stroke-linecap="round" />

    <!-- Drop Handlebars with Textured Bar Tape & Shimano Hoods -->
    <path d="M 31,23 Q 50,19 69,23" stroke="#0f172a" stroke-width="3.6" stroke-linecap="round" fill="none" />
    <circle cx="31" cy="23" r="2.8" fill="#06b6d4" stroke="#0f172a" stroke-width="0.8" />
    <circle cx="69" cy="23" r="2.8" fill="#06b6d4" stroke="#0f172a" stroke-width="0.8" />

    <!-- Garmin GPS Cycling Computer -->
    <rect x="47" y="17" width="6" height="5" rx="1.5" fill="#38bdf8" stroke="#0f172a" stroke-width="0.6" />

    <!-- Aerodynamic Road Cyclist in Cycling Jersey -->
    <path d="M 35,38 Q 50,33 65,38 L 62,58 Q 50,63 38,58 Z" fill="#0891b2" stroke="#0e7490" stroke-width="1.3" />

    <!-- Ventilated Aero Helmet with Air Ducts & Sunglasses -->
    <ellipse cx="50" cy="44" rx="9.5" ry="14" fill="#06b6d4" stroke="#ffffff" stroke-width="1.5" />
    <line x1="46" y1="35" x2="46" y2="52" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" />
    <line x1="54" y1="35" x2="54" y2="52" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" />

    <!-- Carbon Saddle & Blinking Red Seatpost Safety Strobe Light -->
    <ellipse cx="50" cy="67" rx="3.5" ry="6" fill="#0f172a" />
    <circle cx="50" cy="81" r="3.2" fill="#ef4444" stroke="#ffffff" stroke-width="0.9" class="bike-rear-strobe" />
  </g>
</svg>
`;

    case "bus":
      // Ultra-Realistic 3D Tour Coach Bus
      return `
<svg viewBox="0 0 100 100" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .bus-display-glow { animation: busDisplayPulse 1.5s ease-in-out infinite alternate; }
      @keyframes busDisplayPulse {
        0% { fill: #38bdf8; opacity: 0.8; }
        100% { fill: #67e8f9; opacity: 1; filter: drop-shadow(0 0 3px #38bdf8); }
      }
    </style>
    <linearGradient id="realBusBody" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0f766e" />
      <stop offset="30%" stop-color="#14b8a6" />
      <stop offset="70%" stop-color="#2dd4bf" />
      <stop offset="100%" stop-color="#0d9488" />
    </linearGradient>
    <linearGradient id="realBusRoof" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="50%" stop-color="#475569" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <filter id="realBusShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000000" flood-opacity="0.55" />
    </filter>
  </defs>

  <polygon points="34,8 20,-12 44,-12" fill="rgba(254, 240, 138, 0.45)" />
  <polygon points="66,8 56,-12 80,-12" fill="rgba(254, 240, 138, 0.45)" />

  <g filter="url(#realBusShadow)">
    <rect x="25" y="18" width="6" height="15" rx="3" fill="#0f172a" stroke="#334155" stroke-width="1" />
    <rect x="69" y="18" width="6" height="15" rx="3" fill="#0f172a" stroke="#334155" stroke-width="1" />
    <rect x="25" y="66" width="6" height="13" rx="2.5" fill="#0f172a" stroke="#334155" stroke-width="1" />
    <rect x="69" y="66" width="6" height="13" rx="2.5" fill="#0f172a" stroke="#334155" stroke-width="1" />
    <rect x="25" y="78" width="6" height="13" rx="2.5" fill="#0f172a" stroke="#334155" stroke-width="1" />
    <rect x="69" y="78" width="6" height="13" rx="2.5" fill="#0f172a" stroke="#334155" stroke-width="1" />

    <rect x="29" y="6" width="42" height="88" rx="6" fill="url(#realBusBody)" stroke="#0f766e" stroke-width="1.2" />
    <rect x="33" y="10" width="34" height="74" rx="4" fill="url(#realBusRoof)" stroke="#0f172a" stroke-width="0.8" />

    <path d="M 31,8 Q 50,5 69,8 L 69,18 Q 50,16 31,18 Z" fill="#0f172a" />
    <rect x="38" y="10" width="24" height="4" rx="1" fill="#0284c7" class="bus-display-glow" />

    <rect x="42" y="20" width="16" height="6" rx="2" fill="#0f172a" />
    <rect x="42" y="60" width="16" height="10" rx="2" fill="#0f172a" />
    <line x1="44" y1="63" x2="56" y2="63" stroke="#64748b" stroke-width="0.8" />
    <line x1="44" y1="67" x2="56" y2="67" stroke="#64748b" stroke-width="0.8" />

    <rect x="35" y="86" width="30" height="4" rx="1" fill="#0f172a" stroke="#1e293b" stroke-width="0.6" />
    <line x1="32" y1="92" x2="40" y2="92" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" />
    <line x1="60" y1="92" x2="68" y2="92" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" />
  </g>
</svg>
`;

    case "walking":
    default:
      // Ultra-Realistic 3D Isometric Animated Walking Man / Adventurer
      return `
<svg viewBox="0 0 100 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .walking-legs { animation: walkerStep 0.65s ease-in-out infinite alternate; transform-origin: 50px 70px; }
      .walking-poles { animation: poleSwing 0.65s ease-in-out infinite alternate; transform-origin: 50px 45px; }
      .radar-ring { animation: radarPulseRing 2.2s linear infinite; transform-origin: 50px 75px; }
      @keyframes walkerStep {
        0% { transform: rotate(-8deg) translateY(0); }
        100% { transform: rotate(8deg) translateY(-2px); }
      }
      @keyframes poleSwing {
        0% { transform: rotate(10deg); }
        100% { transform: rotate(-10deg); }
      }
      @keyframes radarPulseRing {
        0% { r: 16px; opacity: 0.85; stroke-width: 2px; }
        100% { r: 46px; opacity: 0; stroke-width: 0.5px; }
      }
    </style>
    <!-- 3D Jacket, Skin, and Backpack Gradients -->
    <linearGradient id="realManJacket" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="50%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
    <linearGradient id="realManBackpack" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f97316" />
      <stop offset="50%" stop-color="#ea580c" />
      <stop offset="100%" stop-color="#9a3412" />
    </linearGradient>
    <linearGradient id="realManPants" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#334155" />
      <stop offset="50%" stop-color="#475569" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="realManSkin" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fed7aa" />
      <stop offset="100%" stop-color="#fba063" />
    </linearGradient>
    <filter id="realManShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000000" flood-opacity="0.65" />
    </filter>
  </defs>

  <!-- Ground Trail Compass Pulse Rings -->
  <circle cx="50" cy="75" r="16" fill="none" stroke="#10b981" class="radar-ring" />
  <circle cx="50" cy="75" r="32" fill="none" stroke="rgba(16, 185, 129, 0.3)" stroke-dasharray="3, 3" />

  <g filter="url(#realManShadow)">
    <!-- ANIMATED WALKING LEGS & HIKING BOOTS (3D Perspective) -->
    <g class="walking-legs">
      <!-- Left Leg & Boot -->
      <path d="M 43,62 L 38,82 L 34,88 L 44,88 L 46,78 L 47,62 Z" fill="url(#realManPants)" stroke="#1e293b" stroke-width="0.8" />
      <!-- Left Boot (Brown Vibram Sole) -->
      <path d="M 33,85 Q 38,83 45,85 L 45,90 L 32,90 Z" fill="#78350f" stroke="#451a03" stroke-width="0.8" />
      <rect x="31" y="89" width="15" height="2.5" rx="1" fill="#0f172a" />

      <!-- Right Leg & Boot -->
      <path d="M 57,62 L 62,82 L 66,88 L 56,88 L 54,78 L 53,62 Z" fill="url(#realManPants)" stroke="#1e293b" stroke-width="0.8" />
      <!-- Right Boot (Brown Vibram Sole) -->
      <path d="M 55,85 Q 62,83 67,85 L 67,90 L 55,90 Z" fill="#78350f" stroke="#451a03" stroke-width="0.8" />
      <rect x="54" y="89" width="15" height="2.5" rx="1" fill="#0f172a" />
    </g>

    <!-- 3D EXPEDITION BACKPACK ON HIS BACK (Viewed from 3D angle) -->
    <rect x="35" y="34" width="30" height="28" rx="6" fill="url(#realManBackpack)" stroke="#7c2d12" stroke-width="1.4" />
    <!-- Rolled Sleeping Pad on Top of Backpack -->
    <rect x="32" y="30" width="36" height="7.5" rx="3.5" fill="#0d9488" stroke="#115e59" stroke-width="0.9" />
    <circle cx="33" cy="33.8" r="3" fill="#047857" />
    <circle cx="67" cy="33.8" r="3" fill="#047857" />
    <!-- Side Water Bottle Pockets -->
    <rect x="32" y="40" width="4" height="13" rx="2" fill="#38bdf8" stroke="#0284c7" stroke-width="0.6" />
    <rect x="64" y="40" width="4" height="13" rx="2" fill="#38bdf8" stroke="#0284c7" stroke-width="0.6" />

    <!-- 3D UPPER BODY / TORSO & OUTDOOR JACKET -->
    <path d="M 36,36 Q 50,30 64,36 L 62,64 Q 50,68 38,64 Z" fill="url(#realManJacket)" stroke="#064e3b" stroke-width="1.3" />
    <!-- Center Zipper & Chest Pockets -->
    <line x1="50" y1="32" x2="50" y2="64" stroke="#ffffff" stroke-width="1.2" />
    <rect x="40" y="44" width="8" height="6" rx="1.5" fill="#047857" />
    <rect x="52" y="44" width="8" height="6" rx="1.5" fill="#047857" />

    <!-- ANIMATED ARMS WITH CARBON TREKKING POLES -->
    <g class="walking-poles">
      <!-- Left Arm & Pole -->
      <path d="M 36,38 L 26,52 L 28,58 L 36,46 Z" fill="url(#realManJacket)" stroke="#064e3b" stroke-width="0.8" />
      <circle cx="27" cy="56" r="3" fill="url(#realManSkin)" />
      <!-- Left Carbon Trekking Pole -->
      <line x1="24" y1="28" x2="16" y2="78" stroke="#475569" stroke-width="2.2" stroke-linecap="round" />
      <rect x="23" y="38" width="3.5" height="12" rx="1.5" fill="#f97316" />
      <circle cx="16" cy="78" r="2.5" fill="#0f172a" />

      <!-- Right Arm & Pole -->
      <path d="M 64,38 L 74,52 L 72,58 L 64,46 Z" fill="url(#realManJacket)" stroke="#064e3b" stroke-width="0.8" />
      <circle cx="73" cy="56" r="3" fill="url(#realManSkin)" />
      <!-- Right Carbon Trekking Pole -->
      <line x1="76" y1="28" x2="84" y2="78" stroke="#475569" stroke-width="2.2" stroke-linecap="round" />
      <rect x="73.5" y="38" width="3.5" height="12" rx="1.5" fill="#f97316" />
      <circle cx="84" cy="78" r="2.5" fill="#0f172a" />
    </g>

    <!-- 3D HEAD, FACE & ADVENTURER CAP (Tilted Forward into Stride) -->
    <!-- Neck -->
    <rect x="46" y="26" width="8" height="6" fill="url(#realManSkin)" />
    <!-- Head / Face Profile -->
    <ellipse cx="50" cy="22" rx="9.5" ry="10.5" fill="url(#realManSkin)" stroke="#ea580c" stroke-width="0.8" />
    <!-- Polarized Sunglasses Visor -->
    <rect x="43" y="19" width="14" height="4.5" rx="2" fill="#0f172a" stroke="#38bdf8" stroke-width="0.6" />
    <!-- Khaki Adventurer Baseball Cap with Visor Brim -->
    <path d="M 40,18 Q 50,11 60,18 L 62,14 Q 50,7 38,14 Z" fill="#fde047" stroke="#ca8a04" stroke-width="1.2" />
    <!-- Cap Bill/Visor pointing forward -->
    <path d="M 42,16 Q 50,11 58,16 L 56,12 Q 50,8 44,12 Z" fill="#eab308" />

    <!-- Forward Direction Compass Navigator Pin -->
    <polygon points="50,2 55,10 50,8 45,10" fill="#ffffff" stroke="#10b981" stroke-width="0.9" />
  </g>
</svg>
`;
  }
}

export type VehicleRenderMode = "3d-icon" | "svg";

export const VEHICLE_3D_ICONS: Record<Transport, string> = {
  car: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Automobile/3D/automobile_3d.png",
  taxi: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Taxi/3D/taxi_3d.png",
  flight: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Airplane/3D/airplane_3d.png",
  train: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/High-speed%20train/3D/high-speed_train_3d.png",
  bus: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Bus/3D/bus_3d.png",
  bike: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Motorcycle/3D/motorcycle_3d.png",
  bicycle: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Bicycle/3D/bicycle_3d.png",
  ship: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Sailboat/3D/sailboat_3d.png",
  walking: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Person%20walking/Default/3D/person_walking_3d_default.png",
};

export function getVehicleMarkerContent(transport: Transport, mode: VehicleRenderMode = "3d-icon"): string {
  if (mode === "3d-icon" && VEHICLE_3D_ICONS[transport]) {
    const iconUrl = VEHICLE_3D_ICONS[transport];
    return `<div class="vehicle-3d-icon-wrapper" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
      <img src="${iconUrl}" alt="${transport}" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 8px 12px rgba(0,0,0,0.6)); pointer-events: none;" />
    </div>`;
  }
  return getRealisticVehicleSvg(transport);
}

const canvasImageCache = new Map<Transport, HTMLImageElement>();

export function getCachedVehicleImage(transport: Transport, mode: VehicleRenderMode = "3d-icon"): HTMLImageElement {
  let img = canvasImageCache.get(transport);
  if (!img) {
    img = new Image();
    img.crossOrigin = "anonymous";
    if (mode === "3d-icon" && VEHICLE_3D_ICONS[transport]) {
      img.src = VEHICLE_3D_ICONS[transport];
      img.onerror = () => {
        const svgStr = getRealisticVehicleSvg(transport);
        img!.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
      };
    } else {
      const svgStr = getRealisticVehicleSvg(transport);
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
    }
    canvasImageCache.set(transport, img);
  }
  return img;
}

export function drawRealisticVehicleOnCanvas(
  ctx: CanvasRenderingContext2D,
  transport: Transport,
  x: number,
  y: number,
  bearingDeg: number = 0,
  scale: number = 1.0
): void {
  const img = getCachedVehicleImage(transport, "svg");
  const isLargeTransport = transport === "train" || transport === "ship";
  const isPersonalTransport = transport === "bike" || transport === "bicycle" || transport === "walking";
  const baseSize = isLargeTransport ? 122 : isPersonalTransport ? 116 : 92;
  const size = baseSize * scale;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((bearingDeg * Math.PI) / 180);

  const config = VEHICLE_CONFIGS[transport] || VEHICLE_CONFIGS.flight;
  ctx.shadowColor = config.glowColor;
  ctx.shadowBlur = config.shadowBlur;

  if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, 24 * scale, 0, Math.PI * 2);
    ctx.fillStyle = config.color;
    ctx.fill();
  }

  ctx.restore();
}

export function getVehicleColor(transport: Transport): string {
  return VEHICLE_CONFIGS[transport]?.color || "#3b82f6";
}

export function getVehicleName(transport: Transport): string {
  return VEHICLE_CONFIGS[transport]?.label || "Vehicle";
}

export function getVehicleSVG(transport: Transport): string {
  return getRealisticVehicleSvg(transport);
}

export function preloadVehicleImages(): void {
  const transports: Transport[] = ["car", "bike", "flight", "train", "taxi", "bicycle", "bus", "walking", "ship"];
  transports.forEach((transport) => {
    getCachedVehicleImage(transport, "3d-icon");
  });
}

export function getVehicleRotationOffset(_transport?: Transport): number {
  return 0;
}