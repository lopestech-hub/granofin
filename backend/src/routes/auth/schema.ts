import { z } from 'zod'

export const schemaCadastro = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  telefone: z
    .string()
    .min(10, 'Telefone inválido')
    .max(20, 'Telefone inválido')
    .regex(/^\+?[\d\s\(\)\-]+$/, 'Telefone inválido'),
  senha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
})

export const schemaLogin = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
})

export const schemaRefresh = z.object({
  refresh_token: z.string().min(1),
})

export const schemaEsqueciSenha = z.object({
  email: z.string().email(),
})

export const schemaResetarSenha = z.object({
  token: z.string().min(1),
  nova_senha: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
})

export type CadastroInput = z.infer<typeof schemaCadastro>
export type LoginInput = z.infer<typeof schemaLogin>
export type RefreshInput = z.infer<typeof schemaRefresh>
export type EsqueciSenhaInput = z.infer<typeof schemaEsqueciSenha>
export type ResetarSenhaInput = z.infer<typeof schemaResetarSenha>
