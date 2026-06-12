import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  children: ReactNode
}

export function Button({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  const base = 'px-4 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer'
  const variants = {
    primary:   'bg-amber-500 hover:bg-amber-400 text-zinc-900',
    secondary: 'bg-zinc-700 hover:bg-zinc-600 text-zinc-100',
    ghost:     'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
