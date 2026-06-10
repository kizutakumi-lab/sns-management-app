"use client"

import { useState, useMemo } from "react"
import { useData } from "@/lib/DataContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, Link as LinkIcon, Search, Filter } from "lucide-react"
import { AdCampaignMapping, RawAdCampaign } from "@/lib/types"

export default function MappingPage() {
  const { campaigns, analyzedPosts, mappings, setMappings, runAutoMapping } = useData()
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [excludedCategories, setExcludedCategories] = useState<string[]>([])

  const handleToggleMapping = (campaignId: string, postId: string) => {
    const existingMapping = mappings.find(m => m.campaignId === campaignId);
    let newMappings;
    if (existingMapping) {
      if (existingMapping.postIds.includes(postId)) {
        // Remove
        const updatedPostIds = existingMapping.postIds.filter(id => id !== postId);
        if (updatedPostIds.length === 0) {
          newMappings = mappings.filter(m => m.campaignId !== campaignId);
        } else {
          newMappings = mappings.map(m => m.campaignId === campaignId ? { ...m, postIds: updatedPostIds } : m);
        }
      } else {
        // Add
        newMappings = mappings.map(m => m.campaignId === campaignId ? { ...m, postIds: [...m.postIds, postId] } : m);
      }
    } else {
      // Create new
      newMappings = [...mappings, { campaignId, postIds: [postId] }];
    }
    setMappings(newMappings);
  };

  // キャンペーンごとの紐付き数
  const getMappedCount = (campaignId: string) => {
    return mappings.find(m => m.campaignId === campaignId)?.postIds.length || 0;
  }

  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    analyzedPosts.forEach(p => p.categories.forEach(c => cats.add(c)));
    return Array.from(cats).sort();
  }, [analyzedPosts]);

  const filteredPosts = analyzedPosts.filter(post => {
    const matchText = post.text.toLowerCase().includes(searchTerm.toLowerCase()) || post.postTime.includes(searchTerm);
    if (!matchText) return false;
    
    if (selectedCategories.length > 0) {
      // AND条件: 選択されたすべてのタグを含んでいること
      if (!selectedCategories.every(cat => post.categories.includes(cat))) return false;
    }
    if (excludedCategories.length > 0) {
      // 除外条件: 指定されたタグが1つでも含まれていたら除外
      if (excludedCategories.some(cat => post.categories.includes(cat))) return false;
    }
    return true;
  });

  const toggleCategoryFilter = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      // 選択中 → 除外に切り替え
      setSelectedCategories(prev => prev.filter(c => c !== cat));
      setExcludedCategories(prev => [...prev, cat]);
    } else if (excludedCategories.includes(cat)) {
      // 除外中 → 未選択に切り替え
      setExcludedCategories(prev => prev.filter(c => c !== cat));
    } else {
      // 未選択 → 選択に切り替え
      setSelectedCategories(prev => [...prev, cat]);
    }
  };

  const clearCategoryFilters = () => {
    setSelectedCategories([]);
    setExcludedCategories([]);
  };

  const currentMappingPostIds = selectedCampaign 
    ? (mappings.find(m => m.campaignId === selectedCampaign)?.postIds || [])
    : [];

  const sortedAndFilteredPosts = [...filteredPosts].sort((a, b) => {
    if (!selectedCampaign) {
      return new Date(b.postTime).getTime() - new Date(a.postTime).getTime();
    }
    
    const aMapped = currentMappingPostIds.includes(a.id);
    const bMapped = currentMappingPostIds.includes(b.id);
    
    if (aMapped && !bMapped) return -1;
    if (!aMapped && bMapped) return 1;
    
    return new Date(b.postTime).getTime() - new Date(a.postTime).getTime();
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">広告キャンペーン紐付け</h2>
          <p className="text-muted-foreground mt-2">
            広告キャンペーンの数値（Impressions等）を、どの投稿データ（オーガニック）と合算・分離するかを設定します。
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              if (window.confirm('すべての紐付けを解除しますか？手動で行った紐付けもすべて消去されます。')) {
                setMappings([]);
              }
            }} 
            variant="outline" 
            className="shadow-sm text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            すべての紐付けを解除
          </Button>
          <Button onClick={runAutoMapping} variant="secondary" className="shadow-sm">
            <LinkIcon className="w-4 h-4 mr-2" />
            未紐付けの広告を一括自動紐付け
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 左カラム：キャンペーン一覧 */}
        <div className="md:col-span-1 space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <LinkIcon className="w-5 h-5" /> 広告キャンペーン一覧
          </h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {campaigns.length === 0 && (
              <p className="text-sm text-muted-foreground">インポートされた広告データがありません。</p>
            )}
            {campaigns.map(camp => (
              <Card 
                key={camp.id} 
                className={`cursor-pointer transition-colors hover:border-primary ${selectedCampaign === camp.id ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => setSelectedCampaign(camp.id)}
              >
                <CardContent className="p-4">
                  <div className="font-medium text-sm mb-1">{camp.name}</div>
                  <div className="text-xs text-muted-foreground mb-2">{camp.startDate} ~ {camp.endDate}</div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="bg-secondary px-2 py-1 rounded-full">
                      IMP: {camp.impressions.toLocaleString()}
                    </span>
                    {getMappedCount(camp.id) > 0 ? (
                      <span className="text-green-600 flex items-center gap-1"><Check className="w-3 h-3"/> 紐付け済 ({getMappedCount(camp.id)})</span>
                    ) : (
                      <span className="text-muted-foreground">未紐付け</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 右カラム：投稿一覧と紐付け操作 */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="font-semibold text-lg">
            {selectedCampaign 
              ? `「${campaigns.find(c => c.id === selectedCampaign)?.name}」と紐付ける投稿` 
              : 'キャンペーンを左から選択してください'}
          </h3>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input 
                type="text"
                placeholder="投稿のテキストや日付で検索..."
                className="w-full bg-background border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={!selectedCampaign}
              />
            </div>
            
            <div className="flex items-start gap-2 bg-muted/20 p-3 rounded-md border">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
              <div className="flex flex-wrap gap-1.5">
                {allCategories.length === 0 && <span className="text-sm text-muted-foreground">タグがありません（投稿一覧画面で追加できます）</span>}
                {allCategories.map(c => {
                  const isSelected = selectedCategories.includes(c);
                  const isExcluded = excludedCategories.includes(c);
                  let btnClass = 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed';
                  if (isSelected) {
                    btnClass = 'bg-primary text-primary-foreground border-primary shadow-sm font-medium';
                  } else if (isExcluded) {
                    btnClass = 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20 line-through decoration-destructive/50';
                  }

                  return (
                    <button
                      key={c}
                      disabled={!selectedCampaign}
                      onClick={() => toggleCategoryFilter(c)}
                      title="1回クリックで絞り込み、もう1回で除外"
                      className={`text-xs px-2.5 py-1 rounded-full transition-colors border ${btnClass}`}
                    >
                      {c}
                    </button>
                  );
                })}
                {(selectedCategories.length > 0 || excludedCategories.length > 0) && (
                  <button 
                    onClick={clearCategoryFilters}
                    className="text-xs px-2 py-1 text-muted-foreground hover:text-foreground underline"
                  >
                    クリア
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="h-[600px] overflow-y-auto pr-4 space-y-3">
            {sortedAndFilteredPosts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                該当する投稿が見つかりません
              </div>
            ) : null}
            
            {!selectedCampaign && sortedAndFilteredPosts.length > 0 && (
              <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                左側のリストからキャンペーンを選択してください
              </div>
            )}
            
            {selectedCampaign && sortedAndFilteredPosts.map(post => {
              const isMapped = mappings.find(m => m.campaignId === selectedCampaign)?.postIds.includes(post.id);
              
              // 自動推測の簡易ロジック: キャンペーンの日付と投稿の日付が近いかどうか
              const camp = campaigns.find(c => c.id === selectedCampaign);
              const isSuggested = camp && post.postTime.startsWith(camp.startDate.split(' ')[0]);

              return (
                <Card key={post.id} className={`${isMapped ? 'border-primary ring-1 ring-primary' : ''} ${isSuggested && !isMapped ? 'border-amber-500/50' : ''}`}>
                  <CardContent className="p-4 flex gap-4 items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-mono text-muted-foreground">{post.postTime}</span>
                        {isSuggested && !isMapped && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded-full font-medium">推奨 (日付が一致)</span>
                        )}
                      </div>
                      <p className="text-sm line-clamp-2 mb-2">{post.text}</p>
                      <div className="text-xs text-muted-foreground">
                        総IMP: {post.impressions.toLocaleString()}
                        {camp && camp.impressions > post.impressions && (
                          <span className="text-destructive ml-2 font-bold bg-destructive/10 px-1.5 py-0.5 rounded">
                            ※警告: 総IMPが広告の数値({camp.impressions.toLocaleString()})を下回っています
                          </span>
                        )}
                      </div>
                    </div>
                    <Button 
                      variant={isMapped ? "default" : "outline"} 
                      size="sm"
                      onClick={() => handleToggleMapping(selectedCampaign, post.id)}
                      className="shrink-0"
                    >
                      {isMapped ? '紐付け解除' : '紐付ける'}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
