import { z } from 'zod'

export const schemaCriarContaPagar = z.object({
  categoria_id: z.string().uuid('ID de categoria inválido'),
  descricao: z.string().min(2, 'Descrição deve ter ao menos 2 caracteres').max(200),
  valor: z.number().positive('Valor deve ser positivo'),
  data_vencimento: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  observacoes: z.string().max(500).optional(),

  // Recorrência
  recorrencia: z
    .enum(['NENHUMA', 'DIARIA', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'])
    .default('NENHUMA'),
  total_ocorrencias: z.number().int().min(1).max(120).optional(),

  // Parcelamento (mutuamente exclusivo com recorrência)
  total_parcelas: z.number().int().min(2).max(120).optional(),
})

export const schemaEditarContaPagar = z.object({
  descricao: z.string().min(2).max(200).optional(),
  valor: z.number().positive().optional(),
  data_vencimento: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  categoria_id: z.string().uuid().optional(),
  observacoes: z.string().max(500).optional(),
})

export const schemaBaixarContaPagar = z.object({
  conta_id: z.string().uuid('ID de conta inválido'),
  data_pagamento: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
    .optional(),
  valor_pago: z.number().positive().optional(),
})

export const schemaFiltrosListar = z.object({
  status: z.enum(['PENDENTE', 'PAGO', 'VENCIDO', 'CANCELADO']).optional(),
  mes: z.coerce.number().int().min(1).max(12).optional(),
  ano: z.coerce.number().int().min(2020).optional(),
  categoria_id: z.string().uuid().optional(),
})

export type CriarContaPagarData = z.infer<typeof schemaCriarContaPagar>
export type EditarContaPagarData = z.infer<typeof schemaEditarContaPagar>
export type BaixarContaPagarData = z.infer<typeof schemaBaixarContaPagar>
