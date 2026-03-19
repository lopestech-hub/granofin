import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, AlertCircle, CheckCircle2, Clock, XCircle,
  Receipt, Pencil, Trash2,
  CalendarDays, TrendingDown, ChevronRight,
  Filter, Search, Layers
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import toast from 'react-hot-toast'
import AppShell from '@/components/layout/AppShell'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { contasPagarService, type ContaPagar, type ContaPagarStatus } from '@/services/contasPagar'
import { categoriasService } from '@/services/categorias'
import { contasService } from '@/services/contas'
import { formatarMoeda, formatarData } from '@/utils/formato'

// â”€â”€â”€ Schemas â”€â”€â”€
const schemaCriar = z.object({
  descricao: z.string().min(2, 'Mínimo 2 caracteres'),
  categoria_id: z.string().min(1, 'Selecione uma categoria'),
  valor: z.coerce.number().positive('Valor deve ser positivo'),
  data_vencimento: z.string().min(1, 'Data obrigatória'),
  observacoes: z.string().optional(),
  recorrencia: z.enum(['NENHUMA', 'DIARIA', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL']).default('NENHUMA'),
  total_ocorrencias: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().int().min(2).max(120).optional()),
  total_parcelas: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().int().min(2).max(120).optional()),
  tipo_criacao: z.enum(['unica', 'parcelada', 'recorrente']).default('unica'),
})
type FormCriar = z.infer<typeof schemaCriar>

const schemaBaixar = z.object({
  conta_id: z.string().min(1, 'Selecione uma conta'),
  data_pagamento: z.string().optional(),
  valor_pago: z.coerce.number().positive().optional(),
})
type FormBaixar = z.infer<typeof schemaBaixar>

// â”€â”€â”€ Constants â”€â”€â”€
const STATUS_CONFIG: Record<ContaPagarStatus, { label: string; color: string; icon: any; bg: string }> = {
  PENDENTE: { label: 'Pendente', color: 'text-amber-500', icon: Clock, bg: 'bg-amber-500/10' },
  PAGO: { label: 'Pago', color: 'text-green-500', icon: CheckCircle2, bg: 'bg-green-500/10' },
  VENCIDO: { label: 'Vencido', color: 'text-rose-500', icon: AlertCircle, bg: 'bg-rose-500/10' },
  CANCELADO: { label: 'Cancelado', color: 'text-slate-400', icon: XCircle, bg: 'bg-slate-400/10' },
}

const EASE = [0.25, 1, 0.5, 1] as [number, number, number, number]

export default function ContasPagarPage() {
  const qc = useQueryClient()
  const [filtroStatus, setFiltroStatus] = useState<ContaPagarStatus | 'TODOS'>('TODOS')
  const [modalCriar, setModalCriar] = useState(false)
  const [modalBaixar, setModalBaixar] = useState<ContaPagar | null>(null)
  const [editando, setEditando] = useState<ContaPagar | null>(null)
  const [confirmandoCancelar, setConfirmandoCancelar] = useState<ContaPagar | null>(null)
  const [uploadContaId, setUploadContaId] = useState<string | null>(null)
  const [modalParcelas, setModalParcelas] = useState<ContaPagar[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // â”€â”€ Queries â”€â”€
  const { data: resumoData } = useQuery({ queryKey: ['contas-pagar-resumo'], queryFn: contasPagarService.resumo })
  const { data: listaData, isLoading } = useQuery({
    queryKey: ['contas-pagar', filtroStatus],
    queryFn: () => contasPagarService.listar(filtroStatus !== 'TODOS' ? { status: filtroStatus } : undefined)
  })
  const { data: categoriasData } = useQuery({ queryKey: ['categorias'], queryFn: categoriasService.listar })
  const { data: contasData } = useQuery({ queryKey: ['contas'], queryFn: contasService.listar })

  const contas = listaData?.contas ?? []
  const resumo = resumoData?.resumo
  const categoriasDespesa = (categoriasData?.categorias ?? []).filter((c) => c.tipo === 'DESPESA')
  const contasFinanceiras = contasData?.contas ?? []

  // â”€â”€ Mutations â”€â”€
  const { mutateAsync: criar, isPending: criando } = useMutation({
    mutationFn: contasPagarService.criar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas-pagar'] })
      qc.invalidateQueries({ queryKey: ['contas-pagar-resumo'] })
      toast.success('Conta a pagar criada!')
      setModalCriar(false)
      resetCriar()
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao criar'),
  })

  const { mutateAsync: editar, isPending: editando_ } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => contasPagarService.editar(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas-pagar'] })
      qc.invalidateQueries({ queryKey: ['contas-pagar-resumo'] })
      toast.success('Atualizado!')
      setEditando(null)
      resetCriar()
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao editar'),
  })

  const { mutateAsync: baixar, isPending: baixando } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormBaixar }) => contasPagarService.baixar(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas-pagar'] })
      qc.invalidateQueries({ queryKey: ['contas-pagar-resumo'] })
      qc.invalidateQueries({ queryKey: ['lancamentos'] })
      toast.success('Pagamento registrado!')
      setModalBaixar(null)
      resetBaixar()
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao baixar'),
  })

  const { mutateAsync: cancelar, isPending: cancelando } = useMutation({
    mutationFn: (id: string) => contasPagarService.cancelar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas-pagar'] })
      qc.invalidateQueries({ queryKey: ['contas-pagar-resumo'] })
      toast.success('Conta cancelada')
      setConfirmandoCancelar(null)
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao cancelar'),
  })

  const { mutateAsync: uploadComprovante } = useMutation({
    mutationFn: ({ id, arquivo }: { id: string; arquivo: File }) => contasPagarService.uploadComprovante(id, arquivo),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contas-pagar'] }); toast.success('Comprovante enviado!'); setUploadContaId(null) },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao enviar comprovante'),
  })

  // â”€â”€ Forms â”€â”€
  const { register: registerCriar, handleSubmit: handleCriar, reset: resetCriar, watch: watchCriar, formState: { errors: errorsCriar } } = useForm<FormCriar>({
    resolver: zodResolver(schemaCriar),
    defaultValues: { tipo_criacao: 'unica', recorrencia: 'NENHUMA' }
  })

  const { register: registerBaixar, handleSubmit: handleBaixar, reset: resetBaixar, formState: { errors: errorsBaixar } } = useForm<FormBaixar>({
    resolver: zodResolver(schemaBaixar)
  })

  const tipoCriacao = watchCriar('tipo_criacao')

  // â”€â”€ Handlers â”€â”€
  function abrirEditar(conta: ContaPagar) {
    resetCriar({
      descricao: conta.descricao,
      categoria_id: conta.categoria_id,
      valor: conta.valor,
      data_vencimento: conta.data_vencimento.slice(0, 10),
      observacoes: conta.observacoes ?? '',
      tipo_criacao: 'unica',
      recorrencia: 'NENHUMA',
    })
    setEditando(conta)
    setModalCriar(true)
  }

  const onSubmitCriar = async (form: FormCriar) => {
    const payload: any = { ...form, recorrencia: form.recorrencia || 'NENHUMA' }
    if (editando) { await editar({ id: editando.id, data: payload }); return }
    await criar(payload)
  }

  const onSubmitBaixar = async (form: FormBaixar) => {
    if (!modalBaixar) return
    await baixar({ id: modalBaixar.id, data: form })
  }

  return (
    <AppShell>
      <div className="p-8 max-w-[1400px] mx-auto space-y-10">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: EASE }}>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none mb-2">Contas a Pagar</h1>
            <p className="text-slate-500 font-medium italic">Gestão de obrigações e compromissos futuros</p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { resetCriar(); setModalCriar(true) }}
            className="flex items-center gap-2 h-12 px-6 rounded-2xl bg-indigo-600 text-sm font-bold text-white shadow-[0_8px_16px_rgba(79,70,229,0.25)] hover:bg-indigo-700 transition-all cursor-pointer"
          >
            <Plus size={20} strokeWidth={3} />
            Agendar Pagamento
          </motion.button>
        </header>

        {/* Resumo Metrics */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <AnimatePresence mode="wait">
            {resumo ? (
              <>
                {[
                  { label: 'Pendentes', data: resumo.pendentes, config: STATUS_CONFIG.PENDENTE, index: 0 },
                  { label: 'Vencidas', data: resumo.vencidas, config: STATUS_CONFIG.VENCIDO, index: 1 },
                  { label: 'Pagas (Mês)', data: resumo.pagas_mes, config: STATUS_CONFIG.PAGO, index: 2 },
                  { label: 'Fluxo Total', data: resumo.total_mes, config: { label: 'Total', color: 'text-slate-900', icon: TrendingDown, bg: 'bg-slate-100' }, index: 3 }
                ].map((item) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: item.index * 0.1, duration: 0.4, ease: EASE }}
                    className="card-premium p-6 group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
                      <div className={`p-1.5 rounded-lg ${item.config.bg} ${item.config.color} opacity-80 group-hover:opacity-100 transition-opacity`}>
                        <item.config.icon size={14} />
                      </div>
                    </div>
                    <p className={`text-2xl font-bold font-mono tracking-tighter ${item.config.color}`}>
                      {formatarMoeda(item.data.valor)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                      {item.data.quantidade} {item.data.quantidade !== 1 ? 'itens registrados' : 'item registrado'}
                    </p>
                  </motion.div>
                ))}
              </>
            ) : (
              [1, 2, 3, 4].map(i => <div key={i} className="card-premium h-28 animate-pulse opacity-50" />)
            )}
          </AnimatePresence>
        </section>

        {/* Filters and List */}
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/60 shadow-sm">
            <div className="flex items-center gap-1.5">
              <Filter size={14} className="text-slate-400 mr-2" />
              {(['TODOS', 'PENDENTE', 'VENCIDO', 'PAGO', 'CANCELADO'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFiltroStatus(s)}
                  className={`px-4 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${filtroStatus === s
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                    : 'text-slate-500 hover:bg-slate-100'
                    }`}
                >
                  {s === 'TODOS' ? 'Tudo' : STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Pesquisar compromissos..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-[13px] placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
          </div>

          {/* Lista com agrupamento de parcelas */}
          <div className="grid grid-cols-1 gap-3">
            {isLoading ? (
              [1, 2, 3, 4, 5].map(i => <div key={i} className="card-premium h-20 animate-pulse opacity-50" />)
            ) : contas.length === 0 ? (
              <div className="card-premium py-20 text-center flex flex-col items-center justify-center border-dashed">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Receipt size={32} className="text-slate-200" />
                </div>
                <h3 className="text-slate-900 font-bold">Nenhum registro encontrado</h3>
                <p className="text-slate-400 text-sm mt-1 max-w-[280px]">Não encontramos nenhuma conta com o filtro selecionado no momento.</p>
              </div>
            ) : (() => {
              // Agrupa por grupo_parcelas ?? grupo_recorrencia ?? id
              const grupos = contas.reduce((acc, conta) => {
                const chave = conta.grupo_parcelas ?? conta.grupo_recorrencia ?? conta.id
                if (!acc[chave]) acc[chave] = []
                acc[chave].push(conta)
                return acc
              }, {} as Record<string, typeof contas>)

              // Ordena cada grupo por parcela_atual / ocorrencia_atual
              Object.values(grupos).forEach(g =>
                g.sort((a, b) => (a.parcela_atual ?? a.ocorrencia_atual ?? 0) - (b.parcela_atual ?? b.ocorrencia_atual ?? 0))
              )

              // Ordem dos grupos: pelo vencimento do primeiro item
              const chavesOrdenadas = Object.keys(grupos).sort((a, b) =>
                new Date(grupos[a][0].data_vencimento).getTime() - new Date(grupos[b][0].data_vencimento).getTime()
              )

              return (
                <AnimatePresence mode="popLayout">
                  {chavesOrdenadas.map((chave, idx) => {
                    const grupo = grupos[chave]
                    const principal = grupo[0]
                    const eGrupo = grupo.length > 1
                    const totalValor = grupo.reduce((s, c) => s + Number(c.valor), 0)

                    // Status predominante (prioridade: VENCIDO > PENDENTE > PAGO > CANCELADO)
                    const prioridade: Record<string, number> = { VENCIDO: 4, PENDENTE: 3, PAGO: 2, CANCELADO: 1 }
                    const statusGrupo = grupo.reduce((melhor, c) =>
                      (prioridade[c.status] ?? 0) > (prioridade[melhor] ?? 0) ? c.status : melhor
                    , grupo[0].status)
                    const configGrupo = STATUS_CONFIG[statusGrupo]
                    const IconGrupo = configGrupo.icon
                    const pagas = grupo.filter(c => c.status === 'PAGO').length

                    return (
                      <motion.div
                        key={chave}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ delay: idx * 0.03, ease: EASE }}
                      >
                        <div
                          onClick={() => eGrupo && setModalParcelas(grupo)}
                          className={`card-premium group flex items-center gap-4 p-4 transition-all ${
                            eGrupo ? 'cursor-pointer hover:border-indigo-200' : 'cursor-default hover:border-indigo-100'
                          }`}
                        >
                          {/* Descrição e metadados */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`font-bold truncate leading-tight uppercase tracking-tight transition-colors ${
                                eGrupo ? 'text-slate-800 group-hover:text-indigo-600' : 'text-slate-800'
                              }`}>
                                {principal.descricao}
                              </h4>
                              {eGrupo && (
                                <span className="flex-shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-500 text-[10px] font-black font-mono border border-indigo-100">
                                  <Layers size={10} />
                                  {pagas}/{grupo.length}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                              <span>{principal.categoria?.nome}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-200" />
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-100/50">
                                <CalendarDays size={12} className="text-indigo-400" />
                                <span className="text-slate-500">
                                  {eGrupo
                                    ? `vence ${formatarData(principal.data_vencimento)}`
                                    : formatarData(principal.data_vencimento)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Valor e status */}
                          <div className="text-right flex flex-col items-end gap-1.5 flex-shrink-0">
                            <span className="text-lg font-black font-mono tabular-nums text-slate-900 tracking-tighter">
                              {formatarMoeda(eGrupo ? totalValor : principal.valor)}
                            </span>
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${configGrupo.bg} ${configGrupo.color} shadow-sm border border-current opacity-70`}>
                              <IconGrupo size={12} strokeWidth={3} />
                              {eGrupo ? `${pagas} pagas` : configGrupo.label}
                            </div>
                          </div>

                          {/* Ações (apenas para itens únicos) */}
                          {!eGrupo && (
                            <div className="flex items-center gap-2 border-l border-slate-100 pl-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              {principal.status === 'PENDENTE' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setModalBaixar(principal) }}
                                  className="p-2 rounded-xl bg-green-500 text-white shadow-lg shadow-green-500/20 hover:bg-green-600 cursor-pointer"
                                  title="Pagar agora"
                                >
                                  <CheckCircle2 size={16} strokeWidth={2.5} />
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); abrirEditar(principal) }}
                                className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
                              >
                                <Pencil size={16} strokeWidth={2.5} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setConfirmandoCancelar(principal) }}
                                className="p-2 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 cursor-pointer"
                              >
                                <Trash2 size={16} strokeWidth={2.5} />
                              </button>
                            </div>
                          )}

                          {/* Seta indicadora */}
                          <div className="text-slate-300 group-hover:translate-x-1 group-hover:text-indigo-400 transition-all duration-300 ml-1">
                            <ChevronRight size={18} strokeWidth={3} />
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              )
            })()}
          </div>
        </section>
      </div>

      <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0]
        if (file && uploadContaId) uploadComprovante({ id: uploadContaId, arquivo: file })
      }} />

      {/* Modal de Parcelas/Ocorrências */}
      <Modal
        aberto={!!modalParcelas}
        titulo={modalParcelas ? `${modalParcelas[0].descricao} — ${modalParcelas.length} parcelas` : ''}
        onFechar={() => setModalParcelas(null)}
        largura="lg"
      >
        {modalParcelas && (
          <div className="space-y-3">
            {/* Resumo do grupo */}
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 mb-2">
              <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                <Layers size={13} className="text-indigo-400" />
                {modalParcelas.filter(p => p.status === 'PAGO').length} de {modalParcelas.length} pagas
              </div>
              <span className="text-sm font-black font-mono text-slate-900">
                Total: {formatarMoeda(modalParcelas.reduce((s, p) => s + Number(p.valor), 0))}
              </span>
            </div>

            {/* Lista de parcelas */}
            {modalParcelas.map((parcela) => {
              const cfg = STATUS_CONFIG[parcela.status]
              const Ico = cfg.icon
              return (
                <div
                  key={parcela.id}
                  className="card-premium group flex items-center gap-4 px-4 py-3 hover:border-indigo-200 transition-all"
                >
                  {/* Número */}
                  <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-[12px] font-black text-indigo-600 font-mono border border-indigo-100">
                    {parcela.parcela_atual ?? parcela.ocorrencia_atual}
                  </span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">
                      Parcela {parcela.parcela_atual ?? parcela.ocorrencia_atual} de {parcela.total_parcelas ?? parcela.total_ocorrencias}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 mt-0.5">
                      <CalendarDays size={10} className="text-indigo-400" />
                      {formatarData(parcela.data_vencimento)}
                    </div>
                  </div>

                  {/* Valor e status */}
                  <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-sm font-black font-mono tabular-nums text-slate-900">
                      {formatarMoeda(parcela.valor)}
                    </span>
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${cfg.bg} ${cfg.color} border border-current opacity-80`}>
                      <Ico size={10} strokeWidth={3} />
                      {cfg.label}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1.5 border-l border-slate-100 pl-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {parcela.status === 'PENDENTE' && (
                      <button
                        onClick={() => { setModalParcelas(null); setModalBaixar(parcela) }}
                        className="p-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 cursor-pointer"
                        title="Pagar"
                      >
                        <CheckCircle2 size={14} strokeWidth={2.5} />
                      </button>
                    )}
                    <button
                      onClick={() => { setModalParcelas(null); abrirEditar(parcela) }}
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
                    >
                      <Pencil size={14} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={() => { setModalParcelas(null); setConfirmandoCancelar(parcela) }}
                      className="p-1.5 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 cursor-pointer"
                    >
                      <Trash2 size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Modal>

      {/* Modal Criar/Editar (Premium Version) */}
      <Modal aberto={modalCriar} titulo={editando ? 'Ajustar Compromisso' : 'Novo Agendamento Financeiro'} onFechar={() => { setModalCriar(false); setEditando(null); resetCriar() }}>
        <form onSubmit={handleCriar(onSubmitCriar)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-full">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Descrição do Pagamento</label>
              <input {...registerCriar('descricao')} className="premium-input text-lg font-bold" placeholder="Ex: Assinatura SaaS, Aluguel..." />
              {errorsCriar.descricao && <span className="text-[10px] text-rose-500 font-bold ml-1">{errorsCriar.descricao.message}</span>}
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Valor Previsto</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">R$</span>
                <input {...registerCriar('valor')} type="number" step="0.01" className="premium-input pl-10 font-black font-mono" placeholder="0,00" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Data de Vencimento</label>
              <input {...registerCriar('data_vencimento')} type="date" className="premium-input font-bold" />
            </div>

            <div className="col-span-full">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Categoria de Despesa</label>
              <select {...registerCriar('categoria_id')} className="premium-input font-bold">
                <option value="">Selecione uma categoria...</option>
                {categoriasDespesa.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.parent_id ? `↳ ${c.nome}` : c.nome}
                  </option>
                ))}
              </select>
            </div>

            {!editando && (
              <div className="col-span-full bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block text-center">Configuração de Ciclo</label>
                <div className="flex gap-2">
                  {['unica', 'parcelada', 'recorrente'].map((v) => (
                    <label key={v} className={`flex-1 flex flex-col items-center p-3 rounded-xl border-2 transition-all cursor-pointer ${tipoCriacao === v ? 'border-indigo-600 bg-white shadow-md text-indigo-600' : 'border-slate-100 bg-transparent text-slate-400'
                      }`}>
                      <input {...registerCriar('tipo_criacao')} type="radio" value={v} className="hidden" />
                      <span className="text-[10px] font-black uppercase tracking-tighter">{v}</span>
                    </label>
                  ))}
                </div>

                {tipoCriacao !== 'unica' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200/50">
                    {tipoCriacao === 'parcelada' ? (
                      <div className="col-span-full">
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block">Número de Parcelas</label>
                        <input {...registerCriar('total_parcelas')} type="number" className="premium-input" placeholder="Ex: 12" />
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block">Frequência</label>
                          <select {...registerCriar('recorrencia')} className="premium-input">
                            <option value="MENSAL">Mensal</option>
                            <option value="DIARIA">Diária</option>
                            <option value="ANUAL">Anual</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 block">Ocorrências</label>
                          <input {...registerCriar('total_ocorrencias')} type="number" className="premium-input" placeholder="Ex: 12" />
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalCriar(false)} className="h-12 px-8 rounded-2xl text-slate-500 font-bold hover:bg-slate-50 cursor-pointer">Descartar</button>
            <button type="submit" disabled={criando || editando_} className="h-12 px-10 rounded-2xl bg-slate-900 text-white font-black shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer disabled:opacity-50">
              {criando || editando_ ? 'Agendando...' : editando ? 'Salvar Alterações' : 'Confirmar Agendamento'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Baixar (Registrar Pagamento) */}
      <Modal aberto={!!modalBaixar} titulo="Confirmar Pagamento" onFechar={() => { setModalBaixar(null); resetBaixar() }}>
        {modalBaixar && (
          <form onSubmit={handleBaixar(onSubmitBaixar)} className="space-y-6">
            <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-600/20">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Liquidando Compromisso</span>
              <h3 className="text-xl font-black mt-1">{modalBaixar.descricao}</h3>
              <div className="flex items-end gap-2 mt-4">
                <span className="text-4xl font-black font-mono tracking-tighter">{formatarMoeda(modalBaixar.valor)}</span>
                <span className="text-xs font-bold opacity-60 mb-2 whitespace-nowrap">Vencimento em {formatarData(modalBaixar.data_vencimento)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Conta de Origem</label>
                <select {...registerBaixar('conta_id')} className="premium-input font-bold">
                  <option value="">Selecione a conta financeira...</option>
                  {contasFinanceiras.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                {errorsBaixar.conta_id && <span className="text-[10px] text-rose-500 font-bold">{errorsBaixar.conta_id.message}</span>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Data da Liquidação</label>
                  <input {...registerBaixar('data_pagamento')} type="date" className="premium-input font-bold" defaultValue={new Date().toISOString().slice(0, 10)} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Valor Efetivo Pago</label>
                  <input {...registerBaixar('valor_pago')} type="number" step="0.01" className="premium-input font-black font-mono" placeholder={String(modalBaixar.valor)} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setModalBaixar(null)} className="h-12 px-8 rounded-2xl text-slate-500 font-bold hover:bg-slate-50 cursor-pointer">Voltar</button>
              <button type="submit" disabled={baixando} className="flex-1 h-12 rounded-2xl bg-green-500 text-white font-black shadow-lg shadow-green-500/20 hover:bg-green-600 transition-all cursor-pointer disabled:opacity-50">
                {baixando ? 'Finalizando...' : 'Confirmar Liquidação'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        aberto={!!confirmandoCancelar}
        titulo="Cancelar Compromisso?"
        mensagem={`Esta ação interrompe o fluxo financeiro para "${confirmandoCancelar?.descricao}". Deseja prosseguir?`}
        onConfirmar={() => confirmandoCancelar && cancelar(confirmandoCancelar.id)}
        onCancelar={() => setConfirmandoCancelar(null)}
        carregando={cancelando}
      />
    </AppShell>
  )
}
