export interface RawPostData {
  id: string; // 投稿ID
  postTime: string; // 投稿時間
  text: string; // 内容
  url: string; // 詳細URL
  impressions: number; // 表示回数 (※表示回数 などの文字列は数値化するか0にする)
  likes: number; // いいね数
  reposts: number; // リポスト(合計)
  replies: number; // リプライ数
  bookmarks: number; // ブックマーク数
  engagementRate: number; // エンゲージメント率
  linkClicks: number; // リンククリック数
  authorId?: string; // アカウントID (推測値)
}

export interface RawAdCampaign {
  id: string; // Campaign ID
  name: string; // Campaign name
  startDate: string; // Campaign start
  endDate: string; // Campaign end
  impressions: number; // Impressions
  spend: number; // Spend
  linkClicks: number; // Link clicks
  videoViews: number; // Video views
  // 今後追加される広告データ用
  likes: number; // いいね
  reposts: number; // リポスト
  replies: number; // リプライ
}

export interface DailySummary {
  date: string; // 日時
  postCount: number; // 投稿数
  followers: number; // フォロワー数
  following: number; // フォロー数
  lists: number; // リスト数
  authorId?: string; // アカウントID (推測値)
}

export interface AdCampaignMapping {
  campaignId: string;
  postIds: string[]; // 紐付けられた投稿のID配列
}

export interface AnalyzedPost extends RawPostData {
  organicImpressions: number;
  paidImpressions: number;
  organicLikes: number;
  paidLikes: number;
  organicReposts: number;
  paidReposts: number;
  organicReplies: number;
  paidReplies: number;
  organicLinkClicks: number;
  paidLinkClicks: number;
  campaigns: RawAdCampaign[]; // 紐付いているキャンペーン
  categories: string[]; // カテゴリタグ
}

export interface PostSnapshot {
  postId: string;
  date: string; // 記録日 (YYYY-MM-DD)
  impressions: number;
  likes: number;
  reposts: number;
  replies: number;
  bookmarks: number;
  engagementRate: number;
}
