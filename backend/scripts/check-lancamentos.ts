import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const email = 'juliofranlopes18@gmail.com'

    try {
        const usuario = await prisma.usuarios.findUnique({
            where: { email },
            include: {
                lancamentos: {
                    orderBy: { criado_em: 'desc' },
                    take: 5,
                    include: {
                        categoria: true,
                        conta: true
                    }
                }
            }
        })

        if (!usuario) {
            console.log('Usuário não encontrado.')
            return
        }

        console.log(`Lançamentos para ${usuario.nome}:`)
        console.log(JSON.stringify(usuario.lancamentos, null, 2))

    } catch (error) {
        console.error('Erro ao buscar lançamentos:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
