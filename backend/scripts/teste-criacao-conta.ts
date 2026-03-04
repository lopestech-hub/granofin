import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🚀 Iniciando teste de criação de conta a pagar...')

    try {
        // 1. Buscar um usuário para o teste
        const usuario = await prisma.usuarios.findFirst()
        if (!usuario) {
            console.error('❌ Nenhum usuário encontrado no banco.')
            return
        }
        console.log(`✅ Usuário encontrado: ${usuario.email}`)

        // 2. Buscar uma categoria para o teste
        const categoria = await prisma.categorias.findFirst({
            where: { OR: [{ usuario_id: usuario.id }, { padrao: true }] }
        })
        if (!categoria) {
            console.error('❌ Nenhuma categoria encontrada. Rode o seed de categorias primeiro.')
            return
        }
        console.log(`✅ Categoria encontrada: ${categoria.nome}`)

        // 3. Tentar criar uma conta a pagar SIMPLES
        console.log(' tentando criar conta simples...')
        const contaSimples = await prisma.contas_pagar.create({
            data: {
                usuario_id: usuario.id,
                categoria_id: categoria.id,
                descricao: 'Teste Simples ' + new Date().getTime(),
                valor: 100.50,
                data_vencimento: new Date(),
                status: 'PENDENTE',
                recorrencia: 'NENHUMA'
            }
        })
        console.log('✅ Conta simples criada com sucesso:', contaSimples.id)

        // 4. Tentar criar conta PARCELADA (Teste do createMany)
        console.log(' tentando criar conta parcelada (lote)...')
        const grupo = 'test-batch-' + new Date().getTime()
        const parcelas = [
            {
                usuario_id: usuario.id,
                categoria_id: categoria.id,
                descricao: 'Parcela 1/2',
                valor: 50.00,
                data_vencimento: new Date(),
                grupo_parcelas: grupo,
                parcela_atual: 1,
                total_parcelas: 2
            },
            {
                usuario_id: usuario.id,
                categoria_id: categoria.id,
                descricao: 'Parcela 2/2',
                valor: 50.00,
                data_vencimento: new Date(),
                grupo_parcelas: grupo,
                parcela_atual: 2,
                total_parcelas: 2
            }
        ]

        await prisma.contas_pagar.createMany({ data: parcelas })
        console.log('✅ Parcelas criadas com sucesso (createMany)')

    } catch (error) {
        console.error('❌ ERRO DETECTADO NO PRISMA:')
        console.error(error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
