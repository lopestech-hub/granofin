import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const schemaTransferencia = z.object({
  conta_origem_id: z.string().min(1),
  conta_destino_id: z.string().min(1),
  valor: z.number().positive(),
  data: z.string(),
  observacoes: z.string().optional(),
})

export const transferenciasRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: [app.autenticar] }

  // POST /transferencias
  app.post('/', auth, async (request, reply) => {
    const { id: usuario_id } = request.user as any
    const resultado = schemaTransferencia.safeParse(request.body)

    if (!resultado.success) {
      return reply.status(400).send({ success: false, error: resultado.error.errors[0].message })
    }

    const { conta_origem_id, conta_destino_id, valor, data, observacoes } = resultado.data

    if (conta_origem_id === conta_destino_id) {
       return reply.status(400).send({ success: false, error: 'As contas de origem e destino devem ser diferentes' })
    }

    // Busca a categoria padrão de transferência
    const categoria = await app.prisma.categorias.findFirst({
      where: { nome: 'Transferência', padrao: true }
    })

    if (!categoria) {
      return reply.status(500).send({ success: false, error: 'Categoria de transferência não configurada no sistema' })
    }

    const transferencia_id = crypto.randomUUID()

    try {
      // Usamos transação para garantir que ambos os lados sejam criados
      await app.prisma.$transaction([
        // Lado da Saída (Despesa na Origem)
        app.prisma.lancamentos.create({
          data: {
            id: crypto.randomUUID(),
            usuario_id,
            conta_id: conta_origem_id,
            categoria_id: categoria.id,
            descricao: `Transferência enviada`,
            valor,
            tipo: 'DESPESA',
            data: new Date(data),
            efetivado: true,
            observacoes,
            transferencia_id,
          }
        }),
        // Lado da Entrada (Receita no Destino)
        app.prisma.lancamentos.create({
          data: {
            id: crypto.randomUUID(),
            usuario_id,
            conta_id: conta_destino_id,
            categoria_id: categoria.id,
            descricao: `Transferência recebida`,
            valor,
            tipo: 'RECEITA',
            data: new Date(data),
            efetivado: true,
            observacoes,
            transferencia_id,
          }
        })
      ])

      return reply.status(201).send({ success: true, transferencia_id })
    } catch (e: any) {
      app.log.error(e)
      return reply.status(500).send({ success: false, error: 'Falha ao processar transferência' })
    }
  })
}
