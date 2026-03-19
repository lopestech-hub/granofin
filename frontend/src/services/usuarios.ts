import { api } from './api'

export interface Usuario {
  id: string
  nome: string
  email: string
  telefone?: string
  avatar_url?: string
  assinatura?: {
    plano: string
    status: string
    trial_expira_em?: string
  }
}

export const usuariosService = {
  getPerfil: () =>
    api.get<{ success: boolean; usuario: Usuario }>('/usuarios/perfil').then((r: any) => r.usuario ?? r.data?.usuario),
  atualizarPerfil: (data: Partial<{ nome: string; telefone: string | null; avatar_url: string | null }>) =>
    api.put<{ success: boolean; usuario: Usuario }>('/usuarios/perfil', data).then((r: any) => r.usuario ?? r.data?.usuario),
}
