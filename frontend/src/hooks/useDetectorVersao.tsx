import { useEffect, useRef } from 'react'
import toast from 'react-hot-toast'

// Versão local — armazenada na primeira checagem
let versaoLocal: string | null = null

export function useDetectorVersao(intervaloMs = 5 * 60 * 1000) {
  const notificado = useRef(false)

  useEffect(() => {
    const verificar = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`)
        if (!res.ok) return
        const { version } = await res.json()

        // Primeira execução: apenas registra a versão atual
        if (!versaoLocal) {
          versaoLocal = version
          return
        }

        if (version !== versaoLocal && !notificado.current) {
          notificado.current = true
          toast(
            (t) => (
              <div className="flex items-center gap-3">
                <span>Nova versão disponível!</span>
                <button
                  onClick={() => {
                    toast.dismiss(t.id)
                    window.location.reload()
                  }}
                  className="ml-2 rounded bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700"
                >
                  Atualizar
                </button>
              </div>
            ),
            { duration: Infinity, icon: '🔄' }
          )
        }
      } catch {
        // Silencioso — não interromper o usuário por falha de rede
      }
    }

    // Executa imediatamente para registrar versão inicial
    verificar()

    const intervalo = setInterval(verificar, intervaloMs)
    return () => clearInterval(intervalo)
  }, [intervaloMs])
}
