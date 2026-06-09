import { NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/lib/drive";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data || !Array.isArray(data)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (type === "summary") {
      // Handle summary data import
      // Map to post_snapshots or accounts snapshot
      // For now, we'll just store it in a generic snapshots file to build out the MVP
      const existing = await readJsonFile("account_summary.json") || [];
      const updated = [...existing, ...data];
      await writeJsonFile("account_summary.json", updated);

    } else if (type === "posts") {
      // Handle posts data import
      const existingPosts = await readJsonFile("posts.json") || [];
      const existingSnapshots = await readJsonFile("post_snapshots.json") || [];
      const existingAccounts = await readJsonFile("accounts.json") || [];

      // Deduplicate and process posts
      const newPosts: any[] = [];
      const newSnapshots: any[] = [];
      const accountsMap = new Map(existingAccounts.map((a: any) => [a.id, a]));
      
      const today = new Date().toISOString().split('T')[0];

      data.forEach((row: any) => {
        if (!row['投稿ID'] && !row['詳細URL']) return;
        
        const postId = row['投稿ID'] || row['詳細URL'];
        
        // Extract account info
        const authorId = row['ユーザーID'] || 'unknown';
        const authorUsername = row['ユーザーネーム'] || 'unknown';
        const authorName = row['名前'] || '不明なアカウント';
        
        const postDateMs = new Date(row['投稿時間'] || 0).getTime();
        
        if (!accountsMap.has(authorId)) {
          accountsMap.set(authorId, {
            id: authorId,
            username: authorUsername,
            name: authorName,
            followers: parseInt(row['フォロワー数'] || '0') || 0,
            lastImportedAt: today,
            _lastPostDateMs: postDateMs
          });
        } else {
          // Update followers only if this row is newer
          const acc = accountsMap.get(authorId);
          if (postDateMs > (acc._lastPostDateMs || 0)) {
            acc.followers = parseInt(row['フォロワー数'] || '0') || acc.followers;
            acc._lastPostDateMs = postDateMs;
          }
          acc.lastImportedAt = today;
        }

        // Find existing post
        const exists = existingPosts.find((p: any) => p.id === postId);
        if (!exists) {
          newPosts.push({
            id: postId,
            url: row['詳細URL'] || '',
            postedAt: row['投稿時間'] || '',
            content: row['内容'] || '',
            authorId,
            authorUsername,
            authorName,
            tags: [],
            memo: '',
            purpose: '',
            creativeType: '',
            evaluation: '未評価'
          });
        }

        // Add snapshot for metrics
        newSnapshots.push({
          postId: postId,
          date: today,
          impressions: parseInt(row['表示回数'] || '0') || 0,
          likes: parseInt(row['いいね数'] || '0') || 0,
          reposts: parseInt(row['リポスト(合計)'] || '0') || 0,
          replies: parseInt(row['リプライ数'] || '0') || 0,
          bookmarks: parseInt(row['ブックマーク数'] || '0') || 0,
          engagementRate: row['エンゲージメント率'] || '0%',
        });
      });

      // Update accounts
      await writeJsonFile("accounts.json", Array.from(accountsMap.values()));

      // Update files
      if (newPosts.length > 0) {
        await writeJsonFile("posts.json", [...existingPosts, ...newPosts]);
      }
      
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

    return NextResponse.json({ success: true, processed: data.length });
  } catch (error: any) {
    console.error("API Import Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
