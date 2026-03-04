import { FastifyPluginAsync } from 'fastify'

// Fase 3 — webhooks Stripe serão implementados aqui
export const webhooksRoutes: FastifyPluginAsync = async (app) => {
  // POST /webhooks/stripe
  app.post('/stripe', {
    config: { rawBody: true },
  }, async (_request, reply) => {
    return reply.status(501).send({ success: false, error: 'Webhooks Stripe disponíveis na Fase 3' })
  })
}
