import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import fastifyJwt from '@fastify/jwt'
import { env } from '../config/env'

const jwtPlugin: FastifyPluginAsync = fp(async (app) => {
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  })

  // Decorator para autenticar rotas
  app.decorate('autenticar', async function (request: any, reply: any) {
    try {
      await request.jwtVerify()
    } catch {
      reply.status(401).send({ success: false, error: 'Token inválido ou expirado' })
    }
  })
})

export { jwtPlugin }
