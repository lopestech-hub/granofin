import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'juliofranlopes18@gmail.com'
    const novaSenha = '123456'

    console.log(`Iniciando atualização de senha para: ${email}...`)

    try {
        const usuario = await prisma.usuarios.findUnique({
            where: { email }
        })

        if (!usuario) {
            console.error('Erro: Usuário não encontrado no banco de dados.')
            return
        }

        const senha_hash = await bcrypt.hash(novaSenha, 12)

        await prisma.usuarios.update({
            where: { id: usuario.id },
            data: { senha_hash }
        })

        // Revogar tokens de sessão antigos para forçar novo login por segurança
        await prisma.refresh_tokens.updateMany({
            where: { usuario_id: usuario.id },
            data: { revogado: true }
        })

        console.log('Sucesso: Senha atualizada para "123456".')
        console.log('Sessões antigas foram revogadas por segurança.')

    } catch (error) {
        console.error('Erro ao atualizar senha:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
