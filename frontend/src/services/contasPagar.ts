import { api } from './api'

export type ContaPagarStatus = 'PENDENTE' | 'PAGO' | 'VENCIDO' | 'CANCELADO'
export type RecorrenciaTipo =
  | 'NENHUMA'
  | 'DIARIA'
  | 'SEMANAL'
  | 'QUINZENAL'
  | 'MENSAL'
  | 'BIMESTRAL'
  | 'TRIMESTRAL'
  | 'SEMESTRAL'
  | 'ANUAL'

export interface ContaPagar {
  id: string
  usuario_id: string
  categoria_id: string
  descricao: string
  valor: number
  data_vencimento: string
  status: ContaPagarStatus
  recorrencia: RecorrenciaTipo
  grupo_recorrencia?: string
  ocorrencia_atual?: number
  total_ocorrencias?: number
  parcela_atual?: number
  total_parcelas?: number
  grupo_parcelas?: string
  conta_id?: string
  data_pagamento?: string
  lancamento_id?: string
  comprovante_url?: string
  observacoes?: string
  criado_em: string
  atualizado_em: string
  categoria?: { id: string; nome: string; cor: string; icone: string }
  conta?: { id: string; nome: string; tipo: string }
}

export interface ResumoContasPagar {
  pendentes: { valor: number; quantidade: number }
  vencidas: { valor: number; quantidade: number }
  pagas_mes: { valor: number; quantidade: number }
  total_mes: { valor: number; quantidade: number }
}

export interface CriarContaPagarPayload {
  categoria_id: string
  descricao: string
  valor: number
  data_vencimento: string
  observacoes?: string
  recorrencia?: RecorrenciaTipo
  total_ocorrencias?: number
  total_parcelas?: number
}

export interface BaixarContaPagarPayload {
  conta_id: string
  data_pagamento?: string
  valor_pago?: number
}

export interface FiltrosContasPagar {
  status?: ContaPagarStatus
  mes?: number
  ano?: number
  categoria_id?: string
}

export const contasPagarService = {
  listar: async (filtros?: FiltrosContasPagar) => {
    const params = new URLSearchParams()
    if (filtros?.status) params.append('status', filtros.status)
    if (filtros?.mes) params.append('mes', String(filtros.mes))
    if (filtros?.ano) params.append('ano', String(filtros.ano))
    if (filtros?.categoria_id) params.append('categoria_id', filtros.categoria_id)
    const query = params.toString() ? `?${params.toString()}` : ''
    return api.get<{ success: boolean; contas: ContaPagar[] }>(`/contas-pagar${query}`)
  },

  resumo: async () => {
    return api.get<{ success: boolean; resumo: ResumoContasPagar }>('/contas-pagar/resumo')
  },

  buscar: async (id: string) => {
    return api.get<{ success: boolean; conta: ContaPagar }>(`/contas-pagar/${id}`)
  },

  criar: async (payload: CriarContaPagarPayload) => {
    return api.post<{ success: boolean; conta?: ContaPagar; contas?: ContaPagar[] }>('/contas-pagar', payload)
  },

  editar: async (id: string, payload: Partial<CriarContaPagarPayload>) => {
    return api.put<{ success: boolean; conta: ContaPagar }>(`/contas-pagar/${id}`, payload)
  },

  cancelar: async (id: string) => {
    return api.delete<{ success: boolean }>(`/contas-pagar/${id}`)
  },

  baixar: async (id: string, payload: BaixarContaPagarPayload) => {
    return api.post<{ success: boolean; conta: ContaPagar; lancamento: any }>(`/contas-pagar/${id}/baixar`, payload)
  },

  uploadComprovante: async (id: string, arquivo: File) => {
    const formData = new FormData()
    formData.append('file', arquivo)
    return api.postForm<{ success: boolean; comprovante_url: string }>(`/contas-pagar/${id}/comprovante`, formData)
  },
}
