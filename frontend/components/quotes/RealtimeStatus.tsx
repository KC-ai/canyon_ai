'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function RealtimeStatus() {
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string>('')

  useEffect(() => {
    const channelId = `status_channel_${Date.now()}`
    const channel = supabase.channel(channelId)

    channel
      .on('presence', { event: 'sync' }, () => {
        setIsConnected(true)
      })
      .on('broadcast', { event: '*' }, (payload) => {
        setLastUpdate(new Date().toLocaleTimeString())
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      channel.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
      <span className="text-gray-600">
        Real-time: {isConnected ? 'Connected' : 'Disconnected'}
        {lastUpdate && ` • Last update: ${lastUpdate}`}
      </span>
    </div>
  )
}