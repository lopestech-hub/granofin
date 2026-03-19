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

    const contas = await app.prisma.contas.findMany({
      where: { usuario_id, deletado_em: null },
      orderBy: { criado_em: 'asc' },
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

    // Hard Delete: Deletar a conta e tudo o que estiver ligado a ela
    await app.prisma.$transaction(async (tx) => {
      // 1. Deletar lançamentos ligados a esta conta
      await tx.lancamentos.deleteMany({ where: { conta_id: id } })

      // 2. Deletar contas a pagar ligadas a esta conta
      await tx.contas_pagar.deleteMany({ where: { conta_id: id } })

      // 3. Finalmente deletar a conta
      await tx.contas.delete({ where: { id } })
    })

    return reply.send({ success: true })
  })
}
