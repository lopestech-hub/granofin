import { api } from './api'
import type { Categoria } from './categorias'

export interface Orcamento {
  id: string
  categoria_id: string
  percentual: number
  valor_alocado: number
  valor_gasto: number
  percentual_consumido: number
  ultrapassado: boolean
  subcategorias: string[]
  categoria: Pick<Categoria, 'id' | 'nome' | 'cor' | 'icone'>
}

export interface ResumoOrcamentos {
  success: boolean
  receita_mes: number
  total_alocado_percentual: number
  orcamentos: Orcamento[]
}

export const orcamentosService = {
  listar: (mes?: number, ano?: number) => {
    const params = new URLSearchParams()
    if (mes) params.set('mes', String(mes))
    if (ano) params.set('ano', String(ano))
    const qs = params.toString()
    return api.get<ResumoOrcamentos>(`/orcamentos${qs ? '?' + qs : ''}`)
  },
  criar: (data: { categoria_id: string; percentual: number }) =>
    api.post<{ success: boolean; orcamento: Orcamento }>('/orcamentos', data),
  atualizar: (id: string, percentual: number) =>
    api.put<{ success: boolean; orcamento: Orcamento }>(`/orcamentos/${id}`, { percentual }),
  deletar: (id: string) => api.delete<{ success: boolean }>(`/orcamentos/${id}`),
}
