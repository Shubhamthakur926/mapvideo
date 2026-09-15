import React from "react";
import type { PhotoItem } from "../types/preview.types";

interface RapidPhotosOverlayProps {
  isRapidPhotos: boolean;
  rapidPhotosOpacity: number;
  allPhotos: PhotoItem[];
  rapidPhotoIndex: number;
}

export const RapidPhotosOverlay: React.FC<RapidPhotosOverlayProps> = ({
  isRapidPhotos,
  rapidPhotosOpacity,
  allPhotos,
  rapidPhotoIndex,
}) => {
  if (!isRapidPhotos || allPhotos.length === 0) return null;

  const currentPhoto = allPhotos[rapidPhotoIndex];
  if (!currentPhoto) return null;

  return (
    <div
      className="overlay-container"
      style={{
        opacity: rapidPhotosOpacity,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        zIndex: 50, // above other elements but below recording indicator
      }}
    >
      <img
        src={currentPhoto.url}
        alt={currentPhoto.locationName}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          animation: "zoomIn 10s infinite alternate",
        }}
      />
      <div
        className="photo-location"
        style={{
          position: "absolute",
          bottom: "40px",
          left: "0",
          right: "0",
          textAlign: "center",
          color: "white",
          fontSize: "2rem",
          fontWeight: "bold",
          textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
          zIndex: 51,
        }}
      >
        {currentPhoto.locationName}
      </div>
    </div>
  );
};
