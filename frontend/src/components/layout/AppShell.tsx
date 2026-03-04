import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Target,
  CalendarClock,
  Settings,
  LogOut,
  Menu,
  TrendingUp,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/services/api'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/contas', icon: Wallet, label: 'Contas' },
  { to: '/lancamentos', icon: ArrowLeftRight, label: 'Lançamentos' },
  { to: '/orcamentos', icon: Target, label: 'Orçamentos' },
  { to: '/contas-pagar', icon: CalendarClock, label: 'Contas a Pagar' },
]

interface Props {
  children: React.ReactNode
}

export default function AppShell({ children }: Props) {
  const location = useLocation()
  const navigate = useNavigate()
  const { usuario, logout } = useAuthStore()
  const [menuAberto, setMenuAberto] = useState(false)

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      await api.post('/auth/logout', { refresh_token: refreshToken }).catch(() => {})
    }
    logout()
    navigate('/auth/login')
  }

  const iniciais = usuario?.nome
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() ?? '?'

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Overlay mobile */}
      {menuAberto && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setMenuAberto(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-slate-900
          transition-transform duration-200 ease-out
          lg:static lg:translate-x-0
          ${menuAberto ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 px-5 border-b border-slate-800">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-600">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold text-white tracking-tight">Granofin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const ativo = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuAberto(false)}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium
                  transition-colors duration-150
                  ${ativo
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Rodapé sidebar */}
        <div className="border-t border-slate-800 p-3 space-y-0.5">
          <Link
            to="/configuracoes"
            onClick={() => setMenuAberto(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors duration-150"
          >
            <Settings className="h-4 w-4" />
            Configurações
          </Link>

          {/* Avatar + nome */}
          <div className="flex items-center gap-3 px-3 py-2 mt-1">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white">
              {iniciais}
            </div>
            <span className="truncate text-sm text-slate-400">{usuario?.nome}</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors duration-150"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Área de conteúdo */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Header mobile */}
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
          <button
            onClick={() => setMenuAberto(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span className="font-bold text-slate-900">Granofin</span>
          </div>
          <div className="w-9" />
        </header>

        {/* Conteúdo principal */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
