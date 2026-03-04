import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, AlertCircle, CheckCircle2, Clock, XCircle,
  Receipt, Pencil, Trash2, ChevronDown, Upload, ExternalLink,
  CalendarDays, TrendingDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import AppShell from '@/components/layout/AppShell'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { contasPagarService, type ContaPagar, type ContaPagarStatus } from '@/services/contasPagar'
import { categoriasService } from '@/services/categorias'
import { contasService } from '@/services/contas'
import { formatarMoeda, formatarData } from '@/utils/formato'

// â”€â”€â”€ Schemas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const schemaCriar = z.object({
  descricao: z.string().min(2, 'MÃ­nimo 2 caracteres'),
  categoria_id: z.string().min(1, 'Selecione uma categoria'),
  valor: z.coerce.number().positive('Valor deve ser positivo'),
  data_vencimento: z.string().min(1, 'Data obrigatÃ³ria'),
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

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STATUS_LABELS: Record<ContaPagarStatus, string> = {
  PENDENTE: 'Pendente',
  PAGO: 'Pago',
  VENCIDO: 'Vencido',
  CANCELADO: 'Cancelado',
}

const STATUS_BADGE: Record<ContaPagarStatus, string> = {
  PENDENTE: 'bg-amber-50 text-amber-700',
  PAGO: 'bg-green-50 text-green-700',
  VENCIDO: 'bg-red-50 text-red-600',
  CANCELADO: 'bg-slate-100 text-slate-500',
}

const STATUS_ICONE: Record<ContaPagarStatus, React.FC<{ className?: string }>> = {
  PENDENTE: Clock,
  PAGO: CheckCircle2,
  VENCIDO: AlertCircle,
  CANCELADO: XCircle,
}

function isVencida(conta: ContaPagar): boolean {
  return conta.status === 'PENDENTE' && new Date(conta.data_vencimento) < new Date()
}

// â”€â”€â”€ Componente principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function ContasPagarPage() {
  const qc = useQueryClient()

  const [filtroStatus, setFiltroStatus] = useState<ContaPagarStatus | 'TODOS'>('TODOS')
  const [modalCriar, setModalCriar] = useState(false)
  const [modalBaixar, setModalBaixar] = useState<ContaPagar | null>(null)
  const [editando, setEditando] = useState<ContaPagar | null>(null)
  const [confirmandoCancelar, setConfirmandoCancelar] = useState<ContaPagar | null>(null)
  const [uploadContaId, setUploadContaId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // â”€â”€ Queries â”€â”€
  const { data: resumoData } = useQuery({
    queryKey: ['contas-pagar-resumo'],
    queryFn: contasPagarService.resumo,
  })

  const { data: listaData, isLoading } = useQuery({
    queryKey: ['contas-pagar', filtroStatus],
    queryFn: () =>
      contasPagarService.listar(filtroStatus !== 'TODOS' ? { status: filtroStatus } : undefined),
  })

  const { data: categoriasData } = useQuery({
    queryKey: ['categorias'],
    queryFn: categoriasService.listar,
  })

  const { data: contasData } = useQuery({
    queryKey: ['contas'],
    queryFn: contasService.listar,
  })

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
    mutationFn: ({ id, data }: { id: string; data: FormBaixar }) =>
      contasPagarService.baixar(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas-pagar'] })
      qc.invalidateQueries({ queryKey: ['contas-pagar-resumo'] })
      qc.invalidateQueries({ queryKey: ['lancamentos'] })
      toast.success('Pagamento registrado! Lançamento criado automaticamente.')
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
    mutationFn: ({ id, arquivo }: { id: string; arquivo: File }) =>
      contasPagarService.uploadComprovante(id, arquivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contas-pagar'] })
      toast.success('Comprovante enviado!')
      setUploadContaId(null)
    },
    onError: (e: any) => toast.error(e.message ?? 'Erro ao enviar comprovante'),
  })

  // â”€â”€ Forms â”€â”€
  const {
    register: registerCriar,
    handleSubmit: handleCriar,
    reset: resetCriar,
    watch: watchCriar,
    formState: { errors: errorsCriar },
  } = useForm<FormCriar>({ resolver: zodResolver(schemaCriar), defaultValues: { tipo_criacao: 'unica', recorrencia: 'NENHUMA' } })

  const {
    register: registerBaixar,
    handleSubmit: handleBaixar,
    reset: resetBaixar,
    formState: { errors: errorsBaixar },
  } = useForm<FormBaixar>({ resolver: zodResolver(schemaBaixar) })

  const tipoCriacao = watchCriar('tipo_criacao')
  watchCriar('recorrencia')

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

  function fecharModalCriar() {
    setModalCriar(false)
    setEditando(null)
    resetCriar()
  }

  const onSubmitCriar = async (form: FormCriar) => {
    const payload: any = {
      descricao: form.descricao,
      categoria_id: form.categoria_id,
      valor: form.valor,
      data_vencimento: form.data_vencimento,
      observacoes: form.observacoes || undefined,
      recorrencia: 'NENHUMA',
    }

    if (editando) {
      await editar({ id: editando.id, data: payload })
      return
    }

    if (form.tipo_criacao === 'parcelada') {
      if (!form.total_parcelas) {
        toast.error('Informe o nÃºmero de parcelas')
        return
      }
      payload.total_parcelas = form.total_parcelas
    } else if (form.tipo_criacao === 'recorrente') {
      if (!form.recorrencia || form.recorrencia === 'NENHUMA') {
        toast.error('Selecione uma frequÃªncia de recorrÃªncia')
        return
      }
      if (!form.total_ocorrencias) {
        toast.error('Informe a quantidade de ocorrÃªncias')
        return
      }
      payload.recorrencia = form.recorrencia
      payload.total_ocorrencias = form.total_ocorrencias
    }

    await criar(payload)
  }

  const onSubmitBaixar = async (form: FormBaixar) => {
    if (!modalBaixar) return
    await baixar({ id: modalBaixar.id, data: form })
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !uploadContaId) return
    await uploadComprovante({ id: uploadContaId, arquivo: file })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const inputClass =
    'w-full h-8 rounded-md border border-slate-200 px-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:ring-1 focus:ring-green-100 outline-none transition-colors bg-white'
  const labelClass = 'block text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1'

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* CabeÃ§alho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Contas a Pagar</h1>
            <p className="text-sm text-slate-500 mt-0.5">Agenda de compromissos financeiros</p>
          </div>
          <button
            onClick={() => { resetCriar(); setModalCriar(true) }}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-green-600 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nova conta
          </button>
        </div>

        {/* KPIs resumo */}
        {resumo && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Pendentes',
                valor: resumo.pendentes.valor,
                qtd: resumo.pendentes.quantidade,
                cor: 'text-amber-600',
                bg: 'bg-amber-50',
              },
              {
                label: 'Vencidas',
                valor: resumo.vencidas.valor,
                qtd: resumo.vencidas.quantidade,
                cor: 'text-red-600',
                bg: 'bg-red-50',
              },
              {
                label: 'Pagas no mÃªs',
                valor: resumo.pagas_mes.valor,
                qtd: resumo.pagas_mes.quantidade,
                cor: 'text-green-600',
                bg: 'bg-green-50',
              },
              {
                label: 'Total do mÃªs',
                valor: resumo.total_mes.valor,
                qtd: resumo.total_mes.quantidade,
                cor: 'text-slate-900',
                bg: 'bg-slate-50',
              },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{item.label}</p>
                <p className={`mt-1.5 font-mono tabular-nums text-xl font-bold ${item.cor}`}>
                  {formatarMoeda(item.valor)}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{item.qtd} {item.qtd !== 1 ? 'itens' : 'item'}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filtros */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['TODOS', 'PENDENTE', 'VENCIDO', 'PAGO', 'CANCELADO'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFiltroStatus(s)}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${filtroStatus === s
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
            >
              {s === 'TODOS' ? 'Todas' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-white border border-slate-200 shadow-sm p-5 h-20 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-slate-100" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3.5 w-40 bg-slate-100 rounded" />
                    <div className="h-3 w-24 bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : contas.length === 0 ? (
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm py-16 text-center">
            <TrendingDown className="mx-auto h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-500">Nenhuma conta a pagar encontrada</p>
            <p className="text-xs text-slate-400 mt-1">Crie uma conta para comeÃ§ar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {contas.map((conta) => {
              const vencida = isVencida(conta)
              const StatusIcon = STATUS_ICONE[conta.status]
              const statusEfetivo: ContaPagarStatus = vencida ? 'VENCIDO' : conta.status

              return (
                <div
                  key={conta.id}
                  className={`flex items-center gap-4 rounded-xl bg-white border shadow-sm p-4 hover:border-slate-300 transition-colors ${vencida ? 'border-red-200' : 'border-slate-200'
                    }`}
                >
                  {/* Ãcone categoria */}
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white text-base"
                    style={{ backgroundColor: conta.categoria?.cor ?? '#64748b' }}
                  >
                    {conta.categoria?.icone ?? 'ðŸ’¸'}
                  </div>

                  {/* InformaÃ§Ãµes */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 truncate">{conta.descricao}</p>
                      {(conta.total_parcelas ?? 0) > 1 && (
                        <span className="text-xs text-slate-400 font-mono">
                          {conta.parcela_atual}/{conta.total_parcelas}
                        </span>
                      )}
                      {(conta.total_ocorrencias ?? 0) > 1 && (
                        <span className="text-xs text-slate-400 font-mono">
                          {conta.ocorrencia_atual}/{conta.total_ocorrencias}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-400">{conta.categoria?.nome}</span>
                      <span className="text-xs text-slate-300">â€¢</span>
                      <span className={`flex items-center gap-1 text-xs font-medium ${vencida ? 'text-red-600' : 'text-slate-500'
                        }`}>
                        <CalendarDays className="h-3 w-3" />
                        {formatarData(conta.data_vencimento)}
                      </span>
                    </div>
                  </div>

                  {/* Valor */}
                  <div className="text-right">
                    <p className="font-mono tabular-nums text-sm font-semibold text-slate-900">
                      {formatarMoeda(conta.valor)}
                    </p>
                    <span className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[statusEfetivo]}`}>
                      <StatusIcon className="h-3 w-3" />
                      {STATUS_LABELS[statusEfetivo]}
                    </span>
                  </div>

                  {/* AÃ§Ãµes */}
                  <div className="flex items-center gap-1 ml-1">
                    {conta.status === 'PENDENTE' && (
                      <button
                        onClick={() => { setModalBaixar(conta); resetBaixar({ conta_id: '', data_pagamento: new Date().toISOString().slice(0, 10) }) }}
                        className="rounded-lg px-2 py-1.5 text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors flex items-center gap-1"
                        title="Registrar pagamento"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Baixar
                      </button>
                    )}
                    {conta.status === 'PAGO' && (
                      <button
                        onClick={() => { setUploadContaId(conta.id); fileInputRef.current?.click() }}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        title={conta.comprovante_url ? 'Substituir comprovante' : 'Anexar comprovante'}
                      >
                        <Upload className="h-4 w-4" />
                      </button>
                    )}
                    {conta.comprovante_url && (
                      <a
                        href={conta.comprovante_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        title="Ver comprovante"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    {conta.status === 'PENDENTE' && (
                      <button
                        onClick={() => abrirEditar(conta)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {conta.status !== 'PAGO' && conta.status !== 'CANCELADO' && (
                      <button
                        onClick={() => setConfirmandoCancelar(conta)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Input file oculto para upload de comprovante */}
      <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className="hidden" onChange={handleFileChange} />

      {/* â”€â”€ Modal Criar/Editar â”€â”€ */}
      <Modal
        aberto={modalCriar}
        titulo={editando ? 'Editar conta a pagar' : 'Nova conta a pagar'}
        onFechar={fecharModalCriar}
      >
        <form onSubmit={handleCriar(onSubmitCriar)} className="space-y-3">

          {/* DescriÃ§Ã£o */}
          <div>
            <label className={labelClass}>DescriÃ§Ã£o</label>
            <input
              {...registerCriar('descricao')}
              placeholder="Ex: Aluguel, Internet..."
              className={inputClass}
            />
            {errorsCriar.descricao && <p className="mt-0.5 text-[11px] text-red-500">{errorsCriar.descricao.message}</p>}
          </div>

          {/* Valor + Vencimento + Categoria em linha */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Valor</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                <input
                  {...registerCriar('valor')}
                  type="number" step="0.01" min="0.01" placeholder="0,00"
                  className={`${inputClass} pl-8 font-mono`}
                />
              </div>
              {errorsCriar.valor && <p className="mt-0.5 text-[11px] text-red-500">{errorsCriar.valor.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Vencimento</label>
              <input {...registerCriar('data_vencimento')} type="date" className={inputClass} />
              {errorsCriar.data_vencimento && <p className="mt-0.5 text-[11px] text-red-500">{errorsCriar.data_vencimento.message}</p>}
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className={labelClass}>Categoria</label>
            <select {...registerCriar('categoria_id')} className={inputClass}>
              <option value="">Selecione...</option>
              {categoriasDespesa.map((c) => (
                <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>
              ))}
            </select>
            {errorsCriar.categoria_id && <p className="mt-0.5 text-[11px] text-red-500">{errorsCriar.categoria_id.message}</p>}
          </div>

          {/* Tipo â€” apenas para novas contas */}
          {!editando && (
            <div>
              <label className={labelClass}>Tipo</label>
              <div className="flex gap-1.5">
                {[
                  { value: 'unica', label: 'Ãšnica' },
                  { value: 'parcelada', label: 'Parcelada' },
                  { value: 'recorrente', label: 'Recorrente' },
                ].map(({ value, label }) => (
                  <label
                    key={value}
                    className={`flex-1 flex items-center justify-center rounded-md border px-2 py-1.5 text-xs font-medium cursor-pointer transition-colors ${tipoCriacao === value
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'
                      }`}
                  >
                    <input {...registerCriar('tipo_criacao')} type="radio" value={value} className="hidden" />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Parcelamento â€” nÃºmero de parcelas */}
          {!editando && tipoCriacao === 'parcelada' && (
            <div>
              <label className={labelClass}>NÃºmero de parcelas</label>
              <input
                {...registerCriar('total_parcelas')}
                type="number" min="2" max="120" placeholder="Ex: 12"
                className={inputClass}
              />
              {errorsCriar.total_parcelas && <p className="mt-0.5 text-[11px] text-red-500">{errorsCriar.total_parcelas.message}</p>}
            </div>
          )}

          {/* RecorrÃªncia â€” frequÃªncia + ocorrÃªncias em linha */}
          {!editando && tipoCriacao === 'recorrente' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>FrequÃªncia</label>
                <select {...registerCriar('recorrencia')} className={inputClass}>
                  {[
                    { value: 'DIARIA', label: 'DiÃ¡ria' },
                    { value: 'SEMANAL', label: 'Semanal' },
                    { value: 'QUINZENAL', label: 'Quinzenal' },
                    { value: 'MENSAL', label: 'Mensal' },
                    { value: 'BIMESTRAL', label: 'Bimestral' },
                    { value: 'TRIMESTRAL', label: 'Trimestral' },
                    { value: 'SEMESTRAL', label: 'Semestral' },
                    { value: 'ANUAL', label: 'Anual' },
                  ].map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>OcorrÃªncias</label>
                <input
                  {...registerCriar('total_ocorrencias')}
                  type="number" min="2" max="120" placeholder="Ex: 12"
                  className={inputClass}
                />
                {errorsCriar.total_ocorrencias && <p className="mt-0.5 text-[11px] text-red-500">{errorsCriar.total_ocorrencias.message}</p>}
              </div>
            </div>
          )}

          {/* ObservaÃ§Ãµes */}
          <div>
            <label className={labelClass}>ObservaÃ§Ãµes <span className="normal-case text-slate-400 font-normal">(opcional)</span></label>
            <input {...registerCriar('observacoes')} placeholder="AnotaÃ§Ã£o livre..." className={inputClass} />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={fecharModalCriar}
              className="h-9 px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={criando || editando_}
              className="h-9 px-4 rounded-lg bg-green-600 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              {criando || editando_ ? 'Salvando...' : editando ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* â”€â”€ Modal Baixar (Registrar Pagamento) â”€â”€ */}
      <Modal
        aberto={!!modalBaixar}
        titulo="Registrar pagamento"
        onFechar={() => { setModalBaixar(null); resetBaixar() }}
      >
        {modalBaixar && (
          <form onSubmit={handleBaixar(onSubmitBaixar)} className="space-y-4">
            {/* Resumo da conta */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-900">{modalBaixar.descricao}</p>
              <p className="font-mono tabular-nums text-lg font-bold text-slate-900 mt-1">
                {formatarMoeda(modalBaixar.valor)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Vencimento: {formatarData(modalBaixar.data_vencimento)}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Conta financeira</label>
              <select {...registerBaixar('conta_id')} className={inputClass}>
                <option value="">Selecione a conta usada no pagamento...</option>
                {contasFinanceiras.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              {errorsBaixar.conta_id && <p className="mt-1 text-xs text-red-500">{errorsBaixar.conta_id.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Data do pagamento</label>
                <input
                  {...registerBaixar('data_pagamento')}
                  type="date"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Valor pago <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
                  <input
                    {...registerBaixar('valor_pago')}
                    type="number"
                    step="0.01"
                    placeholder={String(modalBaixar.valor)}
                    className={`${inputClass} pl-9 font-mono`}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Deixe vazio para usar o valor original</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setModalBaixar(null); resetBaixar() }}
                className="h-9 px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={baixando}
                className="h-9 px-4 rounded-lg bg-green-600 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                <Receipt className="h-4 w-4" />
                {baixando ? 'Registrando...' : 'Registrar pagamento'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* â”€â”€ Confirm Cancelar â”€â”€ */}
      <ConfirmDialog
        aberto={!!confirmandoCancelar}
        titulo="Cancelar conta"
        mensagem={`Tem certeza que deseja cancelar "${confirmandoCancelar?.descricao}"?`}
        onConfirmar={() => confirmandoCancelar && cancelar(confirmandoCancelar.id)}
        onCancelar={() => setConfirmandoCancelar(null)}
        carregando={cancelando}
      />
    </AppShell>
  )
}

