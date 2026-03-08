import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Target,
  AlertTriangle, TrendingUp, Info, ArrowRight, Layers
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import toast from 'react-hot-toast'
import AppShell from '@/components/layout/AppShell'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { orcamentosService, type Orcamento } from '@/services/orcamentos'
import { categoriasService } from '@/services/categorias'
import { formatarMoeda, formatarMesAno, mesAtual, anoAtual } from '@/utils/formato'

const schema = z.object({
  categoria_id: z.string().uuid('Selecione uma categoria'),
  valor_limite: z.coerce.number().positive('Valor deve ser positivo'),
})
type FormData = z.infer<typeof schema>

const EASE = [0.25, 1, 0.5, 1] as [number, number, number, number]

function BarraProgresso({ percentual, ultrapassado }: { percentual: number; ultrapassado: boolean }) {
  const largura = Math.min(percentual, 100)

  return (
    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden relative border border-slate-200/20">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${largura}%` }}
        transition={{ duration: 1, ease: EASE }}
        className={`h-full rounded-full transition-colors relative ${ultrapassado ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.4)]' :
          percentual >= 85 ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]' :
            'bg-indigo-600 shadow-[0_0_12px_rgba(79,70,229,0.4)]'
          }`}
      />
    </div>
  )
}

export default function OrcamentosPage() {
  const qc = useQueryClient()
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Orcamento | null>(null)
  const [confirmando, setConfirmando] = useState<Orcamento | null>(null)

  const navegarMes = (dir: -1 | 1) => {
    const d = new Date(ano, mes - 1 + dir, 1)
    setMes(d.getMonth() + 1)
    setAno(d.getFullYear())
  }

  const { data: orcData, isLoading } = useQuery({
    queryKey: ['orcamentos', mes, ano],
    queryFn: () => orcamentosService.listar(mes, ano),
  })

  const { data: catData } = useQuery({ queryKey: ['categorias'], queryFn: categoriasService.listar })

  const orcamentos = orcData?.orcamentos ?? []
  const categoriasDespesa = catData?.categorias.filter((c) => c.tipo === 'DESPESA') ?? []
  const comOrcamento = new Set(orcamentos.map((o) => o.categoria_id))
  const categoriasDisponiveis = categoriasDespesa.filter((c) => !comOrcamento.has(c.id) || editando?.categoria_id === c.id)

  const { mutateAsync: criar, isPending: criando } = useMutation({
    mutationFn: (data: FormData) => orcamentosService.criar({ ...data, mes, ano }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orcamentos'] }); fecharModal(); toast.success('OrÃ§amento estabelecido') },
    onError: () => toast.error('Falha ao criar limite'),
  })

  const { mutateAsync: atualizar, isPending: atualizando } = useMutation({
    mutationFn: ({ id, valor_limite }: { id: string; valor_limite: number }) => orcamentosService.atualizar(id, valor_limite),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orcamentos'] }); fecharModal(); toast.success('Meta atualizada') },
    onError: () => toast.error('Falha ao atualizar meta'),
  })

  const { mutateAsync: deletar, isPending: deletando } = useMutation({
    mutationFn: orcamentosService.deletar,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orcamentos'] }); setConfirmando(null); toast.success('Meta removida') },
    onError: () => toast.error('Falha ao remover meta'),
  })

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  function abrirCriar() {
    reset({ categoria_id: '' as any, valor_limite: undefined })
    setEditando(null)
    setModalAberto(true)
  }

  function abrirEditar(o: Orcamento) {
    reset({ categoria_id: o.categoria_id, valor_limite: o.valor_limite })
    setEditando(o)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setEditando(null)
    reset()
  }

  const onSubmit = async (data: FormData) => {
    if (editando) await atualizar({ id: editando.id, valor_limite: data.valor_limite })
    else await criar(data)
  }

  const ultrapassados = orcamentos.filter((o) => o.ultrapassado).length
  const totalLimite = orcamentos.reduce((a, o) => a + o.valor_limite, 0)
  const totalGasto = orcamentos.reduce((a, o) => a + o.valor_gasto, 0)
  const percGeral = totalLimite > 0 ? Math.round((totalGasto / totalLimite) * 100) : 0

  return (
    <AppShell>
      <div className="p-8 max-w-[1400px] mx-auto space-y-10">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: EASE }}>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none mb-2">Engenharia de Metas</h1>
            <p className="text-slate-500 font-medium italic">Limite seus gastos e maximize sua economia</p>
          </motion.div>

          <div className="flex items-center gap-3">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center bg-white rounded-2xl p-1 shadow-sm border border-slate-200">
              <button onClick={() => navegarMes(-1)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all cursor-pointer">
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

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={abrirCriar}
              className="flex items-center gap-2 h-12 px-6 rounded-2xl bg-indigo-600 text-sm font-bold text-white shadow-[0_8px_16px_rgba(79,70,229,0.25)] hover:bg-indigo-700 transition-all cursor-pointer"
            >
              <Plus size={20} strokeWidth={3} />
              Definir Teto
            </motion.button>
          </div>
        </header>

        {/* Global Summary */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 card-premium p-8 relative overflow-hidden bg-gradient-to-br from-white to-slate-50/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600">
                    <TrendingUp size={18} strokeWidth={2.5} />
                  </div>
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-indigo-400">Desempenho Geral do OrÃ§amento</h3>
                </div>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className={`text-5xl font-black font-mono tracking-tighter tabular-nums ${totalGasto > totalLimite ? 'text-rose-600' : 'text-slate-900'}`}>
                    {percGeral}%
                  </span>
                  <span className="text-slate-400 font-bold text-sm">consumido das metas ativas</span>
                </div>
                <BarraProgresso percentual={percGeral} ultrapassado={totalGasto > totalLimite} />
              </div>

              <div className="hidden md:flex flex-col gap-4 border-l border-slate-200/60 pl-8 min-w-[240px]">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Limite Estabelecido</p>
                  <p className="text-xl font-black font-mono text-slate-900 tracking-tight">{formatarMoeda(totalLimite)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Gasto Consolidado</p>
                  <p className="text-xl font-black font-mono text-slate-700 tracking-tight">{formatarMoeda(totalGasto)}</p>
                </div>
              </div>
            </div>

            {/* Pattern */}
            <Target size={120} className="absolute right-[-20px] bottom-[-20px] opacity-[0.03] text-indigo-600" />
          </div>

          <div className="space-y-4">
            {ultrapassados > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card-premium p-6 border-rose-200 bg-rose-50/50 flex flex-col items-center justify-center text-center gap-3"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
                  <AlertTriangle size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-1">Alerta Critico</p>
                  <p className="text-sm font-bold text-rose-800 leading-tight">
                    {ultrapassados} {ultrapassados === 1 ? 'categoria ultrapassou' : 'categorias ultrapassaram'} o limite.
                  </p>
                </div>
                <button className="text-[10px] font-black uppercase tracking-widest text-rose-600 underline cursor-pointer">Revisar Agora</button>
              </motion.div>
            )}

            <div className="card-premium p-6 flex flex-col gap-3 group">
              <div className="flex items-center gap-2">
                <Info size={14} className="text-indigo-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dica Financeira</span>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed italic">
                Reduzir 10% nas metas de lazer pode aumentar sua reserva de emergÃªncia em R$ 450,00 este mÃªs.
              </p>
            </div>
          </div>
        </section>

        {/* Dashboard Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              [1, 2, 3].map(i => <div key={i} className="card-premium h-48 animate-pulse opacity-50" />)
            ) : orcamentos.length === 0 ? (
              <div className="col-span-full card-premium py-24 flex flex-col items-center justify-center border-dashed">
                <Target size={48} className="text-slate-200 mb-4" />
                <h3 className="text-slate-900 font-bold uppercase tracking-tight">Sem Planejamento Ativo</h3>
                <p className="text-slate-400 text-sm mt-1">Nenhum limite de gastos foi definido para {formatarMesAno(mes, ano)}.</p>
              </div>
            ) : (
              orcamentos.map((o, idx) => (
                <motion.div
                  key={o.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, ease: EASE }}
                  className={`card-premium group p-6 flex flex-col gap-5 hover:border-indigo-400 transition-all ${o.ultrapassado ? 'bg-rose-50/10 border-rose-200' : 'bg-white'
                    }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform duration-500"
                        style={{ backgroundColor: o.categoria.cor + '15', color: o.categoria.cor }}
                      >
                        {o.categoria.icone?.substring(0, 2) ?? '📊'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 uppercase tracking-tight leading-none group-hover:text-indigo-600 transition-colors">{o.categoria.nome}</h4>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Limite Mensal</p>
                      </div>
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => abrirEditar(o)} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setConfirmando(o)} className="p-2 rounded-xl bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-rose-100 transition-all cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-end mb-1">
                      <p className="text-2xl font-black font-mono tracking-tighter tabular-nums leading-none">
                        {formatarMoeda(o.valor_gasto)}
                      </p>
                      <p className={`text-sm font-black font-mono leading-none ${o.ultrapassado ? 'text-rose-600' : 'text-indigo-600'}`}>
                        {o.percentual}%
                      </p>
                    </div>
                    <BarraProgresso percentual={o.percentual} ultrapassado={o.ultrapassado} />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase cursor-default">Total Reservado</span>
                      <span className="text-[11px] font-black text-slate-700 font-mono tracking-tight">{formatarMoeda(o.valor_limite)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-black text-indigo-400 group-hover:translate-x-1 transition-transform cursor-pointer">
                      VER DETALHES <ArrowRight size={12} strokeWidth={3} />
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </section>
      </div>

      {/* Modal Criar/Editar (Premium) */}
      <Modal aberto={modalAberto} titulo={editando ? 'Recalibrar Limite' : 'Novo Planejamento por Categoria'} onFechar={fecharModal}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {!editando && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block text-center">Selecionar Categoria de Gasto</label>
              <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                {categoriasDisponiveis.map((c) => (
                  <label key={c.id} className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${watch('categoria_id') === c.id ? 'border-indigo-600 bg-white shadow-md text-slate-900' : 'border-slate-50 bg-slate-50/50 text-slate-400 hover:border-slate-100'
                    }`}>
                    <input {...register('categoria_id')} type="radio" value={c.id} className="hidden" />
                    <span className="text-xl">{c.icone}</span>
                    <span className="text-[11px] font-black uppercase tracking-tight truncate">{c.nome}</span>
                  </label>
                ))}
              </div>
              {errors.categoria_id && <p className="mt-2 text-center text-[10px] text-rose-500 font-black uppercase">{errors.categoria_id.message}</p>}
              {categoriasDisponiveis.length === 0 && (
                <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 text-center flex flex-col items-center gap-2 border border-indigo-100 mt-4">
                  <Layers size={20} />
                  <p className="text-[10px] font-black uppercase tracking-tight leading-relaxed">ParabÃ©ns! Todas as suas categorias já estÃ£o mapeadas no orÃ§amento.</p>
                </div>
              )}
            </div>
          )}

          {editando && (
            <div className="flex items-center gap-4 p-6 rounded-[2rem] bg-indigo-600 text-white shadow-xl shadow-indigo-600/20">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl bg-white/20 shadow-inner"
              >
                {editando.categoria.icone?.substring(0, 2) ?? '📊'}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Ajustando meta de</p>
                <p className="text-xl font-black uppercase tracking-tight">{editando.categoria.nome}</p>
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Teto MÃ¡ximo Mensal (R$)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">R$</span>
              <input {...register('valor_limite')} type="number" step="0.01" className="premium-input pl-10 font-black font-mono text-xl" placeholder="0,00" />
            </div>
            {errors.valor_limite && <p className="mt-2 text-[10px] text-rose-500 font-bold ml-1">{errors.valor_limite.message}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
            <button type="button" onClick={fecharModal} className="h-12 px-8 rounded-2xl text-slate-500 font-bold hover:bg-slate-50 cursor-pointer text-sm">Ignorar</button>
            <button type="submit" disabled={criando || atualizando || (!editando && categoriasDisponiveis.length === 0)} className="flex-1 h-12 rounded-2xl bg-slate-900 text-white font-black shadow-xl hover:bg-black transition-all cursor-pointer text-sm uppercase tracking-widest disabled:opacity-30">
              {criando || atualizando ? 'Processando...' : editando ? 'Salvar AlteraÃ§Ã£o' : 'Selar OrÃ§amento'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        aberto={!!confirmando}
        titulo="Extinguir OrÃ§amento?"
        mensagem={`VocÃª está prestes a remover o limite estabelecido para "${confirmando?.categoria.nome}". Isso farÃ¡ com que os gastos desta categoria não sejam mais rastreados contra uma meta.`}
        onConfirmar={() => confirmando && deletar(confirmando.id)}
        onCancelar={() => setConfirmando(null)}
        carregando={deletando}
      />
    </AppShell>
  )
}
