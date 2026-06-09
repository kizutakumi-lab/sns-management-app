import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Users, FileUp, TrendingUp } from "lucide-react"
import { getCachedPosts, getCachedSnapshots, getCachedImportLogs } from "@/lib/cache"
import { cookies } from "next/headers"
import DashboardDatePicker from "@/components/dashboard/DashboardDatePicker"

export default async function Dashboard(props: { searchParams: Promise<{ from?: string, to?: string }> }) {
  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const selectedAccountId = cookieStore.get('selectedAccountId')?.value || 'all';

  let posts = [];
  let snapshots = [];
  let importLogs = [];
  
  try {
    posts = await getCachedPosts();
    snapshots = await getCachedSnapshots();
    importLogs = await getCachedImportLogs();
  } catch (error) {
    console.error("Failed to load dashboard data from drive:", error);
  }

  // Filter posts by selected account
  if (selectedAccountId !== 'all') {
    posts = posts.filter((p: any) => p.authorId === selectedAccountId);
  }

  // Filter posts by date range
  const fromDate = searchParams.from ? new Date(searchParams.from) : null;
  const toDate = searchParams.to ? new Date(searchParams.to) : null;
  // If toDate is selected, include the entire day by adding 23:59:59
  if (toDate) {
    toDate.setHours(23, 59, 59, 999);
  }

  if (fromDate || toDate) {
    posts = posts.filter((p: any) => {
      const postDate = new Date(p.postedAt);
      if (fromDate && postDate < fromDate) return false;
      if (toDate && postDate > toDate) return false;
      return true;
    });
  }

  // Calculate metrics
  let totalImpressions = 0;
  let totalLikes = 0;
  let totalFollowers = 0; // Not available in posts CSV usually, but placeholder
  let avgEngagementRate = "0.0%";

  const latestSnapshots = snapshots.reduce((acc: any, curr: any) => {
    // Only process snapshots for posts that exist in our filtered posts array
    if (posts.find((p: any) => p.id === curr.postId)) {
      if (!acc[curr.postId] || curr.date >= acc[curr.postId].date) {
        acc[curr.postId] = curr;
      }
    }
    return acc;
  }, {});

  const snapsArray = Object.values(latestSnapshots) as any[];
  if (snapsArray.length > 0) {
    totalImpressions = snapsArray.reduce((sum, s) => sum + (s.impressions || 0), 0);
    totalLikes = snapsArray.reduce((sum, s) => sum + (s.likes || 0), 0);
    
    // Parse engagement rate "x.x%"
    const totalEngRate = snapsArray.reduce((sum, s) => {
      const rate = parseFloat(s.engagementRate?.replace('%', '') || '0');
      return sum + (isNaN(rate) ? 0 : rate);
    }, 0);
    avgEngagementRate = (totalEngRate / snapsArray.length).toFixed(1) + "%";
  }

  const latestImport = importLogs.length > 0 
    ? new Date(importLogs[importLogs.length - 1].date).toLocaleDateString('ja-JP') 
    : "未実施";

  const topPosts = posts.map((p: any) => {
    const snap = latestSnapshots[p.id] || {};
    return {
      ...p,
      impressions: snap.impressions || 0
    };
  }).sort((a: any, b: any) => b.impressions - a.impressions).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">ダッシュボード</h2>
        <p className="text-muted-foreground mt-2 mb-6">
          SNSアカウントの運用状況とサマリーを確認できます。
        </p>
        <DashboardDatePicker />
      </div>

      {/* 期間テキストの生成 */}
      <div className="text-sm font-medium text-primary bg-primary/10 px-4 py-2 rounded-md inline-block">
        {(!searchParams.from && !searchParams.to) 
          ? "表示期間: 全期間の投稿" 
          : `表示期間: ${searchParams.from ? searchParams.from.replace(/-/g, '/') : '最初'} 〜 ${searchParams.to ? searchParams.to.replace(/-/g, '/') : '最新'} に投稿されたデータ`}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mt-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">総インプレッション</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              上記期間の全投稿合計
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">平均エンゲージメント率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgEngagementRate}</div>
            <p className="text-xs text-muted-foreground mt-1">
              上記期間の全投稿平均
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">総いいね数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLikes.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              直近の全投稿合計
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">最新インポート</CardTitle>
            <FileUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestImport}</div>
            <p className="text-xs text-muted-foreground">
              {importLogs.length} 回のインポート履歴
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>フォロワー数推移</CardTitle>
            <CardDescription>
              過去30日間のフォロワー獲得数の推移
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center border-t border-dashed mt-4">
            <p className="text-sm text-muted-foreground">※グラフはMVP後続フェーズで実装予定</p>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>トップパフォーマンス投稿</CardTitle>
            <CardDescription>
              インプレッション数の多い投稿トップ5
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-4 space-y-4">
            {topPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">データがありません</p>
            ) : (
              topPosts.map((post: any) => (
                <div key={post.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div className="max-w-[70%]">
                    <p className="text-sm font-medium truncate">{post.content.replace(/\[\[.*?\]\]/g, '') || "メディアのみの投稿"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(post.postedAt).toLocaleDateString('ja-JP')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{post.impressions.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">imp</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
