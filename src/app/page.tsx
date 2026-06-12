"use client"

import { useData } from "@/lib/DataContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Users, LayoutDashboard, TrendingUp, ArrowUpRight, ArrowDownRight, LineChart as LineChartIcon } from "lucide-react"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useState, useMemo, useEffect } from "react"

export default function Dashboard() {
  const { analyzedPosts, summaries, snapshots, selectedAccountId } = useData()
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [accounts, setAccounts] = useState<any[]>([])

  // 初回マウント時にアカウントリストを取得
  useEffect(() => {
    fetch('/api/accounts')
      .then(res => res.json())
      .then(data => {
        if (data.accounts) setAccounts(data.accounts);
      })
      .catch(err => console.error("Failed to load accounts", err));
  }, []);

  const selectedAccount = selectedAccountId === "all" ? null : accounts.find(a => a.id === selectedAccountId);

  // 柔軟なアカウントマッチング関数
  const isMatch = (authorId: string, acc: any) => {
    if (!authorId || !acc) return false;
    if (authorId === acc.id) return true;
    if (authorId === acc.username) return true;
    if (authorId.includes(acc.username)) return true;
    if (acc.name && authorId.includes(acc.name)) return true;
    const shortName = acc.name ? acc.name.substring(0, 5) : "";
    if (shortName && authorId.includes(shortName)) return true;
    return false;
  };

  // 指定された期間＆アカウントで投稿をフィルタリング
  const filteredPosts = useMemo(() => {
    return analyzedPosts.filter(p => {
      if (!p || typeof p.postTime !== 'string') return false;
      const pTime = new Date(p.postTime.replace(/-/g, '/')).getTime();
      if (isNaN(pTime)) return true;

      if (startDate) {
        const sTime = new Date(startDate).getTime();
        if (!isNaN(sTime) && pTime < sTime) return false;
      }
      
      if (endDate) {
        // 終了日の23:59:59までを含める
        const eTime = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1;
        if (!isNaN(eTime) && pTime > eTime) return false;
      }
      
      if (selectedAccountId !== "all" && selectedAccount) {
        if (!isMatch(p.authorId || "", selectedAccount)) return false;
      }
      
      return true;
    });
  }, [analyzedPosts, startDate, endDate, selectedAccountId, selectedAccount]);

  // 集計指標の計算（フィルタリング後のデータを使用）
  const totalPosts = filteredPosts.length;
  const totalImpressions = filteredPosts.reduce((sum, p) => sum + p.impressions, 0);
  const totalOrganicImpressions = filteredPosts.reduce((sum, p) => sum + p.organicImpressions, 0);
  const totalPaidImpressions = filteredPosts.reduce((sum, p) => sum + p.paidImpressions, 0);
  const totalLikes = filteredPosts.reduce((sum, p) => sum + p.likes, 0);
  
  const avgEngagementRate = totalPosts > 0 
    ? (filteredPosts.reduce((sum, p) => sum + p.engagementRate, 0) / totalPosts * 100).toFixed(1) + "%" 
    : "0.0%";

  // 実データの表示期間を計算
  const { displayStartDate, displayEndDate } = useMemo(() => {
    if (filteredPosts.length === 0) return { displayStartDate: "-", displayEndDate: "-" };
    const sorted = [...filteredPosts].sort((a, b) => new Date(a.postTime.replace(/-/g, '/')).getTime() - new Date(b.postTime.replace(/-/g, '/')).getTime());
    return { 
      displayStartDate: sorted[0].postTime.split(' ')[0], 
      displayEndDate: sorted[sorted.length - 1].postTime.split(' ')[0] 
    };
  }, [filteredPosts]);

  // アカウントで絞り込んだサマリー
  const targetSummaries = useMemo(() => {
    if (selectedAccountId === "all" || !selectedAccount) return summaries;
    return summaries.filter(s => isMatch(s.authorId || "", selectedAccount));
  }, [summaries, selectedAccountId, selectedAccount]);

  // アカウントで絞り込んだスナップショット (postIdが該当アカウントの投稿に含まれるか)
  const targetSnapshots = useMemo(() => {
    if (selectedAccountId === "all" || !selectedAccount) return snapshots;
    
    // 該当アカウントの全投稿IDセット (期間フィルタリング前のものでOK)
    const validPostIds = new Set(
      analyzedPosts
        .filter(p => isMatch(p.authorId || "", selectedAccount))
        .map(p => p.id)
    );
    return snapshots.filter(s => validPostIds.has(s.postId));
  }, [snapshots, selectedAccountId, selectedAccount, analyzedPosts]);

  // 最新のフォロワー数と前回差分
  const { currentFollowers, followerDiff } = useMemo(() => {
    let curr = 0;
    let diff = 0;

    if (selectedAccountId === "all") {
      let totalCurr = 0;
      let totalPrev = 0;
      accounts.forEach(acc => {
        const accSums = summaries
          .filter(s => isMatch(s.authorId || "", acc))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        if (accSums.length > 0) {
          totalCurr += accSums[0].followers;
          totalPrev += accSums.length > 1 ? accSums[1].followers : accSums[0].followers;
        } else {
          totalCurr += acc.followers || 0;
          totalPrev += acc.followers || 0;
        }
      });
      curr = totalCurr;
      diff = totalCurr - totalPrev;
    } else {
      const sortedSummaries = [...targetSummaries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      if (sortedSummaries.length > 0) {
        curr = sortedSummaries[0].followers;
        diff = curr - (sortedSummaries.length > 1 ? sortedSummaries[1].followers : curr);
      } else {
        curr = selectedAccount?.followers || 0;
        diff = 0;
      }
    }
    return { currentFollowers: curr, followerDiff: diff };
  }, [selectedAccountId, selectedAccount, accounts, summaries, targetSummaries]);

  // snapshots からインプレッションといいねの差分を計算
  const diffStats = useMemo(() => {
    const snapshotDates = Array.from(new Set(targetSnapshots.map(s => s.date))).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const latestDate = snapshotDates.length > 0 ? snapshotDates[0] : null;
    const prevDate = snapshotDates.length > 1 ? snapshotDates[1] : null;

    let impDiff = 0;
    let likesDiff = 0;

    if (latestDate && prevDate) {
      const latestSnaps = targetSnapshots.filter(s => s.date === latestDate);
      const prevSnaps = targetSnapshots.filter(s => s.date === prevDate);
      
      const latestImpSum = latestSnaps.reduce((sum, s) => sum + (s.impressions || 0), 0);
      const prevImpSum = prevSnaps.reduce((sum, s) => sum + (s.impressions || 0), 0);
      impDiff = latestImpSum - prevImpSum;

      const latestLikesSum = latestSnaps.reduce((sum, s) => sum + (s.likes || 0), 0);
      const prevLikesSum = prevSnaps.reduce((sum, s) => sum + (s.likes || 0), 0);
      likesDiff = latestLikesSum - prevLikesSum;
    }
    return { impDiff, likesDiff, latestDate, prevDate };
  }, [targetSnapshots]);

  // フォロワー推移チャート用データ
  const followerChartData = useMemo(() => {
    return [...targetSummaries]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(s => ({
        date: s.date,
        followers: s.followers
      }));
  }, [targetSummaries]);

  // チャート用のデータ作成（日次インプレッション：オーガニック vs 広告）
  const chartData = useMemo(() => {
    const dailyData: Record<string, { date: string; organic: number; paid: number }> = {};
    
    // 投稿日の文字列(YYYY/MM/DD等)から「日付部分」だけを抽出
    filteredPosts.forEach(post => {
      if (!post || typeof post.postTime !== 'string') return;
      const dateKey = post.postTime.split(' ')[0];
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { date: dateKey, organic: 0, paid: 0 };
      }
      dailyData[dateKey].organic += post.organicImpressions;
      dailyData[dateKey].paid += post.paidImpressions;
    });

    return Object.values(dailyData).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredPosts]);

  const topPosts = [...filteredPosts]
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">ダッシュボード</h2>
          <p className="text-muted-foreground mt-2">
            SNSアカウントの運用状況と、オーガニック・広告の効果を確認できます。
          </p>
        </div>
        <div className="flex items-center gap-2 bg-card p-2.5 rounded-lg border shadow-sm">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground mb-1">開始日</span>
            <input 
              type="date" 
              style={{ colorScheme: 'dark' }}
              className="bg-background border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <span className="text-muted-foreground mt-5">〜</span>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground mb-1">終了日</span>
            <input 
              type="date" 
              style={{ colorScheme: 'dark' }}
              className="bg-background border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-md p-3 mb-6 flex flex-col sm:flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">表示期間</span>
          <span className="text-sm font-medium">
            {displayStartDate} <span className="text-muted-foreground mx-1">〜</span> {displayEndDate}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-2 sm:mt-0">
          対象投稿数: <span className="font-bold text-foreground">{totalPosts}</span> 件
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">総インプレッション</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
              {diffStats.impDiff !== 0 && (
                <div className={`text-xs font-semibold flex items-center ${diffStats.impDiff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {diffStats.impDiff > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                  {Math.abs(diffStats.impDiff).toLocaleString()}
                </div>
              )}
            </div>
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
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold">{totalLikes.toLocaleString()}</div>
              {diffStats.likesDiff !== 0 && (
                <div className={`text-xs font-semibold flex items-center ${diffStats.likesDiff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {diffStats.likesDiff > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                  {Math.abs(diffStats.likesDiff).toLocaleString()}
                </div>
              )}
            </div>
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
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold">{currentFollowers.toLocaleString()}</div>
              {followerDiff !== 0 && (
                <div className={`text-xs font-semibold flex items-center ${followerDiff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {followerDiff > 0 ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                  {Math.abs(followerDiff).toLocaleString()}
                </div>
              )}
            </div>
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
                    <p className="text-sm font-medium truncate">{(post.text || "").replace(/\[\[.*?\]\]/g, '') || "メディアのみの投稿"}</p>
                    <p className="text-xs text-muted-foreground mt-1">{(post.postTime || "").split(' ')[0]}</p>
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

      {/* フォロワー数推移グラフを新規追加 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChartIcon className="h-5 w-5" />
            フォロワー数推移
          </CardTitle>
          <CardDescription>
            日次サマリーデータのフォロワー蓄積履歴
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] w-full pt-4">
          {followerChartData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center border-t border-dashed">
              <p className="text-sm text-muted-foreground">データがありません</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={followerChartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(val) => val.toLocaleString()} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="followers" name="フォロワー数" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
