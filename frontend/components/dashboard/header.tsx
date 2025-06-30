"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { User, Building, Crown, Scale, Calculator, LogOut } from "lucide-react"
import { useAuth } from "@/app/providers"

interface HeaderProps {
  currentPersona: string
  setCurrentPersona: (persona: string) => void
}

const personas = [
  { value: "ae", label: "Account Executive", icon: User },
  { value: "deal_desk", label: "Deal Desk", icon: Building },
  { value: "cro", label: "Chief Revenue Officer", icon: Crown },
  { value: "legal", label: "Legal Team", icon: Scale },
  { value: "finance", label: "Finance Team", icon: Calculator },
]

export function Header({ currentPersona, setCurrentPersona }: HeaderProps) {
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <span className="ml-3 text-xl font-semibold text-gray-900">Canyon AI</span>
        </div>

        {/* Persona Toggle and Logout */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Acting as:</label>
            <Select value={currentPersona} onValueChange={(value) => {
              setCurrentPersona(value);
              // Update persona in localStorage
              const userStr = localStorage.getItem('user');
              if (userStr) {
                try {
                  const user = JSON.parse(userStr);
                  user.persona = value;
                  localStorage.setItem('user', JSON.stringify(user));
                } catch (e) {
                  console.error('Failed to update persona:', e);
                }
              }
            }}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {personas.map((persona) => {
                  const Icon = persona.icon
                  return (
                    <SelectItem key={persona.value} value={persona.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {persona.label}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  )
}
