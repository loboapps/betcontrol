import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, className = '', id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm text-zinc-400">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 text-sm placeholder:text-zinc-500 focus:outline-none focus:border-amber-500 transition-colors ${className}`}
        {...props}
      />
    </div>
  )
}
