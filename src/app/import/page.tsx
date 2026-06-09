"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UploadCloud, CheckCircle2, FileText, X } from "lucide-react"
import Papa from "papaparse"

export default function ImportPage() {
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [results, setResults] = useState<any[]>([])

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const removeFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    setIsUploading(true)
    setResults([])

    const processedResults = [];

    for (const file of files) {
      try {
        const parsedData = await new Promise<any[]>((resolve, reject) => {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (res) => resolve(res.data),
            error: (err) => reject(err)
          });
        });

        const type = file.name.includes("summary") ? "summary" : "posts";
        
        const response = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, data: parsedData })
        });

        if (!response.ok) {
          throw new Error('API request failed');
        }

        const resData = await response.json();
        processedResults.push({ name: file.name, rows: resData.processed, type: type === "summary" ? "Summary" : "Posts", status: 'success' });
      } catch (error) {
        console.error("Error importing file:", file.name, error);
        processedResults.push({ name: file.name, status: 'error' });
      }
    }

    setResults(processedResults);
    setIsUploading(false);
    setFiles([]); // Clear queue after upload
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">CSV一括インポート</h2>
        <p className="text-muted-foreground mt-2">
          ソーシャルインサイトから出力した投稿データやサマリーデータのCSVを複数選択して一括アップロードします。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>データアップロード</CardTitle>
          <CardDescription>
            ドラッグ＆ドロップ、またはファイルを選択してください。複数のファイルを選択可能です。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            <UploadCloud className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              ファイルを選択、またはここにドラッグ＆ドロップ
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              CSV (複数選択可)
            </p>
            <input
              id="file-upload"
              type="file"
              accept=".csv"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <Button variant="secondary" className="pointer-events-none mb-6">
              ファイルを参照
            </Button>

            {files.length > 0 && (
              <div className="mt-4 space-y-2 text-left" onClick={(e) => e.stopPropagation()}>
                <p className="text-sm font-medium mb-2">選択されたファイル ({files.length}件):</p>
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center justify-between bg-background border p-2 rounded-md text-sm">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <button onClick={(e) => removeFile(index, e)} className="text-muted-foreground hover:text-destructive p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <Button 
              onClick={handleUpload} 
              disabled={files.length === 0 || isUploading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md hover:shadow-lg transition-shadow"
            >
              {isUploading ? `アップロード中...` : `インポートを実行 (${files.length}ファイル)`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card className="border-green-500/50 bg-green-500/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-green-600 font-semibold mb-4">
              <CheckCircle2 className="h-6 w-6" />
              <span>一括インポート完了</span>
            </div>
            <ul className="space-y-2">
              {results.map((r, i) => (
                <li key={i} className="text-sm flex items-center justify-between border-b border-green-500/20 pb-2 last:border-0 last:pb-0">
                  <span className="truncate pr-4">{r.name}</span>
                  {r.status === 'success' ? (
                    <span className="text-green-600 shrink-0">{r.rows} 件取り込み</span>
                  ) : (
                    <span className="text-red-500 shrink-0">エラー</span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
