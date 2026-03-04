import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion } from 'motion/react'
import { ArrowRight, Gift, Layers, ShieldCheck, Heart } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { api, ApiError } from '@/services/api'
import { useAuthStore } from '@/store/auth'

const schema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('E-mail invÃ¡lido'),
  telefone: z
    .string()
    .min(10, 'Telefone invÃ¡lido â€” inclua o DDD')
    .max(20, 'Telefone invÃ¡lido')
    .regex(/^\+?[\d\s\(\)\-]+$/, 'Use apenas nÃºmeros, espaÃ§os, +, ( e )'),
  senha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
})

type FormData = z.infer<typeof schema>

const EASE = [0.25, 1, 0.5, 1] as [number, number, number, number]

export default function CadastroPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post<{
        success: boolean
        access_token: string
        refresh_token: string
        usuario: any
      }>('/auth/cadastro', data)
      login(res.usuario, res.access_token, res.refresh_token)
      toast.success('Conta validada! BÃ´nus de 14 dias ativado.')
      navigate('/dashboard')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao criar conta'
      toast.error(msg)
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Visual Side (Left) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="hidden lg:flex lg:w-[45%] xl:w-[50%] bg-slate-950 px-16 py-16 flex-shrink-0 relative overflow-hidden flex-col justify-between"
      >
        <Logo variant="light" size="md" className="relative z-10" />

        <div className="relative z-10 max-w-lg space-y-12">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6, ease: EASE }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
              <Gift size={14} className="fill-current" />
              Oferta exclusiva de lanÃ§amento
            </span>
            <h2 className="text-5xl font-black text-white leading-[1.1] tracking-tighter mb-6">
              Organize sua vida <br />
              em <span className="text-indigo-400">segundos</span>.
            </h2>
            <p className="text-slate-400 text-lg font-medium leading-relaxed">
              Diga adeus Ã s planilhas complexas. Experimente a simplicidade do Granofin gratuitamente por 14 dias.
            </p>
          </motion.div>

          <div className="space-y-4">
            {[
              { icon: Layers, text: 'GestÃ£o de contas ilimitadas' },
              { icon: ShieldCheck, text: 'Privacidade de dados absoluto' },
              { icon: Heart, text: 'Suporte prioritÃ¡rio 24/7' }
            ].map((item, i) => (
              <motion.div
                key={item.text}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + (i * 0.1) }}
                className="flex items-center gap-4 group"
              >
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                  <item.icon size={16} strokeWidth={2.5} />
                </div>
                <span className="text-sm font-bold text-slate-300 uppercase tracking-tight">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-600">
          <span>Membro da rede Granofin</span>
          <span>VersÃ£o 2.0 Enterprise</span>
        </div>

        {/* Abstract Background Elements */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-green-600 rounded-full blur-[150px] opacity-10" />
      </motion.div>

      {/* Form Side (Right) */}
      <div className="flex flex-1 items-center justify-center bg-slate-50/50">
        <div className="w-full max-w-[420px] px-8 py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
            className="space-y-10"
          >
            <div className="lg:hidden mb-12 flex justify-center">
              <Logo variant="dark" size="sm" />
            </div>

            <header>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-2">Primeiros Passos</h1>
              <p className="text-slate-500 font-medium italic text-sm">Crie seu perfil e receba seu passe livre de 14 dias.</p>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nome Completo</label>
                  <input {...register('nome')} type="text" placeholder="Ex: JoÃ£o Silva" className="premium-input bg-white h-12" />
                  {errors.nome && <p className="mt-2 text-[10px] text-rose-500 font-bold ml-1">{errors.nome.message}</p>}
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">EndereÃ§o de Email</label>
                  <input {...register('email')} type="email" placeholder="seu@email.com" className="premium-input bg-white h-12" />
                  {errors.email && <p className="mt-2 text-[10px] text-rose-500 font-bold ml-1">{errors.email.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Telefone</label>
                    <input {...register('telefone')} type="tel" placeholder="(11) 99999-9999" className="premium-input bg-white h-12" />
                    {errors.telefone && <p className="mt-2 text-[10px] text-rose-500 font-bold ml-1">{errors.telefone.message}</p>}
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Chave de SeguranÃ§a</label>
                    <input {...register('senha')} type="password" placeholder="8+ caracteres" className="premium-input bg-white h-12" />
                    {errors.senha && <p className="mt-2 text-[10px] text-rose-500 font-bold ml-1">{errors.senha.message}</p>}
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="flex w-full items-center justify-center gap-3 h-14 rounded-2xl bg-indigo-600 text-sm font-black text-white shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Validando Dados...' : (
                    <>
                      ATIVAR TRIAL GRÃTIS
                      <ArrowRight size={18} strokeWidth={3} />
                    </>
                  )}
                </motion.button>
              </div>
            </form>

            <footer className="pt-8 border-t border-slate-200">
              <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-tight">
                Já possui uma conta?{' '}
                <Link to="/auth/login" className="text-indigo-600 hover:text-indigo-800 transition-colors ml-1">
                  Efetuar Login
                </Link>
              </p>
            </footer>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
