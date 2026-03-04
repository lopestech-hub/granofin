import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, ChevronLeft, ChevronRight, Pencil, Trash2, Target, AlertTriangle } from 'lucide-react'
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

function BarraProgresso({ percentual, ultrapassado }: { percentual: number; ultrapassado: boolean }) {
  const largura = Math.min(percentual, 100)
  const cor = ultrapassado
    ? 'bg-red-500'
    : percentual >= 80
    ? 'bg-amber-500'
    : 'bg-green-500'

  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${cor}`}
        style={{ width: `${largura}%` }}
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

  const { data: catData } = useQuery({
    queryKey: ['categorias'],
    queryFn: categoriasService.listar,
  })

  const orcamentos = orcData?.orcamentos ?? []
  const categoriasDespesa = catData?.categorias.filter((c) => c.tipo === 'DESPESA') ?? []

  // IDs de categorias já com orçamento no mês
  const comOrcamento = new Set(orcamentos.map((o) => o.categoria_id))
  const categoriasDisponiveis = categoriasDespesa.filter((c) => !comOrcamento.has(c.id) || editando?.categoria_id === c.id)

  const { mutateAsync: criar, isPending: criando } = useMutation({
    mutationFn: (data: FormData) => orcamentosService.criar({ ...data, mes, ano }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orcamentos'] }); fecharModal(); toast.success('Orçamento criado') },
    onError: () => toast.error('Erro ao criar orçamento'),
  })

  const { mutateAsync: atualizar, isPending: atualizando } = useMutation({
    mutationFn: ({ id, valor_limite }: { id: string; valor_limite: number }) => orcamentosService.atualizar(id, valor_limite),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orcamentos'] }); fecharModal(); toast.success('Orçamento atualizado') },
    onError: () => toast.error('Erro ao atualizar orçamento'),
  })

  const { mutateAsync: deletar, isPending: deletando } = useMutation({
    mutationFn: orcamentosService.deletar,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orcamentos'] }); setConfirmando(null); toast.success('Orçamento removido') },
    onError: () => toast.error('Erro ao remover orçamento'),
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

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
    if (editando) {
      await atualizar({ id: editando.id, valor_limite: data.valor_limite })
    } else {
      await criar(data)
    }
  }

  const ultrapassados = orcamentos.filter((o) => o.ultrapassado).length
  const totalLimite = orcamentos.reduce((a, o) => a + o.valor_limite, 0)
  const totalGasto = orcamentos.reduce((a, o) => a + o.valor_gasto, 0)

  return (
    <AppShell>
      <div className="p-6 max-w-3xl mx-auto space-y-5">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Orçamentos</h1>
            <p className="text-sm text-slate-500 mt-0.5">Limites por categoria</p>
          </div>
          <div className="flex items-center gap-2">
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

        {/* Alerta de categorias ultrapassadas */}
        {ultrapassados > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{ultrapassados} {ultrapassados === 1 ? 'categoria ultrapassou' : 'categorias ultrapassaram'}</span> o limite do orçamento neste mês.
            </p>
          </div>
        )}

        {/* Resumo geral */}
        {orcamentos.length > 0 && (
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total do período</p>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="font-mono tabular-nums text-slate-900 font-semibold">{formatarMoeda(totalGasto)}</span>
                <span>de</span>
                <span className="font-mono tabular-nums text-slate-900 font-semibold">{formatarMoeda(totalLimite)}</span>
              </div>
            </div>
            <BarraProgresso
              percentual={totalLimite > 0 ? Math.round((totalGasto / totalLimite) * 100) : 0}
              ultrapassado={totalGasto > totalLimite}
            />
          </div>
        )}

        {/* Lista por categoria */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-white border border-slate-200 shadow-sm p-5 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-8 w-8 rounded-xl bg-slate-100" />
                  <div className="h-3.5 w-32 bg-slate-100 rounded" />
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : orcamentos.length === 0 ? (
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm py-16 text-center">
            <Target className="mx-auto h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-500">Nenhum orçamento definido</p>
            <p className="text-xs text-slate-400 mt-1">Crie limites por categoria para controlar seus gastos</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orcamentos.map((o) => (
              <div
                key={o.id}
                className={`rounded-xl bg-white border shadow-sm p-5 transition-colors ${
                  o.ultrapassado ? 'border-red-200' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Ícone */}
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-base"
                    style={{ backgroundColor: o.categoria.cor + '20', color: o.categoria.cor }}
                  >
                    {o.categoria.icone?.substring(0, 2) ?? '📊'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{o.categoria.nome}</p>
                        {o.ultrapassado && (
                          <span className="rounded px-1.5 py-0.5 text-xs bg-red-50 text-red-600 font-medium">
                            Ultrapassado
                          </span>
                        )}
                        {!o.ultrapassado && o.percentual >= 80 && (
                          <span className="rounded px-1.5 py-0.5 text-xs bg-amber-50 text-amber-600 font-medium">
                            Atenção
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => abrirEditar(o)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmando(o)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <BarraProgresso percentual={o.percentual} ultrapassado={o.ultrapassado} />

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-400">
                        {formatarMoeda(o.valor_gasto)} gasto
                      </span>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className={`font-mono font-semibold ${o.ultrapassado ? 'text-red-600' : 'text-slate-600'}`}>
                          {o.percentual}%
                        </span>
                        <span className="text-slate-400">de {formatarMoeda(o.valor_limite)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        aberto={modalAberto}
        titulo={editando ? 'Editar orçamento' : 'Novo orçamento'}
        onFechar={fecharModal}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!editando && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Categoria</label>
              <select
                {...register('categoria_id')}
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-colors bg-white"
              >
                <option value="">Selecione uma categoria...</option>
                {categoriasDisponiveis.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
              {errors.categoria_id && <p className="mt-1 text-xs text-red-500">{errors.categoria_id.message}</p>}
              {categoriasDisponiveis.length === 0 && (
                <p className="mt-1.5 text-xs text-amber-600">Todas as categorias já têm orçamento neste mês.</p>
              )}
            </div>
          )}

          {editando && (
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 border border-slate-200">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl text-base"
                style={{ backgroundColor: editando.categoria.cor + '20', color: editando.categoria.cor }}
              >
                {editando.categoria.icone?.substring(0, 2) ?? '📊'}
              </div>
              <p className="text-sm font-semibold text-slate-900">{editando.categoria.nome}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Limite mensal</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
              <input
                {...register('valor_limite')}
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                className="w-full h-9 rounded-lg border border-slate-300 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-colors font-mono"
              />
            </div>
            {errors.valor_limite && <p className="mt-1 text-xs text-red-500">{errors.valor_limite.message}</p>}
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
        titulo="Remover orçamento"
        mensagem={`Remover o orçamento de "${confirmando?.categoria.nome}"?`}
        onConfirmar={() => confirmando && deletar(confirmando.id)}
        onCancelar={() => setConfirmando(null)}
        carregando={deletando}
      />
    </AppShell>
  )
}
