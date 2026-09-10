import { INTRO_VIDEO_URL } from "../constants/preview.constants";

interface IntroVideoOverlayProps {
  introOpacity: number;
  introVideoRef: React.RefObject<HTMLVideoElement | null>;
  muted: boolean;
}

export function IntroVideoOverlay({
  introOpacity,
  introVideoRef,
  muted,
}: IntroVideoOverlayProps) {
  return (
    <section
      className="intro-video-fullscreen"
      style={{ opacity: introOpacity, transition: "opacity 0.05s linear" }}
      aria-label="Journey intro video"
    >
      <video
        ref={introVideoRef}
        src={INTRO_VIDEO_URL}
        autoPlay
        playsInline
        muted={muted}
      />
    </section>
  );
}

