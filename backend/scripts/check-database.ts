import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Verificação do Estado do Banco ---')
  const categorias = await prisma.categorias.findMany({
    where: { deletado_em: null }
  })
  console.log(`Categorias no banco: ${categorias.length}`)
  categorias.forEach(c => console.log(` - ID: ${c.id} | Nome: ${c.nome} | Tipo: ${c.tipo}`))

  const orcamentos = await prisma.orcamentos.findMany()
  console.log(`\nOrçamentos no banco: ${orcamentos.length}`)
}

main().finally(() => prisma.$disconnect())
