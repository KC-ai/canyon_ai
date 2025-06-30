"use client"

import type React from "react"
import { createContext, useState, useEffect } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { useAuth } from "@/app/providers"
import { useRouter } from "next/navigation"

const PersonaContext = createContext<{
  currentPersona: string
  setCurrentPersona: (persona: string) => void
}>({
  currentPersona: "ae",
  setCurrentPersona: () => {},
})

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [currentPersona, setCurrentPersona] = useState("ae")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  // Don't render anything if not authenticated
  if (!user) {
    return null
  }

  return (
    <PersonaContext.Provider value={{ currentPersona, setCurrentPersona }}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar
          currentPersona={currentPersona}
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header currentPersona={currentPersona} setCurrentPersona={setCurrentPersona} />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </PersonaContext.Provider>
  )
}

export { PersonaContext }
