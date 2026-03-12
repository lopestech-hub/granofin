import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const email = 'juliofranlopes18@gmail.com'

    try {
        const usuario = await prisma.usuarios.findUnique({
            where: { email },
            select: { id: true, nome: true }
        })

        if (!usuario) {
            console.log('Usuário não encontrado.')
            return
        }

        const lancamentos = await prisma.lancamentos.findMany({
            where: {
                usuario_id: usuario.id
            },
            select: {
                id: true,
                descricao: true,
                valor: true,
                data: true,
                efetivado: true,
                deletado_em: true,
                tipo: true
            },
            orderBy: { data: 'desc' }
        })

        console.log(`Encontradas ${lancamentos.length} transações no banco para ${usuario.nome}:`)
        console.table(lancamentos)

    } catch (error) {
        console.error('Erro ao buscar as transações:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
