import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const id = '85c3e984-70b0-43a9-9155-f4839206c630'

    try {
        const lancamento = await prisma.lancamentos.update({
            where: { id },
            data: {
                data: new Date('2026-03-08T12:00:00Z')
            }
        })

        console.log('Lançamento atualizado com sucesso para 2026!')
        console.log('Nova Data:', lancamento.data)

    } catch (error) {
        console.error('Erro ao atualizar lançamento:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
