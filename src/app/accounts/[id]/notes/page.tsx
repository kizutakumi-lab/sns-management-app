import { getCachedAccounts, getCachedNotes } from "@/lib/cache";
import { NotesEditor } from "@/components/accounts/NotesEditor";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AccountNotesPage({ params }: PageProps) {
  const { id } = await params;
  
  const accounts = await getCachedAccounts();
  const account = accounts.find((a: any) => a.id === id);

  if (!account) {
    notFound();
  }

  const notes = await getCachedNotes();
  let initialNotes = notes[id] || [];

  if (typeof initialNotes === 'string') {
    initialNotes = [{
      id: 'legacy-' + Date.now(),
      timestamp: new Date().toISOString(),
      content: initialNotes
    }];
  } else if (!Array.isArray(initialNotes)) {
    initialNotes = [];
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/accounts">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">アカウント管理に戻る</h2>
        </div>
      </div>
      
      <div className="flex-1 bg-card rounded-lg border p-6 overflow-hidden">
        <NotesEditor 
          accountId={account.id} 
          accountName={account.name} 
          initialNotes={initialNotes} 
        />
      </div>
    </div>
  );
}
