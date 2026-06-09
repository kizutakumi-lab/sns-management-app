"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, ThumbsUp, MessageCircle, Repeat2, ArrowUpDown, ArrowDown, ArrowUp, Filter, Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PostTagsEditor from "@/components/posts/PostTagsEditor";

import { Loader2 } from "lucide-react";
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

export default function PostTableClient({ initialPosts, tweetThumbnails, predefinedTags = [] }: { initialPosts: any[], tweetThumbnails: Record<string, React.ReactNode>, predefinedTags?: string[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [sortField, setSortField] = useState<string>("postedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [availableTags, setAvailableTags] = useState<string[]>(predefinedTags);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingTag, setIsDeletingTag] = useState<string | null>(null);

  const handleAddTag = async () => {
    if (!newTagInput.trim() || availableTags.includes(newTagInput.trim())) return;
    setIsAddingTag(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: newTagInput.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setAvailableTags(data.tags);
        setNewTagInput("");
        setIsAddModalOpen(false);
      }
    } catch (error) {
      console.error("Failed to add tag", error);
    } finally {
      setIsAddingTag(false);
    }
  };

  const handleDeleteTag = async (tag: string) => {
    setIsDeletingTag(tag);
    try {
      const res = await fetch(`/api/tags?tag=${encodeURIComponent(tag)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setAvailableTags(data.tags);
        setFilterTags(filterTags.filter(t => t !== tag));
      }
    } catch (error) {
      console.error("Failed to delete tag", error);
    } finally {
      setIsDeletingTag(null);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const toggleFilterTag = (tag: string) => {
    if (filterTags.includes(tag)) {
      setFilterTags(filterTags.filter(t => t !== tag));
    } else {
      setFilterTags([...filterTags, tag]);
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    return sortOrder === "asc" ? <ArrowUp className="w-3 h-3 ml-1" /> : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const getSortValue = (post: any, field: string) => {
    if (field === "postedAt") return new Date(post.postedAt).getTime();
    if (field === "impressions") return post.metrics.impressions;
    if (field === "likes") return post.metrics.likes;
    if (field === "reposts") return post.metrics.reposts;
    return 0;
  };

  const filteredPosts = posts.filter(post => {
    // 全ての選択されたタグが投稿に含まれているか（AND検索）
    const matchesTag = filterTags.length === 0 || filterTags.every(tag => post.tags && post.tags.includes(tag));
    const matchesSearch = post.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTag && matchesSearch;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    const aVal = getSortValue(a, sortField);
    const bVal = getSortValue(b, sortField);
    return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-end">
          <div className="flex gap-2 items-center flex-wrap">
            <Filter className="w-4 h-4 text-muted-foreground mr-2" />
            <span className="text-sm text-muted-foreground mr-2">タグ絞り込み:</span>
            {availableTags.map(tag => (
              <Badge 
                key={tag} 
                variant={filterTags.includes(tag) ? "default" : "outline"}
                className={`cursor-pointer transition-colors ${filterTags.includes(tag) ? '' : 'hover:bg-muted'}`}
                onClick={() => toggleFilterTag(tag)}
              >
                {tag}
              </Badge>
            ))}
            <Button variant="outline" size="sm" className="h-6 px-2 text-xs ml-2" onClick={() => setIsAddModalOpen(true)}>
              ＋ タグ追加
            </Button>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-destructive hover:bg-destructive/10" onClick={() => setIsDeleteModalOpen(true)}>
              ー タグ削除
            </Button>
            {filterTags.length > 0 && (
              <button 
                onClick={() => setFilterTags([])}
                className="text-xs text-muted-foreground underline ml-2 hover:text-foreground"
              >
                クリア
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="投稿を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-64 rounded-md border border-input bg-background pl-8 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card text-card-foreground shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground bg-muted/50 border-b">
            <tr>
              <th className="px-6 py-4 font-medium w-48">タグ</th>
              <th className="px-6 py-4 font-medium cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort("postedAt")}>
                <div className="flex items-center">投稿日時 <SortIcon field="postedAt" /></div>
              </th>
              <th className="px-6 py-4 font-medium min-w-[300px]">内容</th>
              <th className="px-6 py-4 font-medium cursor-pointer hover:bg-muted/80 transition-colors text-right" onClick={() => handleSort("impressions")}>
                <div className="flex items-center justify-end">表示回数 <SortIcon field="impressions" /></div>
              </th>
              <th className="px-6 py-4 font-medium cursor-pointer hover:bg-muted/80 transition-colors text-right" onClick={() => handleSort("likes")}>
                <div className="flex items-center justify-end">いいね <SortIcon field="likes" /></div>
              </th>
              <th className="px-6 py-4 font-medium cursor-pointer hover:bg-muted/80 transition-colors text-right" onClick={() => handleSort("reposts")}>
                <div className="flex items-center justify-end">リポスト <SortIcon field="reposts" /></div>
              </th>
              <th className="px-6 py-4 font-medium text-right">ENG率</th>
              <th className="px-6 py-4 font-medium text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {sortedPosts.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                  該当する投稿がありません。
                </td>
              </tr>
            ) : (
              sortedPosts.map((post: any) => (
                <tr key={post.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-4 align-top w-48 border-r bg-muted/10">
                    <PostTagsEditor postId={post.id} initialTags={post.tags} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap align-top">
                    {new Date(post.postedAt).toLocaleString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="flex gap-4 items-start">
                      {tweetThumbnails[post.id]}
                      <div className="flex-1">
                        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed max-w-xl">
                          {formatContentWithLinks(post.content)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right align-top">
                    <div className="flex items-center justify-end gap-1">
                      <Eye className="w-3 h-3 text-muted-foreground" />
                      <span className="font-medium">{post.metrics.impressions.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right align-top">
                    <div className="flex items-center justify-end gap-1">
                      <ThumbsUp className="w-3 h-3 text-muted-foreground" />
                      <span className="font-medium">{post.metrics.likes.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right align-top">
                    <div className="flex items-center justify-end gap-1">
                      <Repeat2 className="w-3 h-3 text-muted-foreground" />
                      <span className="font-medium">{post.metrics.reposts.toLocaleString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-primary align-top">
                    {post.metrics.engagementRate}
                  </td>
                  <td className="px-6 py-4 text-center align-top space-y-2 w-28">
                    <Link href={`/posts/${post.id}`}>
                      <Button variant="ghost" size="sm" className="w-full">分析</Button>
                    </Link>
                    {post.url && (
                      <a href={post.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="w-full text-xs text-muted-foreground mt-2">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          開く
                        </Button>
                      </a>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

      </div>
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background p-6 rounded-lg shadow-lg w-[400px]">
            <h3 className="text-lg font-bold mb-4">新しいタグを追加</h3>
            <input 
              type="text" 
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              placeholder="タグ名を入力..."
              className="w-full border rounded-md px-3 py-2 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>キャンセル</Button>
              <Button onClick={handleAddTag} disabled={!newTagInput.trim() || isAddingTag}>
                {isAddingTag && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                追加
              </Button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background p-6 rounded-lg shadow-lg w-[400px]">
            <h3 className="text-lg font-bold mb-4">タグを削除</h3>
            <p className="text-sm text-muted-foreground mb-4">削除したいタグをクリックしてください。</p>
            <div className="flex flex-wrap gap-2 mb-6">
              {availableTags.length === 0 && <p className="text-sm">タグがありません</p>}
              {availableTags.map(tag => (
                <Badge 
                  key={tag} 
                  variant="outline"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  onClick={() => {
                    if (confirm(`タグ「${tag}」を削除してもよろしいですか？`)) {
                      handleDeleteTag(tag);
                    }
                  }}
                >
                  {tag} {isDeletingTag === tag && <Loader2 className="w-3 h-3 ml-1 animate-spin" />}
                </Badge>
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>閉じる</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
