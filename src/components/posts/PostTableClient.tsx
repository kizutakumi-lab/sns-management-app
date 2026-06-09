"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, ThumbsUp, MessageCircle, Repeat2, ArrowUpDown, ArrowDown, ArrowUp, Filter, Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PostTagsEditor from "@/components/posts/PostTagsEditor";

const PREDEFINED_TAGS = ["DLE", "カンテレ", "リポスト", "キャンペーン", "画像あり", "動画あり"];

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

export default function PostTableClient({ initialPosts, tweetThumbnails }: { initialPosts: any[], tweetThumbnails: Record<string, React.ReactNode> }) {
  const [posts, setPosts] = useState(initialPosts);
  const [sortField, setSortField] = useState<string>("postedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

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
            {PREDEFINED_TAGS.map(tag => (
              <Badge 
                key={tag} 
                variant={filterTags.includes(tag) ? "default" : "outline"}
                className={`cursor-pointer transition-colors ${filterTags.includes(tag) ? '' : 'hover:bg-muted'}`}
                onClick={() => toggleFilterTag(tag)}
              >
                {tag}
              </Badge>
            ))}
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
    </div>
  );
}
