import express from "express";

import { register, Gauge } from "prom-client";
import { getImmichServerStatistics, getImmichServerStorage, getImmichJobs } from "./immich.js";
import { getConfigOption } from "./config.js";

export const storageGauges = {
  gaugeStorageDiskAvailable: new Gauge({
    name: "immich_storage_disk_available",
    help: "Immich Disk Available (/api/server/storage -> diskAvailableRaw)",
  }),

  gaugeStorageDiskSize: new Gauge({
    name: "immich_storage_disk_size",
    help: "Immich Disk Size (/api/server/storage -> diskSizeRaw)",
  }),

  gaugeStorageDiskUse: new Gauge({
    name: "immich_storage_disk_use",
    help: "Immich Disk Use (/api/server/storage -> diskUseRaw)",
  }),

  gaugeStorageDiskUsagePercentage: new Gauge({
    name: "immich_storage_disk_usage_percentage",
    help: "Immich Disk UsagePercentage (/api/server/storage -> diskUsagePercentageRaw)",
  }),
} as const;

export const statisticGauges = {
  gaugeStatisticsPhotoCount: new Gauge({
    name: "immich_statistics_photo_count",
    help: "Immich Photo Count (/api/server/storage -> photos)",
  }),

  gaugeStatisticsVideosCount: new Gauge({
    name: "immich_statistics_video_count",
    help: "Immich Video Count (/api/server/storage -> videos)",
  }),

  gaugeStatisticsUsage: new Gauge({
    name: "immich_statistics_usage",
    help: "Immich Video Count (/api/server/storage -> videos)",
  }),

  gaugeStatisticsUserPhotoCount: new Gauge({
    name: "immich_statistics_user_photo_count",
    help: "Immich User Photo Count (/api/server/storage -> usageByUser[].photos)",
    labelNames: ["user_id", "user_name"],
  }),

  gaugeStatisticsUserVideoCount: new Gauge({
    name: "immich_statistics_user_video_count",
    help: "Immich User Video Count (/api/server/storage -> usageByUser[].videos)",
    labelNames: ["user_id", "user_name"],
  }),

  gaugeStatisticsUserUsage: new Gauge({
    name: "immich_statistics_user_usage",
    help: "Immich User Usage (/api/server/storage -> usageByUser[].usage)",
    labelNames: ["user_id", "user_name"],
  }),

  gaugeStatisticsUserQuotaBytes: new Gauge({
    name: "immich_statistics_user_quota_bytes",
    help: "Immich User Quota in Bytes (/api/server/storage -> usageByUser[].quotaSizeInBytes)",
    labelNames: ["user_id", "user_name"],
  }),
};

export const jobGauges = {
  gaugeJobCounts: new Gauge({
    name: "immich_jobs_count",
    help: "Immich Job Counts by queue and status (/api/jobs)",
    labelNames: ["queue", "status"],
  }),

  gaugeJobQueueActive: new Gauge({
    name: "immich_jobs_queue_active",
    help: "Immich Job Queue Active Status (/api/jobs -> queueStatus.isActive)",
    labelNames: ["queue"],
  }),

  gaugeJobQueuePaused: new Gauge({
    name: "immich_jobs_queue_paused",
    help: "Immich Job Queue Paused Status (/api/jobs -> queueStatus.isPaused)",
    labelNames: ["queue"],
  }),
};

async function handleServerStorage() {
  console.log("[handleServerStorage] Started");

  const storage = await getImmichServerStorage();

  storageGauges.gaugeStorageDiskAvailable.set(storage.diskAvailableRaw);

  storageGauges.gaugeStorageDiskSize.set(storage.diskSizeRaw);

  storageGauges.gaugeStorageDiskUse.set(storage.diskUseRaw);

  storageGauges.gaugeStorageDiskUsagePercentage.set(
      storage.diskUsagePercentage
  );

  console.log(
      `[handleServerStorage] Finished, available ${storage.diskAvailableRaw}, size ${storage.diskSizeRaw}, use ${storage.diskUseRaw}, percentage ${storage.diskUsagePercentage}`
  );
}

async function handleServerStatistics() {
  console.log("[handleServerStatistics] Started");

  const statistics = await getImmichServerStatistics();

  statisticGauges.gaugeStatisticsPhotoCount.set(statistics.photos);

  statisticGauges.gaugeStatisticsVideosCount.set(statistics.videos);

  statisticGauges.gaugeStatisticsUsage.set(statistics.usage);

  for (const user of statistics.usageByUser) {
    const labels = {
      user_id: user.userId,
      user_name: user.userName,
    };

    statisticGauges.gaugeStatisticsUserPhotoCount
        .labels(labels)
        .set(user.photos);

    statisticGauges.gaugeStatisticsUserVideoCount
        .labels(labels)
        .set(user.videos);

    statisticGauges.gaugeStatisticsUserUsage.labels(labels).set(user.usage);

    statisticGauges.gaugeStatisticsUserQuotaBytes
        .labels(labels)
        .set(user.quotaSizeInBytes ?? 0);
  }

  console.log(
      `[handleServerStatistics] Finished, photos ${statistics.photos}, videos ${statistics.videos}, usage ${statistics.usage}, user count ${statistics.usageByUser.length}`
  );
}


// Utility function to convert camelCase to snake_case
function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

async function handleServerJobs() {
  console.log("[handleServerJobs] Started");

  const jobs = await getImmichJobs();

  // Reset all job metrics before setting new values
  jobGauges.gaugeJobCounts.reset();
  jobGauges.gaugeJobQueueActive.reset();
  jobGauges.gaugeJobQueuePaused.reset();

  for (const [queueName, queueData] of Object.entries(jobs)) {
    const queueNameSnake = camelToSnakeCase(queueName);

    // Set job counts for each status
    for (const [status, count] of Object.entries(queueData.jobCounts)) {
      jobGauges.gaugeJobCounts
          .labels({queue: queueNameSnake, status})
          .set(count);
    }

    // Set queue status
    jobGauges.gaugeJobQueueActive
        .labels({queue: queueNameSnake})
        .set(queueData.queueStatus.isActive ? 1 : 0);

    jobGauges.gaugeJobQueuePaused
        .labels({queue: queueNameSnake})
        .set(queueData.queueStatus.isPaused ? 1 : 0);
  }

  console.log(
      `[handleServerJobs] Finished, processed ${Object.keys(jobs).length} job queues`
  );
}

async function handleMetricRefresh() {
  await handleServerStorage();
  await handleServerStatistics();
  await handleServerJobs();
}

async function main() {
  console.log("[main] Starting Immich exporter");

  await handleMetricRefresh();

  const pollFrequency = getConfigOption("POLL_FREQUENCY");
  const port = getConfigOption("PORT");

  const interval = setInterval(handleMetricRefresh, pollFrequency * 1000);

  const app = express();

  app.get("/metrics", async (req, res) => {
    try {
      res.set("Content-Type", register.contentType);
      res.end(await register.metrics());
    } catch (err) {
      console.error(err);

      res.status(500).end();
    }
  });

  const server = app.listen(port, () => {
    console.log(`[main] listening on port ${port}`);
  });

  // Graceful shutdown handling
  const gracefulShutdown = (signal: string) => {
    console.log(`[main] Received ${signal}. Graceful shutdown...`);

    clearInterval(interval);

    server.close(() => {
      console.log("[main] HTTP server closed.");
      process.exit(0);
    });

    // Force exit after 10 seconds if graceful shutdown fails
    setTimeout(() => {
      console.log("[main] Could not close connections in time, forcefully shutting down");
      process.exit(1);
    }, 10000);
  };

  // Listen for termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

main().catch(error => {
  console.error('💥 Unhandled error in main:', error);
  process.exit(1);
});
