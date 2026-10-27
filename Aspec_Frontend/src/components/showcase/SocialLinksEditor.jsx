import { Globe2 } from 'lucide-react'
import SocialPlatformIcon from '../member/SocialPlatformIcon'

const socialPlatformOrder = ['linkedin', 'facebook', 'instagram', 'youtube']

function getLinkPlaceholder(platformName) {
  return `${platformName.toLowerCase()}.com/empresa`
}

function compareSocialPlatforms(firstLink, secondLink) {
  const firstIndex = socialPlatformOrder.indexOf(
    firstLink.name.trim().toLowerCase(),
  )
  const secondIndex = socialPlatformOrder.indexOf(
    secondLink.name.trim().toLowerCase(),
  )

  const normalizedFirstIndex =
    firstIndex === -1 ? socialPlatformOrder.length : firstIndex
  const normalizedSecondIndex =
    secondIndex === -1 ? socialPlatformOrder.length : secondIndex

  return normalizedFirstIndex - normalizedSecondIndex
}

/*
 * Mostra e atualiza os links das redes sociais.
 *
 * O envio final continua a ser responsabilidade do formulário pai.
 */
function SocialLinksEditor({ socialLinks, onChange, footer = null }) {
  const orderedSocialLinks = [...socialLinks].sort(compareSocialPlatforms)

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
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-[#0d1f35]">
        <Globe2 size={20} className="text-[#9b7b45]" aria-hidden="true" />
        Redes Sociais
      </h2>

      <div className="mt-5 space-y-3">
        {orderedSocialLinks.map((link) => {
          const inputId = `social-${link.name.toLowerCase()}`

          return (
            <div key={link.name}>
              <label htmlFor={inputId} className="sr-only">
                {link.name}
              </label>

              <div className="relative">
                <SocialPlatformIcon
                  platform={link.name}
                  size={18}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9b7b45]"
                />

                <input
                  id={inputId}
                  type="url"
                  value={link.url}
                  onChange={(event) => handleChange(link.name, event.target.value)}
                  placeholder={getLinkPlaceholder(link.name)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#9b7b45] focus:ring-2 focus:ring-[#9b7b45]/20"
                />
              </div>

              {link.url && !link.platformId && (
                <p className="mt-2 text-xs text-amber-700">
                  Esta rede ainda não está associada ao perfil na API.
                </p>
              )}
            </div>
          )
        })}
      </div>

      {footer}
    </section>
  )
}

export default SocialLinksEditor
