import { FastifyPluginAsync } from 'fastify'
import { v4 as uuidv4 } from 'uuid'
import { addDays, addWeeks, addMonths, addYears, parseISO, startOfDay, endOfDay } from 'date-fns'
import {
  schemaCriarContaPagar,
  schemaEditarContaPagar,
  schemaBaixarContaPagar,
  schemaFiltrosListar,
} from './schema'

// Calcula a próxima data de vencimento conforme o tipo de recorrência
function proximoVencimento(data: Date, recorrencia: string, ocorrencia: number): Date {
  switch (recorrencia) {
    case 'DIARIA':      return addDays(data, ocorrencia)
    case 'SEMANAL':     return addWeeks(data, ocorrencia)
    case 'QUINZENAL':   return addDays(data, ocorrencia * 15)
    case 'MENSAL':      return addMonths(data, ocorrencia)
    case 'BIMESTRAL':   return addMonths(data, ocorrencia * 2)
    case 'TRIMESTRAL':  return addMonths(data, ocorrencia * 3)
    case 'SEMESTRAL':   return addMonths(data, ocorrencia * 6)
    case 'ANUAL':       return addYears(data, ocorrencia)
    default:            return data
  }
}

export const contasPagarRoutes: FastifyPluginAsync = async (app) => {
  // GET /contas-pagar — Listar com filtros
  app.get('/', { preHandler: [app.autenticar] }, async (request, reply) => {
    const { id: usuario_id } = request.user as any

    const filtros = schemaFiltrosListar.safeParse(request.query)
    if (!filtros.success) {
      return reply.status(400).send({ success: false, error: filtros.error.errors[0].message })
    }

    const { status, mes, ano, categoria_id } = filtros.data

    const where: any = {
      usuario_id,
      deletado_em: null,
    }

    if (status) where.status = status
    if (categoria_id) where.categoria_id = categoria_id

    if (mes && ano) {
      const inicio = new Date(ano, mes - 1, 1)
      const fim = new Date(ano, mes, 0, 23, 59, 59)
      where.data_vencimento = { gte: inicio, lte: fim }
    } else if (ano) {
      where.data_vencimento = {
        gte: new Date(ano, 0, 1),
        lte: new Date(ano, 11, 31, 23, 59, 59),
      }
    }

    const contas = await app.prisma.contas_pagar.findMany({
      where,
      include: {
        categoria: { select: { id: true, nome: true, cor: true, icone: true } },
        conta: { select: { id: true, nome: true, tipo: true } },
      },
      orderBy: { data_vencimento: 'asc' },
    })

    return reply.send({ success: true, contas })
  })

  // GET /contas-pagar/resumo — Totais por status
  app.get('/resumo', { preHandler: [app.autenticar] }, async (request, reply) => {
    const { id: usuario_id } = request.user as any

    const hoje = new Date()
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59)

    const [pendentes, vencidas, pagas, total] = await Promise.all([
      app.prisma.contas_pagar.aggregate({
        where: { usuario_id, status: 'PENDENTE', deletado_em: null, data_vencimento: { gte: hoje } },
        _sum: { valor: true },
        _count: true,
      }),
      app.prisma.contas_pagar.aggregate({
        where: { usuario_id, status: 'PENDENTE', deletado_em: null, data_vencimento: { lt: hoje } },
        _sum: { valor: true },
        _count: true,
      }),
      app.prisma.contas_pagar.aggregate({
        where: { usuario_id, status: 'PAGO', deletado_em: null, data_pagamento: { gte: inicioMes, lte: fimMes } },
        _sum: { valor: true },
        _count: true,
      }),
      app.prisma.contas_pagar.aggregate({
        where: { usuario_id, deletado_em: null, data_vencimento: { gte: inicioMes, lte: fimMes } },
        _sum: { valor: true },
        _count: true,
      }),
    ])

    return reply.send({
      success: true,
      resumo: {
        pendentes: { valor: Number(pendentes._sum.valor ?? 0), quantidade: pendentes._count },
        vencidas: { valor: Number(vencidas._sum.valor ?? 0), quantidade: vencidas._count },
        pagas_mes: { valor: Number(pagas._sum.valor ?? 0), quantidade: pagas._count },
        total_mes: { valor: Number(total._sum.valor ?? 0), quantidade: total._count },
      },
    })
  })

  // GET /contas-pagar/:id — Detalhe
  app.get('/:id', { preHandler: [app.autenticar] }, async (request, reply) => {
    const { id: usuario_id } = request.user as any
    const { id } = request.params as { id: string }

    const conta = await app.prisma.contas_pagar.findFirst({
      where: { id, usuario_id, deletado_em: null },
      include: {
        categoria: { select: { id: true, nome: true, cor: true, icone: true } },
        conta: { select: { id: true, nome: true, tipo: true } },
        lancamento: { select: { id: true, valor: true, data: true } },
      },
    })

    if (!conta) {
      return reply.status(404).send({ success: false, error: 'Conta a pagar não encontrada' })
    }

    return reply.send({ success: true, conta })
  })

  // POST /contas-pagar — Criar
  app.post('/', { preHandler: [app.autenticar] }, async (request, reply) => {
    const { id: usuario_id } = request.user as any

    const resultado = schemaCriarContaPagar.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: resultado.error.errors[0].message })
    }

    const {
      categoria_id,
      descricao,
      valor,
      data_vencimento,
      observacoes,
      recorrencia,
      total_ocorrencias,
      total_parcelas,
    } = resultado.data

    const dataBase = parseISO(
      data_vencimento.includes('T') ? data_vencimento : `${data_vencimento}T12:00:00`
    )

    // Parcelamento
    if (total_parcelas && total_parcelas > 1) {
      const grupo_parcelas = uuidv4()
      const valorParcela = Number((valor / total_parcelas).toFixed(2))

      const parcelas = Array.from({ length: total_parcelas }, (_, i) => ({
        id: uuidv4(),
        usuario_id,
        categoria_id,
        descricao: `${descricao} (${i + 1}/${total_parcelas})`,
        valor: i === total_parcelas - 1
          ? Number((valor - valorParcela * (total_parcelas - 1)).toFixed(2))
          : valorParcela,
        data_vencimento: addMonths(dataBase, i),
        observacoes: observacoes ?? null,
        recorrencia: 'NENHUMA' as const,
        parcela_atual: i + 1,
        total_parcelas,
        grupo_parcelas,
        criado_em: new Date(),
        atualizado_em: new Date(),
      }))

      await app.prisma.contas_pagar.createMany({ data: parcelas })

      const criadas = await app.prisma.contas_pagar.findMany({
        where: { grupo_parcelas },
        orderBy: { parcela_atual: 'asc' },
      })

      return reply.status(201).send({ success: true, contas: criadas })
    }

    // Recorrência (gerar todas de uma vez)
    if (recorrencia !== 'NENHUMA' && total_ocorrencias && total_ocorrencias > 1) {
      const grupo_recorrencia = uuidv4()

      const ocorrencias = Array.from({ length: total_ocorrencias }, (_, i) => ({
        id: uuidv4(),
        usuario_id,
        categoria_id,
        descricao: `${descricao} (${i + 1}/${total_ocorrencias})`,
        valor,
        data_vencimento: proximoVencimento(dataBase, recorrencia, i),
        observacoes: observacoes ?? null,
        recorrencia,
        grupo_recorrencia,
        ocorrencia_atual: i + 1,
        total_ocorrencias,
        criado_em: new Date(),
        atualizado_em: new Date(),
      }))

      await app.prisma.contas_pagar.createMany({ data: ocorrencias })

      const criadas = await app.prisma.contas_pagar.findMany({
        where: { grupo_recorrencia },
        orderBy: { ocorrencia_atual: 'asc' },
      })

      return reply.status(201).send({ success: true, contas: criadas })
    }

    // Conta simples (única)
    const conta = await app.prisma.contas_pagar.create({
      data: {
        usuario_id,
        categoria_id,
        descricao,
        valor,
        data_vencimento: dataBase,
        observacoes: observacoes ?? null,
        recorrencia,
      },
    })

    return reply.status(201).send({ success: true, conta })
  })

  // PUT /contas-pagar/:id — Editar (apenas PENDENTE)
  app.put('/:id', { preHandler: [app.autenticar] }, async (request, reply) => {
    const { id: usuario_id } = request.user as any
    const { id } = request.params as { id: string }

    const existente = await app.prisma.contas_pagar.findFirst({
      where: { id, usuario_id, deletado_em: null },
    })

    if (!existente) {
      return reply.status(404).send({ success: false, error: 'Conta a pagar não encontrada' })
    }

    if (existente.status !== 'PENDENTE') {
      return reply.status(400).send({ success: false, error: 'Só é possível editar contas com status PENDENTE' })
    }

    const resultado = schemaEditarContaPagar.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: resultado.error.errors[0].message })
    }

    const data: any = { ...resultado.data }
    if (data.data_vencimento) {
      data.data_vencimento = parseISO(
        data.data_vencimento.includes('T') ? data.data_vencimento : `${data.data_vencimento}T12:00:00`
      )
    }

    const conta = await app.prisma.contas_pagar.update({
      where: { id },
      data,
    })

    return reply.send({ success: true, conta })
  })

  // DELETE /contas-pagar/:id — Cancelar/deletar (soft delete)
  app.delete('/:id', { preHandler: [app.autenticar] }, async (request, reply) => {
    const { id: usuario_id } = request.user as any
    const { id } = request.params as { id: string }

    const existente = await app.prisma.contas_pagar.findFirst({
      where: { id, usuario_id, deletado_em: null },
    })

    if (!existente) {
      return reply.status(404).send({ success: false, error: 'Conta a pagar não encontrada' })
    }

    if (existente.status === 'PAGO') {
      return reply.status(400).send({ success: false, error: 'Não é possível excluir uma conta já paga' })
    }

    await app.prisma.contas_pagar.delete({
      where: { id },
    })

    return reply.send({ success: true })
  })

  // POST /contas-pagar/:id/baixar — Registrar pagamento → cria lançamento
  app.post('/:id/baixar', { preHandler: [app.autenticar] }, async (request, reply) => {
    const { id: usuario_id } = request.user as any
    const { id } = request.params as { id: string }

    const existente = await app.prisma.contas_pagar.findFirst({
      where: { id, usuario_id, deletado_em: null },
      include: { categoria: true },
    })

    if (!existente) {
      return reply.status(404).send({ success: false, error: 'Conta a pagar não encontrada' })
    }

    if (existente.status === 'PAGO') {
      return reply.status(400).send({ success: false, error: 'Esta conta já foi paga' })
    }

    if (existente.status === 'CANCELADO') {
      return reply.status(400).send({ success: false, error: 'Esta conta foi cancelada' })
    }

    const resultado = schemaBaixarContaPagar.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: resultado.error.errors[0].message })
    }

    const { conta_id, data_pagamento, valor_pago } = resultado.data

    // Verifica se a conta financeira pertence ao usuário
    const contaFinanceira = await app.prisma.contas.findFirst({
      where: { id: conta_id, usuario_id, deletado_em: null },
    })

    if (!contaFinanceira) {
      return reply.status(404).send({ success: false, error: 'Conta financeira não encontrada' })
    }

    const dataPagamento = data_pagamento
      ? parseISO(data_pagamento.includes('T') ? data_pagamento : `${data_pagamento}T12:00:00`)
      : new Date()

    // Realiza a baixa e atualização de saldo em transação
    const { conta: contaAtualizada, lancamento } = await app.prisma.$transaction(async (tx) => {
      // 1. Cria o lançamento automaticamente
      const l = await tx.lancamentos.create({
        data: {
          usuario_id,
          conta_id,
          categoria_id: existente.categoria_id,
          descricao: existente.descricao,
          valor: valor_pago ?? existente.valor,
          tipo: 'DESPESA',
          data: dataPagamento,
          efetivado: true,
          observacoes: existente.observacoes ?? undefined,
        },
      })

      // 2. Atualiza saldo da conta financeira (subtrai)
      await tx.contas.update({
        where: { id: conta_id },
        data: { saldo_atual: { decrement: valor_pago ?? existente.valor } }
      })

      // 3. Atualiza a conta a pagar como PAGA
      const cp = await tx.contas_pagar.update({
        where: { id },
        data: {
          status: 'PAGO',
          conta_id,
          data_pagamento: dataPagamento,
          lancamento_id: l.id,
        },
      })

      return { conta: cp, lancamento: l }
    })

    return reply.send({ success: true, conta: contaAtualizada, lancamento })
  })

  // POST /contas-pagar/:id/comprovante — Upload de comprovante
  app.post('/:id/comprovante', { preHandler: [app.autenticar] }, async (request, reply) => {
    const { id: usuario_id } = request.user as any
    const { id } = request.params as { id: string }

    const existente = await app.prisma.contas_pagar.findFirst({
      where: { id, usuario_id, deletado_em: null },
    })

    if (!existente) {
      return reply.status(404).send({ success: false, error: 'Conta a pagar não encontrada' })
    }

    const data = await request.file()
    if (!data) {
      return reply.status(400).send({ success: false, error: 'Nenhum arquivo enviado' })
    }

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!tiposPermitidos.includes(data.mimetype)) {
      return reply.status(400).send({ success: false, error: 'Tipo de arquivo não permitido. Use JPG, PNG, WEBP ou PDF' })
    }

    const chunks: Buffer[] = []
    for await (const chunk of data.file) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    if (buffer.length > 5 * 1024 * 1024) {
      return reply.status(400).send({ success: false, error: 'Arquivo muito grande. Máximo: 5MB' })
    }

    const ext = data.mimetype.split('/')[1].replace('jpeg', 'jpg')
    const key = `comprovantes/${usuario_id}/${id}.${ext}`

    // Se já tinha comprovante, o novo sobrescreve (mesmo key por ID)
    const url = await app.r2.uploadComprovante(key, buffer, data.mimetype)

    await app.prisma.contas_pagar.update({
      where: { id },
      data: { comprovante_url: url },
    })

    return reply.send({ success: true, comprovante_url: url })
  })
}
