import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
  ArrowUpRight,
  ArrowDownRight,
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
  quantidade,
  index,
}: {
  label: string
  valor: number
  tipo: 'receita' | 'despesa' | 'saldo'
  quantidade?: number
  index: number
}) {
  const Icon = tipo === 'receita' ? TrendingUp : tipo === 'despesa' ? TrendingDown : Wallet

  const config = {
    receita: {
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      valueColor: 'text-green-700',
      border: 'border-slate-200',
    },
    despesa: {
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
      valueColor: 'text-slate-900',
      border: 'border-slate-200',
    },
    saldo: {
      iconBg: valor >= 0 ? 'bg-green-50' : 'bg-red-50',
      iconColor: valor >= 0 ? 'text-green-600' : 'text-red-500',
      valueColor: valor >= 0 ? 'text-green-700' : 'text-red-600',
      border: valor >= 0 ? 'border-green-100' : 'border-red-100',
    },
  }[tipo]

  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className={`rounded-xl bg-white border ${config.border} shadow-sm p-5`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">{label}</p>
          <p className={`mt-2.5 text-[1.625rem] font-bold font-mono tabular-nums tracking-tight leading-none ${config.valueColor}`}>
            {formatarMoeda(valor)}
          </p>
          {quantidade !== undefined && (
            <p className="mt-2 text-xs text-slate-400">
              {quantidade} {quantidade === 1 ? 'lançamento' : 'lançamentos'}
            </p>
          )}
        </div>
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${config.iconBg} ${config.iconColor}`}>
          <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
        </div>
      </div>
    </motion.div>
  )
}

function TooltipCustom({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-md p-3 min-w-[160px]">
      <p className="text-xs font-medium text-slate-500 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6 text-xs">
          <span className="text-slate-600">
            {p.dataKey === 'receitas' ? 'Receitas' : p.dataKey === 'despesas' ? 'Despesas' : 'Saldo'}
          </span>
          <span
            className={`font-mono font-semibold ${
              p.dataKey === 'receitas' ? 'text-green-600' : p.dataKey === 'despesas' ? 'text-red-500' : p.value >= 0 ? 'text-green-600' : 'text-red-500'
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
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Cabeçalho + navegação de mês */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-sm text-slate-400 mt-0.5">Visão geral das suas finanças</p>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white shadow-sm px-1 py-1">
            <button
              onClick={() => navegarMes(-1)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[130px] text-center text-sm font-medium text-slate-700 capitalize px-2">
              {formatarMesAno(mes, ano)}
            </span>
            <button
              onClick={() => navegarMes(1)}
              disabled={mes === mesAtual() && ano === anoAtual()}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </motion.div>

        {/* Cards de métricas */}
        {loadingResumo ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-white border border-slate-200 shadow-sm p-5 h-28 animate-pulse">
                <div className="h-3 w-20 bg-slate-100 rounded mb-3" />
                <div className="h-7 w-32 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <CardMetrica label="Receitas" valor={resumo?.total_receitas ?? 0} tipo="receita" quantidade={resumo?.qtd_receitas} index={0} />
            <CardMetrica label="Despesas" valor={resumo?.total_despesas ?? 0} tipo="despesa" quantidade={resumo?.qtd_despesas} index={1} />
            <CardMetrica label="Saldo do mês" valor={resumo?.saldo ?? 0} tipo="saldo" index={2} />
          </div>
        )}

        {/* Gráfico de evolução */}
        {evolucao.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1], delay: 0.25 }}
            className="rounded-xl bg-white border border-slate-200 shadow-sm p-5"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-slate-900">Evolução mensal</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  Receitas
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="h-2 w-2 rounded-full bg-red-400" />
                  Despesas
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={evolucao} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradReceitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradDespesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.08} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  width={48}
                />
                <Tooltip content={<TooltipCustom />} />
                <Area type="monotone" dataKey="receitas" stroke="#16a34a" strokeWidth={1.5} fill="url(#gradReceitas)" dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={1.5} fill="url(#gradDespesas)" dot={false} activeDot={{ r: 3, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Últimos lançamentos */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1], delay: 0.32 }}
          className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Últimos lançamentos</h2>
            <a href="/lancamentos" className="text-xs text-green-600 hover:text-green-700 font-medium transition-colors">
              Ver todos →
            </a>
          </div>

          {loadingLancamentos ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-8 w-8 rounded-xl bg-slate-100 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 bg-slate-100 rounded" />
                    <div className="h-2.5 w-20 bg-slate-100 rounded" />
                  </div>
                  <div className="h-4 w-20 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : ultimos.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-400">Nenhum lançamento neste mês</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {ultimos.map((l, i) => (
                <motion.li
                  key={l.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 + i * 0.04, duration: 0.25 }}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors"
                >
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-sm"
                    style={{ backgroundColor: l.categoria.cor + '18', color: l.categoria.cor }}
                  >
                    {l.categoria.icone?.substring(0, 2) ?? '💰'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{l.descricao}</p>
                    <p className="text-xs text-slate-400">
                      {l.categoria.nome} · {formatarData(l.data)}
                      {l.total_parcelas && l.total_parcelas > 1 ? ` · ${l.parcela_atual}/${l.total_parcelas}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {l.tipo === 'RECEITA' ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
                    )}
                    <span className={`font-mono tabular-nums text-sm font-semibold ${l.tipo === 'RECEITA' ? 'text-green-700' : 'text-slate-800'}`}>
                      {formatarMoeda(l.valor)}
                    </span>
                    {!l.efetivado && (
                      <span className="ml-1 rounded px-1.5 py-0.5 text-xs bg-amber-50 text-amber-600 font-medium">
                        Pendente
                      </span>
                    )}
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>
    </AppShell>
  )
}
