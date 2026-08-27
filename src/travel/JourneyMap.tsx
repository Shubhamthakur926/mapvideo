import { Play } from "lucide-react";
import { MapboxGlobe } from "./MapboxGlobe";
import type { Location, Transport } from "./types";

type Props = {
  locations: Location[];
  legs: Transport[];
  onPreview: () => void;
  onSelectDestination: (location: Location) => void;
  isPaused?: boolean;
  progress?: number;
};

export function JourneyMap({ locations, legs, onPreview, onSelectDestination, isPaused = false, progress }: Props) {
  return (
    <section className="map">
      {!isPaused && (
        <MapboxGlobe
          locations={locations}
          legs={legs}
          activeLocation={locations.at(-1)}
          onSelectDestination={onSelectDestination}
          playing={!isPaused}
          hideOverlays={isPaused}
          progress={progress}
        />
      )}
      <div className="map-info">
        <b>MAPBOX 3D SATELLITE GLOBE</b>
        <span>Real satellite imagery & dynamic 3D camera travel tracking</span>
      </div>
      <button className="watch" onClick={onPreview}>
        <Play size={15} fill="currentColor" /> Watch journey story
      </button>
    </section>
  );
}

