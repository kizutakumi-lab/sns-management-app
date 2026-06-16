"use client"

import { useData } from "@/lib/DataContext"
import { Card, CardContent } from "@/components/ui/card"
import { useState, useMemo, useEffect } from "react"
import TweetThumbnail from "@/components/posts/TweetThumbnail";
import { ExternalLink, Search, Filter, SortDesc, SortAsc, CheckSquare, ChevronLeft, ChevronRight } from "lucide-react"

type SortField = 'postTime' | 'impressions' | 'organicImpressions' | 'paidImpressions' | 'likes' | 'reposts' | 'replies' | 'linkClicks';
type SortOrder = 'asc' | 'desc';

const formatContentWithLinks = (text: string) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

export default function PostsPage() {
  const { analyzedPosts, updatePostTags, updateMultiplePostTags } = useData()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [excludedCategories, setExcludedCategories] = useState<string[]>([])
  const [sortField, setSortField] = useState<SortField>('postTime')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [selectedPostIds, setSelectedPostIds] = useState<string[]>([])
  const [bulkTagInput, setBulkTagInput] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 20

  // 全カテゴリの抽出
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    analyzedPosts.forEach(p => p.categories.forEach(c => cats.add(c)));
    return Array.from(cats).sort();
  }, [analyzedPosts]);

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

  // ソート・フィルタリング適用
  const filteredAndSortedPosts = useMemo(() => {
    let result = [...analyzedPosts];

    // フィルタリング
    if (searchTerm) {
      result = result.filter(p => p.text.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (selectedCategories.length > 0) {
      // AND条件: 選択されたすべてのタグを含んでいること
      result = result.filter(p => selectedCategories.every(cat => p.categories.includes(cat)));
    }
    if (excludedCategories.length > 0) {
      // 除外条件: 指定されたタグが1つでも含まれていたら除外
      result = result.filter(p => !excludedCategories.some(cat => p.categories.includes(cat)));
    }
    
    // 期間フィルタリング
    if (startDate) {
      const start = new Date(startDate).getTime();
      result = result.filter(p => new Date(p.postTime.split(' ')[0].replace(/-/g, '/')).getTime() >= start);
    }
    if (endDate) {
      // endDateは指定日の23:59:59までとするために1日足すか、Dateでパースして比較
      const end = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1; 
      result = result.filter(p => new Date(p.postTime.split(' ')[0].replace(/-/g, '/')).getTime() <= end);
    }

    // ソート
    result.sort((a, b) => {
      let valA: any = a[sortField] || 0;
      let valB: any = b[sortField] || 0;

      if (sortField === 'postTime') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [analyzedPosts, searchTerm, selectedCategories, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // 検索・フィルタ変更時に1ページ目に戻す
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategories, excludedCategories, startDate, endDate]);

  // ページネーション用データ
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedPosts.length / ITEMS_PER_PAGE));
  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedPosts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAndSortedPosts, currentPage]);

  const PaginationControls = () => (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground mr-2">
        {filteredAndSortedPosts.length} 件中 {filteredAndSortedPosts.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedPosts.length)} 件
      </span>
      <button 
        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        className="p-1 border rounded hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <span className="text-sm font-medium px-2">
        {currentPage} / {totalPages}
      </span>
      <button 
        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        className="p-1 border rounded hover:bg-muted disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <SortAsc className="w-4 h-4 ml-1 inline" /> : <SortDesc className="w-4 h-4 ml-1 inline" />;
  };

  const PostTagsEditor = ({ post }: { post: any }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newTag, setNewTag] = useState('');

    const handleAdd = () => {
      if (newTag.trim() && !post.categories.includes(newTag.trim())) {
        updatePostTags(post.id, [...post.categories, newTag.trim()]);
      }
      setNewTag('');
    };

    const handleRemove = (tag: string) => {
      updatePostTags(post.id, post.categories.filter((c: string) => c !== tag));
    };

    if (!isEditing) {
      return (
        <div className="flex gap-1 flex-wrap mt-2 items-center">
          {post.categories.map((c: string) => (
            <span key={c} className="bg-secondary text-[10px] px-2 py-0.5 rounded-full text-secondary-foreground">
              {c}
            </span>
          ))}
          <button onClick={() => setIsEditing(true)} className="text-muted-foreground hover:text-primary text-[10px] bg-muted px-2 py-0.5 rounded-full hover:bg-secondary transition-colors">
            + タグ編集
          </button>
        </div>
      );
    }

    return (
      <div className="mt-2 p-2 border rounded-md bg-muted/20">
        <div className="flex flex-wrap gap-1 mb-2">
          {post.categories.map((c: string) => (
            <span key={c} className="bg-secondary text-[10px] px-2 py-0.5 rounded-full text-secondary-foreground flex items-center gap-1 pr-1">
              {c}
              <button onClick={() => handleRemove(c)} className="text-red-500 hover:text-red-700 bg-white/50 rounded-full w-3 h-3 flex items-center justify-center leading-none">&times;</button>
            </span>
          ))}
        </div>
        <div className="flex gap-1 mb-2">
          <input 
            type="text" 
            value={newTag} 
            onChange={(e) => setNewTag(e.target.value)} 
            className="border px-1.5 py-1 text-xs rounded flex-1 focus:outline-none focus:ring-1 focus:ring-primary bg-background" 
            placeholder="新しいタグを入力..."
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button onClick={handleAdd} className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">追加</button>
          <button onClick={() => setIsEditing(false)} className="border text-muted-foreground bg-background text-xs px-2 py-1 rounded hover:bg-muted">完了</button>
        </div>
        {allCategories.filter(c => !post.categories.includes(c)).length > 0 && (
          <div className="flex flex-wrap gap-1 items-center">
            <span className="text-[10px] text-muted-foreground mr-1">既存タグから追加:</span>
            {allCategories.filter(c => !post.categories.includes(c)).slice(0, 10).map(c => (
              <button key={c} onClick={() => updatePostTags(post.id, [...post.categories, c])} className="text-[10px] border px-1.5 py-0.5 rounded bg-background hover:bg-muted text-muted-foreground">
                + {c}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedPostIds(filteredAndSortedPosts.map(p => p.id));
    } else {
      setSelectedPostIds([]);
    }
  };

  const handleSelectPost = (postId: string, checked: boolean) => {
    if (checked) {
      setSelectedPostIds(prev => [...prev, postId]);
    } else {
      setSelectedPostIds(prev => prev.filter(id => id !== postId));
    }
  };

  const handleBulkAddTag = () => {
    if (bulkTagInput.trim() && selectedPostIds.length > 0) {
      updateMultiplePostTags(selectedPostIds, bulkTagInput.trim());
      setBulkTagInput("");
      setSelectedPostIds([]); // 追加後に選択解除
    }
  };

  const handleBulkAddExistingTag = (tag: string) => {
    if (selectedPostIds.length > 0) {
      updateMultiplePostTags(selectedPostIds, tag);
      setSelectedPostIds([]);
    }
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">投稿パフォーマンス一覧</h2>
        <p className="text-muted-foreground mt-2">
          すべての投稿の詳細な数値（オーガニック / 広告）を比較・分析できます。
        </p>
      </div>

      <div className="bg-card p-4 rounded-lg border shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="relative w-full md:w-96 shrink-0">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="投稿内容で検索..."
              className="w-full bg-background border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm text-muted-foreground">期間:</span>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded-md px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-muted-foreground">〜</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded-md px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(""); setEndDate(""); }}
                className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
              >
                クリア
              </button>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
              <div className="flex flex-wrap gap-1.5">
                {allCategories.length === 0 && <span className="text-sm text-muted-foreground">タグがありません</span>}
                {allCategories.map(c => {
                  const isSelected = selectedCategories.includes(c);
                  const isExcluded = excludedCategories.includes(c);
                  let btnClass = 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground';
                  if (isSelected) {
                    btnClass = 'bg-primary text-primary-foreground border-primary shadow-sm font-medium';
                  } else if (isExcluded) {
                    btnClass = 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20 line-through decoration-destructive/50';
                  }

                  return (
                    <button
                      key={c}
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
        </div>
      </div>

      <div className="flex justify-end items-center mb-2">
        <PaginationControls />
      </div>

      {selectedPostIds.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <CheckSquare className="w-4 h-4" />
            {selectedPostIds.length}件の投稿を選択中
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input 
              type="text"
              value={bulkTagInput}
              onChange={(e) => setBulkTagInput(e.target.value)}
              placeholder="新しいタグ..."
              className="border px-2 py-1.5 text-sm rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary w-40"
              onKeyDown={(e) => e.key === 'Enter' && handleBulkAddTag()}
            />
            <button 
              onClick={handleBulkAddTag}
              className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm font-medium"
            >
              一括追加
            </button>
            {allCategories.length > 0 && (
              <div className="flex items-center gap-1 border-l pl-2 ml-1 border-primary/20">
                <span className="text-xs text-primary/70 mr-1">既存タグ:</span>
                {allCategories.slice(0, 5).map(c => (
                  <button key={c} onClick={() => handleBulkAddExistingTag(c)} className="text-[10px] bg-background border px-1.5 py-0.5 rounded hover:bg-muted text-foreground">
                    + {c}
                  </button>
                ))}
              </div>
            )}
            <button 
              onClick={() => setSelectedPostIds([])}
              className="text-xs text-muted-foreground hover:text-foreground underline ml-2"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 uppercase border-b">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300"
                      checked={filteredAndSortedPosts.length > 0 && selectedPostIds.length === filteredAndSortedPosts.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 cursor-pointer hover:bg-muted whitespace-nowrap" onClick={() => handleSort('postTime')}>
                    投稿日時 <SortIcon field="postTime" />
                  </th>
                  <th className="px-4 py-3 min-w-[300px]">内容 / カテゴリ</th>
                  <th className="px-4 py-3 text-right cursor-pointer hover:bg-muted whitespace-nowrap" onClick={() => handleSort('impressions')}>
                    総IMP <SortIcon field="impressions" />
                  </th>
                  <th className="px-4 py-3 text-right text-blue-500 cursor-pointer hover:bg-muted whitespace-nowrap" onClick={() => handleSort('organicImpressions')}>
                    Org (IMP) <SortIcon field="organicImpressions" />
                  </th>
                  <th className="px-4 py-3 text-right text-green-500 cursor-pointer hover:bg-muted whitespace-nowrap" onClick={() => handleSort('paidImpressions')}>
                    Paid (IMP) <SortIcon field="paidImpressions" />
                  </th>
                  <th className="px-4 py-3 text-right cursor-pointer hover:bg-muted whitespace-nowrap" onClick={() => handleSort('likes')}>
                    いいね <SortIcon field="likes" />
                  </th>
                  <th className="px-4 py-3 text-right cursor-pointer hover:bg-muted whitespace-nowrap" onClick={() => handleSort('reposts')}>
                    RP <SortIcon field="reposts" />
                  </th>
                  <th className="px-4 py-3 text-right cursor-pointer hover:bg-muted whitespace-nowrap" onClick={() => handleSort('replies')}>
                    コメント <SortIcon field="replies" />
                  </th>
                  <th className="px-4 py-3 text-right cursor-pointer hover:bg-muted whitespace-nowrap" onClick={() => handleSort('linkClicks')}>
                    リンククリック <SortIcon field="linkClicks" />
                  </th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPosts.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                      データがありません
                    </td>
                  </tr>
                ) : (
                  paginatedPosts.map((post) => {
                    let contentText = post.text || '';
                    const urlMatches = contentText.match(/\[\[(.*?)\]\]/);
                    const mediaUrl = urlMatches ? urlMatches[1] : post.url;
                    contentText = contentText.replace(/\[\[.*?\]\]/g, '').trim();

                    return (
                      <tr key={post.id} className={`border-b last:border-0 hover:bg-muted/30 ${selectedPostIds.includes(post.id) ? 'bg-primary/5' : ''}`}>
                        <td className="px-4 py-3 align-top w-10">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 mt-1"
                            checked={selectedPostIds.includes(post.id)}
                            onChange={(e) => handleSelectPost(post.id, e.target.checked)}
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap align-top">
                          {post.postTime.split(' ')[0]}<br/>
                          <span className="text-muted-foreground">{post.postTime.split(' ')[1]}</span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex gap-4 items-start">
                            <TweetThumbnail url={mediaUrl} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm pr-2 break-words leading-relaxed whitespace-pre-wrap">
                                {formatContentWithLinks(contentText)}
                              </div>
                              <PostTagsEditor post={post} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium align-top">
                          {(Number(post.impressions) || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-400 font-semibold align-top">
                          {(Number(post.organicImpressions) || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-green-400 font-semibold align-top">
                          {Number(post.paidImpressions) > 0 ? Number(post.paidImpressions).toLocaleString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-right align-top">
                          {(Number(post.likes) || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right align-top">
                          {(Number(post.reposts) || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right align-top">
                          {(Number(post.replies) || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right align-top">
                          {(Number(post.linkClicks) || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center align-top space-y-2">
                          <a href={`/posts/${post.id}`} className="block">
                            <button className="w-full bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded text-xs font-medium transition-colors">
                              分析
                            </button>
                          </a>
                          {post.url && (
                            <a href={post.url} target="_blank" rel="noopener noreferrer" className="block">
                              <button className="w-full border text-muted-foreground hover:bg-muted px-3 py-1.5 rounded text-xs transition-colors flex items-center justify-center">
                                <ExternalLink className="w-3 h-3 mr-1" />
                                開く
                              </button>
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end items-center mt-4 mb-8">
        <PaginationControls />
      </div>
    </div>
  )
}
