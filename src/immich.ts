import { getConfigOption } from "./config.js";

export const getImmichUrl = (path: string) => {
  let host = getConfigOption("IMMICH_HOST");

  if (!host.startsWith("https://") && !host.startsWith("http://")) {
    host = `http://${host}`;
  }

  if (host.endsWith("/")) {
    host = host.substring(0, host.length - 1);
  }

  return `${host}${path}`;
};

export const getImmichHeaders = () => {
  return {
    "x-api-key": getConfigOption("IMMICH_KEY"),
  };
};

export interface ImmichServerStatistics {
  photos: number;
  videos: number;
  usage: number;
  usageByUser: Array<{
    userId: string;
    userName: string;
    quotaSizeInBytes: number;
    photos: number;
    videos: number;
    usage: number;
  }>;
}

export const getImmichServerStatistics =
  async (): Promise<ImmichServerStatistics> => {
    const url = getImmichUrl("/api/server/statistics");

    const response = await fetch(url, {
      headers: { ...getImmichHeaders() },
    });

    return await response.json();
  };

export interface ImmichServerStorage {
  diskUsagePercentage: number;

  diskAvailable: string;
  diskAvailableRaw: number;

  diskSize: string;
  diskSizeRaw: number;

  diskUse: string;
  diskUseRaw: number;
}

export const getImmichServerStorage =
  async (): Promise<ImmichServerStorage> => {
    const url = getImmichUrl("/api/server/storage");

    const response = await fetch(url, {
      headers: { ...getImmichHeaders() },
    });

    return await response.json();
  };

export interface ImmichServerVersion {
  major: number;
  minor: number;
  patch: number;
}

export const getImmichServerVersion =
  async (): Promise<ImmichServerVersion> => {
    const url = getImmichUrl("/api/server/version");

    const response = await fetch(url, {
      headers: { ...getImmichHeaders() },
    });

    return await response.json();
  };

export type ImmichServerVersionHistory = Array<{
  createdAt: string;
  id: string;
  version: string;
}>;

export const getImmichServerVersionHistory =
  async (): Promise<ImmichServerVersionHistory> => {
    const url = getImmichUrl("/api/server/version-history");

    const response = await fetch(url, {
      headers: { ...getImmichHeaders() },
    });

    return await response.json();
  };
