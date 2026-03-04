import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight,
  Trash2, Pencil, CheckCircle2, Search, Filter, Calendar,
  Wallet, Layers, ArrowRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import toast from 'react-hot-toast'
import AppShell from '@/components/layout/AppShell'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { lancamentosService, type Lancamento, type NovoLancamento } from '@/services/lancamentos'
import { contasService } from '@/services/contas'
import { categoriasService } from '@/services/categorias'
import { formatarMoeda, formatarData, formatarMesAno, mesAtual, anoAtual } from '@/utils/formato'

const schema = z.object({
  descricao: z.string().min(1, 'DescriÃ§Ã£o obrigatÃ³ria'),
  valor: z.coerce.number().positive('Valor deve ser positivo'),
  tipo: z.enum(['RECEITA', 'DESPESA']),
  conta_id: z.string().uuid('Selecione uma conta'),
  categoria_id: z.string().uuid('Selecione uma categoria'),
  data: z.string().min(1, 'Data obrigatÃ³ria'),
  efetivado: z.boolean().default(true),
  observacoes: z.string().optional(),
  total_parcelas: z.coerce.number().min(1).optional(),
})
type FormData = z.infer<typeof schema>

const EASE = [0.25, 1, 0.5, 1] as [number, number, number, number]

export default function LancamentosPage() {
  const qc = useQueryClient()
  const hoje = new Date()
  const [mes, setMes] = useState(hoje.getMonth() + 1)
  const [ano, setAno] = useState(hoje.getFullYear())
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'RECEITA' | 'DESPESA'>('TODOS')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Lancamento | null>(null)
  const [confirmando, setConfirmando] = useState<Lancamento | null>(null)

  const navegarMes = (dir: -1 | 1) => {
    const d = new Date(ano, mes - 1 + dir, 1)
    setMes(d.getMonth() + 1)
    setAno(d.getFullYear())
  }

  const { data: lancData, isLoading } = useQuery({
    queryKey: ['lancamentos', mes, ano],
    queryFn: () => lancamentosService.listar({ mes, ano }),
  })

  const { data: contasData } = useQuery({ queryKey: ['contas'], queryFn: contasService.listar })
  const { data: catData } = useQuery({ queryKey: ['categorias'], queryFn: categoriasService.listar })

  const lancamentos = lancData?.lancamentos ?? []
  const contas = contasData?.contas ?? []
  const categorias = catData?.categorias ?? []

  const filtrados = filtroTipo === 'TODOS' ? lancamentos : lancamentos.filter((l) => l.tipo === filtroTipo)

  const { mutateAsync: criar, isPending: criando } = useMutation({
    mutationFn: lancamentosService.criar,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lancamentos'] }); fecharModal(); toast.success('LanÃ§amento criado') },
    onError: () => toast.error('Erro ao criar lanÃ§amento'),
  })

  const { mutateAsync: atualizar, isPending: atualizando } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NovoLancamento> }) => lancamentosService.atualizar(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lancamentos'] }); fecharModal(); toast.success('LanÃ§amento atualizado') },
    onError: () => toast.error('Erro ao atualizar lanÃ§amento'),
  })

  const { mutateAsync: deletar, isPending: deletando } = useMutation({
    mutationFn: lancamentosService.deletar,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lancamentos'] }); setConfirmando(null); toast.success('LanÃ§amento removido') },
    onError: () => toast.error('Erro ao remover lanÃ§amento'),
  })

  const { mutateAsync: efetivar } = useMutation({
    mutationFn: lancamentosService.efetivar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lancamentos'] }),
    onError: () => toast.error('Erro ao efetivar lanÃ§amento'),
  })

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'DESPESA', efetivado: true, data: hoje.toISOString().split('T')[0] },
  })

  const tipoForm = watch('tipo')
  const categoriasFiltradas = categorias.filter((c) => c.tipo === tipoForm)

  function abrirCriar() {
    reset({ tipo: 'DESPESA', efetivado: true, data: hoje.toISOString().split('T')[0] })
    setEditando(null)
    setModalAberto(true)
  }

  function abrirEditar(l: Lancamento) {
    reset({
      descricao: l.descricao,
      valor: l.valor,
      tipo: l.tipo,
      conta_id: l.conta.id,
      categoria_id: l.categoria.id,
      data: l.data.split('T')[0],
      efetivado: l.efetivado,
      observacoes: l.observacoes,
    })
    setEditando(l)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setEditando(null)
    reset()
  }

  const onSubmit = async (data: FormData) => {
    const payload: NovoLancamento = {
      ...data,
      data: new Date(data.data + 'T12:00:00').toISOString(),
      total_parcelas: data.total_parcelas && data.total_parcelas > 1 ? data.total_parcelas : undefined,
    }
    if (editando) await atualizar({ id: editando.id, data: payload })
    else await criar(payload)
  }

  // Group by date
  const grouped = filtrados.reduce((groups, lanc) => {
    const date = lanc.data.split('T')[0]
    if (!groups[date]) groups[date] = []
    groups[date].push(lanc)
    return groups
  }, {} as Record<string, Lancamento[]>)

  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  const totalReceitas = filtrados.filter((l) => l.tipo === 'RECEITA' && l.efetivado).reduce((a, l) => a + l.valor, 0)
  const totalDespesas = filtrados.filter((l) => l.tipo === 'DESPESA' && l.efetivado).reduce((a, l) => a + l.valor, 0)

  return (
    <AppShell>
      <div className="p-8 max-w-[1400px] mx-auto space-y-10">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: EASE }}>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none mb-2">LanÃ§amentos</h1>
            <p className="text-slate-500 font-medium italic">HistÃ³rico detalhado da sua vida financeira</p>
          </motion.div>

          <div className="flex items-center gap-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center bg-white rounded-2xl p-1 shadow-sm border border-slate-200"
            >
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
              Novo Registro
            </motion.button>
          </div>
        </header>

        {/* Mini Summary Dashboard */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-premium p-6 flex items-center gap-4 bg-gradient-to-br from-white to-green-50/30">
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-600 flex items-center justify-center">
              <ArrowUpRight size={24} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total de Receitas</p>
              <p className="text-2xl font-black font-mono text-green-600 tracking-tighter">{formatarMoeda(totalReceitas)}</p>
            </div>
          </div>
          <div className="card-premium p-6 flex items-center gap-4 bg-gradient-to-br from-white to-rose-50/30">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <ArrowDownRight size={24} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total de Despesas</p>
              <p className="text-2xl font-black font-mono text-slate-900 tracking-tighter">{formatarMoeda(totalDespesas)}</p>
            </div>
          </div>
          <div className="card-premium p-6 flex items-center gap-4 bg-gradient-to-br from-white to-indigo-50/30 border-indigo-100">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Wallet size={24} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Saldo do PerÃ­odo</p>
              <p className={`text-2xl font-black font-mono tracking-tighter ${totalReceitas - totalDespesas >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                {formatarMoeda(totalReceitas - totalDespesas)}
              </p>
            </div>
          </div>
        </section>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 flex-wrap bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]">
            <Filter size={14} className="text-slate-400 mr-2" />
            {(['TODOS', 'RECEITA', 'DESPESA'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFiltroTipo(t)}
                className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${filtroTipo === t ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-100'
                  }`}
              >
                {t === 'TODOS' ? 'Geral' : t === 'RECEITA' ? 'Receitas' : 'Despesas'}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Pesquisar por descriÃ§Ã£o, categoria ou conta..."
              className="w-full pl-9 pr-4 py-2 bg-slate-100/50 border-none rounded-xl text-[13px] font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
        </div>

        {/* List Content */}
        <div className="space-y-10 pb-10">
          {isLoading ? (
            [1, 2, 3].map(i => <div key={i} className="card-premium h-24 animate-pulse opacity-50" />)
          ) : sortedDates.length === 0 ? (
            <div className="card-premium py-20 text-center flex flex-col items-center justify-center border-dashed">
              <Layers size={48} className="text-slate-200 mb-4" />
              <h3 className="text-slate-900 font-bold">Sem movimentações</h3>
              <p className="text-slate-400 text-sm mt-1">Não há registros para este período com os filtros aplicados.</p>
            </div>
          ) : (
            sortedDates.map((date) => (
              <div key={date} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/50 shadow-sm">
                    <Calendar size={12} className="text-indigo-500" />
                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">{formatarData(date)}</span>
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <AnimatePresence mode="popLayout">
                    {grouped[date].map((l, idx) => (
                      <motion.div
                        key={l.id}
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.02, ease: EASE }}
                        className="card-premium group flex items-center gap-6 p-4 hover:border-indigo-100 transition-all cursor-pointer"
                        title={l.observacoes}
                      >
                        {/* Categoria Icon */}
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform duration-500"
                          style={{ backgroundColor: l.categoria.cor + '15', color: l.categoria.cor }}
                        >
                          {l.categoria.icone?.substring(0, 2) ?? '💰'}
                        </div>

                        {/* Description & Metadata */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-bold text-slate-800 truncate leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                              {l.descricao}
                            </h4>
                            {l.total_parcelas && l.total_parcelas > 1 && (
                              <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-black font-mono">
                                {l.parcela_atual}/{l.total_parcelas}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span className="text-slate-500">{l.categoria.nome}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-200" />
                            <div className="flex items-center gap-1.5">
                              <Wallet size={11} className="text-indigo-400" />
                              <span className="text-slate-400">{l.conta.nome}</span>
                            </div>
                          </div>
                        </div>

                        {/* Amount & Status */}
                        <div className="text-right flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5">
                            {l.tipo === 'RECEITA' ? (
                              <ArrowUpRight className="text-green-500" size={16} strokeWidth={3} />
                            ) : (
                              <ArrowDownRight className="text-slate-400" size={16} strokeWidth={2.5} />
                            )}
                            <span className={`text-lg font-black font-mono tabular-nums tracking-tighter ${l.tipo === 'RECEITA' ? 'text-green-600' : 'text-slate-900'}`}>
                              {l.tipo === 'RECEITA' ? '+' : ''}{formatarMoeda(l.valor)}
                            </span>
                          </div>
                          {!l.efetivado && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[9px] font-black uppercase tracking-tighter border border-amber-100">
                              Agendado
                            </span>
                          )}
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-1 border-l border-slate-100 pl-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {!l.efetivado && (
                            <button
                              onClick={(e) => { e.stopPropagation(); efetivar(l.id) }}
                              className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                              title="Efetivar agora"
                            >
                              <CheckCircle2 size={16} strokeWidth={2.5} />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); abrirEditar(l) }}
                            className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white transition-all cursor-pointer"
                          >
                            <Pencil size={16} strokeWidth={2.5} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmando(l) }}
                            className="p-2 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                          >
                            <Trash2 size={16} strokeWidth={2.5} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Criar/Editar (Premium Version) */}
      <Modal aberto={modalAberto} titulo={editando ? 'Ajustar Movimentação' : 'Nova Inteligência de Fluxo'} onFechar={fecharModal} largura="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex gap-2">
            {(['DESPESA', 'RECEITA'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setValue('tipo', t); setValue('categoria_id', '' as any) }}
                className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all cursor-pointer ${tipoForm === t
                    ? t === 'RECEITA'
                      ? 'border-green-500 bg-white text-green-600 shadow-md'
                      : 'border-rose-500 bg-white text-rose-600 shadow-md'
                    : 'border-slate-50 text-slate-300 hover:border-slate-100'
                  }`}
              >
                {t === 'RECEITA' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-full">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">O que aconteceu?</label>
              <input {...register('descricao')} className="premium-input text-lg font-bold" placeholder="Ex: Mercado semanal, Venda de serviço..." />
              {errors.descricao && <span className="text-[10px] text-rose-500 font-bold ml-1">{errors.descricao.message}</span>}
            </div>

            <div className="relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Quanto? (R$)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">R$</span>
                <input {...register('valor')} type="number" step="0.01" className="premium-input pl-10 font-black font-mono" placeholder="0,00" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Quando aconteceu?</label>
              <input {...register('data')} type="date" className="premium-input font-bold" />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Qual conta?</label>
              <select {...register('conta_id')} className="premium-select font-bold">
                <option value="">Selecione...</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Qual categoria?</label>
              <select {...register('categoria_id')} className="premium-select font-bold">
                <option value="">Selecione...</option>
                {categoriasFiltradas.map(c => <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>)}
              </select>
            </div>

            {!editando && tipoForm === 'DESPESA' && (
              <div className="col-span-full">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Parcelamento (Opcional)</label>
                <div className="relative">
                  <input {...register('total_parcelas')} type="number" min="1" max="60" className="premium-input pl-4" placeholder="NÃºmero de parcelas (ex: 12)" />
                  <Layers size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                </div>
              </div>
            )}

            <div className="col-span-full bg-slate-50 p-4 rounded-2xl flex items-center justify-between border border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${watch('efetivado') ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                  {watch('efetivado') ? <CheckCircle2 size={20} strokeWidth={2.5} /> : <Clock size={20} strokeWidth={2.5} />}
                </div>
                <div>
                  <p className="text-[11px] font-black text-slate-900 uppercase">Status de EfetivaÃ§Ã£o</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{watch('efetivado') ? 'LanÃ§amento Liquidado' : 'Agendado para o futuro'}</p>
                </div>
              </div>
              <label className="relative flex items-center cursor-pointer">
                <input {...register('efetivado')} type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500" />
              </label>
            </div>

            <div className="col-span-full">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">AnotaÃ§Ãµes</label>
              <textarea {...register('observacoes')} rows={2} className="premium-input py-3 resize-none" placeholder="Detalhes adicionais..." />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
            <button type="button" onClick={fecharModal} className="h-12 px-8 rounded-2xl text-slate-500 font-bold hover:bg-slate-50 cursor-pointer">Descartar</button>
            <button type="submit" disabled={criando || atualizando} className="h-12 px-10 rounded-2xl bg-indigo-600 text-white font-black shadow-xl shadow-indigo-600/20 hover:scale-[1.02] transition-all cursor-pointer disabled:opacity-50">
              {criando || atualizando ? 'Processando...' : editando ? 'Salvar AlteraÃ§Ãµes' : 'Efetuar LanÃ§amento'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        aberto={!!confirmando}
        titulo="Remover MovimentaÃ§Ã£o?"
        mensagem={`VocÃª está prestes a remover o registro "${confirmando?.descricao}". Esta operaÃ§Ã£o alterarÃ¡ seus saldos e não pode ser revertida.`}
        onConfirmar={() => confirmando && deletar(confirmando.id)}
        onCancelar={() => setConfirmando(null)}
        carregando={deletando}
      />
    </AppShell>
  )
}
