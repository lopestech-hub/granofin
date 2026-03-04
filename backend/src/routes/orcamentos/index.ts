import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const schemaOrcamento = z.object({
  categoria_id: z.string().uuid(),
  valor_limite: z.number().positive(),
  mes: z.number().int().min(1).max(12),
  ano: z.number().int().min(2000),
})

export const orcamentosRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: [app.autenticar] }

  // GET /orcamentos?mes=3&ano=2026
  app.get('/', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any

    const { mes, ano } = z.object({
      mes: z.coerce.number().min(1).max(12).optional(),
      ano: z.coerce.number().min(2000).optional(),
    }).parse(request.query)

    const mesAtual = mes ?? new Date().getMonth() + 1
    const anoAtual = ano ?? new Date().getFullYear()

    const orcamentos = await app.prisma.orcamentos.findMany({
      where: { usuario_id, mes: mesAtual, ano: anoAtual },
      include: {
        categoria: { select: { id: true, nome: true, cor: true, icone: true } },
      },
    })

    // Calcular valor gasto por categoria no mês
    const inicio = new Date(anoAtual, mesAtual - 1, 1)
    const fim = new Date(anoAtual, mesAtual, 0, 23, 59, 59)

    const gastosPorCategoria = await app.prisma.lancamentos.groupBy({
      by: ['categoria_id'],
      where: {
        usuario_id,
        tipo: 'DESPESA',
        data: { gte: inicio, lte: fim },
        deletado_em: null,
        efetivado: true,
      },
      _sum: { valor: true },
    })

    const gastosMap = new Map(
      gastosPorCategoria.map((g) => [g.categoria_id, Number(g._sum.valor ?? 0)])
    )

    const resultado = orcamentos.map((o) => {
      const gasto = gastosMap.get(o.categoria_id) ?? 0
      const limite = Number(o.valor_limite)
      return {
        ...o,
        valor_limite: limite,
        valor_gasto: gasto,
        percentual: limite > 0 ? Math.round((gasto / limite) * 100) : 0,
        ultrapassado: gasto > limite,
      }
    })

    return reply.send({ success: true, orcamentos: resultado })
  })

  // POST /orcamentos
  app.post('/', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any

    const resultado = schemaOrcamento.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: resultado.error.errors[0].message })
    }

    try {
      const orcamento = await app.prisma.orcamentos.create({
        data: { ...resultado.data, usuario_id },
        include: { categoria: { select: { id: true, nome: true, cor: true, icone: true } } },
      })
      return reply.status(201).send({ success: true, orcamento })
    } catch {
      return reply.status(409).send({ success: false, error: 'Orçamento já existe para esta categoria/mês' })
    }
  })

  // PUT /orcamentos/:id
  app.put('/:id', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any
    const { id } = request.params as { id: string }

    const resultado = z.object({ valor_limite: z.number().positive() }).safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'valor_limite inválido' })
    }

    const existente = await app.prisma.orcamentos.findFirst({ where: { id, usuario_id } })
    if (!existente) {
      return reply.status(404).send({ success: false, error: 'Orçamento não encontrado' })
    }

    const orcamento = await app.prisma.orcamentos.update({
      where: { id },
      data: { valor_limite: resultado.data.valor_limite },
    })

    return reply.send({ success: true, orcamento })
  })

  // DELETE /orcamentos/:id
  app.delete('/:id', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any
    const { id } = request.params as { id: string }

    const existente = await app.prisma.orcamentos.findFirst({ where: { id, usuario_id } })
    if (!existente) {
      return reply.status(404).send({ success: false, error: 'Orçamento não encontrado' })
    }

    await app.prisma.orcamentos.delete({ where: { id } })

    return reply.send({ success: true })
  })
}
