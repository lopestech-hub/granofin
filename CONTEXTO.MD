# Granofin
>
> Memória viva do projeto. Atualizado automaticamente após qualquer mudança e antes de encerrar cada sessão.

## 🎯 Objetivo

SaaS de finanças pessoais focado em controle de gastos e orçamento. Permite ao usuário cadastrar contas, lançar receitas e despesas, definir orçamentos por categoria e visualizar relatórios de evolução financeira. Monetizado via assinatura mensal/anual com período trial.

## 👥 Usuários e Perfis

- **Usuário Final (Pessoa Física):** cadastra contas, lança transações, define orçamentos, visualiza relatórios
- **Planos:** Trial (14 dias) → Assinatura Mensal ou Anual (via Stripe)
- Sem multi-tenancy — cada usuário tem dados completamente isolados

## ⚙️ Regras de Negócio

- Trial de 14 dias ao cadastrar — sem cartão obrigatório
- Após trial, acesso bloqueado até assinar um plano
- Lançamentos manuais apenas (MVP) — sem Open Finance
- Cartão de crédito não contemplado no MVP
- Categorias padrão do sistema + categorias personalizadas por usuário
- Lançamentos parcelados: ao editar/deletar uma parcela, decisão: apenas a parcela atual (não as futuras)
- Orçamentos por categoria por mês/ano — alerta visual quando ultrapassar limite
- Soft delete em contas, categorias e lançamentos

## 📦 Stack

- **Frontend Web:** React + Vite + TypeScript + Tailwind CSS
- **Frontend Web Libs:** React Hook Form + Zod, TanStack Query, Recharts, date-fns, dinero.js, lucide-react, Zustand
- **Mobile:** React Native + Expo + Expo Router
- **Mobile Libs:** TanStack Query, lucide-react-native, date-fns, dinero.js
- **Backend:** Node.js + Fastify + Prisma + PostgreSQL
- **Backend Libs:** @fastify/jwt, @fastify/rate-limit, @fastify/helmet, @fastify/cors, @fastify/multipart@8, @aws-sdk/client-s3, @aws-sdk/lib-storage, pino-pretty (dev), Zod, Stripe SDK, Nodemailer
- **Storage:** Cloudflare R2 (comprovantes de contas a pagar) — bucket `granofin` | URL pública: `https://pub-da2fdc433ba64261a07567b7fffafc52.r2.dev`
- **Auth:** JWT + refresh token (armazenado em banco com revogação por ID) | Email e senha
- **Logs:** Pino nativo do Fastify | Nível produção: info | Nunca logar senhas, tokens, CPF
- **Segurança:** CORS com origens explícitas, Helmet, Rate Limiting nas rotas de auth e APIs públicas
- **Infra:** VPS + EasyPanel | Deploy: GitHub push → auto deploy | Timezone: America/Sao_Paulo
- **Pagamentos:** Stripe (checkout session, webhooks para ativação/cancelamento/renovação)
- **E-mail:** Nodemailer (confirmação de cadastro, reset de senha)

## 🗄️ Banco de Dados

### Tabelas (nomes em Português)

- `usuarios` — cadastro e perfil
- `assinaturas` — plano, status, IDs Stripe, datas de trial/período
- `contas` — contas financeiras do usuário (carteira, conta corrente, poupança)
- `categorias` — categorias de receita/despesa (padrão do sistema + personalizadas)
- `lancamentos` — receitas e despesas com suporte a parcelamento
- `orcamentos` — limite por categoria/mês com controle de utilização

### URL de Conexão Externa ao Banco de Dados

postgres://postgres:812f2b75cb407103406b@easypanel.lopestechhub.com.br:3421/db-granofin?sslmode=disable

### Prisma Schema Completo

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model usuarios {
  id              String        @id @default(uuid())
  nome            String
  email           String        @unique
  telefone        String?       @db.VarChar(20)
  senha_hash      String
  avatar_url      String?
  criado_em       DateTime      @default(now())
  atualizado_em   DateTime      @updatedAt
  deletado_em     DateTime?

  assinatura      assinaturas?
  contas          contas[]
  categorias      categorias[]
  lancamentos     lancamentos[]
  orcamentos      orcamentos[]
  refresh_tokens  refresh_tokens[]

  @@index([email])
}

model refresh_tokens {
  id          String    @id @default(uuid())
  usuario_id  String
  token_hash  String    @unique
  expira_em   DateTime
  revogado    Boolean   @default(false)
  criado_em   DateTime  @default(now())

  usuario usuarios @relation(fields: [usuario_id], references: [id])

  @@index([usuario_id])
  @@index([token_hash])
}

model assinaturas {
  id                     String    @id @default(uuid())
  usuario_id             String    @unique
  stripe_customer_id     String?
  stripe_subscription_id String?
  plano                  PlanType  @default(TRIAL)
  status                 SubStatus @default(TRIAL)
  trial_expira_em        DateTime?
  periodo_inicio         DateTime?
  periodo_fim            DateTime?
  criado_em              DateTime  @default(now())
  atualizado_em          DateTime  @updatedAt

  usuario usuarios @relation(fields: [usuario_id], references: [id])

  @@index([usuario_id])
  @@index([stripe_customer_id])
}

enum PlanType {
  TRIAL
  MENSAL
  ANUAL
}

enum SubStatus {
  TRIAL
  ATIVO
  CANCELADO
  EXPIRADO
  INADIMPLENTE
}

model contas {
  id            String     @id @default(uuid())
  usuario_id    String
  nome          String
  tipo          ContaTipo
  saldo_inicial Decimal    @db.Decimal(10, 2) @default(0)
  cor           String?
  icone         String?
  ativa         Boolean    @default(true)
  criado_em     DateTime   @default(now())
  atualizado_em DateTime   @updatedAt
  deletado_em   DateTime?

  usuario     usuarios      @relation(fields: [usuario_id], references: [id])
  lancamentos lancamentos[]

  @@index([usuario_id])
}

enum ContaTipo {
  CARTEIRA
  CONTA_CORRENTE
  POUPANCA
  OUTRO
}

model categorias {
  id            String         @id @default(uuid())
  usuario_id    String?
  nome          String
  tipo          LancamentoTipo
  cor           String
  icone         String
  padrao        Boolean        @default(false)
  criado_em     DateTime       @default(now())
  atualizado_em DateTime       @updatedAt
  deletado_em   DateTime?

  usuario     usuarios?     @relation(fields: [usuario_id], references: [id])
  lancamentos lancamentos[]
  orcamentos  orcamentos[]

  @@index([usuario_id])
  @@index([tipo])
}

model lancamentos {
  id             String         @id @default(uuid())
  usuario_id     String
  conta_id       String
  categoria_id   String
  descricao      String
  valor          Decimal        @db.Decimal(10, 2)
  tipo           LancamentoTipo
  data           DateTime
  efetivado      Boolean        @default(true)
  observacoes    String?
  parcela_atual  Int?
  total_parcelas Int?
  grupo_parcelas String?
  criado_em      DateTime       @default(now())
  atualizado_em  DateTime       @updatedAt
  deletado_em    DateTime?

  usuario   usuarios   @relation(fields: [usuario_id], references: [id])
  conta     contas     @relation(fields: [conta_id], references: [id])
  categoria categorias @relation(fields: [categoria_id], references: [id])

  @@index([usuario_id])
  @@index([conta_id])
  @@index([categoria_id])
  @@index([data])
  @@index([usuario_id, data])
}

enum LancamentoTipo {
  RECEITA
  DESPESA
}

model orcamentos {
  id            String   @id @default(uuid())
  usuario_id    String
  categoria_id  String
  valor_limite  Decimal  @db.Decimal(10, 2)
  mes           Int
  ano           Int
  criado_em     DateTime @default(now())
  atualizado_em DateTime @updatedAt

  usuario   usuarios   @relation(fields: [usuario_id], references: [id])
  categoria categorias @relation(fields: [categoria_id], references: [id])

  @@unique([usuario_id, categoria_id, mes, ano])
  @@index([usuario_id, mes, ano])
}
```

### Scripts de Migração

- Produção: `backend/scripts/` com Prisma Client (`$executeRawUnsafe` para DDL, `$executeRaw` para DML)
- Nunca usar `prisma migrate` ou `prisma db push` em produção

### Decisões Importantes

- Valores monetários: `Decimal @db.Decimal(10, 2)` — nunca Float
- Refresh tokens armazenados no banco com hash e campo `revogado` para logout seguro
- `grupo_parcelas` em lançamentos: UUID para agrupar parcelas de um mesmo parcelamento
- Soft delete: `deletado_em DateTime?` em contas, categorias e lançamentos
- Categorias com `usuario_id = null` são categorias padrão do sistema

## 🔌 Rotas da API

### Auth

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/auth/cadastro` | Criar conta | ❌ |
| POST | `/auth/login` | Login + tokens | ❌ |
| POST | `/auth/refresh` | Renovar access token | ❌ |
| POST | `/auth/logout` | Invalidar refresh token | ✅ |
| POST | `/auth/esqueci-senha` | Enviar e-mail reset | ❌ |
| POST | `/auth/resetar-senha` | Alterar senha com token | ❌ |

### Usuários

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/usuarios/perfil` | Dados do perfil | ✅ |
| PUT | `/usuarios/perfil` | Atualizar perfil | ✅ |

### Assinaturas

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/assinaturas/status` | Status atual do plano | ✅ |
| POST | `/assinaturas/checkout` | Criar sessão Stripe Checkout | ✅ |
| POST | `/assinaturas/cancelar` | Cancelar assinatura | ✅ |
| POST | `/webhooks/stripe` | Eventos do Stripe | ❌ |

### Contas

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/contas` | Listar contas | ✅ |
| POST | `/contas` | Criar conta | ✅ |
| PUT | `/contas/:id` | Atualizar conta | ✅ |
| DELETE | `/contas/:id` | Deletar conta (soft) | ✅ |

### Categorias

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/categorias` | Listar (padrão + do usuário) | ✅ |
| POST | `/categorias` | Criar categoria personalizada | ✅ |
| PUT | `/categorias/:id` | Atualizar categoria | ✅ |
| DELETE | `/categorias/:id` | Deletar categoria | ✅ |

### Lançamentos

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/lancamentos` | Listar com filtros (mês, conta, categoria) | ✅ |
| POST | `/lancamentos` | Criar lançamento (único ou parcelado) | ✅ |
| PUT | `/lancamentos/:id` | Atualizar lançamento | ✅ |
| DELETE | `/lancamentos/:id` | Deletar lançamento | ✅ |
| PATCH | `/lancamentos/:id/efetivar` | Marcar como efetivado | ✅ |

### Orçamentos

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/orcamentos` | Listar por mês/ano com % utilizado | ✅ |
| POST | `/orcamentos` | Criar orçamento | ✅ |
| PUT | `/orcamentos/:id` | Atualizar limite | ✅ |
| DELETE | `/orcamentos/:id` | Remover orçamento | ✅ |

### Relatórios

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/relatorios/resumo-mensal` | Receitas, despesas e saldo do mês | ✅ |
| GET | `/relatorios/gastos-categoria` | Gastos por categoria no período | ✅ |
| GET | `/relatorios/evolucao` | Evolução mensal (últimos 6/12 meses) | ✅ |

### Contas a Pagar

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/contas-pagar` | Listar com filtros (status, mês, categoria) | ✅ |
| GET | `/contas-pagar/resumo` | Totais por status para o dashboard | ✅ |
| GET | `/contas-pagar/:id` | Detalhe de uma conta | ✅ |
| POST | `/contas-pagar` | Criar (única, parcelada ou recorrente) | ✅ |
| PUT | `/contas-pagar/:id` | Editar (só PENDENTE) | ✅ |
| DELETE | `/contas-pagar/:id` | Cancelar/soft delete | ✅ |
| POST | `/contas-pagar/:id/baixar` | Registrar pagamento → cria lançamento | ✅ |
| POST | `/contas-pagar/:id/comprovante` | Upload de comprovante (multipart → R2) | ✅ |

## 📁 Estrutura de Pastas Atual

```
granofin/
├── frontend/                    # Web (React + Vite)
│   └── src/
│       ├── components/
│       │   ├── ui/
│       │   ├── lancamentos/
│       │   ├── orcamentos/
│       │   ├── relatorios/
│       │   └── layout/
│       ├── pages/
│       │   ├── auth/
│       │   ├── dashboard/
│       │   ├── contas/
│       │   ├── lancamentos/
│       │   ├── orcamentos/
│       │   ├── contas-pagar/
│       │   └── configuracoes/
│       ├── hooks/
│       ├── services/
│       ├── store/
│       ├── types/
│       └── utils/
├── mobile/                      # App (React Native + Expo)
│   └── src/
│       ├── components/
│       ├── screens/
│       ├── navigation/
│       ├── services/
│       ├── store/
│       └── hooks/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── scripts/
│   └── src/
│       ├── routes/
│       │   ├── auth/
│       │   ├── usuarios/
│       │   ├── assinaturas/
│       │   ├── contas/
│       │   ├── categorias/
│       │   ├── lancamentos/
│       │   ├── orcamentos/
│       │   ├── relatorios/
│       │   └── webhooks/
│       ├── plugins/
│       │   ├── prisma.ts
│       │   ├── jwt.ts
│       │   ├── cors.ts
│       │   └── rate-limit.ts
│       ├── hooks/
│       ├── services/
│       └── types/
├── Dockerfile
├── .env.example
└── CONTEXTO.MD
```

## 🔧 Variáveis de Ambiente

```env
DATABASE_URL="postgresql://user:password@host:5432/granofin?schema=public"
TZ=America/Sao_Paulo
PGTZ=America/Sao_Paulo
JWT_SECRET=
JWT_EXPIRES_IN=10h
JWT_REFRESH_EXPIRES_IN=7d
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://applications-granofin.tbs25p.easypanel.host
CORS_ORIGIN=https://applications-granofin.tbs25p.easypanel.host
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_MENSAL=
STRIPE_PRICE_ANUAL=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
LOG_LEVEL=info
TRIAL_DIAS=14
```

## 🛠️ Comandos Úteis

- Dev frontend: `cd frontend && npm run dev`
- Dev backend: `cd backend && npm run dev`
- Rodar migration: `cd backend && npx tsx scripts/nome.ts`
- Build local: `docker build -t granofin .`
- URL produção: https://applications-granofin.tbs25p.easypanel.host
- Prisma Studio: `cd backend && npx prisma studio`

## 📋 Integrações Externas

- **Stripe:** Checkout Session, Customer Portal, Webhooks (payment_intent, customer.subscription.*)
- **Nodemailer:** Confirmação de cadastro, reset de senha
- **EasyPanel:** Deploy automático via push no GitHub

## 🚀 Roadmap

- [x] **Fase 1** — Setup: monorepo, Fastify, Prisma, auth completo, JWT, rate limit, Helmet, CORS, version.json ✅
- [x] **Fase 2** — Core: layout/sidebar, dashboard, contas, lançamentos (+ parcelados), orçamentos ✅
- [ ] **Fase 3** — Monetização: Stripe checkout, webhooks, controle de acesso por plano, relatórios, gráficos
- [ ] **Fase 4** — Mobile: React Native Expo, telas principais, push notifications, onboarding, testes Vitest

## 🎨 Convenções de Código

- Nomenclatura: `camelCase` (funções/variáveis), `PascalCase` (componentes/classes), `snake_case` (banco)
- Erros backend: `{ success: false, error: "mensagem" }` — nunca expor stack trace em produção
- Imports: absolutos via alias `@/` no frontend, relativos no backend
- Timezone: sempre `America/Sao_Paulo` — nunca UTC direto
- Valores monetários: sempre usar `dinero.js` ou `Intl.NumberFormat` para exibição, `Decimal` no banco
- Rate limiting: todas as rotas de auth — 10 req/min por IP

## ⚠️ Riscos Identificados

- **[ALTO]** Prazo Web + Mobile em 1-2 meses é apertado → Mobile está na Fase 4, Web é o MVP
- **[ALTO]** Stripe webhook pode falhar silenciosamente → implementar idempotência, logs e testar com Stripe CLI
- **[MÉDIO]** Refresh token sem banco = logout não invalida → `refresh_tokens` table com campo `revogado`
- **[MÉDIO]** Cálculo de orçamento com muitos lançamentos pode ser lento → índice composto `(usuario_id, data)` + calcular no backend
- **[MÉDIO]** Regra de edição de parcelas ambígua → definido: editar/deletar afeta apenas a parcela atual
- **[BAIXO]** Soft delete: queries sem filtro `deletado_em IS NULL` → garantir nos services, não deixar para o dev

## 📝 Decisões Técnicas

- **Fastify ao invés de NestJS:** projeto com escopo definido, sem necessidade de arquitetura modular complexa — Fastify é mais performático e simples para o MVP
- **Refresh tokens no banco:** necessário para invalidação no logout e revogação em caso de comprometimento
- **Mobile como Fase 4:** prazo de 1-2 meses exige foco no Web — mobile entra depois do core estável
- **Stripe Checkout Session:** mais simples que Elements para o MVP — usuário sai do app para pagar
- **Soft delete seletivo:** apenas em contas, categorias e lançamentos — usuários e assinaturas têm deleção por negócio

## 🗺️ Planejamento — Resumo das Etapas

- **Etapa 1 (Entendimento):** SaaS finanças pessoais, controle de gastos/orçamento, Web + Mobile, assinatura mensal/anual, lançamentos manuais, sem cartão no MVP, auth email/senha, EasyPanel, prazo urgente
- **Etapa 2 (Stack):** React + Vite, React Native Expo, Fastify, Prisma, PostgreSQL — todos compatíveis ✅
- **Etapa 3 (Libs):** RHF+Zod, TanStack Query, Recharts, date-fns, dinero.js, Stripe, Nodemailer, @fastify/helmet, @fastify/rate-limit
- **Etapa 4 (Módulos):** auth, usuarios, assinaturas, contas, categorias, lancamentos, orcamentos, relatorios, webhooks
- **Etapa 5 (Banco):** 7 tabelas + 3 enums — schema completo com Decimal, soft delete, refresh_tokens, índices compostos
- **Etapa 6 (Rotas):** 32 rotas distribuídas em 9 módulos
- **Etapa 7 (Pastas):** monorepo frontend/ + mobile/ + backend/ + Dockerfile na raiz
- **Etapa 8 (Dockerfile):** multi-stage build — frontend builder + backend builder → imagem final única
- **Etapa 9 (Envs):** 20 variáveis mapeadas no .env.example
- **Etapa 10 (Roadmap):** 4 fases — Fase 1-3 foco Web, Fase 4 Mobile

## ⚠️ Problemas Conhecidos

_Nenhum até o momento._

## 📅 Última Sessão — O que foi feito e testado

- 2026-03-04: **Módulo Contas a Pagar implementado**
  - Cloudflare R2 configurado para armazenamento de comprovantes
  - `backend/scripts/add-contas-pagar.ts` — migration executada com sucesso (tabela + enums + FKs + índices + trigger)
  - `backend/prisma/schema.prisma` — adicionados `contas_pagar`, `ContaPagarStatus`, `RecorrenciaTipo`
  - `backend/src/plugins/r2.ts` — plugin R2 com `uploadComprovante` e `deletarComprovante`
  - `backend/src/routes/contas-pagar/` — 8 endpoints completos (listar, resumo, detalhe, criar, editar, deletar, baixar, upload comprovante)
  - `frontend/src/services/contasPagar.ts` — service tipado
  - `frontend/src/services/api.ts` — adicionado `postForm` para upload multipart (FormData detectado automaticamente)
  - `frontend/src/pages/contas-pagar/ContasPagarPage.tsx` — página completa com KPIs, filtros, lista, modal criar (única/parcelada/recorrente), modal baixar, upload comprovante
  - `AppShell.tsx` — item "Contas a Pagar" com ícone `CalendarClock` no sidebar
  - `App.tsx` — rota `/contas-pagar` registrada
  - @fastify/multipart@8 instalado (compatível com Fastify 4)
  - Backend porta 3000 ✅ | Frontend porta 5174 ✅

## ➡️ Próximos Passos

1. Criar repositório no GitHub e conectar ao EasyPanel para auto-deploy
2. **Criar bucket no Cloudflare R2** e verificar URL pública (R2_PUBLIC_URL configurada no .env)
3. Iniciar **Fase 3**: integração Stripe (checkout, webhooks, controle de acesso por plano), tela de assinatura/upgrade, relatórios com gráfico de pizza por categoria

## 📅 Histórico de Mudanças

| Data       | Mudança                                                                                              |
|------------|------------------------------------------------------------------------------------------------------|
| 2026-03-03 | Planejamento inicial completo — CONTEXTO.MD criado                                                   |
| 2026-03-03 | Fase 1 concluída — estrutura completa do monorepo, backend, auth e frontend base                     |
| 2026-03-03 | Fase 2 concluída — layout, dashboard, contas, lançamentos, orçamentos + sistema de design            |
| 2026-03-03 | Campo `telefone` adicionado à tabela `usuarios` — migration, schema, backend e frontend atualizados  |
| 2026-03-04 | Módulo Contas a Pagar implementado — tabela, 8 rotas backend, plugin R2, página frontend completa    |
