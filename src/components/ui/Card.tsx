import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`bg-zinc-800 rounded-lg border border-zinc-700 ${className}`} {...props}>
      {children}
    </div>
  )
}
