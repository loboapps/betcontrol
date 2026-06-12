import { NavLink } from 'react-router-dom'
import { BarChart2, Calendar, TrendingUp } from 'lucide-react'

const navItems = [
  { to: '/',           label: 'Bets',       icon: BarChart2 },
  { to: '/por-data',   label: 'Por data',   icon: Calendar  },
  { to: '/por-evento', label: 'Por evento', icon: TrendingUp },
]

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 flex z-10">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 py-2 gap-1 text-xs font-medium transition-colors ${
              isActive ? 'text-amber-500' : 'text-zinc-500'
            }`
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
