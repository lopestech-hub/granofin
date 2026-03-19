/**
 * Exclui todas as categorias do banco (padrão + do usuário).
 * Execute: npx tsx scripts/limpar-categorias.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Excluindo todas as categorias...\n')

  // Remove soft-delete e hard-delete de todas as categorias
  const total = await prisma.$executeRaw`DELETE FROM categorias`
  console.log(`✅ categorias: ${total} registros removidos`)

  console.log('\n🎉 Categorias limpas!')
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
