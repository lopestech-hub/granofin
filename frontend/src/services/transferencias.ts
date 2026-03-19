import { api } from './api'

export interface TransferenciaData {
  conta_origem_id: string
  conta_destino_id: string
  valor: number
  data: string
  observacoes?: string
}

export const transferenciasService = {
  criar: async (data: TransferenciaData) => {
    const response = await api.post<{ success: boolean; transferencia_id: string }>('/transferencias', data)
    return response.transferencia_id
  }
}
