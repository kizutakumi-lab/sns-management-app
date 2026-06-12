"use client"

import { useData } from "@/lib/DataContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useState, useMemo, useEffect } from "react"
import { Sparkles, FileText, Loader2, AlertCircle } from "lucide-react"

export default function AnalysisPage() {
  const { analyzedPosts, selectedAccountId } = useData()
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [accounts, setAccounts] = useState<any[]>([])
  
  useEffect(() => {
    fetch('/api/accounts')
      .then(res => res.json())
      .then(data => {
        if (data.accounts) setAccounts(data.accounts);
      })
      .catch(err => console.error("Failed to load accounts", err));
  }, []);

  const [selectedTag, setSelectedTag] = useState<string>("")
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const selectedAccount = selectedAccountId === "all" ? null : accounts.find((a: any) => a.id === selectedAccountId);

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
        const eTime = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1;
        if (!isNaN(eTime) && pTime > eTime) return false;
      }
      
      if (selectedAccountId !== "all" && selectedAccount) {
        if (!isMatch(p.authorId || "", selectedAccount)) return false;
      }
      
      return true;
    });
  }, [analyzedPosts, startDate, endDate, selectedAccountId, selectedAccount]);

  // 利用可能な全タグの抽出
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    filteredPosts.forEach(post => {
      if (Array.isArray(post.categories)) {
        post.categories.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [filteredPosts]);

  // 初期タグの設定
  useEffect(() => {
    if (availableTags.length > 0 && !selectedTag) {
      setSelectedTag(availableTags[0]);
    } else if (availableTags.length === 0) {
      setSelectedTag("");
    }
  }, [availableTags, selectedTag]);

  // 選択されたタグが含まれる投稿の抽出
  const targetPosts = useMemo(() => {
    if (!selectedTag) return [];
    return filteredPosts.filter(post => 
      Array.isArray(post.categories) && post.categories.includes(selectedTag)
    );
  }, [filteredPosts, selectedTag]);

  // 選択されたタグの全体サマリー計算
  const tagSummary = useMemo(() => {
    if (targetPosts.length === 0) return null;
    let totalImp = 0;
    let totalLikes = 0;
    let totalReposts = 0;
    targetPosts.forEach(p => {
      totalImp += p.impressions || 0;
      totalLikes += p.likes || 0;
      totalReposts += p.reposts || 0;
    });
    return {
      count: targetPosts.length,
      avgImp: Math.round(totalImp / targetPosts.length),
      likesRate: totalImp > 0 ? ((totalLikes / totalImp) * 100).toFixed(2) : "0.00",
      repostsRate: totalImp > 0 ? ((totalReposts / totalImp) * 100).toFixed(2) : "0.00"
    };
  }, [targetPosts]);

  const handleGenerateInsight = async () => {
    if (targetPosts.length === 0 || !selectedTag || !tagSummary) return;
    setIsAnalyzing(true);
    setAiError(null);
    try {
      // 投稿内容の一部（本文、数字）だけを抽出してAPIに送信
      const postsDataForAI = targetPosts.map(p => ({
        text: p.text || "",
        impressions: p.impressions || 0,
        likes: p.likes || 0,
        reposts: p.reposts || 0,
        likesRate: p.impressions > 0 ? ((p.likes / p.impressions) * 100).toFixed(2) : 0,
        postTime: p.postTime
      }));

      const res = await fetch('/api/analyze-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: selectedTag, summary: tagSummary, posts: postsDataForAI })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'APIリクエストに失敗しました');
      }
      setAiAnalysis(data.result);
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">投稿AI比較分析</h2>
          <p className="text-muted-foreground mt-2">
            特定のタグ内の投稿同士を比較し、勝ち負けの理由をAIが推測します。
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

      {availableTags.length === 0 ? (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            対象のデータがありません。条件を変更するか、データをインポートしてください。
          </CardContent>
        </Card>
      ) : (
        <Card className="border-primary/20 shadow-lg relative overflow-hidden flex flex-col h-full min-h-[600px]">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Sparkles className="w-64 h-64 text-primary" />
          </div>
          
          <CardHeader className="relative z-10 pb-4 border-b bg-card/50 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Sparkles className="w-5 h-5 text-primary" />
                  深掘り分析するタグの選択
                </CardTitle>
                <CardDescription className="mt-1">
                  選択したタグが付けられている投稿の本文やエンゲージメントをAIが比較します。
                </CardDescription>
              </div>
              
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <select 
                    className="bg-background border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[200px]"
                    value={selectedTag}
                    onChange={(e) => {
                      setSelectedTag(e.target.value);
                      setAiAnalysis(null);
                      setAiError(null);
                    }}
                  >
                    {availableTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                  
                  {tagSummary && (
                    <div className="flex items-center gap-4 text-sm bg-muted/50 px-4 py-2 rounded-md">
                      <div className="flex flex-col"><span className="text-xs text-muted-foreground">投稿数</span><span className="font-mono font-medium">{tagSummary.count}件</span></div>
                      <div className="flex flex-col"><span className="text-xs text-muted-foreground">平均IMP</span><span className="font-mono font-medium">{tagSummary.avgImp.toLocaleString()}</span></div>
                      <div className="flex flex-col"><span className="text-xs text-pink-400">いいね率</span><span className="font-mono font-medium text-pink-100">{tagSummary.likesRate}%</span></div>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={handleGenerateInsight}
                  disabled={isAnalyzing}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2.5 rounded-md font-medium shadow-md hover:shadow-lg transition-all hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:hover:scale-100 whitespace-nowrap"
                >
                  {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isAnalyzing ? "分析中..." : "AIで分析する"}
                </button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="relative z-10 flex-1 flex flex-col p-0">
            {/* 分析前の初期状態 */}
            {!aiAnalysis && !isAnalyzing && !aiError && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-muted/10">
                <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium text-slate-200 mb-2">タグ「{selectedTag}」の投稿を比較分析</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  このタグが含まれる {targetPosts.length} 件の投稿のテキスト内容とインプレッション、いいね率などの結果をAIに送信し、伸びる傾向と改善点を推測します。
                </p>
              </div>
            )}

            {/* 分析中 */}
            {isAnalyzing && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-4 bg-muted/10">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-sm font-medium animate-pulse text-primary">Gemini AIが投稿本文を読み込み、理由を推測しています...</p>
              </div>
            )}

            {/* エラー表示 */}
            {aiError && (
              <div className="p-6">
                <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-5 h-5" />
                    エラーが発生しました
                  </div>
                  <p className="text-sm">{aiError}</p>
                </div>
              </div>
            )}

            {/* 分析結果表示 */}
            {aiAnalysis && !isAnalyzing && (
              <div className="flex-1 flex flex-col p-6 overflow-hidden">
                <div className="bg-slate-900/60 rounded-xl p-6 text-sm leading-relaxed overflow-y-auto flex-1 prose prose-invert prose-sm max-w-none border shadow-inner">
                  {aiAnalysis.split('\n').map((line, i) => {
                    if (line.startsWith('## ')) return <h3 key={i} className="text-blue-400 font-bold mt-4 mb-3 pb-2 border-b border-blue-900/30 text-lg">{line.replace('## ', '')}</h3>;
                    if (line.startsWith('### ')) return <h4 key={i} className="text-purple-400 font-bold mt-5 mb-2 text-base flex items-center gap-2">{line.replace('### ', '')}</h4>;
                    if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 mb-2 text-slate-200">{line.substring(2)}</li>;
                    if (line.trim() === '') return <div key={i} className="h-3"></div>;
                    
                    const parts = line.split(/(\*\*.*?\*\*)/g);
                    return <p key={i} className="mb-3 text-slate-300">
                      {parts.map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return <strong key={j} className="text-white font-bold">{part.slice(2, -2)}</strong>;
                        }
                        return part;
                      })}
                    </p>;
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
