import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import env from "./config.js";
import { createExportJob, getExportFile, getExportJob } from "./services/videoExportService.js";

const app = express();
app.use(express.json({ limit: "20mb" }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (env.frontendOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS blocked"));
    },
    credentials: true,
  })
);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "roamly-backend" });
});

app.post("/api/video/export", async (req, res) => {
  try {
    const jobId = await createExportJob(req.body ?? {});
    console.log(`[export:${jobId}] queued`);
    res.status(202).json({ jobId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit export job.";
    console.error("[export] queue failed:", error);
    res.status(400).json({ error: message });
  }
});

app.get("/api/video/export/:jobId", (req, res) => {
  const job = getExportJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: "Export job not found." });
    return;
  }

  res.json(job);
});

app.get("/api/video/export/:jobId/download", async (req, res) => {
  try {
    const filePath = await getExportFile(req.params.jobId);
    const stat = await fs.promises.stat(filePath);
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Content-Disposition", `attachment; filename="${path.basename(filePath)}"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    console.log(`[export:${req.params.jobId}] download started`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Download failed.";
    console.error(`[export:${req.params.jobId}] download failed:`, error);
    res.status(404).json({ error: message });
  }
});

app.listen(env.port, () => {
  console.log(`Roamly backend listening on http://localhost:${env.port}`);
});
