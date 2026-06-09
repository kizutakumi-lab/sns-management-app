import { NextResponse } from "next/server";
import { readJsonFile, writeJsonFile } from "@/lib/drive";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { tags } = body;
    const { id } = await params;

    if (!Array.isArray(tags)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const posts = await readJsonFile("posts.json") || [];
    const postIndex = posts.findIndex((p: any) => p.id === id);

    if (postIndex === -1) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Update tags
    posts[postIndex].tags = tags;
    
    // Save to Drive
    await writeJsonFile("posts.json", posts);

    return NextResponse.json({ success: true, tags });
  } catch (error: any) {
    console.error("API Update Tags Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
