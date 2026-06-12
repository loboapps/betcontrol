import { NavLink } from 'react-router-dom'
import { BarChart2, Calendar, TrendingUp } from 'lucide-react'

const navItems = [
  { to: '/',           label: 'Bets',       icon: BarChart2 },
  { to: '/por-data',   label: 'Por data',   icon: Calendar  },
  { to: '/por-evento', label: 'Por evento', icon: TrendingUp },
]

export function TopNav() {
  return (
    <nav className="hidden md:flex items-center gap-1 bg-zinc-900 border-b border-zinc-800 px-6 h-14 sticky top-0 z-10">
      <span className="text-amber-500 font-bold text-lg mr-6">BetControl</span>
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-zinc-800 text-amber-500'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
            }`
          }
        >
          <Icon size={16} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
