
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando alteração de schema...')

  // 1. Adiciona a coluna saldo_atual via SQL Puro (conforme Regra 6)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE IF EXISTS "contas" 
    ADD COLUMN IF NOT EXISTS "saldo_atual" DECIMAL(10,2) DEFAULT 0
  `)

  console.log('Coluna saldo_atual adicionada. Calculando saldos iniciais...')

  // 2. Busca todas as contas e calcula o saldo real delas para popular a nova coluna
  const todasContas = await prisma.contas.findMany({
    where: { deletado_em: null }
  })

  for (const conta of todasContas) {
    const movimentacoes = await prisma.lancamentos.groupBy({
      by: ['tipo'],
      _sum: { valor: true },
      where: {
        conta_id: conta.id,
        efetivado: true,
        deletado_em: null
      }
    })

    const receitas = Number(movimentacoes.find(m => m.tipo === 'RECEITA')?._sum.valor || 0)
    const despesas = Number(movimentacoes.find(m => m.tipo === 'DESPESA')?._sum.valor || 0)
    const saldoReal = Number(conta.saldo_inicial) + receitas - despesas

    await prisma.$executeRaw`
      UPDATE "contas" SET "saldo_atual" = ${saldoReal} WHERE "id" = ${conta.id}
    `
    console.log(`Conta [${conta.nome}] atualizada com saldo: ${saldoReal}`)
  }

  console.log('Migração concluída com sucesso!')
}

main()
  .catch(e => console.error('Erro na migração:', e))
  .finally(async () => await prisma.$disconnect())
