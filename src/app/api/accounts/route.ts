import { NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/lib/drive";
import { revalidatePath } from "next/cache";

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

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, username } = body;

    if (!id) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }

    const accounts = await readJsonFile("accounts.json") || [];
    let updated = false;

    const newAccounts = accounts.map((acc: any) => {
      if (acc.id === id) {
        updated = true;
        return {
          ...acc,
          name: name || acc.name,
          username: username || acc.username,
        };
      }
      return acc;
    });

    if (!updated) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await writeJsonFile("accounts.json", newAccounts);

    // キャッシュを破棄して最新データを反映させる
    revalidatePath("/", "layout");
    revalidatePath("/accounts");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API Update Account Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }

    const accounts = await readJsonFile("accounts.json") || [];
    const newAccounts = accounts.filter((acc: any) => acc.id !== id);

    if (accounts.length === newAccounts.length) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    await writeJsonFile("accounts.json", newAccounts);

    // 関連するポスト等も削除するかどうかは要件次第ですが、
    // 重複で作成された空のアカウントカードを消すのが主目的なのでアカウントのみ削除します。
    // (ポストはauthorIdが残っていてもaccounts.jsonになければ一覧には表示されない、またはisMatchで拾われます)

    revalidatePath("/", "layout");
    revalidatePath("/accounts");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API Delete Account Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
