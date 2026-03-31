import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Pencil, Trash2, Tag, Layers,
  ArrowDownCircle, ArrowUpCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import toast from 'react-hot-toast'
import AppShell from '@/components/layout/AppShell'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { categoriasService, type Categoria } from '@/services/categorias'
import { LucideIcone } from '@/utils/icone'

const EASE = [0.25, 1, 0.5, 1] as [number, number, number, number]

// ─── Cores disponíveis ───
const CORES = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#64748b', '#a16207',
]

// ─── Ícones disponíveis ───
const ICONES_DESPESA = [
  'home', 'car', 'utensils', 'shopping-cart', 'credit-card',
  'heart', 'book-open', 'gamepad-2', 'plane', 'zap',
  'shirt', 'phone', 'wifi', 'tv', 'music', 'coffee',
  'baby', 'dog', 'dumbbell', 'graduation-cap',
]
const ICONES_RECEITA = [
  'trending-up', 'briefcase', 'building', 'banknote', 'coins',
  'piggy-bank', 'landmark', 'wallet', 'star', 'gift',
  'award', 'handshake', 'laptop', 'package',
]

// ─── Schema ───
const schema = z.object({
  nome: z.string().min(2, 'Mínimo 2 caracteres'),
  tipo: z.enum(['RECEITA', 'DESPESA']),
  cor: z.string().min(1, 'Selecione uma cor'),
  icone: z.string().min(1, 'Selecione um ícone'),
  parent_id: z.string().uuid().or(z.literal('')).nullable().optional()
    .transform(v => (v === '' ? null : v)),
})
type FormData = z.infer<typeof schema>

// ─── Filtro de aba ───
type Aba = 'DESPESA' | 'RECEITA'

export default function CategoriasPage() {
  const qc = useQueryClient()
  const [aba, setAba] = useState<Aba>('DESPESA')
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Categoria | null>(null)
  const [confirmando, setConfirmando] = useState<Categoria | null>(null)

  // ─── Query ───
  const { data, isLoading } = useQuery({
    queryKey: ['categorias'],
    queryFn: categoriasService.listar,
  })

  const todasCategorias = data?.categorias ?? []
  // Filtra pela aba ativa
  const daAba = todasCategorias.filter(c => c.tipo === aba)
  // Categorias principais (sem parent) e subcategorias (com parent)
  const principais = daAba.filter(c => !c.parent_id)
  const subcategorias = daAba.filter(c => !!c.parent_id)

  // Categorias principais para o select de pai (filtradas pelo tipo selecionado no form)
  const [isSub, setIsSub] = useState(false)

  // ─── Mutations ───
  const { mutate: criar, isPending: criando } = useMutation({
    mutationFn: (d: FormData) => categoriasService.criar(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] })
      toast.success('Categoria criada!')
      fecharModal()
    },
    onError: () => toast.error('Erro ao criar categoria'),
  })

  const { mutate: atualizar, isPending: atualizando } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FormData> }) =>
      categoriasService.atualizar(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] })
      toast.success('Categoria atualizada!')
      fecharModal()
    },
    onError: () => toast.error('Erro ao atualizar'),
  })

  const { mutate: deletar } = useMutation({
    mutationFn: categoriasService.deletar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorias'] })
      toast.success('Categoria removida')
      setConfirmando(null)
    },
    onError: () => toast.error('Não é possível remover — categoria em uso'),
  })

  // ─── Form ───
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tipo: 'DESPESA',
      cor: CORES[0],
      icone: ICONES_DESPESA[0],
    },
  })

  const tipoWatch = watch('tipo')
  const corWatch = watch('cor')
  const iconeWatch = watch('icone')

  const iconesPorTipo = tipoWatch === 'RECEITA' ? ICONES_RECEITA : ICONES_DESPESA

  const abrirCriar = () => {
    setEditando(null)
    setIsSub(false)
    reset({ tipo: aba, cor: CORES[0], icone: iconesPorTipo[0], parent_id: null })
    setModalAberto(true)
  }

  const abrirEditar = (c: Categoria) => {
    setEditando(c)
    setIsSub(!!c.parent_id)
    reset({
      nome: c.nome,
      tipo: c.tipo,
      cor: c.cor,
      icone: c.icone,
      parent_id: c.parent_id ?? null,
    })
    setModalAberto(true)
  }

  const fecharModal = () => {
    setModalAberto(false)
    setEditando(null)
    reset()
  }

  const onSubmit = (data: FormData) => {
    if (editando) {
      atualizar({ id: editando.id, data })
    } else {
      criar(data)
    }
  }

  // ─── Card de categoria ───
  const CardCategoria = ({ cat, isSub = false }: { cat: Categoria; isSub?: boolean }) => {
    const pai = isSub ? todasCategorias.find(c => c.id === cat.parent_id) : null
    const isPadrao = cat.padrao

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ ease: EASE }}
        className={`card-premium group flex items-center gap-4 px-5 py-4 hover:border-indigo-200 transition-all ${isSub ? 'ml-8 border-l-4 border-l-slate-100' : ''}`}
      >
        {/* Ícone */}
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-110 transition-transform duration-300"
          style={{ backgroundColor: cat.cor + '20', color: cat.cor }}
        >
          <LucideIcone nome={cat.icone ?? 'tag'} size={18} strokeWidth={2} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-slate-800 uppercase tracking-tight text-sm">{cat.nome}</p>
            {isPadrao && (
              <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-400">
                Padrão
              </span>
            )}
            {isSub && pai && (
              <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md text-indigo-400 bg-indigo-50 border border-indigo-100">
                ↳ {pai.nome}
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
            {isSub ? 'Subcategoria' : 'Categoria Principal'}
          </p>
        </div>

        {/* Ações — visíveis para todas as categorias */}
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => abrirEditar(cat)}
            className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
            title="Editar"
          >
            <Pencil size={14} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => setConfirmando(cat)}
            className="p-2 rounded-xl bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-600 transition-all cursor-pointer"
            title="Remover"
          >
            <Trash2 size={14} strokeWidth={2.5} />
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <AppShell>
      <div className="p-6 md:p-8 max-w-[900px] mx-auto space-y-8">

        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none mb-1">Categorias</h1>
            <p className="text-slate-400 font-medium text-sm">Organize suas receitas e despesas por categoria</p>
          </motion.div>

          <button
            onClick={abrirCriar}
            className="flex items-center gap-2 h-10 px-5 rounded-2xl bg-indigo-600 text-sm font-bold text-white shadow-[0_4px_12px_rgba(99,102,241,0.3)] hover:bg-indigo-700 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus size={18} strokeWidth={3} />
            Nova Categoria
          </button>
        </header>

        {/* Abas DESPESA / RECEITA */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
          {(['DESPESA', 'RECEITA'] as Aba[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setAba(tab)}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                aba === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'DESPESA'
                ? <ArrowDownCircle size={15} strokeWidth={2.5} className={aba === tab ? 'text-rose-500' : ''} />
                : <ArrowUpCircle size={15} strokeWidth={2.5} className={aba === tab ? 'text-emerald-500' : ''} />
              }
              {tab === 'DESPESA' ? 'Despesas' : 'Receitas'}
              <span className="ml-1 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">
                {daAba.length}
              </span>
            </button>
          ))}
        </div>

        {/* Lista Agrupada */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="card-premium h-16 animate-pulse opacity-40" />)}
          </div>
        ) : daAba.length === 0 ? (
          <div className="card-premium py-20 flex flex-col items-center justify-center border-dashed gap-4">
            <Tag size={42} className="text-slate-200" />
            <div className="text-center">
              <p className="font-bold text-slate-700">Nenhuma categoria cadastrada</p>
              <p className="text-slate-400 text-sm mt-1">Crie categorias para organizar suas {aba === 'DESPESA' ? 'despesas' : 'receitas'}.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {principais.map(pai => {
                const filhos = subcategorias.filter(s => s.parent_id === pai.id)
                
                return (
                  <div key={pai.id} className="space-y-2">
                    {/* Categoria Principal */}
                    <CardCategoria cat={pai} />

                    {/* Subcategorias aninhadas */}
                    {filhos.length > 0 && (
                      <div className="ml-6 pl-4 border-l-2 border-slate-100 space-y-2 py-1">
                        {filhos.map(filho => (
                          <CardCategoria key={filho.id} cat={filho} isSub />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Caso existam subcategorias órfãs (sem pai encontrado) */}
              {subcategorias.filter(s => !principais.find(p => p.id === s.parent_id)).length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Outras Subcategorias</p>
                  <div className="space-y-2">
                    {subcategorias
                      .filter(s => !principais.find(p => p.id === s.parent_id))
                      .map(s => <CardCategoria key={s.id} cat={s} isSub />)
                    }
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ─── Modal Criar / Editar ─── */}
      <Modal
        aberto={modalAberto}
        titulo={editando ? 'Editar Categoria' : 'Nova Categoria'}
        onFechar={fecharModal}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Tipo — apenas na criação */}
          {!editando && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tipo</label>
              <div className="flex gap-2">
                {(['DESPESA', 'RECEITA'] as const).map(t => (
                  <label key={t} className={`flex-1 flex items-center gap-2 justify-center p-3 rounded-2xl border-2 cursor-pointer transition-all font-bold text-sm ${
                    tipoWatch === t
                      ? t === 'DESPESA' ? 'border-rose-400 bg-rose-50 text-rose-600' : 'border-emerald-400 bg-emerald-50 text-emerald-600'
                      : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                  }`}>
                    <input
                      {...register('tipo')}
                      type="radio"
                      value={t}
                      className="hidden"
                      onChange={() => {
                        setValue('tipo', t)
                        setValue('icone', t === 'RECEITA' ? ICONES_RECEITA[0] : ICONES_DESPESA[0])
                      }}
                    />
                    {t === 'DESPESA'
                      ? <ArrowDownCircle size={15} strokeWidth={2.5} />
                      : <ArrowUpCircle size={15} strokeWidth={2.5} />
                    }
                    {t === 'DESPESA' ? 'Despesa' : 'Receita'}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Nome */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nome</label>
            <input
              {...register('nome')}
              className="input-field"
              placeholder="Ex: Alimentação, Salário, Transporte..."
            />
            {errors.nome && <p className="mt-1 text-[10px] text-rose-500 font-black uppercase">{errors.nome.message}</p>}
          </div>

          {/* Cor */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Cor</label>
            <div className="flex flex-wrap gap-2">
              {CORES.map(cor => (
                <button
                  key={cor}
                  type="button"
                  onClick={() => setValue('cor', cor)}
                  className={`w-8 h-8 rounded-full cursor-pointer transition-all ${
                    corWatch === cor ? 'ring-2 ring-offset-2 ring-indigo-400 scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: cor }}
                />
              ))}
            </div>
          </div>

          {/* Ícone */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Ícone</label>
            <div className="flex flex-wrap gap-2">
              {iconesPorTipo.map(icone => (
                <button
                  key={icone}
                  type="button"
                  onClick={() => setValue('icone', icone)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all ${
                    iconeWatch === icone
                      ? 'ring-2 ring-indigo-400 shadow-sm'
                      : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                  }`}
                  style={iconeWatch === icone ? { backgroundColor: corWatch + '20', color: corWatch } : {}}
                >
                  <LucideIcone nome={icone} size={16} strokeWidth={2} />
                </button>
              ))}
            </div>
          </div>

          {/* Preview da categoria */}
          {watch('nome') && (
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-slate-100 bg-slate-50">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: corWatch + '20', color: corWatch }}
              >
                <LucideIcone nome={iconeWatch ?? 'tag'} size={18} strokeWidth={2} />
              </div>
              <div>
                <p className="font-bold text-slate-800 uppercase tracking-tight text-sm">{watch('nome')}</p>
                <p className="text-[10px] text-slate-400 font-medium">Prévia</p>
              </div>
            </div>
          )}

          {/* Hierarquia — Principal ou Subcategoria */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nível da Categoria</label>
            <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsSub(false)
                  setValue('parent_id', null)
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  !isSub ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Tag size={14} />
                Principal
              </button>
              <button
                type="button"
                onClick={() => setIsSub(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSub ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Layers size={14} />
                Subcategoria
              </button>
            </div>
          </div>

          {/* Vincular como subcategoria (Mostra se isSub for true) */}
          {isSub && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Vincular à Categoria...
              </label>
              <select {...register('parent_id')} className="input-field">
                <option value="">— Selecione uma categoria pai —</option>
                {todasCategorias
                  .filter(c => c.tipo === tipoWatch && !c.parent_id && c.id !== editando?.id)
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))
                }
              </select>
              {isSub && !watch('parent_id') && (
                <p className="text-[10px] text-amber-500 font-bold uppercase tracking-tight">
                  Selecione uma categoria principal para esta subcategoria
                </p>
              )}
            </motion.div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-50">
            <button type="button" onClick={fecharModal} className="px-4 py-2 rounded-xl text-slate-500 text-sm font-bold hover:bg-slate-50 cursor-pointer">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={criando || atualizando}
              className="px-6 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
            >
              {editando ? 'Salvar' : 'Criar Categoria'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ─── Confirm Dialog ─── */}
      <ConfirmDialog
        aberto={!!confirmando}
        titulo="Remover Categoria?"
        mensagem={`Deseja remover "${confirmando?.nome}"? Esta ação não pode ser desfeita.`}
        onConfirmar={() => confirmando && deletar(confirmando.id)}
        onCancelar={() => setConfirmando(null)}
      />
    </AppShell>
  )
}
