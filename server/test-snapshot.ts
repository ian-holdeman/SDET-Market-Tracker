import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { Router } from "express";
import { validateFeed, type TelemetryFeed } from "../src/telemetry/contract";
import { fetchHistory, type HistoryConfig } from "./test-history";
const MAX_BYTES = 4_000_000;
/** Single-writer local store. A mounted persistent volume is required on ephemeral hosts. */
export class TestSnapshotStore {
  readonly file: string;
  private sequence = 0;
  private writes = Promise.resolve();
  constructor(
    readonly directory: string,
    readonly scope: Pick<HistoryConfig, "repository" | "branch">,
  ) {
    this.file = path.join(
      directory,
      createHash("sha256").update(JSON.stringify(scope)).digest("hex") +
        ".json",
    );
  }
  private checked(raw: unknown) {
    const feed = validateFeed(raw);
    if (
      !feed.configured ||
      feed.stale ||
      Date.parse(feed.fetchedAt) > Date.now() + 60000
    )
      throw Error("Invalid snapshot");
    for (const run of feed.runs)
      if (
        run.branch !== this.scope.branch ||
        new URL(run.url).pathname !==
          "/" +
            this.scope.repository +
            "/actions/runs/" +
            run.id +
            "/attempts/" +
            run.attempt
      )
        throw Error("Snapshot scope mismatch");
    return { ...feed, refreshing: false, snapshot: false };
  }
  async read(): Promise<TelemetryFeed | null> {
    try {
      const handle = await open(this.file, "r");
      let raw: string;
      try {
        if ((await handle.stat()).size > MAX_BYTES) throw Error();
        raw = await handle.readFile("utf8");
      } finally {
        await handle.close();
      }
      const envelope = JSON.parse(raw);
      if (
        envelope.version !== 1 ||
        envelope.repository !== this.scope.repository ||
        envelope.branch !== this.scope.branch
      )
        throw Error();
      const feed = this.checked(envelope.feed);
      if (Date.now() - Date.parse(feed.fetchedAt) > 90 * 86400000) return null;
      return feed;
    } catch {
      return null;
    }
  }
  write(feed: TelemetryFeed, generation: number): Promise<void> {
    const checked = this.checked(feed);
    if (generation < this.sequence) return Promise.resolve();
    this.sequence = generation;
    const bytes = JSON.stringify({ version: 1, ...this.scope, feed: checked });
    if (Buffer.byteLength(bytes) > MAX_BYTES)
      return Promise.reject(Error("Snapshot exceeds storage limit"));
    const write = async () => {
      if (generation !== this.sequence) return;
      await mkdir(this.directory, { recursive: true });
      const temporary = this.file + "." + randomUUID() + ".tmp";
      try {
        const file = await open(temporary, "wx", 0o600);
        try {
          await file.writeFile(bytes);
          await file.sync();
        } finally {
          await file.close();
        }
        if (generation === this.sequence) await rename(temporary, this.file);
      } finally {
        await unlink(temporary).catch(() => {});
      }
    };
    this.writes = this.writes.catch(() => {}).then(write);
    return this.writes;
  }
}
export function snapshotHistoryRouter(
  config: HistoryConfig,
  store: TestSnapshotStore,
  load = fetchHistory,
  clock = Date.now,
) {
  const router = Router();
  let value: TelemetryFeed | null = null,
    pending: Promise<void> | null = null,
    next = 0,
    failed = false,
    generation = 0;
  const reports: Parameters<typeof fetchHistory>[3] = new Map();
  const ready = store.read().then((saved) => {
    value = saved ? { ...saved, snapshot: true } : null;
  });
  router.get("/api/test-history", async (req, res, nextRoute) => {
    // Older pages and malformed query strings retain the existing route's validation.
    if (Object.keys(req.query).length) return nextRoute();
    res.set("Cache-Control", "no-store");
    await ready;
    if (!pending && clock() >= next) {
      const ticket = ++generation;
      pending = (async () => {
        try {
          const fresh = validateFeed(
            await load(config, fetch, undefined, reports),
          );
          if (fresh.stale || !fresh.configured)
            throw Error("Unverified refresh");
          if (ticket !== generation) return;
          value = { ...fresh, snapshot: false, refreshing: false };
          failed = false;
          try {
            await store.write(fresh, ticket);
          } catch {
            console.warn(
              "Test snapshot persistence unavailable; serving validated memory results.",
            );
          }
        } catch {
          failed = true;
        } finally {
          pending = null;
          next = clock() + 15000;
        }
      })();
    }
    if (!value && failed)
      return res
        .status(502)
        .json({ error: "Test history could not be retrieved." });
    return res.json(
      value
        ? { ...value, stale: failed, refreshing: !!pending }
        : {
            version: 1,
            configured: true,
            fetchedAt: new Date(0).toISOString(),
            stale: false,
            runs: [],
            refreshing: true,
            snapshot: false,
          },
    );
  });
  return router;
}
