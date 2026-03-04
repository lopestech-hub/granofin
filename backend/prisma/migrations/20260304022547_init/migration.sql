-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('TRIAL', 'MENSAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "SubStatus" AS ENUM ('TRIAL', 'ATIVO', 'CANCELADO', 'EXPIRADO', 'INADIMPLENTE');

-- CreateEnum
CREATE TYPE "ContaTipo" AS ENUM ('CARTEIRA', 'CONTA_CORRENTE', 'POUPANCA', 'OUTRO');

-- CreateEnum
CREATE TYPE "LancamentoTipo" AS ENUM ('RECEITA', 'DESPESA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "avatar_url" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "deletado_em" TIMESTAMP(3),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "revogado" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assinaturas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "plano" "PlanType" NOT NULL DEFAULT 'TRIAL',
    "status" "SubStatus" NOT NULL DEFAULT 'TRIAL',
    "trial_expira_em" TIMESTAMP(3),
    "periodo_inicio" TIMESTAMP(3),
    "periodo_fim" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assinaturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "ContaTipo" NOT NULL,
    "saldo_inicial" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cor" TEXT,
    "icone" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "deletado_em" TIMESTAMP(3),

    CONSTRAINT "contas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "nome" TEXT NOT NULL,
    "tipo" "LancamentoTipo" NOT NULL,
    "cor" TEXT NOT NULL,
    "icone" TEXT NOT NULL,
    "padrao" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "deletado_em" TIMESTAMP(3),

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lancamentos" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "conta_id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "tipo" "LancamentoTipo" NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "efetivado" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "parcela_atual" INTEGER,
    "total_parcelas" INTEGER,
    "grupo_parcelas" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    "deletado_em" TIMESTAMP(3),

    CONSTRAINT "lancamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orcamentos" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "categoria_id" TEXT NOT NULL,
    "valor_limite" DECIMAL(10,2) NOT NULL,
    "mes" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orcamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_email_idx" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_usuario_id_idx" ON "refresh_tokens"("usuario_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_hash_idx" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "assinaturas_usuario_id_key" ON "assinaturas"("usuario_id");

-- CreateIndex
CREATE INDEX "assinaturas_usuario_id_idx" ON "assinaturas"("usuario_id");

-- CreateIndex
CREATE INDEX "assinaturas_stripe_customer_id_idx" ON "assinaturas"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "contas_usuario_id_idx" ON "contas"("usuario_id");

-- CreateIndex
CREATE INDEX "categorias_usuario_id_idx" ON "categorias"("usuario_id");

-- CreateIndex
CREATE INDEX "categorias_tipo_idx" ON "categorias"("tipo");

-- CreateIndex
CREATE INDEX "lancamentos_usuario_id_idx" ON "lancamentos"("usuario_id");

-- CreateIndex
CREATE INDEX "lancamentos_conta_id_idx" ON "lancamentos"("conta_id");

-- CreateIndex
CREATE INDEX "lancamentos_categoria_id_idx" ON "lancamentos"("categoria_id");

-- CreateIndex
CREATE INDEX "lancamentos_data_idx" ON "lancamentos"("data");

-- CreateIndex
CREATE INDEX "lancamentos_usuario_id_data_idx" ON "lancamentos"("usuario_id", "data");

-- CreateIndex
CREATE INDEX "orcamentos_usuario_id_mes_ano_idx" ON "orcamentos"("usuario_id", "mes", "ano");

-- CreateIndex
CREATE UNIQUE INDEX "orcamentos_usuario_id_categoria_id_mes_ano_key" ON "orcamentos"("usuario_id", "categoria_id", "mes", "ano");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas" ADD CONSTRAINT "contas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_conta_id_fkey" FOREIGN KEY ("conta_id") REFERENCES "contas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos" ADD CONSTRAINT "lancamentos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
