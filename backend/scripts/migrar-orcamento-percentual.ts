/**
 * Migração: Novo sistema de Orçamento por Percentual
 *
 * O que faz:
 * 1. Adiciona parent_id em categorias (auto-referência para subcategorias)
 * 2. Adiciona percentual na tabela orcamentos
 * 3. Torna mes e ano opcionais / remove unique constraint antiga
 * 4. Adiciona unique(usuario_id, categoria_id) — orçamento perpétuo
 *
 * Execute: npx tsx backend/scripts/migrar-orcamento-percentual.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Iniciando migração do sistema de Orçamento...\n')

  // 1. Adicionar parent_id em categorias (auto-referência)
  console.log('📌 1. Adicionando parent_id em categorias...')
  await prisma.$executeRawUnsafe(`
    ALTER TABLE categorias
    ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES categorias(id) ON DELETE SET NULL;
  `)
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_categorias_parent_id ON categorias(parent_id);
  `)
  console.log('   ✅ parent_id adicionado\n')

  // 2. Adicionar coluna percentual em orcamentos
  console.log('📌 2. Adicionando percentual em orcamentos...')
  await prisma.$executeRawUnsafe(`
    ALTER TABLE orcamentos
    ADD COLUMN IF NOT EXISTS percentual DECIMAL(5,2);
  `)
  console.log('   ✅ percentual adicionado\n')

  // 3. Tornar mes e ano nullable (orçamento agora é perpétuo)
  console.log('📌 3. Tornando mes e ano nullable...')
  await prisma.$executeRawUnsafe(`
    ALTER TABLE orcamentos
    ALTER COLUMN mes DROP NOT NULL,
    ALTER COLUMN ano DROP NOT NULL;
  `)
  console.log('   ✅ mes e ano agora são nullable\n')

  // 4. Remover a unique constraint antiga (usuario_id, categoria_id, mes, ano)
  console.log('📌 4. Removendo unique constraint antiga...')
  try {
    // Tenta remover pelo nome padrão gerado pelo Prisma
    await prisma.$executeRawUnsafe(`
      ALTER TABLE orcamentos
      DROP CONSTRAINT IF EXISTS orcamentos_usuario_id_categoria_id_mes_ano_key;
    `)
    console.log('   ✅ Constraint antiga removida\n')
  } catch (e) {
    console.log('   ⚠️  Constraint antiga não encontrada (pode já ter sido removida)\n')
  }

  // 5. Adicionar nova unique constraint perpétua
  console.log('📌 5. Adicionando nova unique (usuario_id, categoria_id)...')
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE orcamentos
      ADD CONSTRAINT orcamentos_usuario_id_categoria_id_unique
      UNIQUE (usuario_id, categoria_id);
    `)
    console.log('   ✅ Nova unique adicionada\n')
  } catch (e) {
    console.log('   ⚠️  Unique já existe (ignorando)\n')
  }

  // 6. Limpar orçamentos antigos (com mes/ano) para evitar conflito com nova unique
  console.log('📌 6. Limpando orçamentos antigos (serão reconfigurados pelo usuário)...')
  const deletados = await prisma.$executeRaw`
    DELETE FROM orcamentos WHERE mes IS NOT NULL AND ano IS NOT NULL;
  `
  console.log(`   ✅ ${deletados} orçamentos antigos removidos\n`)

  // 7. Verificação final
  console.log('📌 7. Verificando estrutura final...')
  const colunasOrca = await prisma.$queryRaw<any[]>`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'orcamentos'
    ORDER BY ordinal_position;
  `
  console.log('   Colunas em orcamentos:')
  colunasOrca.forEach(c => console.log(`   - ${c.column_name} (${c.data_type}) nullable=${c.is_nullable}`))

  const colunasCat = await prisma.$queryRaw<any[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'categorias' AND column_name = 'parent_id';
  `
  console.log(`\n   parent_id em categorias: ${colunasCat.length > 0 ? '✅ existe' : '❌ NÃO existe'}`)

  console.log('\n🎉 Migração concluída com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro na migração:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
