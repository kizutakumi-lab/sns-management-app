import { NextRequest, NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/lib/drive";
import { revalidatePath } from "next/cache";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');
    
    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }
    
    let notesData: any = await readJsonFile("notes.json");
    if (!notesData || typeof notesData !== 'object' || Array.isArray(notesData)) {
      notesData = {};
    }
    const accountNotes = Array.isArray(notesData[accountId]) ? notesData[accountId] : [];

    // 日付の降順（新しい順）でソート
    accountNotes.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({ notes: accountNotes });
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

    let notesData: any = await readJsonFile("notes.json");
    if (!notesData || typeof notesData !== 'object' || Array.isArray(notesData)) {
      notesData = {};
    }
    
    if (!Array.isArray(notesData[accountId])) {
      notesData[accountId] = [];
    }

    // 既存のノートがあれば更新、なければ追加
    const existingIndex = notesData[accountId].findIndex((n: any) => n.id === block.id);
    if (existingIndex !== -1) {
      notesData[accountId][existingIndex] = block;
    } else {
      notesData[accountId].push(block);
    }

    await writeJsonFile("notes.json", notesData);
    revalidatePath("/", "layout");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to save note:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
