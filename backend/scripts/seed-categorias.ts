/**
 * Seed de categorias padrão do sistema (usuario_id = null)
 * Executar: npx tsx scripts/seed-categorias.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categorias = [
  // Despesas
  { nome: 'Alimentação', tipo: 'DESPESA', cor: '#EF4444', icone: 'utensils' },
  { nome: 'Moradia', tipo: 'DESPESA', cor: '#F97316', icone: 'home' },
  { nome: 'Transporte', tipo: 'DESPESA', cor: '#EAB308', icone: 'car' },
  { nome: 'Saúde', tipo: 'DESPESA', cor: '#22C55E', icone: 'heart-pulse' },
  { nome: 'Educação', tipo: 'DESPESA', cor: '#3B82F6', icone: 'book-open' },
  { nome: 'Lazer', tipo: 'DESPESA', cor: '#8B5CF6', icone: 'gamepad-2' },
  { nome: 'Roupas', tipo: 'DESPESA', cor: '#EC4899', icone: 'shirt' },
  { nome: 'Tecnologia', tipo: 'DESPESA', cor: '#06B6D4', icone: 'laptop' },
  { nome: 'Assinaturas', tipo: 'DESPESA', cor: '#6366F1', icone: 'tv' },
  { nome: 'Pets', tipo: 'DESPESA', cor: '#F59E0B', icone: 'paw-print' },
  { nome: 'Beleza', tipo: 'DESPESA', cor: '#F43F5E', icone: 'sparkles' },
  { nome: 'Impostos', tipo: 'DESPESA', cor: '#64748B', icone: 'file-text' },
  { nome: 'Outros', tipo: 'DESPESA', cor: '#94A3B8', icone: 'circle-ellipsis' },
  // Receitas
  { nome: 'Salário', tipo: 'RECEITA', cor: '#22C55E', icone: 'briefcase' },
  { nome: 'Freelance', tipo: 'RECEITA', cor: '#10B981', icone: 'laptop-2' },
  { nome: 'Investimentos', tipo: 'RECEITA', cor: '#3B82F6', icone: 'trending-up' },
  { nome: 'Presente', tipo: 'RECEITA', cor: '#EC4899', icone: 'gift' },
  { nome: 'Reembolso', tipo: 'RECEITA', cor: '#F97316', icone: 'receipt' },
  { nome: 'Aluguel', tipo: 'RECEITA', cor: '#8B5CF6', icone: 'building-2' },
  { nome: 'Outras Receitas', tipo: 'RECEITA', cor: '#94A3B8', icone: 'circle-ellipsis' },
] as const

async function main() {
  console.log('Iniciando seed de categorias padrão...')

  let criadas = 0
  let ignoradas = 0

  for (const cat of categorias) {
    const existente = await prisma.categorias.findFirst({
      where: { nome: cat.nome, padrao: true, usuario_id: null },
    })

    if (existente) {
      console.log(`  [ignorada] ${cat.nome} já existe`)
      ignoradas++
      continue
    }

    await prisma.categorias.create({
      data: {
        nome: cat.nome,
        tipo: cat.tipo,
        cor: cat.cor,
        icone: cat.icone,
        padrao: true,
        usuario_id: null,
      },
    })

    console.log(`  [criada] ${cat.tipo} — ${cat.nome}`)
    criadas++
  }

  console.log(`\nSeed concluído: ${criadas} criadas, ${ignoradas} ignoradas`)
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
