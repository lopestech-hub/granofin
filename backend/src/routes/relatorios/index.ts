import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

export const relatoriosRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: [app.autenticar] }

  // GET /relatorios/resumo-mensal?mes=3&ano=2026
  app.get('/resumo-mensal', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any
    const { mes, ano } = z.object({
      mes: z.coerce.number().min(1).max(12).default(new Date().getMonth() + 1),
      ano: z.coerce.number().min(2000).default(new Date().getFullYear()),
    }).parse(request.query)

    const inicio = new Date(ano, mes - 1, 1)
    const fim = new Date(ano, mes, 0, 23, 59, 59)

    const [receitas, despesas] = await Promise.all([
      app.prisma.lancamentos.aggregate({
        where: { usuario_id, tipo: 'RECEITA', data: { gte: inicio, lte: fim }, deletado_em: null, efetivado: true },
        _sum: { valor: true },
        _count: true,
      }),
      app.prisma.lancamentos.aggregate({
        where: { usuario_id, tipo: 'DESPESA', data: { gte: inicio, lte: fim }, deletado_em: null, efetivado: true },
        _sum: { valor: true },
        _count: true,
      }),
    ])

    const totalReceitas = Number(receitas._sum.valor ?? 0)
    const totalDespesas = Number(despesas._sum.valor ?? 0)

    return reply.send({
      success: true,
      resumo: {
        mes,
        ano,
        total_receitas: totalReceitas,
        total_despesas: totalDespesas,
        saldo: totalReceitas - totalDespesas,
        qtd_receitas: receitas._count,
        qtd_despesas: despesas._count,
      },
    })
  })

  // GET /relatorios/gastos-categoria?mes=3&ano=2026
  app.get('/gastos-categoria', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any
    const { mes, ano } = z.object({
      mes: z.coerce.number().min(1).max(12).default(new Date().getMonth() + 1),
      ano: z.coerce.number().min(2000).default(new Date().getFullYear()),
    }).parse(request.query)

    const inicio = new Date(ano, mes - 1, 1)
    const fim = new Date(ano, mes, 0, 23, 59, 59)

    const gastos = await app.prisma.lancamentos.groupBy({
      by: ['categoria_id'],
      where: { usuario_id, tipo: 'DESPESA', data: { gte: inicio, lte: fim }, deletado_em: null, efetivado: true },
      _sum: { valor: true },
      _count: true,
      orderBy: { _sum: { valor: 'desc' } },
    })

    // Buscar dados das categorias
    const categoriaIds = gastos.map((g) => g.categoria_id)
    const categorias = await app.prisma.categorias.findMany({
      where: { id: { in: categoriaIds } },
      select: { id: true, nome: true, cor: true, icone: true },
    })
    const catMap = new Map(categorias.map((c) => [c.id, c]))

    const totalGeral = gastos.reduce((acc, g) => acc + Number(g._sum.valor ?? 0), 0)

    const resultado = gastos.map((g) => ({
      categoria: catMap.get(g.categoria_id),
      total: Number(g._sum.valor ?? 0),
      quantidade: g._count,
      percentual: totalGeral > 0 ? Math.round((Number(g._sum.valor ?? 0) / totalGeral) * 100) : 0,
    }))

    return reply.send({ success: true, gastos_por_categoria: resultado, total_geral: totalGeral })
  })

  // GET /relatorios/evolucao?meses=6
  app.get('/evolucao', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any
    const { meses } = z.object({
      meses: z.coerce.number().min(3).max(24).default(6),
    }).parse(request.query)

    const resultado = []
    const agora = new Date()

    for (let i = meses - 1; i >= 0; i--) {
      const data = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
      const mes = data.getMonth() + 1
      const ano = data.getFullYear()
      const inicio = new Date(ano, mes - 1, 1)
      const fim = new Date(ano, mes, 0, 23, 59, 59)

      const [receitas, despesas] = await Promise.all([
        app.prisma.lancamentos.aggregate({
          where: { usuario_id, tipo: 'RECEITA', data: { gte: inicio, lte: fim }, deletado_em: null, efetivado: true },
          _sum: { valor: true },
        }),
        app.prisma.lancamentos.aggregate({
          where: { usuario_id, tipo: 'DESPESA', data: { gte: inicio, lte: fim }, deletado_em: null, efetivado: true },
          _sum: { valor: true },
        }),
      ])

      const totalReceitas = Number(receitas._sum.valor ?? 0)
      const totalDespesas = Number(despesas._sum.valor ?? 0)

      resultado.push({
        mes,
        ano,
        label: `${mes.toString().padStart(2, '0')}/${ano}`,
        receitas: totalReceitas,
        despesas: totalDespesas,
        saldo: totalReceitas - totalDespesas,
      })
    }

    return reply.send({ success: true, evolucao: resultado })
  })
}
