import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const schemaAtualizarPerfil = z.object({
  nome: z.string().min(2).optional(),
  avatar_url: z.string().url().optional(),
})

export const usuariosRoutes: FastifyPluginAsync = async (app) => {
  // GET /usuarios/perfil
  app.get('/perfil', { preHandler: [app.autenticar] }, async (request, reply) => {
    const { id } = request.user as any

    const usuario = await app.prisma.usuarios.findUnique({
      where: { id, deletado_em: null },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        avatar_url: true,
        criado_em: true,
        assinatura: {
          select: { plano: true, status: true, trial_expira_em: true, periodo_fim: true },
        },
      },
    })

    if (!usuario) {
      return reply.status(404).send({ success: false, error: 'Usuário não encontrado' })
    }

    return reply.send({ success: true, usuario })
  })

  // PUT /usuarios/perfil
  app.put('/perfil', { preHandler: [app.autenticar] }, async (request, reply) => {
    const { id } = request.user as any

    const resultado = schemaAtualizarPerfil.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: resultado.error.errors[0].message })
    }

    const usuario = await app.prisma.usuarios.update({
      where: { id },
      data: resultado.data,
      select: { id: true, nome: true, email: true, avatar_url: true },
    })

    return reply.send({ success: true, usuario })
  })
}
