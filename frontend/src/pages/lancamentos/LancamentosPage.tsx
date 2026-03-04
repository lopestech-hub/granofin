import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight,
  Trash2, Pencil, CheckCircle2,
} from 'lucide-react'
import { motion } from 'motion/react'
import toast from 'react-hot-toast'
import AppShell from '@/components/layout/AppShell'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { lancamentosService, type Lancamento, type NovoLancamento } from '@/services/lancamentos'
import { contasService } from '@/services/contas'
import { categoriasService } from '@/services/categorias'
import { formatarMoeda, formatarData, formatarMesAno, mesAtual, anoAtual } from '@/utils/formato'

const schema = z.object({
  descricao: z.string().min(1, 'Descrição obrigatória'),
  valor: z.coerce.number().positive('Valor deve ser positivo'),
  tipo: z.enum(['RECEITA', 'DESPESA']),
  conta_id: z.string().uuid('Selecione uma conta'),
  categoria_id: z.string().uuid('Selecione uma categoria'),
  data: z.string().min(1, 'Data obrigatória'),
  efetivado: z.boolean().default(true),
  observacoes: z.string().optional(),
  total_parcelas: z.coerce.number().min(1).optional(),
})
type FormData = z.infer<typeof schema>

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lancamentos'] }); fecharModal(); toast.success('Lançamento criado') },
    onError: () => toast.error('Erro ao criar lançamento'),
  })

  const { mutateAsync: atualizar, isPending: atualizando } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NovoLancamento> }) => lancamentosService.atualizar(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lancamentos'] }); fecharModal(); toast.success('Lançamento atualizado') },
    onError: () => toast.error('Erro ao atualizar lançamento'),
  })

  const { mutateAsync: deletar, isPending: deletando } = useMutation({
    mutationFn: lancamentosService.deletar,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lancamentos'] }); setConfirmando(null); toast.success('Lançamento removido') },
    onError: () => toast.error('Erro ao remover lançamento'),
  })

  const { mutateAsync: efetivar } = useMutation({
    mutationFn: lancamentosService.efetivar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lancamentos'] }),
    onError: () => toast.error('Erro ao efetivar lançamento'),
  })

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors },
  } = useForm<FormData>({
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
    if (editando) {
      await atualizar({ id: editando.id, data: payload })
    } else {
      await criar(payload)
    }
  }

  // Totais
  const totalReceitas = filtrados.filter((l) => l.tipo === 'RECEITA' && l.efetivado).reduce((a, l) => a + l.valor, 0)
  const totalDespesas = filtrados.filter((l) => l.tipo === 'DESPESA' && l.efetivado).reduce((a, l) => a + l.valor, 0)

  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
        className="p-6 max-w-4xl mx-auto space-y-5"
      >
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Lançamentos</h1>
            <p className="text-sm text-slate-500 mt-0.5">Receitas e despesas do período</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Navegação mês */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white shadow-sm px-1 py-1">
              <button onClick={() => navegarMes(-1)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[120px] text-center text-sm font-medium text-slate-700 capitalize px-2">
                {formatarMesAno(mes, ano)}
              </span>
              <button
                onClick={() => navegarMes(1)}
                disabled={mes === mesAtual() && ano === anoAtual()}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={abrirCriar}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-green-600 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Novo
            </button>
          </div>
        </div>

        {/* Mini-resumo + filtro tipo */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm">
              <ArrowUpRight className="h-4 w-4 text-green-600" />
              <span className="font-mono tabular-nums font-semibold text-green-600">{formatarMoeda(totalReceitas)}</span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-1.5 text-sm">
              <ArrowDownRight className="h-4 w-4 text-red-500" />
              <span className="font-mono tabular-nums font-semibold text-slate-700">{formatarMoeda(totalDespesas)}</span>
            </div>
          </div>
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm text-xs font-medium">
            {(['TODOS', 'RECEITA', 'DESPESA'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFiltroTipo(t)}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  filtroTipo === t ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {t === 'TODOS' ? 'Todos' : t === 'RECEITA' ? 'Receitas' : 'Despesas'}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-5 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-9 w-9 rounded-xl bg-slate-100 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-40 bg-slate-100 rounded" />
                    <div className="h-3 w-24 bg-slate-100 rounded" />
                  </div>
                  <div className="h-4 w-24 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-slate-400">Nenhum lançamento encontrado</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {filtrados.map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors group">
                  {/* Ícone categoria */}
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-base"
                    style={{ backgroundColor: l.categoria.cor + '20', color: l.categoria.cor }}
                  >
                    {l.categoria.icone?.substring(0, 2) ?? '💰'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-900">{l.descricao}</p>
                      {l.total_parcelas && l.total_parcelas > 1 && (
                        <span className="flex-shrink-0 rounded px-1.5 py-0.5 text-xs bg-slate-100 text-slate-500 font-medium">
                          {l.parcela_atual}/{l.total_parcelas}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {l.categoria.nome} · {l.conta.nome} · {formatarData(l.data)}
                    </p>
                  </div>

                  {/* Valor + status */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!l.efetivado && (
                      <span className="rounded px-1.5 py-0.5 text-xs bg-amber-50 text-amber-600 font-medium">
                        Pendente
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      {l.tipo === 'RECEITA' ? (
                        <ArrowUpRight className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
                      )}
                      <span className={`font-mono tabular-nums text-sm font-semibold ${l.tipo === 'RECEITA' ? 'text-green-600' : 'text-slate-900'}`}>
                        {formatarMoeda(l.valor)}
                      </span>
                    </div>
                  </div>

                  {/* Ações (visíveis no hover) */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!l.efetivado && (
                      <button
                        onClick={() => efetivar(l.id)}
                        title="Efetivar"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-green-50 hover:text-green-600 transition-colors"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => abrirEditar(l)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setConfirmando(l)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>

      {/* Modal criar/editar */}
      <Modal
        aberto={modalAberto}
        titulo={editando ? 'Editar lançamento' : 'Novo lançamento'}
        onFechar={fecharModal}
        largura="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tipo */}
          <div className="flex gap-2">
            {(['DESPESA', 'RECEITA'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setValue('tipo', t); setValue('categoria_id', '' as any) }}
                className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${
                  tipoForm === t
                    ? t === 'RECEITA'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-red-400 bg-red-50 text-red-600'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {t === 'RECEITA' ? '↑ Receita' : '↓ Despesa'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Descrição */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Descrição</label>
              <input
                {...register('descricao')}
                placeholder="Ex: Aluguel, Salário..."
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-colors"
              />
              {errors.descricao && <p className="mt-1 text-xs text-red-500">{errors.descricao.message}</p>}
            </div>

            {/* Valor */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Valor</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
                <input
                  {...register('valor')}
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  className="w-full h-9 rounded-lg border border-slate-300 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-colors font-mono"
                />
              </div>
              {errors.valor && <p className="mt-1 text-xs text-red-500">{errors.valor.message}</p>}
            </div>

            {/* Data */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Data</label>
              <input
                {...register('data')}
                type="date"
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-colors"
              />
              {errors.data && <p className="mt-1 text-xs text-red-500">{errors.data.message}</p>}
            </div>

            {/* Conta */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Conta</label>
              <select
                {...register('conta_id')}
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-colors bg-white"
              >
                <option value="">Selecione...</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              {errors.conta_id && <p className="mt-1 text-xs text-red-500">{errors.conta_id.message}</p>}
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Categoria</label>
              <select
                {...register('categoria_id')}
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-colors bg-white"
              >
                <option value="">Selecione...</option>
                {categoriasFiltradas.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              {errors.categoria_id && <p className="mt-1 text-xs text-red-500">{errors.categoria_id.message}</p>}
            </div>
          </div>

          {/* Parcelamento (só criação de despesas) */}
          {!editando && tipoForm === 'DESPESA' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Parcelamento <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <input
                  {...register('total_parcelas')}
                  type="number"
                  min="1"
                  max="60"
                  placeholder="1 = sem parcelamento"
                  className="w-full h-9 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-colors font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">parcelas</span>
              </div>
            </div>
          )}

          {/* Efetivado */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input {...register('efetivado')} type="checkbox" className="h-4 w-4 rounded border-slate-300 text-green-600 accent-green-600" />
            <span className="text-sm text-slate-700">Já efetivado</span>
          </label>

          {/* Observações */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Observações <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              {...register('observacoes')}
              rows={2}
              placeholder="Algum detalhe importante..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-colors resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={fecharModal} className="h-9 px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={criando || atualizando} className="h-9 px-4 rounded-lg bg-green-600 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-60">
              {criando || atualizando ? 'Salvando...' : editando ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        aberto={!!confirmando}
        titulo="Remover lançamento"
        mensagem={`Remover "${confirmando?.descricao}"? Esta ação não pode ser desfeita.`}
        onConfirmar={() => confirmando && deletar(confirmando.id)}
        onCancelar={() => setConfirmando(null)}
        carregando={deletando}
      />
    </AppShell>
  )
}
