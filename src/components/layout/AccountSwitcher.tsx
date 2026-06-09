"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function AccountSwitcher() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("all");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Fetch accounts
    fetch('/api/accounts')
      .then(res => res.json())
      .then(data => {
        if (data.accounts) setAccounts(data.accounts);
      })
      .catch(err => console.error("Failed to load accounts", err));

    // Get selected from cookie
    const match = document.cookie.match(/(?:^|;)\s*selectedAccountId=([^;]*)/);
    if (match) {
      setSelectedId(match[1]);
    }
  }, []);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    document.cookie = `selectedAccountId=${id}; path=/; max-age=31536000`;
    setIsOpen(false);
    router.refresh(); // Refresh server components to re-fetch data for the new account
  };

  const selectedAccount = selectedId === "all" ? null : accounts.find(a => a.id === selectedId);

  return (
    <div className="relative mb-6 px-4">
      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
        Workspace
      </p>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={isOpen}
        className="w-full justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 truncate">
          <Building2 className="w-4 h-4 shrink-0" />
          <span className="truncate">
            {selectedAccount ? selectedAccount.name : "すべてのアカウント"}
          </span>
        </div>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-4 right-4 mt-1 z-50 bg-popover text-popover-foreground border rounded-md shadow-md p-1">
          <div
            className="flex items-center justify-between px-2 py-1.5 text-sm cursor-pointer hover:bg-muted rounded-sm"
            onClick={() => handleSelect("all")}
          >
            <span>すべてのアカウント</span>
            {selectedId === "all" && <Check className="w-4 h-4" />}
          </div>
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="flex items-center justify-between px-2 py-1.5 text-sm cursor-pointer hover:bg-muted rounded-sm mt-1"
              onClick={() => handleSelect(acc.id)}
            >
              <div className="flex flex-col overflow-hidden">
                <span className="truncate font-medium">{acc.name}</span>
                <span className="text-xs text-muted-foreground truncate">@{acc.username}</span>
              </div>
              {selectedId === acc.id && <Check className="w-4 h-4" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
