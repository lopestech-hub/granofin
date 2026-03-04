import { useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  aberto: boolean
  titulo: string
  onFechar: () => void
  children: React.ReactNode
  largura?: 'sm' | 'md' | 'lg'
}

const larguras = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export default function Modal({ aberto, titulo, onFechar, children, largura = 'md' }: Props) {
  // Fechar com Esc
  useEffect(() => {
    if (!aberto) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [aberto, onFechar])

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onFechar}
      />

      {/* Conteúdo */}
      <div
        className={`relative z-10 w-full ${larguras[largura]} rounded-2xl bg-white shadow-xl border border-slate-200`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
          <button
            onClick={onFechar}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
