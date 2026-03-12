import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const descricao = 'Transferência realizada com sucesso'

    try {
        const lancamentos = await prisma.lancamentos.findMany({
            where: {
                descricao: {
                    contains: descricao,
                    mode: 'insensitive' // Busca ignorando maiúsculas/minúsculas
                }
            },
            include: {
                categoria: true,
                conta: true
            }
        })

        if (lancamentos.length === 0) {
            console.log('Nenhum lançamento encontrado com essa descrição.')
            return
        }

        console.log(`Lançamentos encontrados:`)
        console.log(JSON.stringify(lancamentos, null, 2))

    } catch (error) {
        console.error('Erro ao buscar lançamentos:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
