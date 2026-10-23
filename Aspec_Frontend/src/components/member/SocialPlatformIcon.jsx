/*
 * Ícones de marca usados nas redes sociais do perfil. A biblioteca lucide
 * não disponibiliza ícones de marcas, por isso mantemos aqui versões SVG
 * leves, sem introduzir outra dependência apenas para estes quatro ícones.
 */
export default function SocialPlatformIcon({
  platform,
  size = 18,
  ...svgProps
}) {
  const normalizedPlatform = platform?.trim().toLowerCase() ?? ''
  const sharedProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    ...svgProps,
  }

  if (normalizedPlatform.includes('linkedin')) {
    return (
      <svg {...sharedProps}>
        <rect x="4" y="9" width="3" height="10" rx="0.5" />
        <path d="M5.5 6.5h.01" strokeWidth="3" />
        <path d="M10 19v-6a3 3 0 0 1 6 0v6" />
        <path d="M10 13v-4" />
      </svg>
    )
  }

  if (normalizedPlatform.includes('facebook')) {
    return (
      <svg {...sharedProps}>
        <path
          d="M14 20v-7h2.5l.5-3H14V8.5c0-.9.3-1.5 1.8-1.5H17V4.3c-.5-.1-1.1-.1-1.8-.1-2.5 0-4.2 1.5-4.2 4.2V10H8.5v3H11v7h3Z"
          fill="currentColor"
          stroke="none"
        />
      </svg>
    )
  }

  if (normalizedPlatform.includes('instagram')) {
    return (
      <svg {...sharedProps}>
        <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.9" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    )
  }

  if (normalizedPlatform.includes('youtube')) {
    return (
      <svg {...sharedProps}>
        <rect x="3" y="6" width="18" height="12" rx="4" />
        <path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none" />
      </svg>
    )
  }

  return (
    <svg {...sharedProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  )
}
