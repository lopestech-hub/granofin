import { api } from './api'

export interface Conta {
  id: string
  nome: string
  tipo: 'CARTEIRA' | 'CONTA_CORRENTE' | 'POUPANCA' | 'OUTRO'
  saldo_inicial: number
  cor?: string
  icone?: string
  ativa: boolean
}

export const contasService = {
  listar: () => api.get<{ success: boolean; contas: Conta[] }>('/contas'),
  criar: (data: Omit<Conta, 'id' | 'ativa'>) =>
    api.post<{ success: boolean; conta: Conta }>('/contas', data),
  atualizar: (id: string, data: Partial<Conta>) =>
    api.put<{ success: boolean; conta: Conta }>(`/contas/${id}`, data),
  deletar: (id: string) => api.delete<{ success: boolean }>(`/contas/${id}`),
}
