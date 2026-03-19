import * as LucideIcons from 'lucide-react'
import type { LucideProps } from 'lucide-react'

/**
 * Renderiza dinamicamente um ícone Lucide a partir do nome em string.
 * Ex: "utensils" → <Utensils />
 * Caso o nome não exista, renderiza um ícone de interrogação.
 */
export function LucideIcone({ nome, ...props }: { nome: string } & LucideProps) {
  // Converte "book-open" → "BookOpen", "utensils" → "Utensils"
  const pascalCase = nome
    .split('-')
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join('')

  const Icon = (LucideIcons as Record<string, any>)[pascalCase]

  if (!Icon) {
    // Fallback: mostra a string original compacta caso o ícone não seja encontrado
    return <span style={{ fontSize: '0.7em', lineHeight: 1 }}>{nome.substring(0, 3)}</span>
  }

  return <Icon {...props} />
}
