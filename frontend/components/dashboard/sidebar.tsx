"use client"

import { cn } from "@/lib/utils"
import { BarChart3, FileText, Home, Plus, Menu } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/app/providers"

interface SidebarProps {
  currentPersona: string
  isCollapsed: boolean
  onToggle: () => void
}

export function Sidebar({ currentPersona, isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  
  // Get user display info
  const userEmail = user?.email || "user@example.com"
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User"
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const getNavigationForPersona = (persona: string) => {
    const baseNav = [
      { name: "Home", href: "/dashboard", icon: Home },
      { name: "Quotes", href: "/dashboard/quotes", icon: FileText },
    ]

    if (persona === "ae") {
      baseNav.push({ name: "Create Quote", href: "/dashboard/quotes/create", icon: Plus })
    }

    baseNav.push({ name: "Insights", href: "/dashboard/insights", icon: BarChart3 })

    return baseNav
  }

  const navigation = getNavigationForPersona(currentPersona)

  return (
    <div
      className={cn(
        "bg-white border-r border-gray-200 flex flex-col transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      {/* Toggle Button */}
      <div className="p-4 border-b border-gray-200">
        <button onClick={onToggle} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Menu className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                isActive ? "bg-black text-white shadow-lg" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                isCollapsed ? "justify-center px-2" : "gap-3",
              )}
              title={isCollapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span className="truncate">{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      {!isCollapsed && (
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-white">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
              <p className="text-xs text-gray-500 truncate">{userEmail}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
