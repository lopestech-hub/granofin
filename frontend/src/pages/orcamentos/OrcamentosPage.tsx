import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Pencil, Trash2, Target, AlertTriangle,
  ChevronLeft, ChevronRight, Info, Layers,
  CheckCircle2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import toast from 'react-hot-toast'
import AppShell from '@/components/layout/AppShell'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { orcamentosService, type Orcamento } from '@/services/orcamentos'
import { categoriasService } from '@/services/categorias'
import { formatarMoeda, formatarMesAno, mesAtual, anoAtual } from '@/utils/formato'
import { LucideIcone } from '@/utils/icone'

const EASE = [0.25, 1, 0.5, 1] as [number, number, number, number]

// ─── Schema do formulário de alocação ───
const schemaAlocacao = z.object({
  categoria_id: z.string().uuid('Selecione uma categoria'),
  percentual: z.coerce.number()
    .positive('Informe um percentual')
    .max(100, 'Máximo 100%'),
})
type FormAlocacao = z.infer<typeof schemaAlocacao>

// ─── Schema do formulário de categoria ───
const schemaCategoria = z.object({
  nome: z.string().min(2, 'Mínimo 2 caracteres'),
  cor: z.string().min(1),
  icone: z.string().min(1),
  parent_id: z.string().uuid().nullable().optional(),
})
type FormCategoria = z.infer<typeof schemaCategoria>

// ─── Barra de progresso ───
function BarraProgresso({ percentual, ultrapassado }: { percentual: number; ultrapassado: boolean }) {
  const pct = Math.min(percentual, 100)
  return (
    <div className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
      <motion.div
        className={`absolute inset-y-0 left-0 rounded-full ${ultrapassado ? 'bg-rose-500' : 'bg-indigo-500'}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: EASE }}
      />
    </div>
  )
}

// ─── Anel de progresso SVG ───
function AnelProgresso({ percentual, cor, ultrapassado }: { percentual: number; cor: string; ultrapassado: boolean }) {
  const r = 30
  const circ = 2 * Math.PI * r
  const pct = Math.min(percentual, 100)
  const offset = circ - (pct / 100) * circ
  const corFill = ultrapassado ? '#f43f5e' : cor

  return (
    <svg width="80" height="80" viewBox="0 0 80 80" className="flex-shrink-0">
      <circle cx="40" cy="40" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
      <motion.circle
        cx="40" cy="40" r={r} fill="none"
        stroke={corFill} strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: EASE }}
        transform="rotate(-90 40 40)"
      />
      <text x="40" y="44" textAnchor="middle" fontSize="13" fontWeight="900" fill={corFill} fontFamily="monospace">
        {pct}%
      </text>
    </svg>
  )
}

// ─── Cores e ícones sugeridos para novas categorias ───
const CORES = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6']
const ICONES = ['briefcase', 'home', 'heart', 'car', 'book-open', 'shopping-cart', 'credit-card', 'piggy-bank', 'trending-up', 'utensils', 'gamepad-2', 'plane', 'zap', 'tag']

export default function OrcamentosPage() {
  const qc = useQueryClient()
  const [mes, setMes] = useState(mesAtual())
  const [ano, setAno] = useState(anoAtual())

  // Modais
  const [modalAlocacao, setModalAlocacao] = useState(false)
  const [editandoAlocacao, setEditandoAlocacao] = useState<Orcamento | null>(null)
  const [confirmandoRemover, setConfirmandoRemover] = useState<Orcamento | null>(null)
  const [modalCategoria, setModalCategoria] = useState(false)

  const navegarMes = (delta: number) => {
    let m = mes + delta
    let a = ano
    if (m > 12) { m = 1; a++ }
    if (m < 1)  { m = 12; a-- }
    setMes(m)
    setAno(a)
  }

  // ─── Queries ───
  const { data, isLoading } = useQuery({
    queryKey: ['orcamentos', mes, ano],
    queryFn: () => orcamentosService.listar(mes, ano),
  })

  const { data: catData } = useQuery({
    queryKey: ['categorias'],
    queryFn: categoriasService.listar,
  })

  const orcamentos = data?.orcamentos ?? []
  const receita_mes = data?.receita_mes ?? 0
  const total_alocado_pct = data?.total_alocado_percentual ?? 0
  const pct_livre = Math.max(0, 100 - total_alocado_pct)

  const todasCategorias = catData?.categorias ?? []
  // Apenas categorias de DESPESA
  const categoriasDespesa = todasCategorias.filter(c => c.tipo === 'DESPESA')
  // Categorias principais (sem parent_id)
  const categoriasMain = categoriasDespesa.filter(c => !c.parent_id)
  // Subcategorias (com parent_id)
  const subcategorias = categoriasDespesa.filter(c => !!c.parent_id)

  // Categorias principais que ainda não têm alocação
  const ids_alocados = orcamentos.map(o => o.categoria_id)
  const categoriasDisponiveis = categoriasMain.filter(c => !ids_alocados.includes(c.id))

  // ─── Mutations ───
  const { mutate: criarAlocacao, isPending: criando } = useMutation({
    mutationFn: orcamentosService.criar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orcamentos'] })
      toast.success('Alocação criada!')
      setModalAlocacao(false)
      resetAlocacao()
    },
    onError: () => toast.error('Erro ao criar alocação'),
  })

  const { mutate: atualizarAlocacao, isPending: atualizando } = useMutation({
    mutationFn: ({ id, percentual }: { id: string; percentual: number }) =>
      orcamentosService.atualizar(id, percentual),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orcamentos'] })
      toast.success('Alocação atualizada!')
      setEditandoAlocacao(null)
      resetAlocacao()
    },
    onError: () => toast.error('Erro ao atualizar'),
  })

  const { mutate: removerAlocacao, isPending: removendo } = useMutation({
    mutationFn: orcamentosService.deletar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orcamentos'] })
      toast.success('Alocação removida')
      setConfirmandoRemover(null)
    },
    onError: () => toast.error('Erro ao remover alocação'),
  })

  const { mutate: criarCategoria, isPending: criandoCat } = useMutation({
    mutationFn: (data: FormCategoria) =>
      categoriasService.criar({ ...data, tipo: 'DESPESA' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] })
      toast.success('Categoria criada!')
      setModalCategoria(false)
      resetCategoria()
    },
    onError: () => toast.error('Erro ao criar categoria'),
  })

  // ─── Forms ───
  const { register: regAloc, handleSubmit: handleAloc, watch: watchAloc, reset: resetAlocacao,
    formState: { errors: errsAloc } } = useForm<FormAlocacao>({ resolver: zodResolver(schemaAlocacao) })

  const { register: regCat, handleSubmit: handleCat, watch: watchCat, setValue: setValCat,
    reset: resetCategoria, formState: { errors: errsCat } } = useForm<FormCategoria>({
    resolver: zodResolver(schemaCategoria),
    defaultValues: { cor: CORES[0], icone: ICONES[0] },
  })

  const onSubmitAlocacao = (data: FormAlocacao) => {
    if (editandoAlocacao) {
      atualizarAlocacao({ id: editandoAlocacao.id, percentual: data.percentual })
    } else {
      criarAlocacao(data)
    }
  }

  const abrirEditar = (o: Orcamento) => {
    setEditandoAlocacao(o)
    resetAlocacao({ categoria_id: o.categoria_id, percentual: o.percentual })
    setModalAlocacao(true)
  }

  const fecharModal = () => {
    setModalAlocacao(false)
    setEditandoAlocacao(null)
    resetAlocacao()
  }

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none mb-1">Orçamento</h1>
            <p className="text-slate-400 font-medium text-sm">Distribua sua renda por categorias e controle seus gastos</p>
          </motion.div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Navegação de mês */}
            <div className="flex items-center bg-white rounded-2xl p-1 shadow-sm border border-slate-200">
              <button onClick={() => navegarMes(-1)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all cursor-pointer">
                <ChevronLeft size={18} strokeWidth={2.5} />
              </button>
              <span className="px-4 py-1 text-sm font-bold text-slate-700 min-w-[130px] text-center capitalize">
                {formatarMesAno(mes, ano)}
              </span>
              <button
                onClick={() => navegarMes(1)}
                disabled={mes === mesAtual() && ano === anoAtual()}
                className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-all disabled:opacity-20 cursor-pointer"
              >
                <ChevronRight size={18} strokeWidth={2.5} />
              </button>
            </div>

            <button
              onClick={() => setModalCategoria(true)}
              className="flex items-center gap-2 h-10 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all cursor-pointer"
            >
              <Layers size={16} strokeWidth={2.5} />
              Nova Categoria
            </button>

            <button
              onClick={() => { setEditandoAlocacao(null); resetAlocacao(); setModalAlocacao(true) }}
              disabled={categoriasDisponiveis.length === 0}
              className="flex items-center gap-2 h-10 px-5 rounded-2xl bg-indigo-600 text-sm font-bold text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)] hover:bg-indigo-700 transition-all cursor-pointer disabled:opacity-50"
            >
              <Plus size={18} strokeWidth={3} />
              Nova Alocação
            </button>
          </div>
        </header>

        {/* Painel de Receita */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-premium p-6 flex flex-col gap-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Receita do Mês</p>
            <p className="text-2xl font-black font-mono text-slate-900 tracking-tighter">{formatarMoeda(receita_mes)}</p>
            <p className="text-[11px] text-slate-400">Base de cálculo para as alocações</p>
          </div>
          <div className="card-premium p-6 flex flex-col gap-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Total Alocado</p>
            <p className="text-2xl font-black font-mono text-indigo-600 tracking-tighter">{total_alocado_pct}%</p>
            <BarraProgresso percentual={total_alocado_pct} ultrapassado={total_alocado_pct > 100} />
          </div>
          <div className="card-premium p-6 flex flex-col gap-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Disponível / Não Alocado</p>
            <p className={`text-2xl font-black font-mono tracking-tighter ${pct_livre > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {pct_livre}%
            </p>
            <p className="text-[11px] text-slate-400">{formatarMoeda(receita_mes * pct_livre / 100)} sem destino</p>
          </div>
        </section>

        {/* Grade de alocações */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {isLoading
              ? [1, 2, 3].map(i => <div key={i} className="card-premium h-52 animate-pulse opacity-40" />)
              : orcamentos.length === 0
              ? (
                <div className="col-span-full card-premium py-24 flex flex-col items-center justify-center border-dashed gap-4">
                  <Target size={48} className="text-slate-200" />
                  <div className="text-center">
                    <h3 className="text-slate-700 font-bold">Nenhuma alocação definida</h3>
                    <p className="text-slate-400 text-sm mt-1">Clique em "Nova Alocação" para distribuir sua renda por categorias.</p>
                  </div>
                </div>
              )
              : orcamentos.map((o, idx) => {
                  // Subcategorias desta alocação com seus gastos
                  const subsDesta = subcategorias.filter(s => s.parent_id === o.categoria_id)

                  return (
                    <motion.div
                      key={o.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.04, ease: EASE }}
                      className={`card-premium group p-6 flex flex-col gap-4 hover:border-indigo-200 transition-all ${o.ultrapassado ? 'border-rose-200 bg-rose-50/20' : ''}`}
                    >
                      {/* Cabeçalho do card */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-inner flex-shrink-0 group-hover:scale-110 transition-transform duration-500"
                            style={{ backgroundColor: o.categoria.cor + '20', color: o.categoria.cor }}
                          >
                            <LucideIcone nome={o.categoria.icone ?? 'tag'} size={20} strokeWidth={2} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 uppercase tracking-tight leading-none">
                              {o.categoria.nome}
                            </h4>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">
                              {o.percentual}% da renda · {formatarMoeda(o.valor_alocado)}
                            </p>
                          </div>
                        </div>

                        {/* Anel de progresso */}
                        <AnelProgresso
                          percentual={o.percentual_consumido}
                          cor={o.categoria.cor}
                          ultrapassado={o.ultrapassado}
                        />
                      </div>

                      {/* Barra + valores */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gasto</p>
                          <p className={`text-sm font-black font-mono ${o.ultrapassado ? 'text-rose-600' : 'text-slate-700'}`}>
                            {formatarMoeda(o.valor_gasto)}
                          </p>
                        </div>
                        <BarraProgresso percentual={o.percentual_consumido} ultrapassado={o.ultrapassado} />
                        <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                          <span>R$ 0</span>
                          <span>{formatarMoeda(o.valor_alocado)}</span>
                        </div>
                      </div>

                      {/* Subcategorias vinculadas */}
                      {subsDesta.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 border-t border-slate-50 pt-3">
                          {subsDesta.map(sub => (
                            <span
                              key={sub.id}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-tight"
                            >
                              <LucideIcone nome={sub.icone ?? 'tag'} size={10} />
                              {sub.nome}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Ações */}
                      <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                        {o.ultrapassado
                          ? <span className="flex items-center gap-1 text-[10px] font-black text-rose-500 uppercase"><AlertTriangle size={12} /> Limite ultrapassado</span>
                          : <span className="flex items-center gap-1 text-[10px] font-black text-emerald-500 uppercase"><CheckCircle2 size={12} /> No limite</span>
                        }
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => abrirEditar(o)} className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setConfirmandoRemover(o)} className="p-2 rounded-xl bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-600 transition-all cursor-pointer">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })
            }
          </AnimatePresence>
        </section>

        {/* Dica sobre subcategorias */}
        {subcategorias.length === 0 && orcamentos.length > 0 && (
          <div className="card-premium p-5 flex items-center gap-3 border-indigo-100 bg-indigo-50/30">
            <Info size={18} className="text-indigo-400 flex-shrink-0" />
            <p className="text-sm text-indigo-600 font-medium">
              <strong>Dica:</strong> Crie subcategorias (ex: "Transporte", "Alimentação") e vincule-as a uma categoria principal para detalhar seus gastos dentro de cada alocação.
            </p>
            <button onClick={() => setModalCategoria(true)} className="ml-auto flex-shrink-0 text-[11px] font-black uppercase text-indigo-600 hover:underline cursor-pointer">
              Criar agora →
            </button>
          </div>
        )}
      </div>

      {/* ─── Modal: Nova Alocação / Editar ─── */}
      <Modal
        aberto={modalAlocacao}
        titulo={editandoAlocacao ? `Ajustar: ${editandoAlocacao.categoria.nome}` : 'Nova Alocação de Renda'}
        onFechar={fecharModal}
      >
        <form onSubmit={handleAloc(onSubmitAlocacao)} className="space-y-5">
          {/* Seletor de categoria (apenas na criação) */}
          {!editandoAlocacao && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">
                Categoria Principal
              </label>
              {categoriasDisponiveis.length === 0 ? (
                <div className="p-5 rounded-2xl bg-emerald-50 text-emerald-700 text-center flex flex-col items-center gap-2 border border-emerald-100">
                  <CheckCircle2 size={20} />
                  <p className="text-[11px] font-black uppercase">Todas as categorias já têm alocação!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-1">
                  {categoriasDisponiveis.map(c => (
                    <label
                      key={c.id}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                        watchAloc('categoria_id') === c.id
                          ? 'border-indigo-600 bg-white shadow-md text-slate-900'
                          : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-indigo-200'
                      }`}
                    >
                      <input {...regAloc('categoria_id')} type="radio" value={c.id} className="hidden" />
                      <span className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg" style={{ backgroundColor: c.cor + '20', color: c.cor }}>
                        <LucideIcone nome={c.icone} size={16} strokeWidth={2} />
                      </span>
                      <span className="text-[11px] font-black uppercase tracking-tight truncate">{c.nome}</span>
                    </label>
                  ))}
                </div>
              )}
              {errsAloc.categoria_id && (
                <p className="mt-2 text-[10px] text-rose-500 font-black uppercase">{errsAloc.categoria_id.message}</p>
              )}
            </div>
          )}

          {/* Percentual */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              % da Renda Mensal
              {receita_mes > 0 && watchAloc('percentual') > 0 && (
                <span className="ml-2 text-indigo-500 normal-case font-bold">
                  ≈ {formatarMoeda(receita_mes * (watchAloc('percentual') / 100))}
                </span>
              )}
            </label>
            <div className="relative">
              <input
                {...regAloc('percentual')}
                type="number"
                step="0.1"
                min="0.1"
                max="100"
                placeholder="Ex: 60"
                className="input-field pr-10 font-mono text-lg"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">%</span>
            </div>
            {errsAloc.percentual && (
              <p className="mt-1.5 text-[10px] text-rose-500 font-black uppercase">{errsAloc.percentual.message}</p>
            )}
            {total_alocado_pct > 0 && !editandoAlocacao && (
              <p className="mt-1.5 text-[10px] text-slate-400 font-bold">
                Já alocado: {total_alocado_pct}% · Disponível: {pct_livre}%
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={fecharModal} className="px-4 py-2 rounded-xl text-slate-500 text-sm font-bold hover:bg-slate-50 cursor-pointer">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={criando || atualizando}
              className="px-6 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
            >
              {editandoAlocacao ? 'Salvar' : 'Alocar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Modal: Nova Categoria ─── */}
      <Modal aberto={modalCategoria} titulo="Nova Categoria" onFechar={() => { setModalCategoria(false); resetCategoria() }}>
        <form onSubmit={handleCat(d => criarCategoria(d))} className="space-y-5">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nome</label>
            <input {...regCat('nome')} className="input-field" placeholder="Ex: Custo de Vida, Transporte..." />
            {errsCat.nome && <p className="mt-1 text-[10px] text-rose-500 font-black uppercase">{errsCat.nome.message}</p>}
          </div>

          {/* Cor */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Cor</label>
            <div className="flex flex-wrap gap-2">
              {CORES.map(cor => (
                <button
                  key={cor}
                  type="button"
                  onClick={() => setValCat('cor', cor)}
                  className={`w-8 h-8 rounded-full cursor-pointer transition-all ${watchCat('cor') === cor ? 'ring-2 ring-offset-2 ring-indigo-400 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: cor }}
                />
              ))}
            </div>
          </div>

          {/* Ícone */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Ícone</label>
            <div className="flex flex-wrap gap-2">
              {ICONES.map(icone => (
                <button
                  key={icone}
                  type="button"
                  onClick={() => setValCat('icone', icone)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all ${
                    watchCat('icone') === icone
                      ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-300'
                      : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <LucideIcone nome={icone} size={16} strokeWidth={2} />
                </button>
              ))}
            </div>
          </div>

          {/* Categoria Principal (opcional — torna subcategoria) */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Vincular como subcategoria de... <span className="font-normal normal-case">(opcional)</span>
            </label>
            <select {...regCat('parent_id')} className="input-field">
              <option value="">— Categoria Principal (sem vínculo) —</option>
              {categoriasMain.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setModalCategoria(false); resetCategoria() }} className="px-4 py-2 rounded-xl text-slate-500 text-sm font-bold hover:bg-slate-50 cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={criandoCat} className="px-6 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
              Criar Categoria
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Confirm Dialog ─── */}
      <ConfirmDialog
        aberto={!!confirmandoRemover}
        titulo="Remover Alocação?"
        mensagem={`Deseja remover a alocação de "${confirmandoRemover?.categoria.nome}"? Os lançamentos não serão afetados.`}
        carregando={removendo}
        onConfirmar={() => confirmandoRemover && removerAlocacao(confirmandoRemover.id)}
        onCancelar={() => setConfirmandoRemover(null)}
      />
    </AppShell>
  )
}
