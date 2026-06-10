import { unstable_cache } from "next/cache";
import { readJsonFile } from "./drive";

export const getCachedPosts = unstable_cache(
  async () => {
    return (await readJsonFile("posts.json")) || [];
  },
  ["drive-posts"],
  { tags: ["drive-data"] }
);

export const getCachedSnapshots = unstable_cache(
  async () => {
    return (await readJsonFile("post_snapshots.json")) || [];
  },
  ["drive-snapshots"],
  { tags: ["drive-data"] }
);

export const getCachedAccounts = unstable_cache(
  async () => {
    return (await readJsonFile("accounts.json")) || [];
  },
  ["drive-accounts"],
  { tags: ["drive-data"] }
);

export const getCachedImportLogs = unstable_cache(
  async () => {
    return (await readJsonFile("import_logs.json")) || [];
  },
  ["drive-import-logs"],
  { tags: ["drive-data"] }
);

export const getCachedTags = unstable_cache(
  async () => {
    const tags = await readJsonFile("tags.json");
    if (!tags || !Array.isArray(tags)) {
      return ["DLE", "カンテレ", "リポスト", "キャンペーン", "画像あり", "動画あり"];
    }
    return tags;
  },
  ["drive-tags"],
  { tags: ["drive-tags"] }
);

export const getCachedNotes = unstable_cache(
  async () => {
    return (await readJsonFile("notes.json")) || {};
  },
  ["drive-notes"],
  { tags: ["drive-data"] }
);
