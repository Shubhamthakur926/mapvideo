import { BRAND_LOGO_URL } from "../constants/preview.constants";

interface OutroOverlayProps {
  outroOpacity: number;
}

export function OutroOverlay({ outroOpacity }: OutroOverlayProps) {
  return (
    <div
      className="video-branding-card"
      style={{ opacity: outroOpacity, transition: "opacity 0.05s linear" }}
      aria-live="polite"
    >
      <div className="video-branding-content">
        <img src={BRAND_LOGO_URL} alt="Roamly Studio logo" />
        <span>Before We Die</span>
        <strong>Journey complete</strong>
        <small>Thanks for travelling with us</small>
      </div>
    </div>
  );
}

