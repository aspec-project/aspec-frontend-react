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