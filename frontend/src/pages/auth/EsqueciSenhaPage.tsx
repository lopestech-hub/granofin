import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api, ApiError } from '@/services/api'

const schema = z.object({ email: z.string().email('E-mail inválido') })
type FormData = z.infer<typeof schema>

export default function EsqueciSenhaPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    try {
      await api.post('/auth/esqueci-senha', data)
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao solicitar reset'
      toast.error(msg)
    }
  }

  if (isSubmitSuccessful) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="mb-4 text-5xl">📬</div>
          <h2 className="text-xl font-semibold text-gray-800">Verifique seu e-mail</h2>
          <p className="mt-2 text-gray-500">
            Se o e-mail estiver cadastrado, você receberá as instruções em breve.
          </p>
          <Link to="/auth/login" className="mt-6 inline-block text-sm text-primary-600 hover:underline">
            Voltar para o login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800">Esqueci minha senha</h1>
          <p className="mt-2 text-gray-500">Digite seu e-mail para receber as instruções</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">E-mail</label>
            <input
              {...register('email')}
              type="email"
              placeholder="seu@email.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Enviando...' : 'Enviar instruções'}
          </button>

          <p className="mt-4 text-center">
            <Link to="/auth/login" className="text-sm text-primary-600 hover:underline">
              Voltar para o login
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
