"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, FileUp, List, BarChart3, Settings, Link as LinkIcon } from "lucide-react"
import AccountSwitcher from "./AccountSwitcher"

const navItems = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/accounts", label: "アカウント管理", icon: Users },
  { href: "/posts", label: "投稿一覧", icon: List },
  { href: "/import", label: "CSVインポート", icon: FileUp },
  { href: "/mapping", label: "広告紐付け", icon: LinkIcon },
  { href: "/analysis", label: "タグ分析", icon: BarChart3 },
  { href: "/settings", label: "設定", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r bg-card/50 glass hidden md:flex flex-col">
      <div className="h-16 flex items-center px-6 border-b">
        <h1 className="text-lg font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
          SNS運用管理くん
        </h1>
      </div>
      <div className="p-3 border-b">
        <AccountSwitcher />
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
                    isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
