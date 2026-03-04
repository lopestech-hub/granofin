import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api, ApiError } from '@/services/api'

const schema = z.object({
  nova_senha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
})
type FormData = z.infer<typeof schema>

export default function NovaSenhaPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast.error('Token inválido. Solicite um novo link de reset.')
      return
    }

    try {
      await api.post('/auth/resetar-senha', { token, nova_senha: data.nova_senha })
      toast.success('Senha redefinida com sucesso!')
      navigate('/auth/login')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao redefinir senha'
      toast.error(msg)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800">Nova senha</h1>
          <p className="mt-2 text-gray-500">Digite sua nova senha abaixo</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
          <div className="mb-6">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Nova senha</label>
            <input
              {...register('nova_senha')}
              type="password"
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
            {errors.nova_senha && <p className="mt-1 text-xs text-red-500">{errors.nova_senha.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>
      </div>
    </div>
  )
}
