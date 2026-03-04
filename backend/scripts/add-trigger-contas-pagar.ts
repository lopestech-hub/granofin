import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📌 Criando função update_atualizado_em...')
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION update_atualizado_em()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.atualizado_em = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `)

  console.log('📌 Removendo trigger antigo (se existir)...')
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS set_atualizado_em_contas_pagar ON "contas_pagar";`)

  console.log('📌 Criando trigger...')
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER set_atualizado_em_contas_pagar
      BEFORE UPDATE ON "contas_pagar"
      FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();
  `)

  console.log('✅ Trigger criado com sucesso!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
