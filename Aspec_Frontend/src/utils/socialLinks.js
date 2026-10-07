/*
 * Cria os campos das redes sociais com base nas plataformas devolvidas
 * pela API e nos links já associados ao perfil do membro.
 */
export function createSocialLinks(savedLinks = [], socialPlatforms = []) {
  const knownLinks = socialPlatforms.map((platform) => {
    const savedLink = savedLinks.find(
      (link) => link.platform_id === platform.id,
    )

    return {
      name: platform.name,
      platformId: platform.id,
      url: savedLink?.url ?? '',
    }
  })

  /*
   * Preserva ligações já existentes caso uma plataforma deixe de surgir
   * temporariamente na lista de referência do backend.
   */
  const platformIds = new Set(
    socialPlatforms.map((platform) => platform.id),
  )

  const extraLinks = savedLinks
    .filter((link) => !platformIds.has(link.platform_id))
    .map((link) => ({
      name: link.platform,
      platformId: link.platform_id,
      url: link.url,
    }))

  return [...knownLinks, ...extraLinks]
}