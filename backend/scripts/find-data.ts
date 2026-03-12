import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const descricao = 'Transferência realizada com sucesso'

    try {
        const lancamentos = await prisma.lancamentos.findMany({
            where: {
                descricao: {
                    contains: descricao,
                    mode: 'insensitive'
                }
            },
            select: {
                id: true,
                data: true,
                valor: true,
                efetivado: true
            }
        })

        console.log(JSON.stringify(lancamentos, null, 2))

    } catch (error) {
        console.error('Erro:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
