import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Wallet, CreditCard, PiggyBank, CircleEllipsis } from 'lucide-react'
import { motion } from 'motion/react'
import toast from 'react-hot-toast'
import AppShell from '@/components/layout/AppShell'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { contasService, type Conta } from '@/services/contas'
import { formatarMoeda } from '@/utils/formato'

const schema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  tipo: z.enum(['CARTEIRA', 'CONTA_CORRENTE', 'POUPANCA', 'OUTRO']),
  saldo_inicial: z.coerce.number().default(0),
})
type FormData = z.infer<typeof schema>

const TIPOS = [
  { value: 'CARTEIRA', label: 'Carteira', icon: Wallet },
  { value: 'CONTA_CORRENTE', label: 'Conta Corrente', icon: CreditCard },
  { value: 'POUPANCA', label: 'Poupança', icon: PiggyBank },
  { value: 'OUTRO', label: 'Outro', icon: CircleEllipsis },
] as const

const CORES = ['#22c55e', '#3b82f6', '#8b5cf6', '#f97316', '#ec4899', '#06b6d4', '#eab308', '#64748b']

function IconeConta({ tipo }: { tipo: Conta['tipo'] }) {
  const map = { CARTEIRA: Wallet, CONTA_CORRENTE: CreditCard, POUPANCA: PiggyBank, OUTRO: CircleEllipsis }
  const Icon = map[tipo]
  return <Icon className="h-5 w-5" />
}

export default function ContasPage() {
  const qc = useQueryClient()
  const [modalAberto, setModalAberto] = useState(false)
  const [contaEditando, setContaEditando] = useState<Conta | null>(null)
  const [confirmando, setConfirmando] = useState<Conta | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['contas'],
    queryFn: contasService.listar,
  })

  const contas = data?.contas ?? []

  const { mutateAsync: criar, isPending: criando } = useMutation({
    mutationFn: contasService.criar,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contas'] }); fecharModal() },
    onError: () => toast.error('Erro ao criar conta'),
  })

  const { mutateAsync: atualizar, isPending: atualizando } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Conta> }) => contasService.atualizar(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contas'] }); fecharModal() },
    onError: () => toast.error('Erro ao atualizar conta'),
  })

  const { mutateAsync: deletar, isPending: deletando } = useMutation({
    mutationFn: (id: string) => contasService.deletar(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contas'] }); setConfirmando(null); toast.success('Conta removida') },
    onError: () => toast.error('Erro ao remover conta'),
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const tipoSelecionado = watch('tipo')

  function abrirCriar() {
    reset({ nome: '', tipo: 'CONTA_CORRENTE', saldo_inicial: 0 })
    setContaEditando(null)
    setModalAberto(true)
  }

  function abrirEditar(conta: Conta) {
    reset({ nome: conta.nome, tipo: conta.tipo, saldo_inicial: conta.saldo_inicial })
    setContaEditando(conta)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setContaEditando(null)
    reset()
  }

  const onSubmit = async (data: FormData) => {
    if (contaEditando) {
      await atualizar({ id: contaEditando.id, data })
      toast.success('Conta atualizada')
    } else {
      await criar(data)
      toast.success('Conta criada')
    }
  }

  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
        className="p-6 max-w-4xl mx-auto space-y-6"
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Contas</h1>
            <p className="text-sm text-slate-500 mt-0.5">Gerencie suas contas financeiras</p>
          </div>
          <button
            onClick={abrirCriar}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-green-600 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nova conta
          </button>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-white border border-slate-200 shadow-sm p-5 h-20 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-slate-100" />
                  <div className="space-y-2">
                    <div className="h-3.5 w-32 bg-slate-100 rounded" />
                    <div className="h-3 w-20 bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : contas.length === 0 ? (
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm py-16 text-center">
            <Wallet className="mx-auto h-10 w-10 text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-500">Nenhuma conta cadastrada</p>
            <p className="text-xs text-slate-400 mt-1">Crie sua primeira conta para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contas.map((conta) => (
              <div
                key={conta.id}
                className="flex items-center gap-4 rounded-xl bg-white border border-slate-200 shadow-sm p-5 hover:border-slate-300 transition-colors"
              >
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: conta.cor ?? '#64748b' }}
                >
                  <IconeConta tipo={conta.tipo} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">{conta.nome}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {TIPOS.find((t) => t.value === conta.tipo)?.label}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono tabular-nums text-sm font-semibold text-slate-900">
                    {formatarMoeda(conta.saldo_inicial)}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">saldo inicial</p>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => abrirEditar(conta)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setConfirmando(conta)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Modal criar/editar */}
      <Modal
        aberto={modalAberto}
        titulo={contaEditando ? 'Editar conta' : 'Nova conta'}
        onFechar={fecharModal}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Nome</label>
            <input
              {...register('nome')}
              placeholder="Ex: Nubank, Carteira..."
              className="w-full h-9 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-colors"
            />
            {errors.nome && <p className="mt-1 text-xs text-red-500">{errors.nome.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {TIPOS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setValue('tipo', value)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    tipoSelecionado === value
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Saldo inicial</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
              <input
                {...register('saldo_inicial')}
                type="number"
                step="0.01"
                placeholder="0,00"
                className="w-full h-9 rounded-lg border border-slate-300 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-colors font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {CORES.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  className="h-7 w-7 rounded-full border-2 border-white ring-2 ring-transparent hover:ring-slate-300 transition-all"
                  style={{ backgroundColor: cor }}
                  title={cor}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={fecharModal}
              className="h-9 px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={criando || atualizando}
              className="h-9 px-4 rounded-lg bg-green-600 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-60"
            >
              {criando || atualizando ? 'Salvando...' : contaEditando ? 'Salvar' : 'Criar conta'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm delete */}
      <ConfirmDialog
        aberto={!!confirmando}
        titulo="Remover conta"
        mensagem={`Tem certeza que deseja remover a conta "${confirmando?.nome}"? Esta ação não pode ser desfeita.`}
        onConfirmar={() => confirmando && deletar(confirmando.id)}
        onCancelar={() => setConfirmando(null)}
        carregando={deletando}
      />
    </AppShell>
  )
}
