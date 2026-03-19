
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const usuarios = await prisma.usuarios.findMany({
    select: { email: true, nome: true }
  })
  console.log(JSON.stringify(usuarios, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
