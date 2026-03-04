export function Logo({
    variant = 'dark',
    size = 'md',
    hideText = false,
    className = ''
}: {
    variant?: 'light' | 'dark',
    size?: 'sm' | 'md' | 'lg',
    hideText?: boolean,
    className?: string
}) {
    const isLight = variant === 'light'

    // Tamanhos perfeitamente alinhados
    const svgSizes = {
        sm: 24,
        md: 32,
        lg: 40
    }

    const textSizes = {
        sm: 'text-[18px]',
        md: 'text-[24px]',
        lg: 'text-[28px]'
    }

    const textColor = isLight ? 'text-white' : 'text-slate-900'

    return (
        <div className={`flex items-center gap-2.5 ${className}`}>
            {/* Réplica exata: G moderno forte, com semente fluorescente desenhada matematicamente */}
            <svg
                width={svgSizes[size]}
                height={svgSizes[size]}
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0"
            >
                {/* Curva do G que fecha criando a aparência do Pacman/Gráfico, usando um verde moderno */}
                <path
                    d="M 16 16 H 26 A 10 10 0 1 1 23 9"
                    stroke="#059669"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                {/* Ponto (semente) sobre a extremidade da curva com um verde neon luminoso */}
                <circle cx="23" cy="9" r="4.5" fill="#34D399" />
            </svg>

            {!hideText && (
                <span className={`font-bold tracking-tight ${textSizes[size]} ${textColor}`}>
                    Granofin
                </span>
            )}
        </div>
    )
}
