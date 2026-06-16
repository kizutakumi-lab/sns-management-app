import { NextRequest, NextResponse } from "next/server";
import { getNotesFromSheet, saveNoteToSheet } from "@/lib/sheets";
import { revalidatePath } from "next/cache";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('accountId');
    
    if (!accountId) {
      return NextResponse.json({ error: "accountId is required" }, { status: 400 });
    }

    const accountNotes = await getNotesFromSheet(accountId);

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

    await saveNoteToSheet(accountId, block);
    revalidatePath("/", "layout");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to save note:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
