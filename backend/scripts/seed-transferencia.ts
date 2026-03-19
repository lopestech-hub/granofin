import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Criando Categoria Padrão: Transferência ---')
  
  try {
     // Verifica se já existe
     const existente = await prisma.categorias.findFirst({
       where: { nome: 'Transferência', padrao: true }
     })

     if (!existente) {
       await prisma.$executeRawUnsafe(`
         INSERT INTO categorias (id, nome, tipo, cor, icone, padrao, criado_em, atualizado_em)
         VALUES (gen_random_uuid()::text, 'Transferência', 'TRANSFERENCIA'::"LancamentoTipo", '#64748b', 'ArrowRightLeft', true, NOW(), NOW())
       `)
       console.log('✅ Categoria Transferência criada!')
     } else {
       console.log('ℹ️ Categoria já existe.')
     }
  } catch (e: any) {
    console.error('❌ Erro:', e.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
