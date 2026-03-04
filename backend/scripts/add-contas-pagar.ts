import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Iniciando migration: add-contas-pagar')

  // 1. Criar enum ContaPagarStatus
  console.log('📌 Criando enum ContaPagarStatus...')
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "ContaPagarStatus" AS ENUM ('PENDENTE', 'PAGO', 'VENCIDO', 'CANCELADO');
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'enum ContaPagarStatus já existe, pulando.';
    END $$;
  `)
  console.log('✅ Enum ContaPagarStatus criado')

  // 2. Criar enum RecorrenciaTipo
  console.log('📌 Criando enum RecorrenciaTipo...')
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "RecorrenciaTipo" AS ENUM (
        'NENHUMA', 'DIARIA', 'SEMANAL', 'QUINZENAL',
        'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'
      );
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'enum RecorrenciaTipo já existe, pulando.';
    END $$;
  `)
  console.log('✅ Enum RecorrenciaTipo criado')

  // 3. Criar tabela contas_pagar
  // Obs: FKs para tabelas existentes usam TEXT (Prisma String @id @default(uuid()))
  // lancamento_id e grupo_* usam TEXT também por consistência
  console.log('📌 Criando tabela contas_pagar...')
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "contas_pagar" (
      "id"                TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "usuario_id"        TEXT NOT NULL,
      "categoria_id"      TEXT NOT NULL,
      "descricao"         TEXT NOT NULL,
      "valor"             DECIMAL(10, 2) NOT NULL,
      "data_vencimento"   TIMESTAMP(3) NOT NULL,
      "status"            "ContaPagarStatus" NOT NULL DEFAULT 'PENDENTE',

      -- Recorrência
      "recorrencia"       "RecorrenciaTipo" NOT NULL DEFAULT 'NENHUMA',
      "grupo_recorrencia" TEXT,
      "ocorrencia_atual"  INTEGER,
      "total_ocorrencias" INTEGER,

      -- Parcelamento
      "parcela_atual"     INTEGER,
      "total_parcelas"    INTEGER,
      "grupo_parcelas"    TEXT,

      -- Pagamento
      "conta_id"          TEXT,
      "data_pagamento"    TIMESTAMP(3),
      "lancamento_id"     TEXT UNIQUE,
      "comprovante_url"   TEXT,

      "observacoes"       TEXT,
      "criado_em"         TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      "atualizado_em"     TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      "deletado_em"       TIMESTAMP(3),

      CONSTRAINT "contas_pagar_pkey" PRIMARY KEY ("id")
    );
  `)
  console.log('✅ Tabela contas_pagar criada')

  // 4. Adicionar foreign keys
  console.log('📌 Adicionando foreign keys...')
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "contas_pagar"
        ADD CONSTRAINT "contas_pagar_usuario_id_fkey"
        FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `)
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "contas_pagar"
        ADD CONSTRAINT "contas_pagar_categoria_id_fkey"
        FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `)
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "contas_pagar"
        ADD CONSTRAINT "contas_pagar_conta_id_fkey"
        FOREIGN KEY ("conta_id") REFERENCES "contas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `)
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "contas_pagar"
        ADD CONSTRAINT "contas_pagar_lancamento_id_fkey"
        FOREIGN KEY ("lancamento_id") REFERENCES "lancamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `)
  console.log('✅ Foreign keys adicionadas')

  // 5. Criar índices
  console.log('📌 Criando índices...')
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "contas_pagar_usuario_id_idx" ON "contas_pagar"("usuario_id");`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "contas_pagar_usuario_status_idx" ON "contas_pagar"("usuario_id", "status");`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "contas_pagar_usuario_vencimento_idx" ON "contas_pagar"("usuario_id", "data_vencimento");`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "contas_pagar_grupo_recorrencia_idx" ON "contas_pagar"("grupo_recorrencia") WHERE "grupo_recorrencia" IS NOT NULL;`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "contas_pagar_grupo_parcelas_idx" ON "contas_pagar"("grupo_parcelas") WHERE "grupo_parcelas" IS NOT NULL;`)
  console.log('✅ Índices criados')

  // 6. Trigger para atualizar atualizado_em automaticamente
  console.log('📌 Criando função e trigger atualizado_em...')
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION update_atualizado_em()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.atualizado_em = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `)
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS set_atualizado_em_contas_pagar ON "contas_pagar";`)
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER set_atualizado_em_contas_pagar
      BEFORE UPDATE ON "contas_pagar"
      FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
  `)
  console.log('✅ Trigger atualizado_em criado')

  console.log('\n🎉 Migration concluída com sucesso!')
}

main()
  .catch((err) => {
    console.error('❌ Erro na migration:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
