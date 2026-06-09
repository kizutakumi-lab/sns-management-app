import { getCachedPosts, getCachedSnapshots, getCachedTags } from "@/lib/cache";
import { Card, CardContent } from "@/components/ui/card";
import { Image as ImageIcon } from "lucide-react";
import { getTweet } from "react-tweet/api";
import PostTableClient from "@/components/posts/PostTableClient";
import { cookies } from "next/headers";

async function TweetThumbnail({ url }: { url: string }) {
  if (!url) return null;
  // X (Twitter) URL から ID を抽出
  const match = url.match(/status\/(\d+)/);
  if (!match) return null;
  
  const tweetId = match[1];
  try {
    const tweet = await getTweet(tweetId);
    if (tweet?.photos && tweet.photos.length > 0) {
      return (
        <div className="mt-2 shrink-0">
          <img 
            src={tweet.photos[0].url} 
            alt="Thumbnail" 
            className="h-16 w-16 object-cover rounded-md border shadow-sm"
          />
        </div>
      );
    }
    if (tweet?.video) {
      return (
        <div className="mt-2 shrink-0 bg-black h-16 w-16 rounded-md flex items-center justify-center border shadow-sm">
          <ImageIcon className="w-6 h-6 text-white" />
        </div>
      );
    }
  } catch (e) {
    // skip if tweet fetch fails
  }
  return null;
}

export default async function PostsPage() {
  const cookieStore = await cookies();
  const selectedAccountId = cookieStore.get('selectedAccountId')?.value || 'all';

  let posts = [];
  let snapshots = [];
  let tags = [];
  
  try {
    posts = await getCachedPosts();
    snapshots = await getCachedSnapshots();
    tags = await getCachedTags();
  } catch (error) {
    console.error("Failed to load posts from drive:", error);
  }

  // Filter posts by selected account
  if (selectedAccountId !== 'all') {
    posts = posts.filter((p: any) => p.authorId === selectedAccountId);
  }

  // Get the latest snapshot for each post to display metrics
  const latestSnapshots = snapshots.reduce((acc: any, curr: any) => {
    if (!acc[curr.postId] || curr.date >= acc[curr.postId].date) {
      acc[curr.postId] = curr;
    }
    return acc;
  }, {});

  const combinedPosts = posts.map((post: any) => {
    const snap = latestSnapshots[post.id] || {};
    
    // 内容から URL を抽出して削除し、本文のみにする
    let content = post.content || '';
    const urlMatches = content.match(/\[\[(.*?)\]\]/);
    const mediaUrl = urlMatches ? urlMatches[1] : post.url;
    content = content.replace(/\[\[.*?\]\]/g, '').trim();

    return {
      ...post,
      content,
      mediaUrl,
      metrics: {
        impressions: snap.impressions || 0,
        likes: snap.likes || 0,
        reposts: snap.reposts || 0,
        replies: snap.replies || 0,
        engagementRate: snap.engagementRate || '0%',
      }
    };
  }).sort((a: any, b: any) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

  // Resolve all Tweet Thumbnails server-side
  const tweetThumbnails: Record<string, React.ReactNode> = {};
  combinedPosts.forEach((post: any) => {
    if (post.mediaUrl) {
      tweetThumbnails[post.id] = <TweetThumbnail key={post.id} url={post.mediaUrl} />;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">投稿一覧</h2>
          <p className="text-muted-foreground mt-2">
            取り込んだすべての投稿とパフォーマンスのサマリーを表示します。
          </p>
        </div>
      </div>

      <PostTableClient initialPosts={combinedPosts} tweetThumbnails={tweetThumbnails} predefinedTags={tags} />
    </div>
  )
}
