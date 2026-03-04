import { useEffect } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

interface Props {
  aberto: boolean
  titulo: string
  onFechar: () => void
  children: React.ReactNode
  largura?: 'sm' | 'md' | 'lg' | 'xl'
}

const larguras = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

const EASE = [0.25, 1, 0.5, 1] as [number, number, number, number]

export default function Modal({ aberto, titulo, onFechar, children, largura = 'md' }: Props) {
  useEffect(() => {
    if (!aberto) return
    const handler = (e: KeyboardEvent) => { e.key === 'Escape' && onFechar() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [aberto, onFechar])

  return (
    <AnimatePresence>
      {aberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onFechar}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.4, ease: EASE }}
            className={`relative z-10 w-full ${larguras[largura]} bg-white rounded-[2rem] shadow-2xl border border-white/40 overflow-hidden`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">{titulo}</h2>
              <button
                onClick={onFechar}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Content Body */}
            <div className="px-8 py-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
