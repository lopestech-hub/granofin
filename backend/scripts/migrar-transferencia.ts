import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Migração Manual: Adicionando transferencia_id ---')
  
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE lancamentos 
      ADD COLUMN IF NOT EXISTS transferencia_id TEXT;
    `)
    console.log('✅ Coluna transferencia_id adicionada com sucesso!')
  } catch (e: any) {
    console.error('❌ Erro ao adicionar coluna:', e.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
