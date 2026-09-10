import { useEffect, useRef } from "react";
import {
  BACKGROUND_MUSIC_DUCK_VOLUME,
  BACKGROUND_MUSIC_URL,
  BACKGROUND_MUSIC_VOLUME,
} from "../constants/preview.constants";
import { playPreviewAudio } from "../utils/mediaPreloader";

interface UsePreviewMediaParams {
  playing: boolean;
  recording: boolean;
  muted: boolean;
  isIntro: boolean;
  isVideoShowcase: boolean;
  restartKey: number;
  timelineElapsed: number;
}

export function usePreviewMedia({
  playing,
  recording,
  muted,
  isIntro,
  isVideoShowcase,
  restartKey,
  timelineElapsed,
}: UsePreviewMediaParams) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const introVideoRef = useRef<HTMLVideoElement | null>(null);

  // Background music effect
  useEffect(() => {
    if (recording) return;

    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    audio.loop = true;
    audio.muted = muted;

    // Only duck volume if an actual video showcase is playing; during photos keep full music volume
    const targetVolume = isVideoShowcase ? BACKGROUND_MUSIC_DUCK_VOLUME : BACKGROUND_MUSIC_VOLUME;
    audio.volume = muted ? 0 : targetVolume;

    const musicUrl = new URL(BACKGROUND_MUSIC_URL, window.location.href).href;
    if (audio.src !== musicUrl) {
      audio.src = BACKGROUND_MUSIC_URL;
      audio.currentTime = 0;
      audio.load();
    }

    if (playing && !isIntro) {
      playPreviewAudio(audio);
    } else {
      audio.pause();
    }
  }, [playing, isIntro, isVideoShowcase, muted, recording]);

  // Audio cleanup on unmount
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
      if (audio) {
        audio.removeAttribute("src");
        audio.load();
      }
      audioRef.current = null;
    };
  }, []);

  // Destination showcase video play/pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playing && isVideoShowcase) {
      void video.play().catch((error) => console.warn("Destination video could not start.", error));
    } else {
      video.pause();
    }
  }, [playing, isVideoShowcase, restartKey, muted]);

  // Intro video play/pause
  useEffect(() => {
    const video = introVideoRef.current;
    if (!video) return;

    if (playing && isIntro) {
      void video.play().catch((error) => console.warn("Intro video could not start.", error));
    } else {
      video.pause();
    }
  }, [playing, isIntro, restartKey, muted]);

  // Intro video time sync
  useEffect(() => {
    const video = introVideoRef.current;
    if (!video || !isIntro) return;
    const targetTime = timelineElapsed / 1000;
    if (Math.abs(video.currentTime - targetTime) > 0.3) {
      video.currentTime = targetTime;
    }
  }, [timelineElapsed, isIntro]);

  return {
    audioRef,
    videoRef,
    introVideoRef,
  };
}

