import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Migração Manual: Adicionando TRANSFERENCIA ao enum LancamentoTipo ---')
  
  try {
    // Para ENUMs no Postgres, usamos ALTER TYPE
    await prisma.$executeRawUnsafe(`
      ALTER TYPE "LancamentoTipo" ADD VALUE IF NOT EXISTS 'TRANSFERENCIA';
    `)
    console.log('✅ Valor TRANSFERENCIA adicionado com sucesso!')
  } catch (e: any) {
    if (e.message.includes('already exists')) {
       console.log('ℹ️ Valor já existe, pulando.')
    } else {
       console.error('❌ Erro:', e.message)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main()
