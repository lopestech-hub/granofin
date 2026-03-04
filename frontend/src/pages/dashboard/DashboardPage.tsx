import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { motion } from 'motion/react'
import AppShell from '@/components/layout/AppShell'
import { relatoriosService } from '@/services/relatorios'
import { lancamentosService } from '@/services/lancamentos'
import { formatarMoeda, formatarData, formatarMesAno, mesAtual, anoAtual } from '@/utils/formato'

const EASE = [0.25, 1, 0.5, 1] as [number, number, number, number]

// Variantes de animação reutilizáveis
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: EASE, delay: i * 0.07 },
  }),
}

function CardMetrica({
  label,
  valor,
  tipo,
  index,
}: {
  label: string
  valor: number
  tipo: 'receita' | 'despesa' | 'saldo'
  index: number
}) {
  const Icon = tipo === 'receita' ? TrendingUp : tipo === 'despesa' ? TrendingDown : Wallet

  const config = {
    receita: {
      color: 'text-green-600',
      iconBg: 'bg-green-500/10',
      progressBg: 'bg-green-500',
      percent: 100,
    },
    despesa: {
      color: 'text-rose-600',
      iconBg: 'bg-rose-500/10',
      progressBg: 'bg-rose-500',
      percent: 65,
    },
    saldo: {
      color: valor >= 0 ? 'text-indigo-600' : 'text-rose-600',
      iconBg: valor >= 0 ? 'bg-indigo-500/10' : 'bg-rose-500/10',
      progressBg: valor >= 0 ? 'bg-indigo-500' : 'bg-rose-500',
      percent: 85,
    },
  }[tipo]

  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="card-premium group p-5 relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-xl ${config.iconBg} ${config.color} transition-transform group-hover:scale-110 duration-300`}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</span>
          <span className={`text-2xl font-bold tabular-nums tracking-tight tracking-[-0.03em] ${config.color}`}>
            {formatarMoeda(valor)}
          </span>
        </div>
      </div>

      <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${config.percent}%` }}
          transition={{ duration: 1, ease: EASE, delay: 0.5 + index * 0.1 }}
          className={`h-full ${config.progressBg} opacity-60`}
        />
      </div>
    </motion.div>
  )
}

function TooltipCustom({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="card-premium bg-slate-900/95 backdrop-blur-md border-white/10 p-3 min-w-[180px] shadow-xl">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-white/10 pb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6 text-xs py-0.5">
          <span className="text-slate-300 font-medium">
            {p.dataKey === 'receitas' ? 'Receitas' : p.dataKey === 'despesas' ? 'Despesas' : 'Saldo'}
          </span>
          <span
            className={`font-mono font-bold ${p.dataKey === 'receitas' ? 'text-green-400' : p.dataKey === 'despesas' ? 'text-rose-400' : p.value >= 0 ? 'text-green-400' : 'text-rose-400'
              }`}
          >
            {formatarMoeda(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())

  const navegarMes = (direcao: -1 | 1) => {
    const d = new Date(ano, mes - 1 + direcao, 1)
    setMes(d.getMonth() + 1)
    setAno(d.getFullYear())
  }

  const { data: resumoData, isLoading: loadingResumo } = useQuery({
    queryKey: ['resumo-mensal', mes, ano],
    queryFn: () => relatoriosService.resumoMensal(mes, ano),
  })

  const { data: evolucaoData } = useQuery({
    queryKey: ['evolucao'],
    queryFn: () => relatoriosService.evolucao(6),
  })

  const { data: lancamentosData, isLoading: loadingLancamentos } = useQuery({
    queryKey: ['lancamentos', mes, ano],
    queryFn: () => lancamentosService.listar({ mes, ano }),
  })

  const resumo = resumoData?.resumo
  const evolucao = evolucaoData?.evolucao ?? []
  const lancamentos = lancamentosData?.lancamentos ?? []
  const ultimos = lancamentos.slice(0, 8)

  return (
    <AppShell>
      <div className="p-8 max-w-[1400px] mx-auto space-y-10">

        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none mb-2">Dashboard</h1>
            <p className="text-slate-500 font-medium">Visão estratégica da sua inteligência financeira</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
            className="flex items-center bg-white rounded-2xl p-1 shadow-sm border border-slate-200"
          >
            <button
              onClick={() => navegarMes(-1)}
              className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
            <span className="px-6 py-1.5 text-sm font-bold text-slate-700 min-w-[140px] text-center capitalize">
              {formatarMesAno(mes, ano)}
            </span>
            <button
              onClick={() => navegarMes(1)}
              disabled={mes === mesAtual() && ano === anoAtual()}
              className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all disabled:opacity-20 cursor-pointer"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </motion.div>
        </section>

        {/* Metrics Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loadingResumo ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="card-premium h-32 animate-pulse opacity-50" />
            ))
          ) : (
            <>
              <CardMetrica label="Entradas" valor={resumo?.total_receitas ?? 0} tipo="receita" index={0} />
              <CardMetrica label="Saídas" valor={resumo?.total_despesas ?? 0} tipo="despesa" index={1} />
              <CardMetrica label="Saldo Total" valor={resumo?.saldo ?? 0} tipo="saldo" index={2} />
            </>
          )}
        </section>

        {/* Chart Section */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.3 }}
            className="card-premium xl:col-span-2 p-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Evolução dos Fluxos</h2>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]" />
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Receitas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]" />
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Despesas</span>
                </div>
              </div>
            </div>

            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolucao} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradReceitas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradDespesas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="6 6" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<TooltipCustom />} cursor={{ stroke: '#f1f5f9', strokeWidth: 2 }} />
                  <Area
                    type="monotone"
                    dataKey="receitas"
                    stroke="#22c55e"
                    strokeWidth={3}
                    fill="url(#gradReceitas)"
                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="despesas"
                    stroke="#f43f5e"
                    strokeWidth={3}
                    fill="url(#gradDespesas)"
                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Side List Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.4 }}
            className="card-premium h-full flex flex-col"
          >
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Atividade Recente</h2>
              <Link to="/lancamentos" className="text-xs font-bold text-green-600 hover:text-green-700 transition-colors cursor-pointer uppercase tracking-widest">
                Ver tudo
              </Link>
            </div>

            <div className="flex-1 overflow-auto max-h-[400px] xl:max-h-none">
              {loadingLancamentos ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 bg-slate-50 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : ultimos.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-sm font-medium text-slate-400">Zero movimentação registrada</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50/50">
                  {ultimos.map((l, i) => (
                    <motion.div
                      key={l.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.05 }}
                      className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    >
                      <div
                        className="h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform duration-300"
                        style={{ backgroundColor: l.categoria.cor + '15', color: l.categoria.cor }}
                      >
                        {l.categoria.icone?.substring(0, 2) ?? '💰'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate leading-tight mb-0.5 group-hover:text-green-600 transition-colors">{l.descricao}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {l.categoria.nome} · {formatarData(l.data)}
                        </p>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <span className={`text-sm font-extrabold font-mono tabular-nums ${l.tipo === 'RECEITA' ? 'text-green-600' : 'text-slate-900'}`}>
                          {l.tipo === 'RECEITA' ? '+' : ''}{formatarMoeda(l.valor)}
                        </span>
                        {!l.efetivado && (
                          <span className="text-[9px] font-black text-amber-600 uppercase tracking-tighter bg-amber-50 px-1 rounded-sm mt-0.5">
                            Pendente
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </section>
      </div>
    </AppShell>
  )
}
