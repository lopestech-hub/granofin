import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary-600">Granofin</h1>
          <p className="mt-2 text-gray-500">Entre na sua conta</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">E-mail</label>
            <input
              {...register('email')}
              type="email"
              placeholder="seu@email.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Senha</label>
            <input
              {...register('senha')}
              type="password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
            {errors.senha && <p className="mt-1 text-xs text-red-500">{errors.senha.message}</p>}
            <div className="mt-2 text-right">
              <Link to="/auth/esqueci-senha" className="text-xs text-primary-600 hover:underline">
                Esqueci minha senha
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>

          <p className="mt-4 text-center text-sm text-gray-500">
            Não tem conta?{' '}
            <Link to="/auth/cadastro" className="font-medium text-primary-600 hover:underline">
              Criar conta grátis
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
