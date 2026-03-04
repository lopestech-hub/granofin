import { FastifyPluginAsync } from 'fastify'

// Fase 3 — integração Stripe será implementada aqui
export const assinaturasRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: [app.autenticar] }

  // GET /assinaturas/status
  app.get('/status', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any

    const assinatura = await app.prisma.assinaturas.findUnique({
      where: { usuario_id },
      select: {
        plano: true,
        status: true,
        trial_expira_em: true,
        periodo_inicio: true,
        periodo_fim: true,
      },
    })

    if (!assinatura) {
      return reply.status(404).send({ success: false, error: 'Assinatura não encontrada' })
    }

    // Verificar se trial expirou
    if (assinatura.status === 'TRIAL' && assinatura.trial_expira_em && assinatura.trial_expira_em < new Date()) {
      await app.prisma.assinaturas.update({
        where: { usuario_id },
        data: { status: 'EXPIRADO' },
      })
      assinatura.status = 'EXPIRADO'
    }

    return reply.send({ success: true, assinatura })
  })

  // POST /assinaturas/checkout — placeholder Fase 3
  app.post('/checkout', auth, async (_request, reply) => {
    return reply.status(501).send({ success: false, error: 'Integração Stripe disponível na Fase 3' })
  })

  // POST /assinaturas/cancelar — placeholder Fase 3
  app.post('/cancelar', auth, async (_request, reply) => {
    return reply.status(501).send({ success: false, error: 'Integração Stripe disponível na Fase 3' })
  })
}
