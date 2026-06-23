import { NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/lib/drive";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data || !Array.isArray(data)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (type === "summary") {
      const existing = await readJsonFile("summaries.json") || [];
      const existingAccounts = await readJsonFile("accounts.json") || [];
      const accountsMap = new Map<string, any>(existingAccounts.map((a: any) => [a.id, a]));
      
      const summaryMap = new Map<string, any>();
      existing.forEach((s: any) => {
        if (s.authorId && s.date) summaryMap.set(`${s.authorId}_${s.date}`, s);
      });

      data.forEach((row: any) => {
        if (!row.date || !row.authorId) return;

        let normalizedDate = row.date;
        try {
          const d = new Date(row.date);
          if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            normalizedDate = `${yyyy}/${mm}/${dd}`;
          }
        } catch (e) {}

        const newSummary = { ...row, date: normalizedDate };
        summaryMap.set(`${row.authorId}_${normalizedDate}`, newSummary);

        if (accountsMap.has(row.authorId)) {
          const acc = accountsMap.get(row.authorId);
          const sumDateMs = new Date(normalizedDate).getTime();
          if (sumDateMs > (acc._lastSummaryDateMs || 0)) {
            acc.followers = Math.max(acc.followers || 0, row.followers || 0);
            acc._lastSummaryDateMs = sumDateMs;
          }
        }
      });

      await writeJsonFile("summaries.json", Array.from(summaryMap.values()));
      await writeJsonFile("accounts.json", Array.from(accountsMap.values()));

    } else if (type === "posts") {
      // Handle posts data import
      const existingPosts = await readJsonFile("posts.json") || [];
      const existingSnapshots = await readJsonFile("post_snapshots.json") || [];
      const existingAccounts = await readJsonFile("accounts.json") || [];

      // Deduplicate and process posts
      const postsMap = new Map<string, any>(existingPosts.map((p: any) => [p.id, p]));
      const newSnapshots: any[] = [];
      const accountsMap = new Map<string, any>(existingAccounts.map((a: any) => [a.id, a]));
      
      const today = new Date().toISOString().split('T')[0];

      data.forEach((row: any) => {
        if (!row.id && !row.url) return;
        
        const postId = row.id || row.url;
        
        // Extract account info
        const authorId = row.authorId || 'unknown';
        // authorUsername and authorName are not parsed by parser.ts so they might be missing or we use defaults
        const authorUsername = 'unknown'; 
        const authorName = '不明なアカウント';
        
        const postDateMs = new Date(row.postTime || 0).getTime();
        
        if (!accountsMap.has(authorId)) {
          accountsMap.set(authorId, {
            id: authorId,
            username: authorUsername,
            name: authorName,
            followers: 0, // Not available in posts CSV anyway
            lastImportedAt: today,
            _lastPostDateMs: postDateMs
          });
        } else {
          // Update followers only if this row is newer
          const acc = accountsMap.get(authorId);
          if (postDateMs > (acc._lastPostDateMs || 0)) {
            acc._lastPostDateMs = postDateMs;
          }
          acc.lastImportedAt = today;
        }

        // Parse metrics data
        const postData = {
          impressions: row.impressions || 0,
          likes: row.likes || 0,
          reposts: row.reposts || 0,
          replies: row.replies || 0,
          bookmarks: row.bookmarks || 0,
          engagementRate: row.engagementRate || 0,
          linkClicks: row.linkClicks || 0,
        };

        // Find existing post or create new
        if (!postsMap.has(postId)) {
          postsMap.set(postId, {
            id: postId,
            url: row.url || '',
            postTime: row.postTime || '',
            text: row.text || '',
            authorId,
            authorUsername,
            authorName,
            tags: [],
            memo: '',
            purpose: '',
            creativeType: '',
            evaluation: '未評価',
            ...postData
          });
        } else {
          const existing = postsMap.get(postId);
          postsMap.set(postId, {
            ...existing,
            ...postData,
            authorId: existing.authorId || authorId,
            authorUsername: existing.authorUsername || authorUsername,
            authorName: existing.authorName || authorName
          });
        }

        // Add snapshot for metrics
        newSnapshots.push({
          postId: postId,
          date: today,
          impressions: row.impressions || 0,
          likes: row.likes || 0,
          reposts: row.reposts || 0,
          replies: row.replies || 0,
          bookmarks: row.bookmarks || 0,
          engagementRate: row.engagementRate || 0,
        });
      });

      // Update accounts
      await writeJsonFile("accounts.json", Array.from(accountsMap.values()));

      // Update files
      await writeJsonFile("posts.json", Array.from(postsMap.values()));
      
      // Update snapshots
      await writeJsonFile("post_snapshots.json", [...existingSnapshots, ...newSnapshots]);
    }

    // Record import log
    const logs = await readJsonFile("import_logs.json") || [];
    logs.push({
      date: new Date().toISOString(),
      type: type,
      recordsProcessed: data.length
    });
    await writeJsonFile("import_logs.json", logs);

    // インポートが成功したら、キャッシュを破棄して最新データを反映させる
    const { revalidateTag, revalidatePath } = require("next/cache");
    revalidateTag("drive-data");
    revalidatePath("/", "layout");
    revalidatePath("/accounts");

    return NextResponse.json({ success: true, processed: data.length });
  } catch (error: any) {
    console.error("API Import Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
