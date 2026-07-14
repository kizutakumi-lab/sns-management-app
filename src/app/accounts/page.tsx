import { getCachedAccounts, getCachedPosts, getCachedSnapshots, getCachedSummaries } from "@/lib/cache";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, BarChart3, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EditAccountModal } from "@/components/accounts/EditAccountModal";

export const dynamic = 'force-dynamic';

export default async function AccountsPage() {
  let accounts = [];
  let posts = [];
  let snapshots = [];
  let summaries = [];

  try {
    [accounts, posts, snapshots, summaries] = await Promise.all([
      getCachedAccounts(),
      getCachedPosts(),
      getCachedSnapshots(),
      getCachedSummaries()
    ]);
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
    const isMatch = (authorId: string) => {
      if (!authorId) return false;
      if (authorId === acc.id) return true;
      if (authorId === acc.username) return true;
      if (authorId.includes(acc.username)) return true;
      if (acc.name && authorId.includes(acc.name)) return true;
      const shortName = acc.name ? acc.name.substring(0, 5) : "";
      if (shortName && authorId.includes(shortName)) return true;
      return false;
    };

    const accPosts = posts.filter((p: any) => isMatch(p.authorId));
    const totalImpressions = accPosts.reduce((sum: number, p: any) => sum + (p.impressions || 0), 0);
    const totalLikes = accPosts.reduce((sum: number, p: any) => sum + (p.likes || 0), 0);

    const accSummaries = summaries
      .filter((s: any) => isMatch(s.authorId))
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    let currentFollowers = acc.followers || 0;
    let followerDiff = 0;
    
    if (accSummaries.length > 0) {
      // accounts.jsonはCSVインポートで更新されるため、summariesとaccountsの大きい方を最新とする
      currentFollowers = Math.max(acc.followers || 0, accSummaries[0].followers);
      if (accSummaries.length > 1) {
        followerDiff = currentFollowers - accSummaries[1].followers;
      }
    }
    
    return {
      ...acc,
      currentFollowers,
      followerDiff,
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
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div className="overflow-hidden">
                      <CardTitle className="truncate text-lg">{acc.name}</CardTitle>
                      <CardDescription className="truncate mt-1">@{acc.username}</CardDescription>
                    </div>
                  </div>
                  <EditAccountModal account={acc} />
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
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-xl font-bold">{acc.currentFollowers.toLocaleString()}</p>
                      {acc.followerDiff !== 0 && (
                        <div className={`text-xs font-semibold flex items-center ${acc.followerDiff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {acc.followerDiff > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                          {Math.abs(acc.followerDiff).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><BarChart3 className="w-3 h-3"/> 累計インプレッション</p>
                    <p className="text-xl font-bold mt-1">{acc.totalImpressions.toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mb-4">
                  最終インポート: {acc.lastImportedAt || '不明'}
                </div>
                <div className="flex gap-2">
                  <Link href={`/accounts/${acc.id}/notes`} className="flex-1">
                    <Button variant="secondary" className="w-full">MTGメモ＆TODO</Button>
                  </Link>
                  <Link href={`/posts?accountId=${acc.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">投稿を見る</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
