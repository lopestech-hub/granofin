// Utilitários de formatação — timezone America/Sao_Paulo

import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

export function formatarData(data: string | Date): string {
  const d = typeof data === 'string' ? parseISO(data) : data
  return format(d, 'dd/MM/yyyy', { locale: ptBR })
}

export function formatarMesAno(mes: number, ano: number): string {
  const d = new Date(ano, mes - 1, 1)
  return format(d, 'MMMM yyyy', { locale: ptBR })
}

export function mesAtual(): number {
  return new Date().getMonth() + 1
}

export function anoAtual(): number {
  return new Date().getFullYear()
}

export function formatarPorcentagem(valor: number): string {
  return `${Math.min(valor, 999)}%`
}

export function abreviarNome(nome: string): string {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((p, i) => (i === 0 ? p : p[0] + '.'))
    .join(' ')
}
