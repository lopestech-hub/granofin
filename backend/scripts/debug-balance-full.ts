
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const accountId = '2a8385da-1b91-4cf4-9e7c-87693d20bd3c' // Vou buscar o ID real no banco primeiro
  
  const usuario = await prisma.usuarios.findFirst({
    where: { email: 'juliofranlopes18@gmail.com' }
  })

  if (!usuario) return console.log('Usuário não encontrado')

  const conta = await prisma.contas.findFirst({
    where: { usuario_id: usuario.id, nome: { contains: 'Nubank', mode: 'insensitive' } }
  })

  if (!conta) return console.log('Conta Nubank não encontrada')

  console.log(`\n--- Analisando Conta: ${conta.nome} (${conta.id}) ---`)
  console.log(`Saldo Inicial: ${conta.saldo_inicial}`)

  const todosLancamentos = await prisma.lancamentos.findMany({
    where: { conta_id: conta.id },
    include: { categoria: true },
    orderBy: { criado_em: 'desc' }
  })

  console.log('\nLista completa de lançamentos para conferência:')
  todosLancamentos.forEach(l => {
    const status = l.deletado_em ? 'DELETADO' : (l.efetivado ? 'EFETIVADO' : 'PENDENTE')
    console.log(`- [${status}] ${l.criado_em.toISOString()} | ${l.tipo} | ${l.descricao}: R$ ${l.valor}`)
  })

  const efetivadosNaoDeletados = todosLancamentos.filter(l => l.efetivado && !l.deletado_em)
  const receitas = efetivadosNaoDeletados.filter(l => l.tipo === 'RECEITA').reduce((acc, l) => acc + Number(l.valor), 0)
  const despesas = efetivadosNaoDeletados.filter(l => l.tipo === 'DESPESA').reduce((acc, l) => acc + Number(l.valor), 0)
  
  console.log(`\nResumo Atual:`)
  console.log(`- Receitas: +${receitas}`)
  console.log(`- Despesas: -${despesas}`)
  console.log(`- Saldo Final: ${Number(conta.saldo_inicial) + receitas - despesas}`)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
