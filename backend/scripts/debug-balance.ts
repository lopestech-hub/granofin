
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const usuario = await prisma.usuarios.findFirst({
    where: { email: 'juliofranlopes18@gmail.com' }
  })

  if (!usuario) {
    console.log('Usuário não encontrado')
    return
  }

  console.log(`Debug para usuário: ${usuario.nome} (${usuario.id})`)

  const contas = await prisma.contas.findMany({
    where: { usuario_id: usuario.id, deletado_em: null }
  })

  for (const conta of contas) {
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
    const saldoCalculado = Number(conta.saldo_inicial) + receitas - despesas

    console.log(`\nConta: ${conta.nome}`)
    console.log(`- Saldo Inicial: ${conta.saldo_inicial}`)
    console.log(`- Receitas (+): ${receitas}`)
    console.log(`- Despesas (-): ${despesas}`)
    console.log(`- Saldo Final Calculado: ${saldoCalculado}`)
  }

  console.log('\n--- Últimos 5 Lançamentos ---')
  const ultimos = await prisma.lancamentos.findMany({
    where: { usuario_id: usuario.id, deletado_em: null },
    orderBy: { criado_em: 'desc' },
    take: 5,
    include: { conta: true }
  })

  ultimos.forEach(l => {
    console.log(`[${l.efetivado ? 'EFETIVADO' : 'PENDENTE'}] ${l.data.toISOString().split('T')[0]} - ${l.tipo} - ${l.descricao}: R$ ${l.valor} (${l.conta.nome})`)
  })
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
