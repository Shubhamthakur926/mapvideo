import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

function localApi() {
  const handler = async (req: { url?: string }, res: { setHeader: (key: string, value: string) => void; end: (value: string) => void }, next: () => void) => {
    if (!req.url?.startsWith("/api/")) return next();
    res.setHeader("Content-Type", "application/json");
    try {
      if (req.url.startsWith("/api/music")) {
        const songs = Array.from({ length: 10 }, (_, index) => ({
          id: index + 1, title: `Song ${index + 1}`, artist: "Demo Artist",
          cover: `https://picsum.photos/seed/roamly-song-${index + 1}/160/160`,
          audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        }));
        return res.end(JSON.stringify(songs));
      }
      if (req.url.startsWith("/api/flights")) {
        const response = await fetch("https://api.adsb.lol/v2/point/30.9/75.85/250", { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error(`Flight data request failed (${response.status})`);
        const data = await response.json() as { ac?: Array<Record<string, unknown>> };
        const flights = (data.ac ?? []).filter((aircraft) => typeof aircraft.lat === "number" && typeof aircraft.lon === "number").slice(0, 500).map((aircraft) => ({
          id: aircraft.hex, callsign: typeof aircraft.flight === "string" ? aircraft.flight.trim() : "Unknown",
          longitude: aircraft.lon, latitude: aircraft.lat, altitude: aircraft.alt_baro ?? null,
          velocity: aircraft.gs ?? null, heading: aircraft.track ?? null, onGround: aircraft.alt_baro === "ground",
        }));
        return res.end(JSON.stringify(flights));
      }
      res.end(JSON.stringify({ message: "Not found" }));
    } catch (error) {
      res.end(JSON.stringify({ message: error instanceof Error ? error.message : "API request failed" }));
    }
  };
  return { name: "roamly-local-api", configureServer(server: { middlewares: { use: typeof handler } }) { server.middlewares.use(handler); }, configurePreviewServer(server: { middlewares: { use: typeof handler } }) { server.middlewares.use(handler); } };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localApi()],
  resolve: {
    alias: [
      { find: /^next\/dynamic$/, replacement: fileURLToPath(new URL("./src/next/index.ts", import.meta.url)) },
      { find: /^next\/link$/, replacement: fileURLToPath(new URL("./src/next/link.tsx", import.meta.url)) },
      { find: /^next\/image$/, replacement: fileURLToPath(new URL("./src/next/image.tsx", import.meta.url)) },
      { find: /^next\/navigation$/, replacement: fileURLToPath(new URL("./src/next/navigation.ts", import.meta.url)) },
    ],
  },
});
