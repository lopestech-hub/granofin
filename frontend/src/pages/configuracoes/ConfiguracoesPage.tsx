import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Mail, Phone, Camera, Save, ShieldCheck, CreditCard, Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import toast from 'react-hot-toast'
import AppShell from '@/components/layout/AppShell'
import { usuariosService } from '@/services/usuarios'

const schema = z.object({
  nome: z.string().min(2, 'Nome muito curto'),
  telefone: z
    .string()
    .transform((val) => val.replace(/\D/g, '')) // Remove tudo o que não é número
    .refine((val) => val === '' || /^55\d{10}$/.test(val), {
      message: 'Formato inválido. Use: 55 + DDD + 8 dígitos (ex: 558988039126)',
    })
    .optional()
    .nullable(),
  avatar_url: z.string().url('URL de avatar inválida').or(z.literal('')).optional().nullable(),
})

type FormData = z.infer<typeof schema>

const EASE = [0.25, 1, 0.5, 1] as [number, number, number, number]

export default function ConfiguracoesPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'perfil' | 'assinatura' | 'seguranca'>('perfil')

  const { data: usuario } = useQuery({
    queryKey: ['usuario-perfil'],
    queryFn: usuariosService.getPerfil,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (usuario) {
      reset({
        nome: usuario.nome,
        telefone: usuario.telefone || '',
        avatar_url: usuario.avatar_url || '',
      })
    }
  }, [usuario, reset])

  const { mutateAsync: atualizar, isPending: salvando } = useMutation({
    mutationFn: usuariosService.atualizarPerfil,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuario-perfil'] })
      toast.success('Perfil atualizado com sucesso!')
    },
    onError: () => toast.error('Ocorreu um erro ao salvar o perfil.'),
  })

  const onSubmit = async (data: FormData) => {
    await atualizar(data)
  }

  return (
    <AppShell>
      <div className="p-8 max-w-[1000px] mx-auto space-y-10">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: EASE }}>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none mb-2 italic">Preferências do Sistema</h1>
            <p className="text-slate-500 font-medium italic">Gerencie sua identidade e assinatura na Granofin</p>
          </motion.div>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Navegação Lateral */}
          <aside className="w-full lg:w-64 space-y-2">
            {[
              { id: 'perfil', label: 'Meu Perfil', icon: User },
              { id: 'assinatura', label: 'Plano e Cobrança', icon: CreditCard },
              { id: 'seguranca', label: 'Segurança', icon: ShieldCheck },
            ].map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                    tab === t.id 
                    ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10 scale-[1.02]' 
                    : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={18} />
                  {t.label}
                </button>
              )
            })}
          </aside>

          {/* Conteúdo Principal */}
          <main className="flex-1">
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="card-premium p-8 bg-white"
            >
              {tab === 'perfil' && (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                  <div className="flex items-center gap-6 pb-6 border-b border-slate-50">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-slate-100 group-hover:border-indigo-500 transition-all shadow-sm">
                        {usuario?.avatar_url ? (
                          <img src={usuario.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User size={32} className="text-slate-300" />
                        )}
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg cursor-pointer">
                        <Camera size={14} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">{usuario?.nome}</h3>
                      <p className="text-sm font-medium text-slate-400">{usuario?.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-full md:col-span-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Seu Nome Completo</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input {...register('nome')} className="premium-input pl-12 font-bold" placeholder="Digite seu nome" />
                      </div>
                      {errors.nome && <span className="text-[10px] text-rose-500 font-bold mt-1">{errors.nome.message}</span>}
                    </div>

                    <div className="col-span-full md:col-span-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">WhatsApp / Telefone</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          {...register('telefone')}
                          className="premium-input pl-12 font-bold"
                          placeholder="558988039126"
                        />
                      </div>
                      {errors.telefone && <span className="text-[10px] text-rose-500 font-bold mt-1">{errors.telefone.message}</span>}
                      <p className="mt-1 text-[9px] text-slate-500 font-medium">Formato: 55 + DDD + 8 dígitos (apenas números)</p>
                    </div>

                    <div className="col-span-full">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">E-mail de Acesso (Não editável)</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input value={usuario?.email || ''} disabled className="premium-input pl-12 font-bold bg-slate-50 text-slate-400 cursor-not-allowed" />
                      </div>
                    </div>

                    <div className="col-span-full">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">URL do Avatar</label>
                      <div className="relative">
                        <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input {...register('avatar_url')} className="premium-input pl-12 font-medium text-xs font-mono" placeholder="https://exemplo.com/avatar.jpg" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={salvando}
                      className="flex items-center gap-2 h-12 px-10 rounded-2xl bg-slate-900 text-white font-black shadow-xl shadow-slate-900/10 hover:scale-[1.02] transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Save size={18} />
                      {salvando ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </form>
              )}

              {tab === 'assinatura' && (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto">
                    <CreditCard size={32} className="text-slate-300" />
                  </div>
                  <h3 className="text-lg font-black text-slate-400 uppercase tracking-tighter">Em breve: Assinaturas Stripe</h3>
                  <p className="text-sm text-slate-400 max-w-xs mx-auto">Estamos preparando o sistema de faturamento para você gerenciar seu plano Granofin.</p>
                </div>
              )}

              {tab === 'seguranca' && (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto">
                    <ShieldCheck size={32} className="text-slate-300" />
                  </div>
                  <h3 className="text-lg font-black text-slate-400 uppercase tracking-tighter">Em breve: Alteração de Senha</h3>
                  <p className="text-sm text-slate-400 max-w-xs mx-auto">Funcionalidades de segurança avançada estão sendo implementadas.</p>
                </div>
              )}
            </motion.div>
          </main>
        </div>
      </div>
    </AppShell>
  )
}
