import { readJsonFile } from "@/lib/drive";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, MessageSquare, BarChart, Calendar } from "lucide-react";

import PostPerformanceHistory from "@/components/posts/PostPerformanceHistory";

export const revalidate = 0;

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  let posts = [];
  let snapshots = [];
  
  try {
    posts = await readJsonFile("posts.json") || [];
    snapshots = await readJsonFile("post_snapshots.json") || [];
  } catch (error) {
    console.error("Failed to load data from drive:", error);
  }

  const post = posts.find((p: any) => p.id === id);
  const postSnapshots = snapshots.filter((s: any) => s.postId === id).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (!post) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-2xl font-bold mb-4">投稿が見つかりません</h2>
        <Link href="/posts">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> 戻る</Button>
        </Link>
      </div>
    );
  }

  const latestSnap = postSnapshots[postSnapshots.length - 1] || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/posts">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">投稿詳細</h2>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Calendar className="h-4 w-4" /> {new Date(post.postedAt).toLocaleString('ja-JP')}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>投稿内容</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 p-4 rounded-lg whitespace-pre-wrap border">
              {post.content}
            </div>
            {post.url && (
              <div className="mt-4">
                <a href={post.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                  実際の投稿を見る →
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>最新の成果</CardTitle>
            <CardDescription>直近のエンゲージメントデータ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-muted-foreground">表示回数</span>
              <span className="font-bold">{latestSnap.impressions?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-muted-foreground">いいね</span>
              <span className="font-bold">{latestSnap.likes?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-muted-foreground">リポスト</span>
              <span className="font-bold">{latestSnap.reposts?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-muted-foreground">リプライ</span>
              <span className="font-bold">{latestSnap.replies?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="font-bold text-primary">エンゲージメント率</span>
              <span className="font-bold text-primary text-xl">{latestSnap.engagementRate || '0%'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>パフォーマンス推移</CardTitle>
            <CardDescription>各インポート日ごとの数値の変化と成長幅</CardDescription>
          </CardHeader>
          <CardContent>
            <PostPerformanceHistory snapshots={postSnapshots} />
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> 分析メモ・タグ設定
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">タグ（カンマ区切り）</label>
                <input type="text" className="w-full h-10 rounded-md border bg-background px-3" placeholder="キャンペーン, 新製品, 画像あり" defaultValue={post.tags?.join(', ')} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">投稿の狙い</label>
                <textarea className="w-full h-24 rounded-md border bg-background p-3" placeholder="認知拡大を狙い、画像を目立たせた..." defaultValue={post.purpose}></textarea>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">所感・振り返り</label>
                <textarea className="w-full h-24 rounded-md border bg-background p-3" placeholder="インプレッションは伸びたがクリック率が低かった。次はCTAを強める。" defaultValue={post.memo}></textarea>
              </div>
              <div className="flex items-end justify-end h-full pb-1">
                <Button className="w-full md:w-auto">保存する</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
