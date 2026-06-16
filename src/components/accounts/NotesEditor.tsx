"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Send, UserPlus, AlertCircle, RefreshCw, Edit2, X } from "lucide-react";

export interface NoteBlock {
  id: string;
  timestamp: string;
  content: string;
}

interface NotesEditorProps {
  accountId: string;
  accountName: string;
  initialNotes: NoteBlock[];
}

export function NotesEditor({ accountId, accountName, initialNotes }: NotesEditorProps) {
  const [notes, setNotes] = useState<NoteBlock[]>(initialNotes);
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  
  // 参加者スタンプ関連
  const [participants, setParticipants] = useState<string[]>([]);
  const [newParticipant, setNewParticipant] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // マウント時にAPIから参加者を読み込む
  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const res = await fetch("/api/notes/participants");
        if (res.ok) {
          const data = await res.json();
          if (data.participants) setParticipants(data.participants);
        }
      } catch (e) {
        console.error("Failed to fetch participants", e);
      }
    };
    fetchParticipants();
  }, []);

  const saveParticipants = async (newParticipants: string[]) => {
    setParticipants(newParticipants);
    try {
      await fetch("/api/notes/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants: newParticipants }),
      });
    } catch (e) {
      console.error("Failed to save participants", e);
    }
  };

  // ポーリングで最新のノートを取得
  const fetchLatestNotes = async () => {
    try {
      const res = await fetch(`/api/notes?accountId=${accountId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.notes) {
          setNotes(data.notes);
        }
      }
    } catch (e) {
      console.error("Failed to fetch latest notes", e);
    }
  };

  useEffect(() => {
    // 10秒ごとに最新データを取得
    const interval = setInterval(fetchLatestNotes, 10000);
    return () => clearInterval(interval);
  }, [accountId]);

  const addParticipant = () => {
    const name = newParticipant.trim();
    if (name && !participants.includes(name)) {
      saveParticipants([...participants, name]);
      setNewParticipant("");
    }
  };

  const removeParticipant = (name: string) => {
    saveParticipants(participants.filter((p) => p !== name));
  };

  const insertStamp = (name: string) => {
    const stamp = `【${name}】 `;
    // 現在のカーソル位置に挿入する、または末尾に追加する
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newContent = content.substring(0, start) + stamp + content.substring(end);
      setContent(newContent);
      // カーソル位置を更新（Reactのステート更新後に行うため少し遅延させる）
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(start + stamp.length, start + stamp.length);
        }
      }, 0);
    } else {
      setContent((prev) => prev + stamp);
    }
  };

  const handleSend = async () => {
    if (!content.trim()) return;

    setIsSaving(true);
    const newBlock: NoteBlock = {
      id: editingNoteId || crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      content: content.trim(),
    };

    // UIを即時更新（楽観的UI更新：古いものを消して先頭に）
    setNotes((prev) => [newBlock, ...prev.filter(n => n.id !== newBlock.id)]);
    setContent("");
    setEditingNoteId(null);

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, block: newBlock }),
      });
      if (!res.ok) {
        throw new Error("Failed to save");
      }
      // 再取得して同期を確実にする
      fetchLatestNotes();
    } catch (e: any) {
      console.error(e);
      // エラー時はフェッチして元に戻す
      fetchLatestNotes();
      alert("送信に失敗しました。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter で送信
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      handleSend();
    }
  };

  const handleEdit = (note: NoteBlock) => {
    setContent(note.content);
    setEditingNoteId(note.id);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const cancelEdit = () => {
    setContent("");
    setEditingNoteId(null);
  };

  return (
    <Card className="h-full flex flex-col border-none shadow-none bg-transparent overflow-hidden">
      <CardHeader className="px-0 pt-0 pb-4 shrink-0">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{accountName} - MTGメモ＆TODO</CardTitle>
              <CardDescription className="mt-1">
                複数人で同時に記録できます。スタンプを押して「誰の発言・タスクか」を明記し、送信してください。
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchLatestNotes} className="text-muted-foreground gap-1">
              <RefreshCw className="w-4 h-4" />
              更新
            </Button>
          </div>

          {/* 参加者管理 */}
          <div className="bg-muted/30 p-3 rounded-lg border flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">参加者:</span>
              <div className="flex flex-wrap gap-2 flex-1">
                {participants.map((p) => (
                  <div key={p} className="flex items-center group relative">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => insertStamp(p)}
                      className="rounded-r-none border-r-0 h-8"
                    >
                      {p}
                    </Button>
                    <button 
                      onClick={() => removeParticipant(p)}
                      className="h-8 px-2 bg-secondary text-secondary-foreground rounded-r-md border border-l-0 border-secondary hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      title="削除"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {participants.length === 0 && (
                  <span className="text-sm text-muted-foreground flex items-center h-8">
                    名前を追加してスタンプを作成できます
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 w-full max-w-sm">
              <input 
                type="text" 
                value={newParticipant}
                onChange={(e) => setNewParticipant(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addParticipant()}
                placeholder="例: 山田太郎" 
                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <Button size="sm" variant="outline" onClick={addParticipant} className="h-8 gap-1">
                <UserPlus className="w-3 h-3" />
                追加
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* 投稿フォーム */}
      <div className="px-0 pb-4 shrink-0">
        {editingNoteId && (
          <div className="flex items-center justify-between bg-primary/10 text-primary text-xs px-3 py-1.5 rounded-t-md border border-b-0 border-primary/20">
            <span className="font-medium">既存のメモを編集中 (送信すると最新の日付で一番上に移動します)</span>
            <button onClick={cancelEdit} className="hover:bg-primary/20 p-1 rounded-full"><X className="w-3 h-3" /></button>
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ここに入力してください... (Ctrl+Enterで送信)"
            className={`flex-1 min-h-[80px] resize-y ${editingNoteId ? 'rounded-tl-none border-t-0 border-primary/20 bg-primary/5 focus-visible:ring-primary/50' : ''}`}
          />
          <Button 
            onClick={handleSend} 
            disabled={isSaving || !content.trim()} 
            className="h-auto px-6 shrink-0"
          >
            {isSaving ? "送信中..." : <><Send className="w-4 h-4 mr-2" /> {editingNoteId ? "更新" : "送信"}</>}
          </Button>
        </div>
      </div>

      {/* タイムライン */}
      <CardContent className="px-0 py-0 flex-1 overflow-y-auto min-h-0 bg-muted/10 rounded-lg border">
        <div className="flex flex-col">
          {notes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              まだメモがありません。最初のメモを投稿しましょう。
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="p-4 border-b last:border-0 hover:bg-muted/20 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-medium bg-background px-2 py-1 rounded border shadow-sm">
                    {format(new Date(note.timestamp), "yyyy/MM/dd HH:mm", { locale: ja })}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(note)} className="h-7 text-xs text-muted-foreground hover:text-primary">
                    <Edit2 className="w-3 h-3 mr-1" />
                    編集
                  </Button>
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground font-mono">
                  {note.content}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
