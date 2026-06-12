import type { ReactNode } from 'react'
import { TopNav } from './TopNav'
import { BottomNav } from './BottomNav'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <TopNav />
      <main className="pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
