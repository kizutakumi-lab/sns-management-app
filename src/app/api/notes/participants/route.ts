import { NextRequest, NextResponse } from "next/server";
import { getParticipantsFromSheet, saveParticipantsToSheet } from "@/lib/sheets";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const participants = await getParticipantsFromSheet();
    return NextResponse.json({ participants: participants || [] });
  } catch (error: any) {
    console.error("Failed to fetch participants:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { participants } = await req.json();

    if (!Array.isArray(participants)) {
      return NextResponse.json({ error: "participants must be an array" }, { status: 400 });
    }

    await saveParticipantsToSheet(participants);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to save participants:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
