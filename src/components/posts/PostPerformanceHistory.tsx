"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Snapshot {
  date: string;
  impressions: number;
  likes: number;
  reposts: number;
  replies: number;
  bookmarks: number;
  engagementRate: string;
}

interface PostPerformanceHistoryProps {
  snapshots: Snapshot[];
}

export default function PostPerformanceHistory({ snapshots }: PostPerformanceHistoryProps) {
  // データを日付順にソートし、差分を計算
  const dataWithDiffs = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return [];

    const sorted = [...snapshots].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return sorted.map((snap, index) => {
      const prev = index > 0 ? sorted[index - 1] : null;
      
      const calcDiff = (current: number, previous?: number) => {
        if (previous === undefined || previous === null) return null;
        return current - previous;
      };

      return {
        ...snap,
        diffs: {
          impressions: calcDiff(snap.impressions, prev?.impressions),
          likes: calcDiff(snap.likes, prev?.likes),
          reposts: calcDiff(snap.reposts, prev?.reposts),
          replies: calcDiff(snap.replies, prev?.replies),
          bookmarks: calcDiff(snap.bookmarks, prev?.bookmarks),
        }
      };
    });
  }, [snapshots]);

  if (dataWithDiffs.length === 0) {
    return <div className="text-sm text-muted-foreground py-8 text-center border-t border-dashed mt-4">推移データがありません</div>;
  }

  const renderDiff = (diff: number | null) => {
    if (diff === null) return <span className="text-muted-foreground text-xs"><Minus className="w-3 h-3 inline" /></span>;
    if (diff === 0) return <span className="text-muted-foreground text-xs text-center w-full block">0</span>;
    if (diff > 0) return <span className="text-green-600 text-xs font-semibold flex items-center gap-0.5 justify-center"><ArrowUpRight className="w-3 h-3" /> {diff.toLocaleString()}</span>;
    return <span className="text-red-600 text-xs text-center w-full block">{diff.toLocaleString()}</span>;
  };

  return (
    <div className="space-y-8 mt-4 pt-4 border-t">
      {/* グラフ部分 */}
      <div className="h-[350px] w-full">
        <h3 className="text-sm font-semibold mb-4 text-muted-foreground">表示回数・いいねの推移</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dataWithDiffs} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
            <XAxis dataKey="date" tick={{fontSize: 12}} />
            <YAxis yAxisId="left" tick={{fontSize: 12}} />
            <YAxis yAxisId="right" orientation="right" tick={{fontSize: 12}} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="impressions" 
              name="表示回数" 
              stroke="#8884d8" 
              activeDot={{ r: 8 }} 
              strokeWidth={2}
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="likes" 
              name="いいね" 
              stroke="#82ca9d" 
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 差分テーブル部分 */}
      <div>
        <h3 className="text-sm font-semibold mb-4 text-muted-foreground">インポートごとの成長幅（差分）</h3>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[120px]">日付</TableHead>
                <TableHead className="text-center">表示回数</TableHead>
                <TableHead className="text-center">いいね</TableHead>
                <TableHead className="text-center">リポスト</TableHead>
                <TableHead className="text-center">リプライ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataWithDiffs.map((row, i) => (
                <TableRow key={`${row.date}-${i}`}>
                  <TableCell className="font-medium">{row.date}</TableCell>
                  <TableCell>
                    <div className="flex flex-col items-center">
                      <span>{row.impressions?.toLocaleString() || 0}</span>
                      {renderDiff(row.diffs.impressions)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-center">
                      <span>{row.likes?.toLocaleString() || 0}</span>
                      {renderDiff(row.diffs.likes)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-center">
                      <span>{row.reposts?.toLocaleString() || 0}</span>
                      {renderDiff(row.diffs.reposts)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-center">
                      <span>{row.replies?.toLocaleString() || 0}</span>
                      {renderDiff(row.diffs.replies)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
