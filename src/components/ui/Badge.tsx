interface BadgeProps {
  sport: string
  className?: string
}

const sportColors: Record<string, string> = {
  NFL:   'bg-amber-500/20 text-amber-400 border-amber-500/30',
  FIFA:  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  NBA:   'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  MLB:   'bg-red-500/20 text-red-400 border-red-500/30',
  NHL:   'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  Other: 'bg-zinc-600/20 text-zinc-400 border-zinc-600/30',
}

export function Badge({ sport, className = '' }: BadgeProps) {
  const colors = sportColors[sport] ?? sportColors['Other']
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors} ${className}`}>
      {sport}
    </span>
  )
}
