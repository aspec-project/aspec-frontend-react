/*
 * Plataformas disponíveis atualmente no projeto.
 * O nome tem de coincidir com o nome devolvido pela API.
 */
export const SOCIAL_PLATFORMS = [
  { name: 'Instagram' },
  { name: 'Facebook' },
  { name: 'LinkedIn' },
  { name: 'YouTube' },
]

/*
 * Cria os campos das redes sociais com base no perfil recebido da API.
 *
 * A API devolve o URL e o platform_id de cada rede já associada
 * ao perfil. Guardamos ambos porque o ID é necessário ao atualizar.
 */
export function createSocialLinks(savedLinks = []) {
  const knownLinks = SOCIAL_PLATFORMS.map((platform) => {
    const savedLink = savedLinks.find(
      (link) => link.platform === platform.name,
    )

    return {
      name: platform.name,
      platformId: savedLink?.platform_id ?? null,
      url: savedLink?.url ?? '',
    }
  })

  /*
   * Preserva futuras plataformas que possam existir na API,
   * mesmo que ainda não tenham um campo definido no frontend.
   */
  const extraLinks = savedLinks
    .filter(
      (savedLink) =>
        !SOCIAL_PLATFORMS.some(
          (platform) => platform.name === savedLink.platform,
        ),
    )
    .map((savedLink) => ({
      name: savedLink.platform,
      platformId: savedLink.platform_id,
      url: savedLink.url,
    }))

  return [...knownLinks, ...extraLinks]
}