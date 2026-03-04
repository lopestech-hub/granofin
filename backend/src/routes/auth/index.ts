import { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { addDays, addHours } from 'date-fns'
import { env } from '../../config/env'
import { enviarEmailBoasVindas, enviarEmailResetSenha } from '../../services/email'
import {
  schemaCadastro,
  schemaLogin,
  schemaRefresh,
  schemaEsqueciSenha,
  schemaResetarSenha,
} from './schema'

// Armazena tokens de reset em memória com expiração (1h)
// Em produção com múltiplas instâncias, usar Redis
const tokensReset = new Map<string, { usuario_id: string; expira_em: Date }>()

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Limite de tentativas nas rotas de auth
  const rateLimitOpts = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }

  // POST /auth/cadastro
  app.post('/cadastro', { ...rateLimitOpts }, async (request, reply) => {
    const resultado = schemaCadastro.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: resultado.error.errors[0].message })
    }

    const { nome, email, telefone, senha } = resultado.data

    const existente = await app.prisma.usuarios.findUnique({ where: { email } })
    if (existente) {
      return reply.status(409).send({ success: false, error: 'E-mail já cadastrado' })
    }

    const senha_hash = await bcrypt.hash(senha, 12)
    const trial_expira_em = addDays(new Date(), env.TRIAL_DIAS)

    const usuario = await app.prisma.usuarios.create({
      data: {
        nome,
        email,
        telefone,
        senha_hash,
        assinatura: {
          create: {
            plano: 'TRIAL',
            status: 'TRIAL',
            trial_expira_em,
          },
        },
      },
      select: { id: true, nome: true, email: true },
    })

    const accessToken = app.jwt.sign({ id: usuario.id, email: usuario.email })
    const refreshToken = await gerarRefreshToken(app, usuario.id)

    // E-mail em background — não bloquear a resposta
    enviarEmailBoasVindas(usuario.nome, usuario.email).catch((err) =>
      app.log.error({ err }, 'Falha ao enviar e-mail de boas-vindas')
    )

    app.log.info({ usuario_id: usuario.id }, 'Novo cadastro realizado')

    return reply.status(201).send({
      success: true,
      access_token: accessToken,
      refresh_token: refreshToken,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
    })
  })

  // POST /auth/login
  app.post('/login', { ...rateLimitOpts }, async (request, reply) => {
    const resultado = schemaLogin.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'Dados inválidos' })
    }

    const { email, senha } = resultado.data

    const usuario = await app.prisma.usuarios.findUnique({
      where: { email, deletado_em: null },
      select: { id: true, nome: true, email: true, senha_hash: true },
    })

    // Mesma mensagem para email não encontrado e senha errada (evita enumeração)
    if (!usuario || !(await bcrypt.compare(senha, usuario.senha_hash))) {
      app.log.warn({ email }, 'Tentativa de login com credenciais inválidas')
      return reply.status(401).send({ success: false, error: 'E-mail ou senha inválidos' })
    }

    const accessToken = app.jwt.sign({ id: usuario.id, email: usuario.email })
    const refreshToken = await gerarRefreshToken(app, usuario.id)

    app.log.info({ usuario_id: usuario.id }, 'Login realizado com sucesso')

    return reply.send({
      success: true,
      access_token: accessToken,
      refresh_token: refreshToken,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
    })
  })

  // POST /auth/refresh
  app.post('/refresh', async (request, reply) => {
    const resultado = schemaRefresh.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'refresh_token é obrigatório' })
    }

    const { refresh_token } = resultado.data
    const tokenHash = hashToken(refresh_token)

    const registro = await app.prisma.refresh_tokens.findUnique({
      where: { token_hash: tokenHash },
      include: { usuario: { select: { id: true, email: true } } },
    })

    if (!registro || registro.revogado || registro.expira_em < new Date()) {
      return reply.status(401).send({ success: false, error: 'Refresh token inválido ou expirado' })
    }

    // Rotação: revogar o atual e emitir um novo par
    await app.prisma.refresh_tokens.update({
      where: { id: registro.id },
      data: { revogado: true },
    })

    const novoAccessToken = app.jwt.sign({
      id: registro.usuario.id,
      email: registro.usuario.email,
    })
    const novoRefreshToken = await gerarRefreshToken(app, registro.usuario.id)

    return reply.send({
      success: true,
      access_token: novoAccessToken,
      refresh_token: novoRefreshToken,
    })
  })

  // POST /auth/logout
  app.post('/logout', { preHandler: [app.autenticar] }, async (request, reply) => {
    const resultado = schemaRefresh.safeParse(request.body)
    if (resultado.success) {
      const tokenHash = hashToken(resultado.data.refresh_token)
      await app.prisma.refresh_tokens.updateMany({
        where: { token_hash: tokenHash, usuario_id: (request.user as any).id },
        data: { revogado: true },
      })
    }

    return reply.send({ success: true })
  })

  // POST /auth/esqueci-senha
  app.post('/esqueci-senha', { ...rateLimitOpts }, async (request, reply) => {
    const resultado = schemaEsqueciSenha.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'E-mail inválido' })
    }

    const { email } = resultado.data

    const usuario = await app.prisma.usuarios.findUnique({
      where: { email, deletado_em: null },
      select: { id: true },
    })

    // Resposta genérica mesmo se o e-mail não existir (evita enumeração)
    if (usuario) {
      const token = crypto.randomBytes(32).toString('hex')
      tokensReset.set(token, {
        usuario_id: usuario.id,
        expira_em: addHours(new Date(), 1),
      })

      enviarEmailResetSenha(email, token).catch((err) =>
        app.log.error({ err }, 'Falha ao enviar e-mail de reset de senha')
      )
    }

    app.log.info({ email }, 'Solicitação de reset de senha')

    return reply.send({
      success: true,
      message: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve.',
    })
  })

  // POST /auth/resetar-senha
  app.post('/resetar-senha', { ...rateLimitOpts }, async (request, reply) => {
    const resultado = schemaResetarSenha.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: resultado.error.errors[0].message })
    }

    const { token, nova_senha } = resultado.data

    const dados = tokensReset.get(token)
    if (!dados || dados.expira_em < new Date()) {
      return reply.status(400).send({ success: false, error: 'Token inválido ou expirado' })
    }

    const senha_hash = await bcrypt.hash(nova_senha, 12)

    await app.prisma.usuarios.update({
      where: { id: dados.usuario_id },
      data: { senha_hash },
    })

    // Revogar todos os refresh tokens do usuário após reset de senha
    await app.prisma.refresh_tokens.updateMany({
      where: { usuario_id: dados.usuario_id },
      data: { revogado: true },
    })

    tokensReset.delete(token)

    app.log.info({ usuario_id: dados.usuario_id }, 'Senha redefinida com sucesso')

    return reply.send({ success: true, message: 'Senha redefinida com sucesso' })
  })
}

// Gera um refresh token, salva o hash no banco e retorna o token em texto plano
async function gerarRefreshToken(app: any, usuario_id: string): Promise<string> {
  const token = crypto.randomBytes(40).toString('hex')
  const tokenHash = hashToken(token)

  // Interpretar "7d" como dias
  const diasStr = env.JWT_REFRESH_EXPIRES_IN.replace('d', '')
  const dias = parseInt(diasStr, 10) || 7

  await app.prisma.refresh_tokens.create({
    data: {
      usuario_id,
      token_hash: tokenHash,
      expira_em: addDays(new Date(), dias),
    },
  })

  return token
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
