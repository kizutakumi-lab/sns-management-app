"use client"

import { useData } from "@/lib/DataContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Users, LayoutDashboard, TrendingUp } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useMemo } from "react"

export default function Dashboard() {
  const { analyzedPosts, summaries } = useData()

  // 集計指標の計算
  const totalPosts = analyzedPosts.length;
  const totalImpressions = analyzedPosts.reduce((sum, p) => sum + p.impressions, 0);
  const totalOrganicImpressions = analyzedPosts.reduce((sum, p) => sum + p.organicImpressions, 0);
  const totalPaidImpressions = analyzedPosts.reduce((sum, p) => sum + p.paidImpressions, 0);
  const totalLikes = analyzedPosts.reduce((sum, p) => sum + p.likes, 0);
  
  const avgEngagementRate = totalPosts > 0 
    ? (analyzedPosts.reduce((sum, p) => sum + p.engagementRate, 0) / totalPosts * 100).toFixed(1) + "%" 
    : "0.0%";

  // 最新のフォロワー数（サマリーから）
  const sortedSummaries = [...summaries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const currentFollowers = sortedSummaries.length > 0 ? sortedSummaries[0].followers : 0;

  // チャート用のデータ作成（日次インプレッション：オーガニック vs 広告）
  const chartData = useMemo(() => {
    const dailyData: Record<string, { date: string; organic: number; paid: number }> = {};
    
    // 投稿日の文字列(YYYY/MM/DD等)から「日付部分」だけを抽出
    analyzedPosts.forEach(post => {
      const dateKey = post.postTime.split(' ')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { date: dateKey, organic: 0, paid: 0 };
      }
      dailyData[dateKey].organic += post.organicImpressions;
      dailyData[dateKey].paid += post.paidImpressions;
    });

    return Object.values(dailyData).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [analyzedPosts]);

  const topPosts = [...analyzedPosts]
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">ダッシュボード</h2>
        <p className="text-muted-foreground mt-2 mb-6">
          SNSアカウントの運用状況と、オーガニック・広告の効果を確認できます。
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">総インプレッション</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground flex gap-3 mt-1">
              <span className="text-blue-500 font-medium">オーガニック: {totalOrganicImpressions.toLocaleString()}</span>
              <span className="text-green-500 font-medium">広告: {totalPaidImpressions.toLocaleString()}</span>
            </div>
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
              インポートされた投稿の平均
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">総いいね数</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLikes.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              インポートされた投稿の合計
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">フォロワー数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentFollowers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              最新のサマリーデータより
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>日次インプレッション推移（オーガニック vs 広告）</CardTitle>
            <CardDescription>
              投稿日ごとのインプレッション数の内訳
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] w-full pt-4">
            {chartData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center border-t border-dashed">
                <p className="text-sm text-muted-foreground">データがありません</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                  <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="organic" name="オーガニック" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="paid" name="広告" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
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
              topPosts.map((post) => (
                <div key={post.id} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div className="max-w-[70%]">
                    <p className="text-sm font-medium truncate">{post.text.replace(/\[\[.*?\]\]/g, '') || "メディアのみの投稿"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{post.postTime.split(' ')[0]}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{post.impressions.toLocaleString()}</p>
                    <div className="flex text-[10px] gap-1 justify-end mt-0.5">
                      <span className="text-blue-500">Org: {(post.organicImpressions/1000).toFixed(1)}k</span>
                      <span className="text-green-500">Ad: {(post.paidImpressions/1000).toFixed(1)}k</span>
                    </div>
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
