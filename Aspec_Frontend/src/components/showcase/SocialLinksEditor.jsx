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

/*
 * Mostra e atualiza os links das redes sociais.
 *
 * O envio final continua a ser responsabilidade do formulário pai.
 */
function SocialLinksEditor({ socialLinks, onChange }) {
  /*
   * Atualiza apenas o URL da plataforma alterada.
   */
  function handleChange(platformName, url) {
    const updatedLinks = socialLinks.map((link) => {
      if (link.name !== platformName) {
        return link
      }

      return {
        ...link,
        url,
      }
    })

    onChange(updatedLinks)
  }

  return (
    <section className="rounded-xl border border-slate-200 p-6">
      <h2 className="text-xl font-semibold text-[#0d1f35]">
        Redes sociais
      </h2>

      <p className="mt-2 text-sm text-slate-600">
        Adiciona as ligações para as redes sociais da empresa.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {socialLinks.map((link) => {
          const inputId = `social-${link.name.toLowerCase()}`

          return (
            <div key={link.name}>
              <label
                htmlFor={inputId}
                className="text-sm font-medium text-slate-700"
              >
                {link.name}
              </label>

              <input
                id={inputId}
                type="url"
                value={link.url}
                onChange={(event) =>
                  handleChange(link.name, event.target.value)
                }
                placeholder={`https://${link.name.toLowerCase()}.com/empresa`}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#8a7043] focus:ring-2 focus:ring-[#8a7043]/20"
              />

              {link.url && !link.platformId && (
                <p className="mt-2 text-xs text-amber-700">
                  Esta rede ainda não está associada ao perfil na API.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default SocialLinksEditor