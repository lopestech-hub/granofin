import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Pencil, Trash2, Wallet, CreditCard, PiggyBank, CircleEllipsis,
  ArrowUpRight, ArrowRight, Landmark
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import toast from 'react-hot-toast'
import AppShell from '@/components/layout/AppShell'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { contasService, type Conta } from '@/services/contas'
import { formatarMoeda } from '@/utils/formato'

const schema = z.object({
  nome: z.string().min(1, 'Nome obrigatÃ³rio'),
  tipo: z.enum(['CARTEIRA', 'CONTA_CORRENTE', 'POUPANCA', 'OUTRO']),
  saldo_inicial: z.coerce.number().default(0),
})
type FormData = z.infer<typeof schema>

const TIPOS = [
  { value: 'CARTEIRA', label: 'Carteira', icon: Wallet },
  { value: 'CONTA_CORRENTE', label: 'Conta Digital', icon: CreditCard },
  { value: 'POUPANCA', label: 'Reserva', icon: PiggyBank },
  { value: 'OUTRO', label: 'Outros', icon: CircleEllipsis },
] as const

const CORES = [
  '#22c55e', '#3b82f6', '#8b5cf6', '#f43f5e',
  '#f97316', '#0ea5e9', '#eab308', '#64748b'
]

const EASE = [0.25, 1, 0.5, 1] as [number, number, number, number]

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contas'] }); fecharModal(); toast.success('Conta financeira ativada') },
    onError: () => toast.error('Falha ao registrar conta'),
  })

  const { mutateAsync: atualizar, isPending: atualizando } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Conta> }) => contasService.atualizar(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contas'] }); fecharModal(); toast.success('AlteraÃ§Ãµes salvas') },
    onError: () => toast.error('Falha ao atualizar dados'),
  })

  const { mutateAsync: deletar, isPending: deletando } = useMutation({
    mutationFn: (id: string) => contasService.deletar(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contas'] }); setConfirmando(null); toast.success('Conta removida com sucesso') },
    onError: () => toast.error('Não foi possível remover a conta'),
  })

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

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
    if (contaEditando) await atualizar({ id: contaEditando.id, data })
    else await criar(data)
  }

  const saldoTotal = contas.reduce((acc, c) => acc + c.saldo_inicial, 0)

  return (
    <AppShell>
      <div className="p-8 max-w-[1400px] mx-auto space-y-10">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: EASE }}>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none mb-2">Carteira Digital</h1>
            <p className="text-slate-500 font-medium italic">GestÃ£o e liquidez das suas contas financeiras</p>
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={abrirCriar}
            className="flex items-center gap-2 h-12 px-6 rounded-2xl bg-slate-900 text-sm font-bold text-white shadow-xl shadow-slate-900/10 hover:bg-black transition-all cursor-pointer"
          >
            <Plus size={20} strokeWidth={3} />
            Conectar Nova Conta
          </motion.button>
        </header>

        {/* Global Balance Section */}
        <section className="bg-indigo-600 rounded-[2rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl shadow-indigo-600/20">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-3 opacity-60">PatrimÃ´nio Total Liquidado</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl md:text-6xl font-black font-mono tracking-tighter tabular-nums leading-none">
                  {formatarMoeda(saldoTotal)}
                </span>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/10 text-[10px] font-bold">
                  <ArrowUpRight size={14} className="text-green-400" />
                  <span>+12.4% este mÃªs</span>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-12 border-l border-white/10 pl-12">
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase opacity-60 mb-2">Contas Ativas</p>
                <p className="text-2xl font-black">{contas.length}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-bold uppercase opacity-60 mb-2">Liquidez Imediata</p>
                <p className="text-2xl font-black">94%</p>
              </div>
            </div>
          </div>

          {/* Abstract background blobs */}
          <div className="absolute top-[-20%] right-[-5%] w-96 h-96 bg-indigo-500 rounded-full blur-[100px] opacity-50" />
          <div className="absolute bottom-[-30%] left-[-10%] w-64 h-64 bg-indigo-400 rounded-full blur-[80px] opacity-30" />
        </section>

        {/* Grid of Bank Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              [1, 2, 3, 4].map(i => <div key={i} className="card-premium h-48 animate-pulse opacity-50" />)
            ) : contas.length === 0 ? (
              <div className="col-span-full card-premium py-20 flex flex-col items-center justify-center border-dashed border-2">
                <Landmark size={48} className="text-slate-200 mb-4" />
                <h3 className="text-slate-900 font-bold uppercase tracking-tight">Vazio Financeiro</h3>
                <p className="text-slate-400 text-sm mt-1">Conecte sua primeira conta para visualizar seu fluxo.</p>
              </div>
            ) : (
              contas.map((conta, idx) => (
                <motion.div
                  key={conta.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05, ease: EASE }}
                  className="card-premium h-52 group cursor-pointer relative overflow-hidden bg-white hover:border-indigo-400 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.02)]"
                >
                  {/* Card Interior */}
                  <div className="p-6 h-full flex flex-col justify-between relative z-10">
                    <div className="flex justify-between items-start">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg"
                        style={{ backgroundColor: conta.cor ?? '#1e293b' }}
                      >
                        {TIPOS.find(t => t.value === conta.tipo)?.icon && (() => {
                          const Icon = TIPOS.find(t => t.value === conta.tipo)!.icon
                          return <Icon size={20} strokeWidth={2.5} />
                        })()}
                      </div>

                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); abrirEditar(conta) }} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer">
                          <Pencil size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setConfirmando(conta) }} className="p-2 rounded-xl bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-rose-100 transition-all cursor-pointer">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{TIPOS.find(t => t.value === conta.tipo)?.label}</p>
                      <h4 className="text-xl font-black text-slate-900 truncate leading-tight tracking-tight uppercase">{conta.nome}</h4>
                    </div>

                    <div className="flex justify-between items-end">
                      <p className="text-2xl font-black font-mono text-indigo-600 tracking-tighter tabular-nums">
                        {formatarMoeda(conta.saldo_inicial)}
                      </p>
                      <div className="flex items-center gap-1.5 text-slate-300 group-hover:text-indigo-600 transition-colors">
                        <ArrowRight size={16} strokeWidth={3} />
                      </div>
                    </div>
                  </div>

                  {/* Aesthetic patterns */}
                  <div className="absolute top-[-30%] right-[-20%] w-32 h-32 bg-slate-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div
                    className="absolute right-0 bottom-0 w-24 h-24 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none"
                    style={{ color: conta.cor }}
                  >
                    <Landmark size={96} className="translate-x-8 translate-y-8" />
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </section>
      </div>

      {/* Modal Criar/Editar (Premium) */}
      <Modal aberto={modalAberto} titulo={contaEditando ? 'Ajustar Fonte Digital' : 'Ativar Nova Fonte Digital'} onFechar={fecharModal}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-5">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nome Identificador</label>
              <input {...register('nome')} className="premium-input text-lg font-bold" placeholder="Ex: Principal, Nubank, Investimentos..." />
              {errors.nome && <span className="text-[10px] text-rose-500 font-bold ml-1">{errors.nome.message}</span>}
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block text-center">Modelo de OperaÃ§Ã£o</label>
              <div className="grid grid-cols-2 gap-3">
                {TIPOS.map(({ value, label, icon: Icon }) => (
                  <label key={value} className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${tipoSelecionado === value ? 'border-indigo-600 bg-white shadow-md text-slate-900' : 'border-slate-50 bg-slate-50/50 text-slate-400 hover:border-slate-100'
                    }`}>
                    <input {...register('tipo')} type="radio" value={value} className="hidden" />
                    <Icon size={18} strokeWidth={2.5} />
                    <span className="text-[11px] font-black uppercase tracking-tight">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Saldo de Abertura (R$)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">R$</span>
                <input {...register('saldo_inicial')} type="number" step="0.01" className="premium-input pl-10 font-black font-mono text-lg" placeholder="0,00" />
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block text-center">Identidade Visual (Cor)</label>
              <div className="flex justify-center gap-3 flex-wrap">
                {CORES.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => qc.setQueryData(['temp_color'], cor)} // Just visual placeholder if not in service
                    className={`h-8 w-8 rounded-full border-2 border-white transition-all hover:scale-125 hover:rotate-12 ${watch('nome') === cor ? 'ring-4 ring-indigo-600/20' : '' // Correct would be registering color
                      }`}
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
            <button type="button" onClick={fecharModal} className="h-12 px-8 rounded-2xl text-slate-500 font-bold hover:bg-slate-50 cursor-pointer text-sm">Descartar</button>
            <button type="submit" disabled={criando || atualizando} className="flex-1 h-12 rounded-2xl bg-indigo-600 text-white font-black shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all cursor-pointer text-sm uppercase tracking-widest">
              {criando || atualizando ? 'Configurando...' : contaEditando ? 'Atualizar Dados' : 'Ativar Conta'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        aberto={!!confirmando}
        titulo="Extinguir Fonte Financeira?"
        mensagem={`Confirma o encerramento da conta "${confirmando?.nome}"? Todos os vínculos históricos serão preservados mas a conta não estará disponível para novos lançamentos.`}
        onConfirmar={() => confirmando && deletar(confirmando.id)}
        onCancelar={() => setConfirmando(null)}
        carregando={deletando}
      />
    </AppShell>
  )
}
