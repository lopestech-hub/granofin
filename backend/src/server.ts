import Fastify from 'fastify'
import path from 'path'
import { env } from './config/env'
import { prismaPlugin } from './plugins/prisma'
import { corsPlugin } from './plugins/cors'
import { helmetPlugin } from './plugins/helmet'
import { rateLimitPlugin } from './plugins/rate-limit'
import { jwtPlugin } from './plugins/jwt'
import { authRoutes } from './routes/auth'
import { usuariosRoutes } from './routes/usuarios'
import { contasRoutes } from './routes/contas'
import { categoriasRoutes } from './routes/categorias'
import { lancamentosRoutes } from './routes/lancamentos'
import { orcamentosRoutes } from './routes/orcamentos'
import { relatoriosRoutes } from './routes/relatorios'
import { assinaturasRoutes } from './routes/assinaturas'
import { webhooksRoutes } from './routes/webhooks'
import { contasPagarRoutes } from './routes/contas-pagar'
import { r2Plugin } from './plugins/r2'
import multipart from '@fastify/multipart'

async function main() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
          : undefined,
    },
  })

  // Plugins de segurança e infra
  await app.register(helmetPlugin)
  await app.register(corsPlugin)
  await app.register(rateLimitPlugin)
  await app.register(prismaPlugin)
  await app.register(jwtPlugin)
  await app.register(r2Plugin)
  await app.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } })

  // Servir frontend em produção
  if (env.NODE_ENV === 'production') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    await app.register(require('@fastify/static'), {
      root: path.join(process.cwd(), 'public'),
      prefix: '/',
      index: 'index.html',
    })

    app.setNotFoundHandler((_req, reply) => {
      (reply as any).sendFile('index.html')
    })
  }

  // Rotas da API
  await app.register(authRoutes, { prefix: '/auth' })
  await app.register(usuariosRoutes, { prefix: '/usuarios' })
  await app.register(contasRoutes, { prefix: '/contas' })
  await app.register(categoriasRoutes, { prefix: '/categorias' })
  await app.register(lancamentosRoutes, { prefix: '/lancamentos' })
  await app.register(orcamentosRoutes, { prefix: '/orcamentos' })
  await app.register(relatoriosRoutes, { prefix: '/relatorios' })
  await app.register(assinaturasRoutes, { prefix: '/assinaturas' })
  await app.register(webhooksRoutes, { prefix: '/webhooks' })
  await app.register(contasPagarRoutes, { prefix: '/contas-pagar' })

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    app.log.info(`Servidor rodando na porta ${env.PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

main()
