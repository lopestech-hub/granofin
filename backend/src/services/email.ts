import nodemailer from 'nodemailer'
import { env } from '../config/env'

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
})

export async function enviarEmailResetSenha(email: string, token: string) {
  const link = `${env.FRONTEND_URL}/auth/nova-senha?token=${token}`

  await transporter.sendMail({
    from: `"Granofin" <${env.SMTP_USER}>`,
    to: email,
    subject: 'Redefinir senha — Granofin',
    html: `
      <h2>Redefinir sua senha</h2>
      <p>Clique no link abaixo para criar uma nova senha. O link expira em 1 hora.</p>
      <a href="${link}" style="background:#22C55E;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px">
        Redefinir senha
      </a>
      <p style="margin-top:24px;color:#64748b;font-size:14px">
        Se você não solicitou a redefinição, ignore este e-mail.
      </p>
    `,
  })
}

export async function enviarEmailBoasVindas(nome: string, email: string) {
  await transporter.sendMail({
    from: `"Granofin" <${env.SMTP_USER}>`,
    to: email,
    subject: 'Bem-vindo ao Granofin!',
    html: `
      <h2>Olá, ${nome}!</h2>
      <p>Sua conta foi criada com sucesso. Você tem <strong>14 dias de trial gratuito</strong> para explorar todos os recursos.</p>
      <a href="${env.FRONTEND_URL}/dashboard" style="background:#22C55E;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:16px">
        Acessar minha conta
      </a>
    `,
  })
}
