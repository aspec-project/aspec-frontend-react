import { useState } from 'react'
import { API_URL } from '../../services/api'

/*
 * Transforma caminhos relativos devolvidos pelo Laravel em URLs completas.
 * Assim, um logótipo guardado em /storage/... é pedido ao backend, não ao
 * servidor do frontend.
 */
function createAssetUrl(assetUrl) {
  if (!assetUrl) {
    return ''
  }

  if (/^https?:\/\//i.test(assetUrl)) {
    return assetUrl
  }

  return new URL(assetUrl, `${API_URL}/`).toString()
}

/*
 * Cria as iniciais mostradas quando a empresa ainda não tem logótipo.
 */
function getInitials(name) {
  return (name ?? 'M')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((namePart) => namePart.charAt(0).toUpperCase())
    .join('')
}

/*
 * Mostra o logótipo da empresa como avatar.
 *
 * Se a imagem não existir ou falhar ao carregar, apresenta as iniciais como
 * alternativa acessível, sem deixar um espaço vazio na interface.
 */
export default function MemberAvatar({
  logoUrl,
  name,
  className = '',
  imageClassName = '',
}) {
  const [failedUrl, setFailedUrl] = useState('')
  const imageUrl = createAssetUrl(logoUrl)
  const hasLogo = Boolean(imageUrl) && failedUrl !== imageUrl

  return (
    <div
      className={[
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#9b7b45] font-bold text-white',
        className,
      ].join(' ')}
    >
      {hasLogo ? (
        <img
          src={imageUrl}
          alt={`Logótipo de ${name}`}
          className={['h-full w-full object-cover', imageClassName].join(' ')}
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        getInitials(name)
      )}
    </div>
  )
}