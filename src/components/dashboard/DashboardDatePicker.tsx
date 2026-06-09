"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react";

export default function DashboardDatePicker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const initialFrom = searchParams.get("from") || "";
  const initialTo = searchParams.get("to") || "";

  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (from) params.set("from", from);
    else params.delete("from");
    
    if (to) params.set("to", to);
    else params.delete("to");
    
    router.push(`/?${params.toString()}`);
  };

  const handleClear = () => {
    setFrom("");
    setTo("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from");
    params.delete("to");
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3 bg-card p-3 border rounded-lg shadow-sm w-max">
      <CalendarIcon className="w-4 h-4 text-muted-foreground ml-1" />
      <span className="text-sm font-medium text-muted-foreground mr-1">集計対象期間:</span>
      <input 
        type="date" 
        value={from} 
        onChange={(e) => setFrom(e.target.value)}
        className="text-sm border rounded px-2 py-1 bg-background"
      />
      <span className="text-muted-foreground">〜</span>
      <input 
        type="date" 
        value={to} 
        onChange={(e) => setTo(e.target.value)}
        className="text-sm border rounded px-2 py-1 bg-background"
      />
      <div className="flex items-center gap-2 ml-2">
        <Button size="sm" onClick={handleApply}>適用</Button>
        {(from || to) && (
          <Button size="sm" variant="ghost" onClick={handleClear} className="text-muted-foreground">クリア</Button>
        )}
      </div>
    </div>
  );
}
