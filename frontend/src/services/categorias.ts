import { api } from './api'

export interface Categoria {
  id: string
  nome: string
  tipo: 'RECEITA' | 'DESPESA'
  cor: string
  icone: string
  padrao: boolean
  parent_id?: string | null
  usuario_id?: string | null
}

export const categoriasService = {
  listar: () => api.get<{ success: boolean; categorias: Categoria[] }>('/categorias'),
  criar: (data: Omit<Categoria, 'id' | 'padrao' | 'usuario_id'>) =>
    api.post<{ success: boolean; categoria: Categoria }>('/categorias', data),
  atualizar: (id: string, data: Partial<Categoria>) =>
    api.put<{ success: boolean; categoria: Categoria }>(`/categorias/${id}`, data),
  deletar: (id: string) => api.delete<{ success: boolean }>(`/categorias/${id}`),
}
