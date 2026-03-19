
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const l = await prisma.lancamentos.deleteMany({
    where: { NOT: { deletado_em: null } }
  })
  
  const cp = await prisma.contas_pagar.deleteMany({
    where: { NOT: { deletado_em: null } }
  })

  console.log(`Lançamentos removidos permanentemente: ${l.count}`)
  console.log(`Contas a Pagar removidas permanentemente: ${cp.count}`)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
