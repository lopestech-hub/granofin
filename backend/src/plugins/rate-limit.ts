import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import rateLimit from '@fastify/rate-limit'

const rateLimitPlugin: FastifyPluginAsync = fp(async (app) => {
  await app.register(rateLimit, {
    global: false, // aplicado por rota — não globalmente
    max: 100,
    timeWindow: '1 minute',
  })
})

export { rateLimitPlugin }
