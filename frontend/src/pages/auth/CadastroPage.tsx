import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { api, ApiError } from '@/services/api'
import { useAuthStore } from '@/store/auth'

const schema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  telefone: z
    .string()
    .min(10, 'Telefone inválido — inclua o DDD')
    .max(20, 'Telefone inválido')
    .regex(/^\+?[\d\s\(\)\-]+$/, 'Use apenas números, espaços, +, ( e )'),
  senha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
})

type FormData = z.infer<typeof schema>

const inputClass =
  'w-full h-10 rounded-lg border border-slate-300 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all'

export default function CadastroPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post<{
        success: boolean
        access_token: string
        refresh_token: string
        usuario: any
      }>('/auth/cadastro', data)
      login(res.usuario, res.access_token, res.refresh_token)
      toast.success('Conta criada! Aproveite seus 14 dias grátis.')
      navigate('/dashboard')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao criar conta'
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
        <Logo variant="light" size="md" />

        <div className="space-y-5">
          <p className="text-xs font-medium uppercase tracking-widest text-green-500">Comece gratuitamente</p>
          <h2 className="text-3xl font-bold text-white leading-tight tracking-tight">
            14 dias grátis.<br />Sem cartão.
          </h2>
          <p className="text-slate-400 text-base leading-relaxed max-w-xs">
            Crie sua conta em segundos e comece a organizar suas finanças hoje mesmo.
          </p>

          <div className="rounded-xl border border-slate-800 p-5 space-y-3 mt-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Trial inclui</p>
            {[
              'Contas e lançamentos ilimitados',
              'Orçamentos por categoria',
              'Contas a pagar com recorrência',
              'Relatórios e gráficos de evolução',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                <span className="text-sm text-slate-400">{item}</span>
              </div>
            ))}
          </div>
        </div>

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
          <Logo variant="dark" size="sm" className="mb-8 lg:hidden" />

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Criar conta grátis</h1>
            <p className="mt-1.5 text-sm text-slate-500">14 dias de trial sem precisar de cartão.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Nome</label>
              <input {...register('nome')} type="text" placeholder="Seu nome completo" autoComplete="name" className={inputClass} />
              {errors.nome && <p className="mt-1 text-xs text-red-500">{errors.nome.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">E-mail</label>
              <input {...register('email')} type="email" placeholder="seu@email.com" autoComplete="email" className={inputClass} />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Telefone</label>
              <input {...register('telefone')} type="tel" placeholder="(11) 99999-9999" autoComplete="tel" className={inputClass} />
              {errors.telefone && <p className="mt-1 text-xs text-red-500">{errors.telefone.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Senha</label>
              <input {...register('senha')} type="password" placeholder="Mínimo 8 caracteres" autoComplete="new-password" className={inputClass} />
              {errors.senha && <p className="mt-1 text-xs text-red-500">{errors.senha.message}</p>}
            </div>

            <div className="pt-1">
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileTap={{ scale: 0.98 }}
                className="flex w-full items-center justify-center gap-2 h-10 rounded-lg bg-green-600 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Criando conta...' : (
                  <>
                    Criar conta grátis
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </motion.button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Já tem conta?{' '}
            <Link to="/auth/login" className="font-semibold text-green-600 hover:text-green-700 transition-colors">
              Entrar
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
