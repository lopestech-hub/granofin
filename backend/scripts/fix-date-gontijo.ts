import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const idGontijo = '82c59607-6d07-47f2-afae-42cb77ba2647'

    try {
        const lancamento = await prisma.lancamentos.update({
            where: { id: idGontijo },
            data: {
                data: new Date('2026-03-08T12:00:00Z')
            }
        })

        console.log('Lançamento Gontijo atualizado com sucesso para 2026!')
        console.log('Nova Data:', lancamento.data)

    } catch (error) {
        console.error('Erro ao atualizar lançamento:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
