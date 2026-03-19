/**
 * Limpa todas as movimentações do usuário:
 * - contas_pagar
 * - lancamentos
 * - orcamentos
 * - contas
 *
 * NÃO remove: usuario, assinatura, categorias
 *
 * Execute: npx tsx scripts/limpar-movimentacoes.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Iniciando limpeza de movimentações...\n')

  // 1. contas_pagar (referenciam contas e lancamentos)
  const cp = await prisma.$executeRaw`DELETE FROM contas_pagar`
  console.log(`✅ contas_pagar: ${cp} registros removidos`)

  // 2. lancamentos
  const lanc = await prisma.$executeRaw`DELETE FROM lancamentos`
  console.log(`✅ lancamentos: ${lanc} registros removidos`)

  // 3. orcamentos
  const orc = await prisma.$executeRaw`DELETE FROM orcamentos`
  console.log(`✅ orcamentos: ${orc} registros removidos`)

  // 4. contas
  const contas = await prisma.$executeRaw`DELETE FROM contas`
  console.log(`✅ contas: ${contas} registros removidos`)

  console.log('\n🎉 Limpeza concluída!')
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
