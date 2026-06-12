"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { RawPostData, RawAdCampaign, DailySummary, AdCampaignMapping, AnalyzedPost, PostSnapshot } from './types';

interface DataContextType {
  posts: RawPostData[];
  setPosts: React.Dispatch<React.SetStateAction<RawPostData[]>>;
  campaigns: RawAdCampaign[];
  setCampaigns: React.Dispatch<React.SetStateAction<RawAdCampaign[]>>;
  summaries: DailySummary[];
  setSummaries: React.Dispatch<React.SetStateAction<DailySummary[]>>;
  mappings: AdCampaignMapping[];
  setMappings: React.Dispatch<React.SetStateAction<AdCampaignMapping[]>>;
  analyzedPosts: AnalyzedPost[];
  runAutoMapping: () => void;
  postTags: Record<string, string[]>;
  updatePostTags: (postId: string, tags: string[]) => void;
  updateMultiplePostTags: (postIds: string[], newTag: string) => void;
  snapshots: PostSnapshot[];
  setSnapshots: React.Dispatch<React.SetStateAction<PostSnapshot[]>>;
  selectedAccountId: string;
  setSelectedAccountId: React.Dispatch<React.SetStateAction<string>>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [posts, setPosts] = useState<RawPostData[]>([]);
  const [campaigns, setCampaigns] = useState<RawAdCampaign[]>([]);
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [mappings, setMappings] = useState<AdCampaignMapping[]>([]);
  const [postTags, setPostTags] = useState<Record<string, string[]>>({});
  const [snapshots, setSnapshots] = useState<PostSnapshot[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");

  const updatePostTags = (postId: string, tags: string[]) => {
    setPostTags(prev => {
      const newTags = { ...prev, [postId]: tags };
      localStorage.setItem('sns_postTags', JSON.stringify(newTags));
      syncToDrive('postTags', newTags);
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
      syncToDrive('postTags', newTags);
      return newTags;
    });
  };

  const syncToDrive = async (key: string, value: any) => {
    try {
      await fetch('/api/drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
    } catch (e) {
      console.error(`Failed to sync ${key} to drive`, e);
    }
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

  // データの読み込み（LocalStorageとAPIからのハイブリッド＆マイグレーション）
  useEffect(() => {
    const loadData = async () => {
      // 1. まずローカルのデータを読み込んでおく
      let localPosts = null, localCampaigns = null, localSummaries = null, localMappings = null, localPostTags = null;
      try {
        const savedPosts = localStorage.getItem('sns_posts');
        if (savedPosts) { localPosts = JSON.parse(savedPosts); setPosts(localPosts); }
        
        const savedCampaigns = localStorage.getItem('sns_campaigns');
        if (savedCampaigns) { localCampaigns = JSON.parse(savedCampaigns); setCampaigns(localCampaigns); }
        
        const savedSummaries = localStorage.getItem('sns_summaries');
        if (savedSummaries) { localSummaries = JSON.parse(savedSummaries); setSummaries(localSummaries); }
        
        const savedMappings = localStorage.getItem('sns_mappings');
        if (savedMappings) { localMappings = JSON.parse(savedMappings); setMappings(localMappings); }

        const savedPostTags = localStorage.getItem('sns_postTags');
        if (savedPostTags) { localPostTags = JSON.parse(savedPostTags); setPostTags(localPostTags); }
      } catch (e) {
        console.error('Failed to load data from localStorage', e);
      }

      // 2. Google Driveから最新データを取得
      try {
        const fetchDriveData = async (key: string) => {
          const res = await fetch(`/api/drive?key=${key}`);
          if (res.ok) {
            const data = await res.json();
            return (Array.isArray(data) && data.length > 0) || (typeof data === 'object' && Object.keys(data).length > 0) ? data : null;
          }
          return null;
        };

        const mergeData = (driveData: any, localData: any) => {
          if (!driveData) return localData || null;
          if (!localData) return driveData;
          
          if (Array.isArray(driveData) && Array.isArray(localData)) {
            const mergedMap = new Map();
            driveData.forEach(item => { 
              const key = item.id || item.campaignId || (item.authorId ? `${item.authorId}-${item.date}` : item.date);
              if (key) mergedMap.set(key, item); 
            });
            localData.forEach(item => { 
              const key = item.id || item.campaignId || (item.authorId ? `${item.authorId}-${item.date}` : item.date);
              if (key) mergedMap.set(key, item); 
            });
            return Array.from(mergedMap.values());
          }
          
          if (typeof driveData === 'object' && typeof localData === 'object') {
            return { ...driveData, ...localData };
          }
          return localData;
        };

        const drivePosts = await fetchDriveData('posts');
        const mergedPosts = mergeData(drivePosts, localPosts);
        if (mergedPosts) {
          setPosts(mergedPosts);
          if (localPosts) await syncToDrive('posts', mergedPosts);
        }

        const driveCampaigns = await fetchDriveData('campaigns');
        const mergedCampaigns = mergeData(driveCampaigns, localCampaigns);
        if (mergedCampaigns) {
          setCampaigns(mergedCampaigns);
          if (localCampaigns) await syncToDrive('campaigns', mergedCampaigns);
        }
        
        const driveSummaries = await fetchDriveData('summaries');
        const mergedSummaries = mergeData(driveSummaries, localSummaries);
        if (mergedSummaries) {
          setSummaries(mergedSummaries);
          if (localSummaries) await syncToDrive('summaries', mergedSummaries);
        }

        const driveMappings = await fetchDriveData('mappings');
        const mergedMappings = mergeData(driveMappings, localMappings);
        if (mergedMappings) {
          setMappings(mergedMappings);
          if (localMappings) await syncToDrive('mappings', mergedMappings);
        }

        const drivePostTags = await fetchDriveData('postTags');
        const mergedPostTags = mergeData(drivePostTags, localPostTags);
        if (mergedPostTags) {
          setPostTags(mergedPostTags);
          if (localPostTags) await syncToDrive('postTags', mergedPostTags);
        }

        const driveSnapshots = await fetchDriveData('post_snapshots');
        const localSnapshots = localStorage.getItem('sns_snapshots');
        const parsedLocalSnapshots = localSnapshots ? JSON.parse(localSnapshots) : null;
        
        // selectedAccountId を Cookie から初期化
        const match = document.cookie.match(/(?:^|;)\s*selectedAccountId=([^;]*)/);
        if (match) setSelectedAccountId(match[1]);
        
        // snapshots のマージキーは postId と date の複合
        const mergeSnapshots = (driveD: any, localD: any) => {
          if (!driveD) return localD || [];
          if (!localD) return driveD || [];
          const map = new Map();
          driveD.forEach((item: any) => map.set(`${item.postId}-${item.date}`, item));
          localD.forEach((item: any) => map.set(`${item.postId}-${item.date}`, item));
          return Array.from(map.values());
        };
        const mergedSnapshots = mergeSnapshots(driveSnapshots, parsedLocalSnapshots);
        if (mergedSnapshots && mergedSnapshots.length > 0) {
          setSnapshots(mergedSnapshots);
          if (parsedLocalSnapshots) await syncToDrive('post_snapshots', mergedSnapshots);
        }

      } catch (e) {
        console.error('Failed to fetch data from drive API', e);
      }
    };
    loadData();
  }, []);

  // データが更新されたらLocalStorageとスプレッドシートに保存＆analyzedPostsを再計算
  // 依存配列による無限ループを防ぐため、初期ロード完了フラグなどを設けるのが理想だが、
  // 簡易的にローカルストレージへ保存し、APIへは非同期で送る。
  const firstRender = React.useRef(true);
  const prevDataRef = React.useRef({ posts, campaigns, summaries, mappings, snapshots });
  const syncTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    
    const saveToLocal = (localKey: string, data: any) => {
      localStorage.setItem(localKey, JSON.stringify(data));
    };

    // ローカルストレージへの保存は即時行う（軽い）
    saveToLocal('sns_posts', posts);
    saveToLocal('sns_campaigns', campaigns);
    saveToLocal('sns_summaries', summaries);
    saveToLocal('sns_mappings', mappings);

    // Google Drive への同期はデバウンスし、変更があったものだけ送る
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    
    syncTimeoutRef.current = setTimeout(() => {
      const prev = prevDataRef.current;
      
      if (prev.posts !== posts) {
        syncToDrive('posts', posts);
      }
      if (prev.campaigns !== campaigns) {
        syncToDrive('campaigns', campaigns);
      }
      if (prev.summaries !== summaries) {
        syncToDrive('summaries', summaries);
      }
      if (prev.mappings !== mappings) {
        syncToDrive('mappings', mappings);
      }
      if (prev.snapshots !== snapshots) {
        syncToDrive('post_snapshots', snapshots);
      }
      
      // 今回のデータを次回比較用に保存
      prevDataRef.current = { posts, campaigns, summaries, mappings, snapshots };
    }, 2000);
  }, [posts, campaigns, summaries, mappings, snapshots]);

  // 分析済み投稿データの構築（useMemoで同期的に計算し、不要な再描画を防ぐ）
  const analyzedPosts = React.useMemo(() => {
    // 高速化のためのルックアップマップ作成
    const mappingByPostId = new Map<string, string[]>();
    (mappings || []).forEach(m => {
      if (m && Array.isArray(m.postIds)) {
        m.postIds.forEach(pid => {
          if (!mappingByPostId.has(pid)) mappingByPostId.set(pid, []);
          mappingByPostId.get(pid)!.push(m.campaignId);
        });
      }
    });

    const campaignById = new Map<string, any>();
    (campaigns || []).forEach(c => {
      if (c && c.id) campaignById.set(c.id, c);
    });

    return (posts || [])
      .filter(post => post && (post.id || post.postTime))
      .map(post => {
      const linkedCampaignIds = mappingByPostId.get(post.id) || [];
      const linkedCampaigns = linkedCampaignIds.map(cid => campaignById.get(cid)).filter(Boolean);
      
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
      const categories: string[] = [...((postTags || {})[post.id] || [])];

      // アカウント判別による必須タグの自動付与
      if (post.authorId) {
        if (post.authorId.includes('ハチエモン') || post.authorId === 'hachiemon_x' || post.authorId === '1940676270360350722') {
          categories.push('ハチエモン');
        }
        if (post.authorId.includes('ジョーくん') || post.authorId === 'joekun_ichijo' || post.authorId === '1457962651448143873') {
          categories.push('ジョーくん');
        }
      }

      if (!(postTags || {})[post.id]) {
        // authorIdから判定できなかった場合のフォールバック
        if (!categories.includes('ハチエモン') && (post.text?.includes('ハチエモン') || post.text?.includes('ハチえもん'))) {
          categories.push('ハチエモン');
        }
        if (!categories.includes('ジョーくん') && (post.text?.includes('ジョーくん') || post.text?.includes('ジョー君'))) {
          categories.push('ジョーくん');
        }

        if (post.text?.includes('プレゼント') || post.text?.includes('キャンペーン') || post.text?.includes('プレキャン')) categories.push('プレキャン');
        if (post.text?.includes('【ごちエモン】')) categories.push('グルメ');
        if (post.url?.includes('/video/') || post.url?.includes('youtu')) categories.push('動画');
        if (post.text?.includes('VTuber') || post.text?.includes('Vtuber')) categories.push('Vtuber');
        if (post.text?.includes('イラスト')) categories.push('イラスト');
        if (post.text?.includes('AI')) categories.push('AI');
        if (post.text?.includes('DLE')) categories.push('DLE');
        if (post.text?.includes('カンテレ')) categories.push('カンテレ');
        if (post.text?.includes('日本産業')) categories.push('日本産業');
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
  }, [posts, campaigns, mappings, postTags]);

  // プロバイダーの値をメモ化して、不要な再レンダリングを防ぐ
  const providerValue = React.useMemo(() => ({
    posts, setPosts, 
    campaigns, setCampaigns, 
    summaries, setSummaries, 
    mappings, setMappings, 
    analyzedPosts, 
    runAutoMapping,
    postTags,
    updatePostTags,
    updateMultiplePostTags,
    snapshots,
    setSnapshots,
    selectedAccountId,
    setSelectedAccountId
  }), [
    posts, campaigns, summaries, mappings, analyzedPosts, 
    postTags, snapshots, selectedAccountId
  ]);

  return (
    <DataContext.Provider value={providerValue}>
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
