import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const schemaCategoria = z.object({
  nome: z.string().min(1),
  tipo: z.enum(['RECEITA', 'DESPESA']),
  cor: z.string().min(1),
  icone: z.string().min(1),
  parent_id: z.string().uuid().nullable().optional(), // nova: vínculo com categoria principal
})

export const categoriasRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: [app.autenticar] }

  // GET /categorias — padrão do sistema + do usuário, com subcategorias aninhadas
  app.get('/', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any

    const categorias = await app.prisma.categorias.findMany({
      where: {
        deletado_em: null,
        OR: [{ usuario_id: null, padrao: true }, { usuario_id }],
      },
      orderBy: [{ padrao: 'desc' }, { nome: 'asc' }],
    })

    // Adiciona parent_id ao retorno (campo recém migrado, pode ser null)
    return reply.send({ success: true, categorias })
  })

  // POST /categorias
  app.post('/', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any

    const resultado = schemaCategoria.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: resultado.error.errors[0].message })
    }

    // Se tem parent_id, valida que a categoria pai existe e pertence ao usuário
    if (resultado.data.parent_id) {
      const pai = await app.prisma.categorias.findFirst({
        where: {
          id: resultado.data.parent_id,
          deletado_em: null,
          OR: [{ usuario_id: null, padrao: true }, { usuario_id }],
        },
      })
      if (!pai) {
        return reply.status(404).send({ success: false, error: 'Categoria principal não encontrada' })
      }
    }

    const categoria = await app.prisma.$queryRaw<any[]>`
      INSERT INTO categorias (id, usuario_id, nome, tipo, cor, icone, parent_id, padrao, criado_em, atualizado_em)
      VALUES (
        gen_random_uuid()::text,
        ${usuario_id}::text,
        ${resultado.data.nome},
        ${resultado.data.tipo}::"LancamentoTipo",
        ${resultado.data.cor},
        ${resultado.data.icone},
        ${resultado.data.parent_id ?? null}::text,
        false,
        NOW(),
        NOW()
      )
      RETURNING *
    `

    return reply.status(201).send({ success: true, categoria: categoria[0] })
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

    // Atualiza apenas os campos enviados
    const { parent_id, ...camposNormais } = resultado.data

    // Usa queryRaw para atualizar parent_id (campo não gerado pelo Prisma ainda)
    if (parent_id !== undefined) {
      await app.prisma.$executeRaw`
        UPDATE categorias SET parent_id = ${parent_id ?? null}::uuid, atualizado_em = NOW()
        WHERE id = ${id}::uuid
      `
    }

    const categoria = Object.keys(camposNormais).length > 0
      ? await app.prisma.categorias.update({ where: { id }, data: camposNormais })
      : await app.prisma.categorias.findFirst({ where: { id } })

    return reply.send({ success: true, categoria })
  })

  // DELETE /categorias/:id
  app.delete('/:id', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any
    const { id } = request.params as { id: string }

    // Permite deletar tanto categorias do próprio usuário quanto as padrão do sistema
    const existente = await app.prisma.categorias.findFirst({
      where: {
        id,
        deletado_em: null,
        OR: [{ usuario_id }, { padrao: true }],
      },
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
