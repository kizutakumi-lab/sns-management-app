"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RawPostData, RawAdCampaign, DailySummary, AdCampaignMapping, AnalyzedPost } from './types';

interface DataContextType {
  posts: RawPostData[];
  setPosts: (posts: RawPostData[]) => void;
  campaigns: RawAdCampaign[];
  setCampaigns: (campaigns: RawAdCampaign[]) => void;
  summaries: DailySummary[];
  setSummaries: (summaries: DailySummary[]) => void;
  mappings: AdCampaignMapping[];
  setMappings: (mappings: AdCampaignMapping[]) => void;
  analyzedPosts: AnalyzedPost[];
  runAutoMapping: () => void;
  postTags: Record<string, string[]>;
  updatePostTags: (postId: string, tags: string[]) => void;
  updateMultiplePostTags: (postIds: string[], newTag: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [posts, setPosts] = useState<RawPostData[]>([]);
  const [campaigns, setCampaigns] = useState<RawAdCampaign[]>([]);
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [mappings, setMappings] = useState<AdCampaignMapping[]>([]);
  const [analyzedPosts, setAnalyzedPosts] = useState<AnalyzedPost[]>([]);
  const [postTags, setPostTags] = useState<Record<string, string[]>>({});

  const updatePostTags = (postId: string, tags: string[]) => {
    setPostTags(prev => {
      const newTags = { ...prev, [postId]: tags };
      localStorage.setItem('sns_postTags', JSON.stringify(newTags));
      return newTags;
    });
  };

  const updateMultiplePostTags = (postIds: string[], newTag: string) => {
    setPostTags(prev => {
      const newTags = { ...prev };
      postIds.forEach(id => {
        const current = newTags[id] || [];
        if (!current.includes(newTag)) {
          newTags[id] = [...current, newTag];
        }
      });
      localStorage.setItem('sns_postTags', JSON.stringify(newTags));
      return newTags;
    });
  };

  const runAutoMapping = () => {
    let currentMappings = [...mappings];
    let isMappingUpdated = false;

    const normalizeDate = (dateStr: string) => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.split(' ')[0].replace(/-/g, '/');
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}/${mm}/${dd}`;
    };

    // 半角・全角、丸数字の正規化関数
    const normalizeString = (s: string) => {
      return (s || '')
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[【】（）＜＞\s_\-\[\]]/g, '')
        .replace(/①/g, '1').replace(/②/g, '2').replace(/③/g, '3').replace(/④/g, '4').replace(/⑤/g, '5')
        .replace(/⑥/g, '6').replace(/⑦/g, '7').replace(/⑧/g, '8').replace(/⑨/g, '9').replace(/⑩/g, '10');
    };

    // bi-gram (2-gram) を使った文字列類似度計算 (Overlap coefficient)
    const getSimilarity = (str1: string, str2: string) => {
      const n1 = normalizeString(str1);
      const n2 = normalizeString(str2);
      if (n1.length < 2 || n2.length < 2) return 0;
      
      const getBigrams = (str: string) => {
        const bigrams = new Set<string>();
        for (let i = 0; i < str.length - 1; i++) {
          bigrams.add(str.slice(i, i + 2));
        }
        return bigrams;
      };

      const bg1 = getBigrams(n1);
      const bg2 = getBigrams(n2);
      if (bg1.size === 0) return 0;
      
      let intersection = 0;
      bg1.forEach(bg => {
        if (bg2.has(bg)) intersection++;
      });
      // 長い投稿文にペナルティを与えないため、キャンペーン名側のbigram数で割る(Overlap係数)
      return intersection / bg1.size;
    };

    // 既存の紐付け状況（ポストごとの紐付け数と使用済みIMP）を集計
    const postMapCount: Record<string, number> = {};
    const postUsedImpressions: Record<string, number> = {};
    currentMappings.forEach(m => {
      const camp = campaigns.find(c => c.id === m.campaignId);
      if (camp) {
        m.postIds.forEach(pid => {
          postMapCount[pid] = (postMapCount[pid] || 0) + 1;
          postUsedImpressions[pid] = (postUsedImpressions[pid] || 0) + (camp.impressions || 0);
        });
      }
    });

    campaigns.forEach(camp => {
      const existing = currentMappings.find(m => m.campaignId === camp.id);
      if (!existing || existing.postIds.length === 0) {
        const campDatePrefix = normalizeDate(camp.startDate);
        const campDate = new Date(camp.startDate).getTime();
        
        const candidatePosts = posts
          .map(p => {
            const postDate = new Date(p.postTime.replace(/-/g, '/')).getTime();
            const diffDays = (!isNaN(postDate) && !isNaN(campDate)) 
              ? Math.abs(postDate - campDate) / (1000 * 60 * 60 * 24) 
              : 999;
              
            const isExactDate = p.postTime.startsWith(campDatePrefix);
            const score = getSimilarity(camp.name, p.text);
            
            return { post: p, diffDays, isExactDate, score };
          })
          .filter(p => {
            // 既に2つ以上のキャンペーンが紐づいていないこと
            if ((postMapCount[p.post.id] || 0) >= 2) return false;
            // 広告IMPを合算しても総IMPを超えないこと
            if (p.post.impressions < (postUsedImpressions[p.post.id] || 0) + (camp.impressions || 0)) return false;
            
            // 類似度が高い(0.15以上)場合は、前後7日以内ならOKとする
            if (p.score >= 0.15 && p.diffDays <= 7) return true;
            
            // 類似度が低くても、開始日が完全に一致している場合は「フォールバック」として候補に入れる
            if (p.isExactDate) return true;
            
            return false;
          })
          .sort((a, b) => {
            // ① 類似度マッチ（0.15以上）を優先
            const aIsSim = a.score >= 0.15;
            const bIsSim = b.score >= 0.15;
            if (aIsSim && !bIsSim) return -1;
            if (!aIsSim && bIsSim) return 1;
            
            // ② 類似度が高い順にソート
            if (Math.abs(b.score - a.score) > 0.05) return b.score - a.score;
            
            // ③ それでも同等ならIMPが大きい順
            return b.post.impressions - a.post.impressions;
          });
          
        if (candidatePosts.length > 0) {
          const selectedPostId = candidatePosts[0].post.id;
          if (existing) {
            existing.postIds = [selectedPostId];
          } else {
            currentMappings.push({ campaignId: camp.id, postIds: [selectedPostId] });
          }
          isMappingUpdated = true;
          
          // 集計を更新
          postMapCount[selectedPostId] = (postMapCount[selectedPostId] || 0) + 1;
          postUsedImpressions[selectedPostId] = (postUsedImpressions[selectedPostId] || 0) + (camp.impressions || 0);
        }
      }
    });

    if (isMappingUpdated) {
      setMappings(currentMappings);
    }
  };

  // LocalStorageから初期データを読み込む
  useEffect(() => {
    try {
      const savedPosts = localStorage.getItem('sns_posts');
      if (savedPosts) setPosts(JSON.parse(savedPosts));
      
      const savedCampaigns = localStorage.getItem('sns_campaigns');
      if (savedCampaigns) setCampaigns(JSON.parse(savedCampaigns));
      
      const savedSummaries = localStorage.getItem('sns_summaries');
      if (savedSummaries) setSummaries(JSON.parse(savedSummaries));
      
      const savedMappings = localStorage.getItem('sns_mappings');
      if (savedMappings) setMappings(JSON.parse(savedMappings));

      const savedPostTags = localStorage.getItem('sns_postTags');
      if (savedPostTags) setPostTags(JSON.parse(savedPostTags));
    } catch (e) {
      console.error('Failed to load data from localStorage', e);
    }
  }, []);

  // データが更新されたらLocalStorageに保存＆analyzedPostsを再計算
  useEffect(() => {
    localStorage.setItem('sns_posts', JSON.stringify(posts));
    localStorage.setItem('sns_campaigns', JSON.stringify(campaigns));
    localStorage.setItem('sns_summaries', JSON.stringify(summaries));
    localStorage.setItem('sns_mappings', JSON.stringify(mappings));

    // 分析済み投稿データを構築
    const analyzed = posts.map(post => {
      const linkedCampaignIds = mappings
        .filter(m => m.postIds.includes(post.id))
        .map(m => m.campaignId);
        
      const linkedCampaigns = campaigns.filter(c => linkedCampaignIds.includes(c.id));
      
      const paidImpressions = linkedCampaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
      const paidLikes = linkedCampaigns.reduce((sum, c) => sum + (c.likes || 0), 0);
      const paidReposts = linkedCampaigns.reduce((sum, c) => sum + (c.reposts || 0), 0);
      const paidReplies = linkedCampaigns.reduce((sum, c) => sum + (c.replies || 0), 0);
      const paidLinkClicks = linkedCampaigns.reduce((sum, c) => sum + (c.linkClicks || 0), 0);
      
      const organicImpressions = Math.max(0, post.impressions - paidImpressions);
      const organicLikes = Math.max(0, post.likes - paidLikes);
      const organicReposts = Math.max(0, post.reposts - paidReposts);
      const organicReplies = Math.max(0, post.replies - paidReplies);
      const organicLinkClicks = Math.max(0, (post.linkClicks || 0) - paidLinkClicks);

      // 手動で設定されたタグ（postTags）を優先。なければ空の配列
      const categories: string[] = postTags[post.id] || [];

      // 初回のみ自動付与したければここにロジックを入れるが、
      // ユーザーが手動で管理したいとのことなので自動ロジックは外す、
      // または手動で保存されていない場合のみ自動推測する
      if (!postTags[post.id]) {
        if (post.text.includes('プレゼント') || post.text.includes('キャンペーン') || post.text.includes('プレキャン')) categories.push('プレキャン');
        if (post.text.includes('【ごちエモン】')) categories.push('グルメ');
        if (post.url && (post.url.includes('/video/') || post.url.includes('youtu'))) categories.push('動画');
        if (post.text.includes('VTuber') || post.text.includes('Vtuber')) categories.push('Vtuber');
        if (post.text.includes('イラスト')) categories.push('イラスト');
        if (post.text.includes('AI')) categories.push('AI');
        if (post.text.includes('DLE')) categories.push('DLE');
        if (post.text.includes('カンテレ')) categories.push('カンテレ');
        if (post.text.includes('日本産業')) categories.push('日本産業');
      }

      return {
        ...post,
        organicImpressions,
        paidImpressions,
        organicLikes,
        paidLikes,
        organicReposts,
        paidReposts,
        organicReplies,
        paidReplies,
        organicLinkClicks,
        paidLinkClicks,
        campaigns: linkedCampaigns,
        categories: Array.from(new Set(categories)) // 重複排除
      };
    });
    
    setAnalyzedPosts(analyzed);
  }, [posts, campaigns, summaries, mappings, postTags]);

  return (
    <DataContext.Provider value={{ 
      posts, setPosts, 
      campaigns, setCampaigns, 
      summaries, setSummaries, 
      mappings, setMappings, 
      analyzedPosts, 
      runAutoMapping,
      postTags,
      updatePostTags,
      updateMultiplePostTags
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
