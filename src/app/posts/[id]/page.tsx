"use client"

import { useData } from "@/lib/DataContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, MessageSquare, Calendar, ExternalLink } from "lucide-react"
import { useParams } from "next/navigation"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts'

export default function PostDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { analyzedPosts, snapshots } = useData()

  const post = analyzedPosts.find(p => p.id === id);

  if (!post) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-2xl font-bold mb-4">投稿が見つかりません</h2>
        <p className="text-muted-foreground mb-6">インポートデータに含まれていないか、IDが間違っています。</p>
        <Link href="/posts">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> 一覧に戻る</Button>
        </Link>
      </div>
    );
  }

  // 過去からの伸び具合（推移）データ
  const historicalData = snapshots
    .filter(s => s.postId === id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(s => ({
      date: s.date.replace(/^\d{4}-/, ''), // YYYY-MM-DD -> MM-DD
      imp: s.impressions,
      likes: s.likes,
      reposts: s.reposts
    }));

  const chartData = [
    {
      name: '表示回数',
      organic: post.organicImpressions,
      paid: post.paidImpressions,
      total: post.impressions
    },
    {
      name: 'いいね',
      organic: post.organicLikes,
      paid: post.paidLikes,
      total: post.likes
    },
    {
      name: 'リポスト',
      organic: post.organicReposts,
      paid: post.paidReposts,
      total: post.reposts
    },
    {
      name: 'リプライ',
      organic: post.organicReplies,
      paid: post.paidReplies,
      total: post.replies
    }
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/posts">
          <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">投稿詳細分析</h2>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Calendar className="h-4 w-4" /> {post.postTime}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* 左カラム：投稿内容 */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>投稿内容</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 p-4 rounded-lg whitespace-pre-wrap border text-sm h-[200px] overflow-y-auto">
              {post.text.replace(/\[\[.*?\]\]/g, '') || "（メディアのみの投稿）"}
            </div>
            
            {post.categories.length > 0 && (
              <div className="mt-4 flex gap-1 flex-wrap">
                {post.categories.map(c => (
                  <span key={c} className="bg-secondary text-xs px-2 py-1 rounded-full text-secondary-foreground">
                    {c}
                  </span>
                ))}
              </div>
            )}
            
            {post.url && (
              <div className="mt-6">
                <a href={post.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="w-full">
                    <ExternalLink className="mr-2 h-4 w-4" /> 実際の投稿を見る
                  </Button>
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 中央・右カラム：オーガニック vs 広告 分析 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>オーガニック vs 広告 成果比較</CardTitle>
            <CardDescription>
              {post.campaigns.length > 0 
                ? `紐付いている広告: ${post.campaigns.map(c => c.name).join(', ')}` 
                : '※この投稿には広告が紐付いていません'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-sm text-left border rounded-lg overflow-hidden">
                <thead className="bg-muted/50 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">指標</th>
                    <th className="px-4 py-3 text-right font-semibold">全体 (Total)</th>
                    <th className="px-4 py-3 text-right font-semibold text-blue-500">オーガニック</th>
                    <th className="px-4 py-3 text-right font-semibold text-green-500">広告 (Paid)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">表示回数 (IMP)</td>
                    <td className="px-4 py-3 text-right font-bold">{(Number(post.impressions) || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-blue-600">{(Number(post.organicImpressions) || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-green-600">{(Number(post.paidImpressions) || 0).toLocaleString()}</td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">いいね</td>
                    <td className="px-4 py-3 text-right font-bold">{(Number(post.likes) || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-blue-600">{(Number(post.organicLikes) || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-green-600">{(Number(post.paidLikes) || 0).toLocaleString()}</td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">リポスト (RP)</td>
                    <td className="px-4 py-3 text-right font-bold">{(Number(post.reposts) || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-blue-600">{(Number(post.organicReposts) || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-green-600">{(Number(post.paidReposts) || 0).toLocaleString()}</td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">リプライ</td>
                    <td className="px-4 py-3 text-right font-bold">{(Number(post.replies) || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-blue-600">{(Number(post.organicReplies) || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-green-600">{(Number(post.paidReplies) || 0).toLocaleString()}</td>
                  </tr>
                  <tr className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">リンククリック</td>
                    <td className="px-4 py-3 text-right font-bold">{(Number(post.linkClicks) || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-blue-600">{(Number(post.organicLinkClicks) || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-green-600">{(Number(post.paidLinkClicks) || 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 広告費用とCPA等の指標 */}
            {post.campaigns.length > 0 && (
              <div className="mb-8 grid grid-cols-3 gap-4">
                <div className="bg-muted/30 border rounded-lg p-4 flex flex-col items-center justify-center">
                  <span className="text-xs text-muted-foreground mb-1">広告費 (Spend)</span>
                  <span className="text-xl font-bold text-green-600">
                    ¥{post.campaigns.reduce((sum, c) => sum + (c.spend || 0), 0).toLocaleString()}
                  </span>
                </div>
                <div className="bg-muted/30 border rounded-lg p-4 flex flex-col items-center justify-center">
                  <span className="text-xs text-muted-foreground mb-1">CPM (表示単価)</span>
                  <span className="text-xl font-bold text-green-600">
                    {post.paidImpressions > 0 
                      ? `¥${((post.campaigns.reduce((sum, c) => sum + (c.spend || 0), 0) / post.paidImpressions) * 1000).toFixed(1)}` 
                      : '-'}
                  </span>
                </div>
                <div className="bg-muted/30 border rounded-lg p-4 flex flex-col items-center justify-center">
                  <span className="text-xs text-muted-foreground mb-1">CPC (クリック単価)</span>
                  <span className="text-xl font-bold text-green-600">
                    {post.paidLinkClicks > 0 
                      ? `¥${(post.campaigns.reduce((sum, c) => sum + (c.spend || 0), 0) / post.paidLinkClicks).toFixed(1)}` 
                      : '-'}
                  </span>
                </div>
              </div>
            )}

            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#333" />
                  <XAxis type="number" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#888" fontSize={12} tickLine={false} axisLine={false} width={80} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="organic" name="オーガニック" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="paid" name="広告" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {post.campaigns.length > 0 && (
              <p className="text-xs text-muted-foreground mt-4 text-center">
                ※現状、提供されている広告CSVにはインプレッション以外の指標が存在しないため、いいね等の広告指標は「0」として計算されています。今後の新しいCSVインポートにより自動反映されます。
              </p>
            )}
          </CardContent>
        </Card>

        {/* 過去からの推移グラフ */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>パフォーマンス推移 (インポート毎の積み上げ)</CardTitle>
            <CardDescription>
              過去のCSVインポート時点からの表示回数・いいね数の伸びを確認できます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historicalData.length > 1 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val.toLocaleString()} />
                    <YAxis yAxisId="right" orientation="right" stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val.toLocaleString()} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: any) => typeof value === 'number' ? value.toLocaleString() : value}
                    />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="imp" name="表示回数 (IMP)" stroke="#3b82f6" activeDot={{ r: 8 }} strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="likes" name="いいね" stroke="#f43f5e" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="reposts" name="リポスト" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground border rounded-lg border-dashed">
                <p>過去の推移データが不足しています。</p>
                <p className="text-sm mt-1">複数回CSVをインポートすると、ここにグラフが表示されます。</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* メモ機能 */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> 分析メモ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">所感・振り返り</label>
                <textarea 
                  className="w-full h-24 rounded-md border bg-background p-3 focus:outline-none focus:ring-2 focus:ring-primary" 
                  placeholder="インプレッションは広告により伸びたが、オーガニックのエンゲージメントが高かった。次は..." 
                ></textarea>
              </div>
              <div className="flex justify-end">
                <Button>保存する</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
