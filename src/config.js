const env = {
  port: Number(process.env.PORT || 4000),
  frontendOrigins: (process.env.FRONTEND_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  videoOutputDir: process.env.VIDEO_OUTPUT_DIR || "./tmp/exports",
  assetCacheDir: process.env.ASSET_CACHE_DIR || "./tmp/assets",
  assetConnectTimeoutMs: Number(process.env.ASSET_CONNECT_TIMEOUT_MS || 10_000),
  assetRequestTimeoutMs: Number(process.env.ASSET_REQUEST_TIMEOUT_MS || 60_000),
  assetMaxRetries: Number(process.env.ASSET_MAX_RETRIES || 3),
  assetRetryDelayMs: Number(process.env.ASSET_RETRY_DELAY_MS || 1_000),
  assetMaxFileSize: Number(process.env.ASSET_MAX_FILE_SIZE_MB || 500) * 1024 * 1024,
  maxExportJobs: Number(process.env.MAX_EXPORT_JOBS || 32),
};

export default env;
