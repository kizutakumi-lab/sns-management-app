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
          // ファイル名から username を抽出 (例: si__accounts-posts_hachiemon_x.csv -> hachiemon_x)
          const match = file.name.match(/si__accounts-(?:posts|summary)_(.*?)(?:_\d+)?\.csv/);
          const authorId = match ? match[1] : undefined;

          const posts = results.data.map((row: any) => ({
            id: row['投稿ID'],
            postTime: row['投稿時間'],
            text: row['内容'],
            url: row['詳細URL'],
            impressions: parseNumber(row['表示回数']),
            likes: parseNumber(row['いいね数']),
            reposts: parseNumber(row['リポスト(合計)']),
            replies: parseNumber(row['リプライ数']),
            bookmarks: parseNumber(row['ブックマーク数']),
            engagementRate: parseNumber(row['エンゲージメント率']),
            linkClicks: parseNumber(row['詳細URLクリック数'] || row['リンククリック数'] || 0),
            authorId: authorId,
          })).filter((post: RawPostData) => post.id && post.postTime); // IDと時間があるものだけ残す
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
