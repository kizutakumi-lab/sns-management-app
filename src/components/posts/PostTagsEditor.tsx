"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const PREDEFINED_TAGS = ["DLE", "カンテレ", "リポスト", "キャンペーン", "画像あり", "動画あり"];

export default function PostTagsEditor({ postId, initialTags = [] }: { postId: string, initialTags?: string[] }) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [isSaving, setIsSaving] = useState(false);

  const addTag = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tag = e.target.value;
    if (!tag || tags.includes(tag)) {
      e.target.value = ""; // reset
      return;
    }
    const newTags = [...tags, tag];
    setTags(newTags);
    e.target.value = ""; // reset
    await saveTags(newTags);
  };

  const removeTag = async (tagToRemove: string) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    setTags(newTags);
    await saveTags(newTags);
  };

  const saveTags = async (newTags: string[]) => {
    setIsSaving(true);
    try {
      await fetch(`/api/posts/${postId}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: newTags })
      });
    } catch (e) {
      console.error("Failed to save tags", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      {tags.map(tag => (
        <Badge key={tag} variant="secondary" className="text-xs bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1">
          {tag}
          <button onClick={() => removeTag(tag)} className="hover:text-destructive transition-colors">
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}
      <select
        className="h-6 text-xs border rounded px-1 bg-background text-muted-foreground w-20 focus:outline-none focus:ring-1"
        onChange={addTag}
        disabled={isSaving}
        defaultValue=""
      >
        <option value="" disabled>+ 追加</option>
        {PREDEFINED_TAGS.map(tag => (
          <option key={tag} value={tag} disabled={tags.includes(tag)}>
            {tag}
          </option>
        ))}
      </select>
    </div>
  );
}
