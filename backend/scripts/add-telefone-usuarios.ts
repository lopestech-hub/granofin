/**
 * Migration: adiciona coluna telefone na tabela usuarios
 * Executar: npx tsx scripts/add-telefone-usuarios.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Verificando coluna telefone em usuarios...')

  const colunaExiste = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) as count
    FROM information_schema.columns
    WHERE table_name = 'usuarios'
      AND column_name = 'telefone'
      AND table_schema = 'public'
  `

  if (Number(colunaExiste[0].count) > 0) {
    console.log('Coluna telefone já existe — nada a fazer.')
    return
  }

  await prisma.$executeRawUnsafe(`
    ALTER TABLE usuarios ADD COLUMN telefone VARCHAR(20)
  `)

  console.log('✅ Coluna telefone adicionada com sucesso.')
}

main()
  .catch((e) => {
    console.error('Erro na migration:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
