import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion } from 'motion/react'
import { KeyRound, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react'
import { api, ApiError } from '@/services/api'
import { Logo } from '@/components/ui/Logo'

const schema = z.object({
  nova_senha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
})
type FormData = z.infer<typeof schema>

const EASE = [0.25, 1, 0.5, 1] as [number, number, number, number]

export default function NovaSenhaPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast.error('Token inválido ou expirado. Solicite um novo reset.')
      return
    }

    try {
      await api.post('/auth/resetar-senha', { token, nova_senha: data.nova_senha })
      toast.success('Senha redefinida com sucesso! Proteção atualizada.')
      navigate('/auth/login')
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erro ao redefinir senha'
      toast.error(msg)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-[440px] space-y-12">
        <div className="flex justify-center">
          <Logo variant="dark" size="sm" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="card-premium p-10 bg-white"
        >
          <header className="mb-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 shadow-sm">
              <KeyRound size={24} strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-2">Redefinição de Chave</h1>
            <p className="text-sm text-slate-500 font-medium italic">Escolha uma nova senha forte para proteger sua conta Granofin.</p>
          </header>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Nova Senha (8+ Caracteres)</label>
              <div className="relative">
                <input
                  {...register('nova_senha')}
                  type="password"
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  className="premium-input h-12 pr-12"
                />
                <ShieldCheck size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
              </div>
              {errors.nova_senha && <p className="mt-2 text-[10px] text-rose-500 font-bold ml-1">{errors.nova_senha.message}</p>}
            </div>

            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="flex w-full items-center justify-center gap-3 h-14 rounded-2xl bg-slate-900 text-sm font-black text-white shadow-xl hover:bg-black transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'SALVANDO CHAVE...' : (
                <>
                  SALVAR NOVA SENHA
                  <ArrowRight size={18} strokeWidth={3} />
                </>
              )}
            </motion.button>

            <footer className="pt-6 text-center border-t border-slate-50">
              <Link to="/auth/login" className="flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-colors">
                <ArrowLeft size={14} />
                Voltar para Login
              </Link>
            </footer>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
