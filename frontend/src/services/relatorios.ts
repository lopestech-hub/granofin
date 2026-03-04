import { api } from './api'

export interface ResumoMensal {
  mes: number
  ano: number
  total_receitas: number
  total_despesas: number
  saldo: number
  qtd_receitas: number
  qtd_despesas: number
}

export interface GastoCategoria {
  categoria: { id: string; nome: string; cor: string; icone: string }
  total: number
  quantidade: number
  percentual: number
}

export interface EvolucaoMes {
  mes: number
  ano: number
  label: string
  receitas: number
  despesas: number
  saldo: number
}

export const relatoriosService = {
  resumoMensal: (mes: number, ano: number) =>
    api.get<{ success: boolean; resumo: ResumoMensal }>(`/relatorios/resumo-mensal?mes=${mes}&ano=${ano}`),
  gastosPorCategoria: (mes: number, ano: number) =>
    api.get<{ success: boolean; gastos_por_categoria: GastoCategoria[]; total_geral: number }>(
      `/relatorios/gastos-categoria?mes=${mes}&ano=${ano}`
    ),
  evolucao: (meses = 6) =>
    api.get<{ success: boolean; evolucao: EvolucaoMes[] }>(`/relatorios/evolucao?meses=${meses}`),
}
