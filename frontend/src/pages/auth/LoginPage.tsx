import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion } from 'motion/react'
import { ArrowRight, ShieldCheck, Zap, TrendingUp } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { api, ApiError } from '@/services/api'
import { useAuthStore } from '@/store/auth'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(1, 'Senha obrigatória'),
})

type FormData = z.infer<typeof schema>

const EASE = [0.25, 1, 0.5, 1] as [number, number, number, number]

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post<{ success: boolean; access_token: string; refresh_token: string; usuario: any }>(
        '/auth/login',
        data
      )
      login(res.usuario, res.access_token, res.refresh_token)
      navigate('/dashboard')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao fazer login'
      toast.error(msg)
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Visual Side (Left) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="hidden lg:flex lg:w-[45%] xl:w-[50%] bg-slate-950 px-16 py-16 flex-shrink-0 relative overflow-hidden flex-col justify-between"
      >
        <Logo variant="light" size="md" className="relative z-10" />

        <div className="relative z-10 max-w-lg space-y-12">
          <div className="space-y-6">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6, ease: EASE }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                <Zap size={14} className="fill-current" />
                Inteligência Financeira
              </span>
              <h2 className="text-5xl font-black text-white leading-[1.1] tracking-tighter mb-6">
                O futuro da sua <br />
                <span className="text-indigo-400">liberdade</span> começa aqui.
              </h2>
              <p className="text-slate-400 text-lg font-medium leading-relaxed">
                Granofin é a plataforma definitiva para quem busca precisão, clareza e controle absoluto sobre o fluxo de caixa.
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {[
              { icon: ShieldCheck, title: 'Segurança Atômica', desc: 'Dados criptografados de ponta a ponta.' },
              { icon: TrendingUp, title: 'Growth Analytics', desc: 'Previsões baseadas em comportamento.' }
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + (i * 0.1) }}
                className="space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-indigo-400">
                  <f.icon size={20} strokeWidth={2.5} />
                </div>
                <h4 className="text-white font-bold text-sm uppercase tracking-tight">{f.title}</h4>
                <p className="text-slate-500 text-xs leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-600">
          <span>© 2024 Granofin Ecosystem</span>
          <div className="flex gap-4">
            <span className="hover:text-slate-400 transition-colors cursor-pointer">Privacidade</span>
            <span className="hover:text-slate-400 transition-colors cursor-pointer">Termos</span>
          </div>
        </div>

        {/* Abstract Background Elements */}
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600 rounded-full blur-[150px] opacity-10" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-slate-800 rounded-full blur-[120px] opacity-20" />
      </motion.div>

      {/* Form Side (Right) */}
      <div className="flex flex-1 items-center justify-center bg-slate-50/50">
        <div className="w-full max-w-[400px] px-8">
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
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-2">Login de Acesso</h1>
              <p className="text-slate-500 font-medium italic text-sm">Insira suas credenciais para gerenciar suas finanças.</p>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Identificador (E-mail)</label>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="ex: voce@empresa.com"
                    className="premium-input bg-white h-12"
                  />
                  {errors.email && <p className="mt-2 text-[10px] text-rose-500 font-bold ml-1">{errors.email.message}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chave de Segurança</label>
                    <Link to="/auth/esqueci-senha" className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors">
                      Esqueci minha chave
                    </Link>
                  </div>
                  <input
                    {...register('senha')}
                    type="password"
                    placeholder="••••••••"
                    className="premium-input bg-white h-12"
                  />
                  {errors.senha && <p className="mt-2 text-[10px] text-rose-500 font-bold ml-1">{errors.senha.message}</p>}
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
                  {isSubmitting ? (
                    'Autenticando...'
                  ) : (
                    <>
                      ACESSAR DASHBOARD
                      <ArrowRight size={18} strokeWidth={3} />
                    </>
                  )}
                </motion.button>
              </div>
            </form>

            <footer className="pt-8 border-t border-slate-200">
              <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-tight">
                Novo por aqui?{' '}
                <Link to="/auth/cadastro" className="text-indigo-600 hover:text-indigo-800 transition-colors ml-1">
                  Abra sua conta em 1 minuto
                </Link>
              </p>
            </footer>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
