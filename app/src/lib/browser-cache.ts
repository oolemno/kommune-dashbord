/**
 * Browser-compatible SSBCache replacement.
 * Uses localStorage instead of filesystem.
 */

import type { SSBQuery, SSBDataPoint } from "ssb-motor/types";

export class SSBCache {
  private prefix: string;
  private defaultTtl: number;

  constructor(_cacheDir: string, defaultTtl: number) {
    this.prefix = "ssb-cache:";
    this.defaultTtl = defaultTtl;
  }

  private getCacheKey(tableId: string, query: SSBQuery): string {
    const payload = JSON.stringify({ tableId, query });
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
      const char = payload.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(36);
  }

  async get(
    tableId: string,
    query: SSBQuery
  ): Promise<{
    data: SSBDataPoint[];
    label: string;
    dimensions: string[];
  } | null> {
    try {
      const key = this.prefix + this.getCacheKey(tableId, query);
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      const entry = JSON.parse(raw);
      if (Date.now() - entry.timestamp > entry.ttl) {
        localStorage.removeItem(key);
        return null;
      }

      return {
        data: entry.data,
        label: entry.label,
        dimensions: entry.dimensions,
      };
    } catch {
      return null;
    }
  }

  async set(
    tableId: string,
    query: SSBQuery,
    result: { data: SSBDataPoint[]; label: string; dimensions: string[] }
  ): Promise<void> {
    try {
      const key = this.prefix + this.getCacheKey(tableId, query);
      const entry = {
        timestamp: Date.now(),
        ttl: this.defaultTtl,
        data: result.data,
        label: result.label,
        dimensions: result.dimensions,
      };
      localStorage.setItem(key, JSON.stringify(entry));
    } catch {
      // localStorage full or unavailable – silently ignore
    }
  }

  async clear(): Promise<void> {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(this.prefix)
    );
    keys.forEach((k) => localStorage.removeItem(k));
  }

  async prune(): Promise<number> {
    let pruned = 0;
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(this.prefix)
    );
    for (const key of keys) {
      try {
        const entry = JSON.parse(localStorage.getItem(key)!);
        if (Date.now() - entry.timestamp > entry.ttl) {
          localStorage.removeItem(key);
          pruned++;
        }
      } catch {
        localStorage.removeItem(key);
        pruned++;
      }
    }
    return pruned;
  }
}
