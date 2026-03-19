import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const schemaConta = z.object({
  nome: z.string().min(1),
  tipo: z.enum(['CARTEIRA', 'CONTA_CORRENTE', 'POUPANCA', 'OUTRO']),
  saldo_inicial: z.number().default(0),
  cor: z.string().optional(),
  icone: z.string().optional(),
})

export const contasRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: [app.autenticar] }

  // GET /contas
  app.get('/', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any

    const contasExistentes = await app.prisma.contas.findMany({
      where: { usuario_id, deletado_em: null },
      orderBy: { criado_em: 'asc' },
    })

    // Busca sumário de lançamentos efetivados para calcular o saldo real
    const movimentacoes = await app.prisma.lancamentos.groupBy({
      by: ['conta_id', 'tipo'],
      _sum: { valor: true },
      where: {
        usuario_id,
        efetivado: true,
      }
    })

    const contas = contasExistentes.map(c => {
      const receitas = movimentacoes.find(m => m.conta_id === c.id && m.tipo === 'RECEITA')?._sum.valor || 0
      const despesas = movimentacoes.find(m => m.conta_id === c.id && m.tipo === 'DESPESA')?._sum.valor || 0
      
      return {
        ...c,
        saldo_atual: Number(c.saldo_inicial) + Number(receitas) - Number(despesas)
      }
    })

    return reply.send({ success: true, contas })
  })

  // POST /contas
  app.post('/', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any

    const resultado = schemaConta.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: resultado.error.errors[0].message })
    }

    const conta = await app.prisma.contas.create({
      data: { ...resultado.data, usuario_id },
    })

    return reply.status(201).send({ success: true, conta })
  })

  // PUT /contas/:id
  app.put('/:id', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any
    const { id } = request.params as { id: string }

    const resultado = schemaConta.partial().safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: resultado.error.errors[0].message })
    }

    const existente = await app.prisma.contas.findFirst({
      where: { id, usuario_id, deletado_em: null },
    })
    if (!existente) {
      return reply.status(404).send({ success: false, error: 'Conta não encontrada' })
    }

    const conta = await app.prisma.contas.update({
      where: { id },
      data: resultado.data,
    })

    return reply.send({ success: true, conta })
  })

  // DELETE /contas/:id — soft delete
  app.delete('/:id', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any
    const { id } = request.params as { id: string }

    const existente = await app.prisma.contas.findFirst({
      where: { id, usuario_id, deletado_em: null },
    })
    if (!existente) {
      return reply.status(404).send({ success: false, error: 'Conta não encontrada' })
    }

    await app.prisma.contas.update({
      where: { id },
      data: { deletado_em: new Date() },
    })

    return reply.send({ success: true })
  })
}
