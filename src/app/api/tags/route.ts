import { NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/lib/drive";
import { revalidatePath } from "next/cache";

// 既存のタグ一覧を取得
export async function GET() {
  try {
    let tags = await readJsonFile("tags.json");
    if (!tags || !Array.isArray(tags)) {
      tags = ["DLE", "カンテレ", "リポスト", "キャンペーン", "画像あり", "動画あり"];
    }
    return NextResponse.json({ tags });
  } catch (error: any) {
    console.error("API GET Tags Error:", error);
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }
}

// 新しいタグを追加
export async function POST(request: Request) {
  try {
    const { tag } = await request.json();
    if (!tag || typeof tag !== "string") {
      return NextResponse.json({ error: "Invalid tag" }, { status: 400 });
    }

    let tags = await readJsonFile("tags.json");
    if (!tags || !Array.isArray(tags)) {
      tags = ["DLE", "カンテレ", "リポスト", "キャンペーン", "画像あり", "動画あり"];
    }

    if (!tags.includes(tag)) {
      tags.push(tag);
      await writeJsonFile("tags.json", tags);
      revalidatePath("/", "layout");
    }

    return NextResponse.json({ success: true, tags });
  } catch (error: any) {
    console.error("API POST Tags Error:", error);
    return NextResponse.json({ error: "Failed to add tag" }, { status: 500 });
  }
}

// タグを削除
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get("tag");

    if (!tag) {
      return NextResponse.json({ error: "Tag is required" }, { status: 400 });
    }

    let tags = await readJsonFile("tags.json");
    if (!tags || !Array.isArray(tags)) {
      tags = ["DLE", "カンテレ", "リポスト", "キャンペーン", "画像あり", "動画あり"];
    }

    const newTags = tags.filter((t: string) => t !== tag);
    await writeJsonFile("tags.json", newTags);
    revalidatePath("/", "layout");

    return NextResponse.json({ success: true, tags: newTags });
  } catch (error: any) {
    console.error("API DELETE Tags Error:", error);
    return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 });
  }
}
