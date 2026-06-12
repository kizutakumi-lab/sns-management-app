import { NextRequest, NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/lib/drive";
import { revalidatePath } from "next/cache";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');
    
    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }

    const notes = (await readJsonFile("notes.json")) || {};
    let accountNotes = notes[accountId];

    // マイグレーション: 文字列だった場合は配列に変換
    if (typeof accountNotes === 'string') {
      accountNotes = [{
        id: 'legacy-' + Date.now(),
        timestamp: new Date().toISOString(),
        content: accountNotes
      }];
    }

    return NextResponse.json({ notes: accountNotes || [] });
  } catch (error: any) {
    console.error("Failed to fetch notes:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { accountId, block } = await req.json();

    if (!accountId || !block) {
      return NextResponse.json({ error: "accountId and block are required" }, { status: 400 });
    }

    const notes = (await readJsonFile("notes.json")) || {};
    let accountNotes = notes[accountId];

    if (typeof accountNotes === 'string') {
      accountNotes = [{
        id: 'legacy-' + Date.now(),
        timestamp: new Date().toISOString(),
        content: accountNotes
      }];
    } else if (!Array.isArray(accountNotes)) {
      accountNotes = [];
    }
    
    // 同じIDの古いノートがあれば削除（更新用）
    accountNotes = accountNotes.filter((n: any) => n.id !== block.id);
    
    // 最新のものを先頭に追加 (unshift)
    accountNotes.unshift(block);
    notes[accountId] = accountNotes;

    await writeJsonFile("notes.json", notes);
    revalidatePath("/", "layout");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to save note:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
