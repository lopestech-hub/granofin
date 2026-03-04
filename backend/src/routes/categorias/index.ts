import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const schemaCategoria = z.object({
  nome: z.string().min(1),
  tipo: z.enum(['RECEITA', 'DESPESA']),
  cor: z.string().min(1),
  icone: z.string().min(1),
})

export const categoriasRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: [app.autenticar] }

  // GET /categorias — padrão do sistema + do usuário
  app.get('/', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any

    const categorias = await app.prisma.categorias.findMany({
      where: {
        deletado_em: null,
        OR: [{ usuario_id: null, padrao: true }, { usuario_id }],
      },
      orderBy: [{ padrao: 'desc' }, { nome: 'asc' }],
    })

    return reply.send({ success: true, categorias })
  })

  // POST /categorias
  app.post('/', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any

    const resultado = schemaCategoria.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: resultado.error.errors[0].message })
    }

    const categoria = await app.prisma.categorias.create({
      data: { ...resultado.data, usuario_id, padrao: false },
    })

    return reply.status(201).send({ success: true, categoria })
  })

  // PUT /categorias/:id
  app.put('/:id', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any
    const { id } = request.params as { id: string }

    const resultado = schemaCategoria.partial().safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: resultado.error.errors[0].message })
    }

    const existente = await app.prisma.categorias.findFirst({
      where: { id, usuario_id, deletado_em: null },
    })
    if (!existente) {
      return reply.status(404).send({ success: false, error: 'Categoria não encontrada' })
    }

    const categoria = await app.prisma.categorias.update({
      where: { id },
      data: resultado.data,
    })

    return reply.send({ success: true, categoria })
  })

  // DELETE /categorias/:id
  app.delete('/:id', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any
    const { id } = request.params as { id: string }

    const existente = await app.prisma.categorias.findFirst({
      where: { id, usuario_id, deletado_em: null },
    })
    if (!existente) {
      return reply.status(404).send({ success: false, error: 'Categoria não encontrada' })
    }

    await app.prisma.categorias.update({
      where: { id },
      data: { deletado_em: new Date() },
    })

    return reply.send({ success: true })
  })
}
