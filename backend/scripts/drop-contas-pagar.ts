import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️  Dropando tabela contas_pagar (se existir)...')
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "contas_pagar" CASCADE;`)
  console.log('✅ Tabela removida')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
