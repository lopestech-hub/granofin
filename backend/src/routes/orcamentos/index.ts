import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const schemaOrcamento = z.object({
  categoria_id: z.string().uuid(),
  percentual: z.number().positive().max(100),
})

export const orcamentosRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: [app.autenticar] }

  /**
   * GET /orcamentos?mes=3&ano=2026
   * Retorna alocações percentuais + valor calculado com a receita do mês consultado.
   * Inclui: valor_alocado, valor_gasto (soma das subcategorias), percentual_consumido.
   */
  app.get('/', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any

    const { mes, ano } = z.object({
      mes: z.coerce.number().min(1).max(12).optional(),
      ano: z.coerce.number().min(2000).optional(),
    }).parse(request.query)

    const mesRef = mes ?? new Date().getMonth() + 1
    const anoRef = ano ?? new Date().getFullYear()
    const inicio = new Date(anoRef, mesRef - 1, 1)
    const fim    = new Date(anoRef, mesRef, 0, 23, 59, 59)

    // Receita total efetivada do mês
    const receitaAgg = await app.prisma.lancamentos.aggregate({
      where: {
        usuario_id,
        tipo: 'RECEITA',
        efetivado: true,
        deletado_em: null,
        data: { gte: inicio, lte: fim },
      },
      _sum: { valor: true },
    })
    const receita_mes = Number(receitaAgg._sum.valor ?? 0)

    // Buscar alocações do usuário (perpétuas — sem mes/ano)
    const orcamentos = await app.prisma.orcamentos.findMany({
      where: { usuario_id },
      include: {
        categoria: {
          select: { id: true, nome: true, cor: true, icone: true },
        },
      },
    })

    // Se não houver orçamentos, retorna logo
    if (orcamentos.length === 0) {
      return reply.send({
        success: true,
        receita_mes,
        total_alocado_percentual: 0,
        orcamentos: [],
      })
    }

    // Buscar IDs de todas as subcategorias de cada categoria principal
    const categoriasMain = orcamentos.map(o => o.categoria_id)

    const subcategorias = await app.prisma.$queryRaw<{ id: string; parent_id: string }[]>`
      SELECT id, parent_id FROM categorias
      WHERE parent_id = ANY(${categoriasMain}::text[])
        AND usuario_id = ${usuario_id}
        AND deletado_em IS NULL
    `

    // Mapa: categoria_principal_id → [ids de subcategorias]
    const subMap = new Map<string, string[]>()
    for (const sub of subcategorias) {
      const list = subMap.get(sub.parent_id) ?? []
      list.push(sub.id)
      subMap.set(sub.parent_id, list)
    }

    // Gastos do mês por categoria (principal + subcategorias)
    const gastosPorCategoria = await app.prisma.lancamentos.groupBy({
      by: ['categoria_id'],
      where: {
        usuario_id,
        tipo: 'DESPESA',
        efetivado: true,
        deletado_em: null,
        data: { gte: inicio, lte: fim },
      },
      _sum: { valor: true },
    })

    const gastosMap = new Map(
      gastosPorCategoria.map(g => [g.categoria_id, Number(g._sum.valor ?? 0)])
    )

    const resultado = orcamentos.map(o => {
      const percentual = Number(o.percentual ?? 0)
      const valor_alocado = receita_mes * (percentual / 100)

      // Soma gastos na própria categoria + todas as subcategorias
      const idsCategoria = [o.categoria_id, ...(subMap.get(o.categoria_id) ?? [])]
      const valor_gasto = idsCategoria.reduce((acc, id) => acc + (gastosMap.get(id) ?? 0), 0)

      const percentual_consumido = valor_alocado > 0
        ? Math.round((valor_gasto / valor_alocado) * 100)
        : 0

      return {
        id: o.id,
        categoria_id: o.categoria_id,
        categoria: o.categoria,
        percentual,
        valor_alocado,
        valor_gasto,
        percentual_consumido,
        ultrapassado: valor_gasto > valor_alocado,
        subcategorias: subMap.get(o.categoria_id) ?? [],
      }
    })

    return reply.send({
      success: true,
      receita_mes,
      total_alocado_percentual: orcamentos.reduce((a, o) => a + Number(o.percentual ?? 0), 0),
      orcamentos: resultado,
    })
  })

  /**
   * POST /orcamentos
   * Cria um orçamento perpétuo por percentual para uma categoria principal.
   */
  app.post('/', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any

    const resultado = schemaOrcamento.safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: resultado.error.errors[0].message })
    }

    try {
      const rows = await app.prisma.$queryRaw<any[]>`
        INSERT INTO orcamentos (id, usuario_id, categoria_id, percentual, valor_limite, criado_em, atualizado_em)
        VALUES (gen_random_uuid()::text, ${usuario_id}::text, ${resultado.data.categoria_id}::text, ${resultado.data.percentual}, 0, NOW(), NOW())
        RETURNING id, usuario_id, categoria_id, percentual, valor_limite, criado_em, atualizado_em
      `
      const orcamento = rows[0]
      // Buscar categoria para retorno
      const categoria = await app.prisma.categorias.findFirst({
        where: { id: orcamento.categoria_id },
        select: { id: true, nome: true, cor: true, icone: true },
      })
      return reply.status(201).send({ success: true, orcamento: { ...orcamento, categoria } })
    } catch (e: any) {
      console.error('❌ Erro ao criar orçamento:', e.message)
      return reply.status(409).send({ success: false, error: 'Orçamento já existe ou erro no banco' })
    }
  })

  /**
   * PUT /orcamentos/:id
   * Atualiza o percentual de uma alocação.
   */
  app.put('/:id', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any
    const { id } = request.params as { id: string }

    const resultado = z.object({ percentual: z.number().positive().max(100) }).safeParse(request.body)
    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: 'percentual inválido (0-100)' })
    }

    const existente = await app.prisma.orcamentos.findFirst({ where: { id, usuario_id } })
    if (!existente) {
      return reply.status(404).send({ success: false, error: 'Orçamento não encontrado' })
    }

    await app.prisma.$executeRaw`
      UPDATE orcamentos SET percentual = ${resultado.data.percentual}, atualizado_em = NOW()
      WHERE id = ${id}
    `
    const orcamento = await app.prisma.$queryRaw<any[]>`
      SELECT id, usuario_id, categoria_id, percentual, valor_limite FROM orcamentos WHERE id = ${id}
    `
    return reply.send({ success: true, orcamento: orcamento[0] })
  })

  /**
   * DELETE /orcamentos/:id
   * Remove uma alocação de orçamento.
   */
  app.delete('/:id', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any
    const { id } = request.params as { id: string }

    const existente = await app.prisma.orcamentos.findFirst({ where: { id, usuario_id } })
    if (!existente) {
      return reply.status(404).send({ success: false, error: 'Orçamento não encontrado' })
    }

    await app.prisma.orcamentos.delete({ where: { id } })
    return reply.send({ success: true })
  })
}
