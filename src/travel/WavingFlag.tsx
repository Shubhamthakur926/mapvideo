/**
 * WavingFlag.tsx (Clean Static Flag Display)
 * ===========================================
 * Clean, high-resolution flag image display without distortion/wave filter.
 */

import React, { useState } from "react";

export interface WavingFlagProps {
  src: string;
  countryName?: string;
  onLoad?: () => void;
  onError?: () => void;
  className?: string;
  autoPlay?: boolean;
}

export const WavingFlag: React.FC<WavingFlagProps> = ({
  src,
  countryName = "Country flag",
  onLoad,
  onError,
  className = "",
}) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={`flag-display-wrapper ${className}`}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#030e18",
      }}
    >
      <img
        src={src}
        alt={`${countryName} flag`}
        onLoad={() => {
          setLoaded(true);
          onLoad?.();
        }}
        onError={() => {
          onError?.();
        }}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.25s ease",
        }}
      />

      {!loaded && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(56,189,248,0.14) 0%, rgba(2,8,16,0.5) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "56px",
          }}
        >
          🏳️
        </div>
      )}
    </div>
  );
};

export default WavingFlag;
