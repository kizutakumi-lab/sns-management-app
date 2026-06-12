import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { RawPostData, RawAdCampaign, DailySummary } from './types';

// 文字列からカンマを取り除いて数値に変換する
const parseNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val || val === '-' || val === '※表示回数') return 0;
  if (typeof val === 'string') {
    // ％表記の場合は小数に変換
    if (val.includes('%')) {
      return parseFloat(val.replace(/[%]/g, '')) / 100;
    }
    return parseFloat(val.replace(/[,]/g, '')) || 0;
  }
  return 0;
};

export const parsePostsCSV = async (file: File): Promise<RawPostData[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          // ファイル名からの fallback 抽出
          const match = file.name.match(/si__accounts-(?:posts|summary)_(.*?)(?:_\d+)?\.csv/);
          const fallbackAuthorId = match ? match[1] : undefined;

          const posts = results.data.map((row: any) => {
            const url = row['詳細URL'] || row['ポストのURL'] || row['URL'] || '';
            let authorId = fallbackAuthorId;
            
            // URLから X (Twitter) のユーザー名を抽出 (例: https://x.com/username/status/...)
            if (url) {
              const urlMatch = url.match(/x\.com\/([^\/]+)\/status/i) || url.match(/twitter\.com\/([^\/]+)\/status/i);
              if (urlMatch && urlMatch[1]) {
                authorId = urlMatch[1];
              }
            }

            return {
              id: row['投稿ID'] || row['ポストID'] || row['Tweet id'],
              postTime: row['投稿時間'] || row['日付'] || row['time'],
              text: row['内容'] || row['ポスト本文'] || row['Tweet text'],
              url: url,
              impressions: parseNumber(row['表示回数'] || row['インプレッション'] || row['impressions']),
              likes: parseNumber(row['いいね数'] || row['いいね'] || row['likes']),
              reposts: parseNumber(row['リポスト(合計)'] || row['リポスト'] || row['retweets']),
              replies: parseNumber(row['リプライ数'] || row['返信'] || row['replies']),
              bookmarks: parseNumber(row['ブックマーク数'] || row['ブックマーク'] || row['user profile clicks']),
              engagementRate: parseNumber(row['エンゲージメント率'] || row['エンゲージメント'] || row['engagement rate']),
              linkClicks: parseNumber(row['詳細URLクリック数'] || row['リンククリック数'] || row['url clicks'] || 0),
              authorId: authorId,
            };
          }).filter((post: RawPostData) => post.id && post.postTime); // IDと時間があるものだけ残す
          resolve(posts);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

export const parseSummaryCSV = async (file: File): Promise<DailySummary[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const match = file.name.match(/si__accounts-(?:posts|summary)_(.*?)(?:_\d+)?\.csv/);
          const authorId = match ? match[1] : undefined;

          const summaries = results.data.map((row: any) => ({
            date: row['日時'],
            postCount: parseNumber(row['投稿数']),
            followers: parseNumber(row['フォロワー数']),
            following: parseNumber(row['フォロー数']),
            lists: parseNumber(row['リスト数']),
            authorId: authorId,
          })).filter((sum: DailySummary) => sum.date);
          resolve(summaries);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

export const parseAdExcel = async (file: File): Promise<RawAdCampaign[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { raw: false });

      const campaigns = json.map((row: any) => ({
        id: String(row['Campaign ID'] || row['キャンペーンID'] || Math.random().toString(36).substr(2, 9)),
        name: row['Campaign name'] || row['キャンペーン名'] || 'Unknown Campaign',
        startDate: row['Campaign start'] || row['開始日'],
        endDate: row['Campaign end'] || row['終了日'],
        impressions: parseNumber(row['Impressions'] || row['インプレッション']),
        spend: parseNumber(row['Spend'] || row['消化金額']),
        linkClicks: parseNumber(row['Link clicks'] || row['リンククリック']),
        videoViews: parseNumber(row['Video views'] || row['動画再生']),
        likes: parseNumber(row['Likes'] || row['いいね'] || row['いいね数']),
        reposts: parseNumber(row['Reposts'] || row['リポスト'] || row['リポスト数']),
        replies: parseNumber(row['Replies'] || row['リプライ'] || row['リプライ数']),
      })).filter((camp: RawAdCampaign) => camp.name !== 'Unknown Campaign');
      
      resolve(campaigns);
    } catch (error) {
      reject(error);
    }
  });
};
