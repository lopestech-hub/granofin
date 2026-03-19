import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const version = await prisma.$queryRaw`SELECT version()`
  console.log(version)
}
main().finally(() => prisma.$disconnect())
