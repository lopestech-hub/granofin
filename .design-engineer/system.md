# Granofin — Design System

## Direction: Sophistication & Trust
Finance SaaS. Transmitir confiança, seriedade e clareza financeira.
Cool slate foundation, verde como accent de crescimento, sombras sutis em camadas.

## Color Tokens
- Background page: `bg-slate-50` (#f8fafc)
- Sidebar bg: `bg-slate-900` (#0f172a)
- Sidebar text: `text-slate-300`
- Sidebar text active: `text-white`
- Sidebar item active bg: `bg-slate-800`
- Card bg: `bg-white`
- Card border: `border border-slate-200`
- Primary accent: `text-green-600` / `bg-green-600` (#16a34a)
- Primary hover: `bg-green-700`
- Primary light: `bg-green-50` / `text-green-700`
- Danger: `text-red-600` / `bg-red-50`
- Warning: `text-amber-600` / `bg-amber-50`
- Text primary: `text-slate-900`
- Text secondary: `text-slate-600`
- Text muted: `text-slate-400`
- Text faint: `text-slate-300`
- Border default: `border-slate-200`
- Border subtle: `border-slate-100`

## Typography
- Font: Inter (loaded via Google Fonts)
- Base: 14px / 500 weight
- Headline: 20-24px / 600-700 weight / tracking-tight
- Labels: 12px / 500 weight / uppercase para headers de tabela
- Data/Numbers: `font-mono tabular-nums` — SEMPRE para valores monetários, datas, IDs
- Hierarchy: slate-900 → slate-600 → slate-400 → slate-300

## Spacing (4px grid)
- Component padding: p-4 (16px)
- Card padding: p-5 (20px)
- Section gap: gap-6 (24px)
- Item gap: gap-3 (12px)
- Micro gap: gap-2 (8px)

## Depth Strategy: Subtle Single Shadow + Border
```css
/* Card padrão */
border: 1px solid #e2e8f0;  /* slate-200 */
box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);

/* Card elevado (modal, dropdown) */
box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05);
```
Tailwind: `shadow-sm` para cards, `shadow-md` para modais/dropdowns.

## Border Radius
- Componentes pequenos (badge, tag): `rounded` (4px)
- Inputs, botões: `rounded-lg` (8px)
- Cards: `rounded-xl` (12px)
- Modais: `rounded-2xl` (16px)

## Patterns

### Button Primary
- Height: 36px (h-9)
- Padding: px-4 py-2
- Radius: rounded-lg
- Font: text-sm font-semibold text-white
- BG: bg-green-600 hover:bg-green-700
- Transition: transition-colors

### Button Secondary
- Height: 36px (h-9)
- Padding: px-4 py-2
- Radius: rounded-lg
- Font: text-sm font-medium text-slate-700
- BG: bg-white hover:bg-slate-50 border border-slate-300

### Button Ghost
- Padding: px-3 py-2
- Radius: rounded-lg
- Font: text-sm font-medium text-slate-600
- BG: hover:bg-slate-100

### Card Padrão
- BG: bg-white
- Border: border border-slate-200
- Radius: rounded-xl
- Shadow: shadow-sm
- Padding: p-5

### Card Métrica (KPI)
- Igual ao Card Padrão
- Label: text-xs font-medium text-slate-500 uppercase tracking-wide
- Valor: text-2xl font-bold text-slate-900 font-mono tabular-nums
- Variação: text-sm com cor semântica (green/red)

### Input
- Height: 36px (h-9)
- Padding: px-3
- Radius: rounded-lg
- Border: border border-slate-300 focus:border-green-500
- Ring: focus:ring-2 focus:ring-green-100
- Font: text-sm text-slate-900
- Placeholder: placeholder:text-slate-400

### Badge
- Receita: bg-green-50 text-green-700 rounded px-2 py-0.5 text-xs font-medium
- Despesa: bg-red-50 text-red-600 rounded px-2 py-0.5 text-xs font-medium
- Trial: bg-amber-50 text-amber-700
- Ativo: bg-green-50 text-green-700

### Sidebar Item
- Padding: px-3 py-2
- Radius: rounded-lg
- Font: text-sm font-medium
- Default: text-slate-400 hover:text-white hover:bg-slate-800
- Active: text-white bg-slate-800
- Icon: h-4 w-4 mr-3

### Valor Monetário
- SEMPRE: font-mono tabular-nums
- Positivo (receita): text-green-600 font-semibold
- Negativo (despesa): text-slate-900 font-semibold
- Grande destaque: text-2xl md:text-3xl font-bold

## Layout
- Sidebar width: w-60 (240px) fixa no desktop
- Header height: h-14 (56px)
- Content: flex-1 overflow-auto p-6
- Max width content: max-w-7xl mx-auto
- Grid métricas: grid grid-cols-2 md:grid-cols-4 gap-4

## Iconografia
- Biblioteca: lucide-react (já instalada)
- Tamanho padrão: h-4 w-4
- Tamanho sidebar: h-5 w-5
- Tamanho card ícone: h-10 w-10 p-2.5 rounded-xl bg-slate-100 text-slate-600

## Animações
- Hover: transition-colors duration-150
- Modal open: sem spring, apenas opacity/scale 150ms
- Micro: 100-150ms ease-out
