import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const id = '85c3e984-70b0-43a9-9155-f4839206c630'

    try {
        const lancamento = await prisma.lancamentos.findUnique({
            where: { id },
            include: {
                categoria: true,
                conta: true,
                usuario: true
            }
        })

        if (!lancamento) {
            console.log('Lançamento não encontrado.')
            return
        }

        console.log(`Lançamento detalhado:`)
        console.log(JSON.stringify(lancamento, null, 2))

    } catch (error) {
        console.error('Erro ao buscar o lançamento:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
