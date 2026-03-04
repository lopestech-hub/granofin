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
  ChevronRight,
  ShieldCheck
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { motion, AnimatePresence } from 'motion/react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/services/api'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Resumo Geral' },
  { to: '/contas', icon: Wallet, label: 'Minhas Contas' },
  { to: '/lancamentos', icon: ArrowLeftRight, label: 'TransaÃ§Ãµes' },
  { to: '/orcamentos', icon: Target, label: 'Planejamento' },
  { to: '/contas-pagar', icon: CalendarClock, label: 'Compromissos' },
]

interface Props {
  children: React.ReactNode
}

const EASE = [0.25, 1, 0.5, 1] as [number, number, number, number]

export default function AppShell({ children }: Props) {
  const location = useLocation()
  const navigate = useNavigate()
  const { usuario, logout } = useAuthStore()
  const [menuAberto, setMenuAberto] = useState(false)

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (refreshToken) {
      await api.post('/auth/logout', { refresh_token: refreshToken }).catch(() => { })
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

  const primeiroNome = usuario?.nome.split(' ')[0] ?? ''

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Overlay mobile */}
      <AnimatePresence>
        {menuAberto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-md lg:hidden"
            onClick={() => setMenuAberto(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-950
          transition-all duration-500 ease-[0.25,1,0.5,1]
          lg:static lg:translate-x-0
          ${menuAberto ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:shadow-none'}
        `}
      >
        {/* Branding Area */}
        <div className="flex h-24 items-center px-8">
          <Logo variant="light" size="md" />
        </div>

        {/* Global Navigation */}
        <nav className="flex-1 overflow-y-auto px-6 py-4 space-y-2 custom-scrollbar">
          <div className="mb-6 px-2">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">SessÃ£o Principal</p>
          </div>

          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const ativo = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuAberto(false)}
                className={`
                  relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold
                  transition-all duration-300 group cursor-pointer
                  ${ativo ? 'text-white' : 'text-slate-500 hover:text-slate-300'}
                `}
              >
                {ativo && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-white/5 rounded-2xl -z-10 shadow-lg border border-white/5"
                    transition={{ duration: 0.4, ease: EASE }}
                  />
                )}

                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-300
                  ${ativo ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 text-slate-500 group-hover:bg-white/10 group-hover:text-slate-300'}
                `}>
                  <Icon size={18} strokeWidth={ativo ? 2.5 : 2} />
                </div>

                <span className="flex-1 uppercase tracking-tight text-[11px] font-black">{label}</span>

                {ativo && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }}>
                    <ChevronRight size={14} className="text-white/30" strokeWidth={3} />
                  </motion.div>
                )}
              </Link>
            )
          })}

          <div className="mt-12 mb-6 px-2">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">ConfiguraÃ§Ãµes</p>
          </div>

          <Link
            to="/configuracoes"
            onClick={() => setMenuAberto(false)}
            className={`
              relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-300 group cursor-pointer
              ${location.pathname === '/configuracoes' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            {location.pathname === '/configuracoes' && (
              <motion.span layoutId="nav-pill" className="absolute inset-0 bg-white/5 rounded-2xl -z-10 shadow-lg border border-white/5" />
            )}
            <div className={`
              flex items-center justify-center w-8 h-8 rounded-xl transition-all
              ${location.pathname === '/configuracoes' ? 'bg-slate-700 text-white' : 'bg-white/5 text-slate-500 group-hover:bg-white/10 group-hover:text-slate-300'}
            `}>
              <Settings size={18} strokeWidth={2} />
            </div>
            <span className="uppercase tracking-tight text-[11px] font-black">PreferÃªncias</span>
          </Link>
        </nav>

        {/* User Workspace Control */}
        <div className="p-6 border-t border-white/5 bg-slate-950/40">
          <div className="bg-white/5 rounded-[1.5rem] p-4 border border-white/5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-indigo-600/20 ring-2 ring-slate-900 border border-white/20">
                {iniciais}
              </div>
              <div className="min-w-0 pr-2">
                <p className="truncate text-[11px] font-black text-white uppercase tracking-tight leading-none mb-1">{primeiroNome}</p>
                <div className="flex items-center gap-1">
                  <ShieldCheck size={10} className="text-green-500" />
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Membro Pro</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 h-10 rounded-xl bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all cursor-pointer group"
            >
              <LogOut size={14} strokeWidth={3} className="group-hover:-translate-x-1 transition-transform" />
              Finalizar SessÃ£o
            </button>
          </div>
        </div>
      </aside>

      {/* Content Engine */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Dynamic Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 lg:hidden shadow-sm relative z-40">
          <button
            onClick={() => setMenuAberto(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <Menu size={20} strokeWidth={2.5} />
          </button>
          <Logo variant="dark" size="sm" />
          <div className="w-10 rounded-xl bg-slate-100 h-10 flex items-center justify-center text-[10px] font-black text-slate-400">
            {iniciais}
          </div>
        </header>

        {/* Global Shimmer Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.03),transparent_40%)] pointer-events-none" />

        <main className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  )
}
