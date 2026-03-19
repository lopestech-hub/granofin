import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const usuario_id = 'b4a1f6f1-e679-4212-b0d2-200642723212'
  const categoria_id = '99d7fedb-3e94-4ee9-b10f-610f0717b977'

  console.log('--- Testando Inserir Orçamento ---')
  try {
    const res = await prisma.$executeRaw`
      INSERT INTO orcamentos (id, usuario_id, categoria_id, percentual, valor_limite, criado_em, atualizado_em)
      VALUES (gen_random_uuid()::text, ${usuario_id}, ${categoria_id}, 60, 0, NOW(), NOW())
    `
    console.log('✅ Sucesso! Linhas afetadas:', res)
  } catch (e: any) {
    console.error('❌ ERRO:', e.message)
  }
}

main().finally(() => prisma.$disconnect())
