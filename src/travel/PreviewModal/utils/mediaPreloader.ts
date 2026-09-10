import type { Transport } from "../../types";
import { vehicleSvgTemplates } from "../../Vehicle3D";

export const audioBufferCache = new Map<string, Promise<AudioBuffer>>();

export function getAudioBuffer(context: AudioContext, url: string): Promise<AudioBuffer> {
  let buffer = audioBufferCache.get(url);
  if (!buffer) {
    buffer = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load audio: ${url}`);
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data));
    buffer.catch(() => audioBufferCache.delete(url));
    audioBufferCache.set(url, buffer);
  }
  return buffer;
}

export function playPreviewAudio(audio: HTMLAudioElement) {
  void audio.play().catch((error) => console.warn("Vehicle sound autoplay was blocked.", error));
}

export const vehicleCanvasCache = new Map<Transport, HTMLCanvasElement>();

export async function preloadVehicleImages(): Promise<Map<Transport, HTMLCanvasElement>> {
  const transports = Object.keys(vehicleSvgTemplates) as Transport[];
  await Promise.all(
    transports.map(
      (transport) =>
        new Promise<void>((resolve) => {
          if (vehicleCanvasCache.has(transport)) {
            resolve();
            return;
          }
          const rawSvg = vehicleSvgTemplates[transport];
          if (!rawSvg) {
            resolve();
            return;
          }
          let svgClean = rawSvg.trim();
          if (!svgClean.includes("xmlns=")) {
            svgClean = svgClean.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
          }

          // Extract viewBox dimensions to give the SVG concrete pixel width/height (avoid 0x0 naturalWidth in Chromium)
          const vbMatch = svgClean.match(
            /viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*["']/i
          );
          const vbWidth = vbMatch ? parseFloat(vbMatch[3]) : 100;
          const vbHeight = vbMatch ? parseFloat(vbMatch[4]) : 100;
          const targetSize = 256;
          const maxDim = Math.max(vbWidth, vbHeight, 1);
          const scale = targetSize / maxDim;
          const pixelWidth = Math.round(vbWidth * scale);
          const pixelHeight = Math.round(vbHeight * scale);

          // Replace width="..." and height="..." with concrete pixel dimensions
          svgClean = svgClean.replace(/<svg\b([^>]*)>/i, (_match, attrs) => {
            const cleaned = attrs
              .replace(/\bwidth=["'][^"']*["']/gi, "")
              .replace(/\bheight=["'][^"']*["']/gi, "")
              .trim();
            return `<svg ${cleaned} width="${pixelWidth}" height="${pixelHeight}">`;
          });

          let done = false;
          const finish = () => {
            if (!done) {
              done = true;
              resolve();
            }
          };
          const timer = setTimeout(finish, 1500);

          const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgClean)}`;
          const img = new Image();

          img.onload = () => {
            clearTimeout(timer);
            try {
              const cvs = document.createElement("canvas");
              cvs.width = pixelWidth;
              cvs.height = pixelHeight;
              const cctx = cvs.getContext("2d");
              if (cctx) {
                cctx.drawImage(img, 0, 0, pixelWidth, pixelHeight);
                vehicleCanvasCache.set(transport, cvs);
              }
            } catch (err) {
              console.warn("Could not bake vehicle to canvas:", transport, err);
            }
            finish();
          };

          img.onerror = (e) => {
            clearTimeout(timer);
            console.warn(`Failed to preload vehicle SVG for ${transport}:`, e);
            finish();
          };

          img.src = dataUrl;
        })
    )
  );
  return vehicleCanvasCache;
}

export async function preloadImages(urls: string[]): Promise<Map<string, HTMLImageElement>> {
  const map = new Map<string, HTMLImageElement>();
  await Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          if (!url) {
            resolve();
            return;
          }
          let done = false;
          const finish = () => {
            if (!done) {
              done = true;
              resolve();
            }
          };
          // Canvas export cannot use a photo until it is fully decoded. A short
          // timeout previously let recording begin with missing photos, which
          // made the downloaded video show the black fallback frame.
          const timer = setTimeout(finish, 15000);
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            clearTimeout(timer);
            void img.decode().catch(() => undefined).finally(() => {
              map.set(url, img);
              finish();
            });
          };
          img.onerror = () => {
            clearTimeout(timer);
            finish();
          };
          img.src = url;
        })
    )
  );
  return map;
}

export async function preloadVideos(urls: string[]): Promise<Map<string, HTMLVideoElement>> {
  const videos = new Map<string, HTMLVideoElement>();
  await Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          let done = false;
          const finish = () => {
            if (!done) {
              done = true;
              resolve();
            }
          };
          const timer = setTimeout(finish, 3000);
          const video = document.createElement("video");
          video.crossOrigin = "anonymous";
          video.preload = "auto";
          video.muted = true;
          video.playsInline = true;
          video.oncanplay = () => {
            clearTimeout(timer);
            videos.set(url, video);
            finish();
          };
          video.onerror = () => {
            clearTimeout(timer);
            finish();
          };
          video.src = url;
          video.load();
        })
    )
  );
  return videos;
}

