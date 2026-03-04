import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

const schemaLancamento = z.object({
  conta_id: z.string().uuid(),
  categoria_id: z.string().uuid(),
  descricao: z.string().min(1),
  valor: z.number().positive(),
  tipo: z.enum(['RECEITA', 'DESPESA']),
  data: z.string().datetime(),
  efetivado: z.boolean().default(true),
  observacoes: z.string().optional(),
  total_parcelas: z.number().int().min(2).optional(),
})

const schemaFiltros = z.object({
  mes: z.coerce.number().min(1).max(12).optional(),
  ano: z.coerce.number().min(2000).optional(),
  conta_id: z.string().uuid().optional(),
  categoria_id: z.string().uuid().optional(),
  tipo: z.enum(['RECEITA', 'DESPESA']).optional(),
})

export const lancamentosRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: [app.autenticar] }

  // GET /lancamentos
  app.get('/', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any
    const filtros = schemaFiltros.parse(request.query)

    const where: any = { usuario_id, deletado_em: null }

    if (filtros.mes && filtros.ano) {
      const inicio = new Date(filtros.ano, filtros.mes - 1, 1)
      const fim = new Date(filtros.ano, filtros.mes, 0, 23, 59, 59)
      where.data = { gte: inicio, lte: fim }
    } else if (filtros.ano) {
      const inicio = new Date(filtros.ano, 0, 1)
      const fim = new Date(filtros.ano, 11, 31, 23, 59, 59)
      where.data = { gte: inicio, lte: fim }
    }

    if (filtros.conta_id) where.conta_id = filtros.conta_id
    if (filtros.categoria_id) where.categoria_id = filtros.categoria_id
    if (filtros.tipo) where.tipo = filtros.tipo

    const lancamentos = await app.prisma.lancamentos.findMany({
      where,
      include: {
        categoria: { select: { id: true, nome: true, cor: true, icone: true } },
        conta: { select: { id: true, nome: true } },
      },
      orderBy: { data: 'desc' },
    })

    return reply.send({ success: true, lancamentos })
  })

  // POST /lancamentos
  app.post('/', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any

    const resultado = schemaLancamento.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: resultado.error.errors[0].message })
    }

    const { total_parcelas, data, valor, ...dados } = resultado.data

    // Verificar se conta e categoria pertencem ao usuário
    const [conta, categoria] = await Promise.all([
      app.prisma.contas.findFirst({ where: { id: dados.conta_id, usuario_id, deletado_em: null } }),
      app.prisma.categorias.findFirst({
        where: { id: dados.categoria_id, deletado_em: null, OR: [{ usuario_id }, { padrao: true }] },
      }),
    ])

    if (!conta) return reply.status(400).send({ success: false, error: 'Conta inválida' })
    if (!categoria) return reply.status(400).send({ success: false, error: 'Categoria inválida' })

    // Lançamento parcelado
    if (total_parcelas && total_parcelas >= 2) {
      const grupo_parcelas = uuidv4()
      const dataBase = new Date(data)

      const parcelas = Array.from({ length: total_parcelas }, (_, i) => {
        const dataParcela = new Date(dataBase)
        dataParcela.setMonth(dataParcela.getMonth() + i)
        return {
          ...dados,
          usuario_id,
          valor,
          data: dataParcela,
          parcela_atual: i + 1,
          total_parcelas,
          grupo_parcelas,
        }
      })

      await app.prisma.lancamentos.createMany({ data: parcelas })

      return reply.status(201).send({
        success: true,
        message: `${total_parcelas} parcelas criadas`,
        grupo_parcelas,
      })
    }

    // Lançamento único
    const lancamento = await app.prisma.lancamentos.create({
      data: { ...dados, usuario_id, valor, data: new Date(data) },
      include: {
        categoria: { select: { id: true, nome: true, cor: true, icone: true } },
        conta: { select: { id: true, nome: true } },
      },
    })

    return reply.status(201).send({ success: true, lancamento })
  })

  // PUT /lancamentos/:id
  app.put('/:id', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any
    const { id } = request.params as { id: string }

    const resultado = schemaLancamento.omit({ total_parcelas: true }).partial().safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: resultado.error.errors[0].message })
    }

    const existente = await app.prisma.lancamentos.findFirst({
      where: { id, usuario_id, deletado_em: null },
    })
    if (!existente) {
      return reply.status(404).send({ success: false, error: 'Lançamento não encontrado' })
    }

    const { data, ...resto } = resultado.data
    const lancamento = await app.prisma.lancamentos.update({
      where: { id },
      data: { ...resto, ...(data ? { data: new Date(data) } : {}) },
      include: {
        categoria: { select: { id: true, nome: true, cor: true, icone: true } },
        conta: { select: { id: true, nome: true } },
      },
    })

    return reply.send({ success: true, lancamento })
  })

  // DELETE /lancamentos/:id — soft delete apenas desta parcela
  app.delete('/:id', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any
    const { id } = request.params as { id: string }

    const existente = await app.prisma.lancamentos.findFirst({
      where: { id, usuario_id, deletado_em: null },
    })
    if (!existente) {
      return reply.status(404).send({ success: false, error: 'Lançamento não encontrado' })
    }

    await app.prisma.lancamentos.update({
      where: { id },
      data: { deletado_em: new Date() },
    })

    return reply.send({ success: true })
  })

  // PATCH /lancamentos/:id/efetivar
  app.patch('/:id/efetivar', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any
    const { id } = request.params as { id: string }

    const existente = await app.prisma.lancamentos.findFirst({
      where: { id, usuario_id, deletado_em: null },
    })
    if (!existente) {
      return reply.status(404).send({ success: false, error: 'Lançamento não encontrado' })
    }

    const lancamento = await app.prisma.lancamentos.update({
      where: { id },
      data: { efetivado: true },
    })

    return reply.send({ success: true, lancamento })
  })
}
