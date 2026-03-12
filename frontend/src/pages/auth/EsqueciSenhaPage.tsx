import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion } from 'motion/react'
import { Mail, ArrowLeft, Send } from 'lucide-react'
import { api, ApiError } from '@/services/api'
import { Logo } from '@/components/ui/Logo'

const schema = z.object({ email: z.string().email('E-mail inválido') })
type FormData = z.infer<typeof schema>

const EASE = [0.25, 1, 0.5, 1] as [number, number, number, number]

export default function EsqueciSenhaPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting, isSubmitSuccessful } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="w-full max-w-[440px] text-center"
        >
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-indigo-600/30">
            <Mail size={32} strokeWidth={2.5} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase mb-3">Verifique seu Portal</h2>
          <p className="text-slate-500 font-medium italic mb-10">
            Se este e-mail existe em nossa rede, você receberá o protocolo de recuperação em instantes.
          </p>
          <Link to="/auth/login" className="flex items-center justify-center gap-2 text-xs font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors">
            <ArrowLeft size={16} />
            Retornar ao Acesso
          </Link>
        </motion.div>
      </div>
    )
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-2">Protocolo de Reset</h1>
            <p className="text-sm text-slate-500 font-medium italic">Insira seu e-mail cadastrado para redefinir sua chave de segurança.</p>
          </header>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">DASHBOARD IDENTIFIER (EMAIL)</label>
              <input
                {...register('email')}
                type="email"
                placeholder="ex: voce@empresa.com"
                className="premium-input h-12"
              />
              {errors.email && <p className="mt-2 text-[10px] text-rose-500 font-bold ml-1">{errors.email.message}</p>}
            </div>

            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="flex w-full items-center justify-center gap-3 h-14 rounded-2xl bg-indigo-600 text-sm font-black text-white shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'ENVIANDO PROTOCOLO...' : (
                <>
                  SOLICITAR RESET
                  <Send size={18} strokeWidth={3} />
                </>
              )}
            </motion.button>

            <footer className="pt-6 text-center border-t border-slate-50">
              <Link to="/auth/login" className="flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-colors">
                <ArrowLeft size={14} />
                Cancelar e Voltar
              </Link>
            </footer>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
