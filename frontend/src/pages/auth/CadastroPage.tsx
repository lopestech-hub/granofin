import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
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
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-colors'

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-green-600">Granofin</h1>
          <p className="mt-2 text-slate-500">Crie sua conta grátis — 14 dias sem cartão</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200"
        >
          {/* Nome */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Nome</label>
            <input {...register('nome')} type="text" placeholder="Seu nome completo" className={inputClass} />
            {errors.nome && <p className="mt-1 text-xs text-red-500">{errors.nome.message}</p>}
          </div>

          {/* E-mail */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">E-mail</label>
            <input {...register('email')} type="email" placeholder="seu@email.com" className={inputClass} />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          {/* Telefone */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Telefone</label>
            <input
              {...register('telefone')}
              type="tel"
              placeholder="(11) 99999-9999"
              className={inputClass}
            />
            {errors.telefone && <p className="mt-1 text-xs text-red-500">{errors.telefone.message}</p>}
          </div>

          {/* Senha */}
          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Senha</label>
            <input
              {...register('senha')}
              type="password"
              placeholder="Mínimo 8 caracteres"
              className={inputClass}
            />
            {errors.senha && <p className="mt-1 text-xs text-red-500">{errors.senha.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Criando conta...' : 'Criar conta grátis'}
          </button>

          <p className="mt-4 text-center text-sm text-slate-500">
            Já tem conta?{' '}
            <Link to="/auth/login" className="font-medium text-green-600 hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
