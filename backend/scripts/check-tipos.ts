import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const res = await prisma.$queryRawUnsafe(
    "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'usuarios' ORDER BY ordinal_position"
  )
  console.log(JSON.stringify(res, null, 2))
}

main().finally(() => prisma.$disconnect())
