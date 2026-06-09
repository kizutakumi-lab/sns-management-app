import { getCachedAccounts, getCachedPosts, getCachedSnapshots } from "@/lib/cache";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, BarChart3, Activity } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AccountsPage() {
  let accounts = [];
  let posts = [];
  let snapshots = [];

  try {
    accounts = await getCachedAccounts();
    posts = await getCachedPosts();
    snapshots = await getCachedSnapshots();
  } catch (e) {
    console.error("Failed to load data", e);
  }

  const latestSnapshots = snapshots.reduce((acc: any, curr: any) => {
    if (!acc[curr.postId] || curr.date >= acc[curr.postId].date) {
      acc[curr.postId] = curr;
    }
    return acc;
  }, {});

  const accountStats = accounts.map((acc: any) => {
    const accPosts = posts.filter((p: any) => p.authorId === acc.id);
    const accSnaps = accPosts.map((p: any) => latestSnapshots[p.id]).filter(Boolean);
    
    const totalImpressions = accSnaps.reduce((sum: number, s: any) => sum + (s.impressions || 0), 0);
    const totalLikes = accSnaps.reduce((sum: number, s: any) => sum + (s.likes || 0), 0);
    
    return {
      ...acc,
      postCount: accPosts.length,
      totalImpressions,
      totalLikes,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">アカウント管理</h2>
          <p className="text-muted-foreground mt-2">
            システムに登録されているすべての運用アカウントを一覧で確認できます。
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {accountStats.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg bg-card">
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>アカウントがまだ登録されていません。</p>
            <p className="text-sm mt-1">「インポート」メニューからCSVをアップロードすると自動的に登録されます。</p>
          </div>
        ) : (
          accountStats.map((acc: any) => (
            <Card key={acc.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div className="overflow-hidden">
                    <CardTitle className="truncate text-lg">{acc.name}</CardTitle>
                    <CardDescription className="truncate mt-1">@{acc.username}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Activity className="w-3 h-3"/> 登録投稿数</p>
                    <p className="text-xl font-bold mt-1">{acc.postCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3"/> フォロワー</p>
                    <p className="text-xl font-bold mt-1">{acc.followers.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><BarChart3 className="w-3 h-3"/> 累計インプレッション</p>
                    <p className="text-xl font-bold mt-1">{acc.totalImpressions.toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mb-4">
                  最終インポート: {acc.lastImportedAt || '不明'}
                </div>
                <Link href="/posts">
                  <Button variant="outline" className="w-full">このアカウントの投稿を見る</Button>
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
