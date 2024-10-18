import express from "express";

import { register, Gauge } from "prom-client";
import { getImmichServerStatistics, getImmichServerStorage } from "./immich.js";

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

const handleServerStorage = async () => {
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
};

const handleServerStatistics = async () => {
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
};

const handleMetricRefresh = async () => {
  await handleServerStorage();
  await handleServerStatistics();
};

const main = async () => {
  console.log("[main] Starting Immich exporter");

  await handleMetricRefresh();

  const interval = setInterval(handleMetricRefresh, 15000);

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

  app.listen(3000, () => {
    console.log("[main] listening on port 3000");
  });
};

main();
