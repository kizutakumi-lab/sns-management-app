"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function EditAccountModal({ account }: { account: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(account.name || "");
  const [username, setUsername] = useState(account.username || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: account.id, name, username }),
      });
      if (res.ok) {
        setIsOpen(false);
        window.location.reload();
      } else {
        alert("保存に失敗しました");
      }
    } catch (e) {
      alert("エラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("このアカウントを削除してもよろしいですか？\n（誤って重複作成されたアカウントの削除を想定しています）")) return;
    
    setIsSaving(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: account.id }),
      });
      if (res.ok) {
        setIsOpen(false);
        window.location.reload();
      } else {
        alert("削除に失敗しました");
      }
    } catch (e) {
      alert("エラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)} className="h-8 px-2 text-xs">
        編集
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card text-card-foreground p-6 rounded-lg shadow-lg w-[400px] max-w-[90vw] border">
            <h3 className="text-lg font-bold mb-4">アカウント編集</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">アカウント名</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 rounded-md border border-input bg-background"
                  placeholder="ハチエモン【公式】"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ユーザー名</label>
                <div className="flex items-center">
                  <span className="px-3 border border-r-0 rounded-l-md bg-muted text-muted-foreground h-[42px] flex items-center">@</span>
                  <input 
                    type="text" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full p-2 rounded-r-md border border-input bg-background h-[42px]"
                    placeholder="hachiemon_x"
                  />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>内部ID: {account.id}</p>
                <p className="mt-1">※ アカウント名・ユーザー名を変更しても、過去の投稿との紐づけは失われません。</p>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>アカウント削除</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>キャンセル</Button>
                <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "保存中..." : "保存"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
