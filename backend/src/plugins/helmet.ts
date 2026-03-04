import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import helmet from '@fastify/helmet'

const helmetPlugin: FastifyPluginAsync = fp(async (app) => {
  await app.register(helmet, {
    contentSecurityPolicy: false, // desativado para SPA — configurar se necessário
  })
})

export { helmetPlugin }
