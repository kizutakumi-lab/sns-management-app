import { readJsonFile } from "./drive";

export const getCachedPosts = async () => {
  return (await readJsonFile("posts.json")) || [];
};

export const getCachedSnapshots = async () => {
  return (await readJsonFile("post_snapshots.json")) || [];
};

export const getCachedAccounts = async () => {
  return (await readJsonFile("accounts.json")) || [];
};

export const getCachedSummaries = async () => {
  return (await readJsonFile("summaries.json")) || [];
};

export const getCachedImportLogs = async () => {
  return (await readJsonFile("import_logs.json")) || [];
};

export const getCachedTags = async () => {
  const tags = await readJsonFile("tags.json");
  if (!tags || !Array.isArray(tags)) {
    return ["DLE", "カンテレ", "リポスト", "キャンペーン", "画像あり", "動画あり"];
  }
  return tags;
};

export const getCachedNotes = async () => {
  return (await readJsonFile("notes.json")) || {};
};

