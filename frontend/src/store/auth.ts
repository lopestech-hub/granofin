import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Usuario {
  id: string
  nome: string
  email: string
}

interface AuthState {
  usuario: Usuario | null
  accessToken: string | null
  refreshToken: string | null
  autenticado: boolean
  login: (usuario: Usuario, accessToken: string, refreshToken: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      accessToken: null,
      refreshToken: null,
      autenticado: false,

      login: (usuario, accessToken, refreshToken) => {
        localStorage.setItem('access_token', accessToken)
        localStorage.setItem('refresh_token', refreshToken)
        set({ usuario, accessToken, refreshToken, autenticado: true })
      },

      logout: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ usuario: null, accessToken: null, refreshToken: null, autenticado: false })
      },
    }),
    {
      name: 'granofin-auth',
      partialize: (state) => ({
        usuario: state.usuario,
        autenticado: state.autenticado,
      }),
    }
  )
)
