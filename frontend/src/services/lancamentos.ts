import { api } from './api'
import type { Categoria } from './categorias'
import type { Conta } from './contas'

export interface Lancamento {
  id: string
  descricao: string
  valor: number
  tipo: 'RECEITA' | 'DESPESA'
  data: string
  efetivado: boolean
  observacoes?: string
  parcela_atual?: number
  total_parcelas?: number
  grupo_parcelas?: string
  categoria: Pick<Categoria, 'id' | 'nome' | 'cor' | 'icone'>
  conta: Pick<Conta, 'id' | 'nome'>
}

export interface FiltrosLancamento {
  mes?: number
  ano?: number
  conta_id?: string
  categoria_id?: string
  tipo?: 'RECEITA' | 'DESPESA'
}

export interface NovoLancamento {
  conta_id: string
  categoria_id: string
  descricao: string
  valor: number
  tipo: 'RECEITA' | 'DESPESA'
  data: string
  efetivado?: boolean
  observacoes?: string
  total_parcelas?: number
}

function filtrosParaQuery(filtros: FiltrosLancamento): string {
  const params = new URLSearchParams()
  if (filtros.mes) params.set('mes', String(filtros.mes))
  if (filtros.ano) params.set('ano', String(filtros.ano))
  if (filtros.conta_id) params.set('conta_id', filtros.conta_id)
  if (filtros.categoria_id) params.set('categoria_id', filtros.categoria_id)
  if (filtros.tipo) params.set('tipo', filtros.tipo)
  return params.toString()
}

export const lancamentosService = {
  listar: (filtros: FiltrosLancamento = {}) => {
    const qs = filtrosParaQuery(filtros)
    return api.get<{ success: boolean; lancamentos: Lancamento[] }>(`/lancamentos${qs ? '?' + qs : ''}`)
  },
  criar: (data: NovoLancamento) =>
    api.post<{ success: boolean; lancamento?: Lancamento; grupo_parcelas?: string }>('/lancamentos', data),
  atualizar: (id: string, data: Partial<NovoLancamento>) =>
    api.put<{ success: boolean; lancamento: Lancamento }>(`/lancamentos/${id}`, data),
  deletar: (id: string) => api.delete<{ success: boolean }>(`/lancamentos/${id}`),
  efetivar: (id: string) =>
    api.patch<{ success: boolean; lancamento: Lancamento }>(`/lancamentos/${id}/efetivar`),
}
