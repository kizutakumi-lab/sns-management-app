import { NextResponse } from "next/server";
import { readJsonFile } from "@/lib/drive";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const accounts = await readJsonFile("accounts.json") || [];
    return NextResponse.json({ accounts });
  } catch (error: any) {
    console.error("API Fetch Accounts Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
