import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion } from 'motion/react'
import { TrendingUp, ArrowRight } from 'lucide-react'
import { api, ApiError } from '@/services/api'
import { useAuthStore } from '@/store/auth'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(1, 'Senha obrigatória'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

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
    <div className="flex min-h-screen bg-slate-50">
      {/* Painel esquerdo — branding */}
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
        className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col justify-between bg-slate-900 px-12 py-12 flex-shrink-0"
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">Granofin</span>
        </div>

        {/* Mensagem central */}
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-widest text-green-500">Controle financeiro pessoal</p>
            <h2 className="text-3xl font-bold text-white leading-tight tracking-tight">
              Tome o controle<br />das suas finanças.
            </h2>
            <p className="text-slate-400 text-base leading-relaxed max-w-xs">
              Acompanhe receitas, despesas e orçamentos em um único lugar. Decisões melhores começam com clareza.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3 pt-2">
            {[
              'Controle de contas e lançamentos',
              'Orçamentos por categoria',
              'Contas a pagar com alertas',
              'Relatórios de evolução mensal',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                <span className="text-sm text-slate-400">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <p className="text-xs text-slate-600">
          © {new Date().getFullYear()} Granofin. Todos os direitos reservados.
        </p>
      </motion.div>

      {/* Painel direito — formulário */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1], delay: 0.1 }}
          className="w-full max-w-sm"
        >
          {/* Logo mobile */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-600">
              <TrendingUp className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-base font-bold text-slate-900 tracking-tight">Granofin</span>
          </div>

          {/* Cabeçalho */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Entrar na conta</h1>
            <p className="mt-1.5 text-sm text-slate-500">Bem-vindo de volta. Insira suas credenciais.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">E-mail</label>
              <input
                {...register('email')}
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all"
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-700">Senha</label>
                <Link
                  to="/auth/esqueci-senha"
                  className="text-xs text-green-600 hover:text-green-700 font-medium transition-colors"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <input
                {...register('senha')}
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all"
              />
              {errors.senha && <p className="mt-1 text-xs text-red-500">{errors.senha.message}</p>}
            </div>

            <div className="pt-1">
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileTap={{ scale: 0.98 }}
                className="flex w-full items-center justify-center gap-2 h-10 rounded-lg bg-green-600 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  'Entrando...'
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </motion.button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Não tem conta?{' '}
            <Link to="/auth/cadastro" className="font-semibold text-green-600 hover:text-green-700 transition-colors">
              Criar conta grátis
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
