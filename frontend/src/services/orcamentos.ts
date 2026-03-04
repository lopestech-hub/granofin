import { api } from './api'
import type { Categoria } from './categorias'

export interface Orcamento {
  id: string
  categoria_id: string
  valor_limite: number
  valor_gasto: number
  percentual: number
  ultrapassado: boolean
  mes: number
  ano: number
  categoria: Pick<Categoria, 'id' | 'nome' | 'cor' | 'icone'>
}

export const orcamentosService = {
  listar: (mes?: number, ano?: number) => {
    const params = new URLSearchParams()
    if (mes) params.set('mes', String(mes))
    if (ano) params.set('ano', String(ano))
    const qs = params.toString()
    return api.get<{ success: boolean; orcamentos: Orcamento[] }>(`/orcamentos${qs ? '?' + qs : ''}`)
  },
  criar: (data: { categoria_id: string; valor_limite: number; mes: number; ano: number }) =>
    api.post<{ success: boolean; orcamento: Orcamento }>('/orcamentos', data),
  atualizar: (id: string, valor_limite: number) =>
    api.put<{ success: boolean; orcamento: Orcamento }>(`/orcamentos/${id}`, { valor_limite }),
  deletar: (id: string) => api.delete<{ success: boolean }>(`/orcamentos/${id}`),
}
