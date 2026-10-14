import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Star } from 'lucide-react'

function safeLogo(value) {
  if (!value) return null
  try {
    const url = new URL(value, window.location.origin)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}

export default function MemberCard({ member }) {
  const [failedLogo, setFailedLogo] = useState(null)
  const logo = safeLogo(member.logo_url)
  const title = member.business_name || member.name
  const hasRating = member.reviews_count > 0 && member.average_rating !== null
  return (
    <article className="min-w-0">
      <Link
        to={`/membros/${encodeURIComponent(member.id)}`}
        aria-label={`Ver perfil: ${title}`}
        className="group flex h-full flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79]"
      >
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0d1f35] text-lg font-semibold text-white" aria-hidden="true">
            {logo && failedLogo !== logo ? <img src={logo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" onError={() => setFailedLogo(logo)} /> : title.trim().charAt(0).toLocaleUpperCase('pt-PT')}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-medium text-[#0d1f35] group-hover:underline" title={title}>{title}</h2>
            <p className="mt-1 truncate text-xs font-normal text-gray-600" title={member.sector.name}>{member.sector.name}</p>
          </div>
        </div>
        {typeof member.description === 'string' && member.description.trim() && (
          <p className="mb-3 line-clamp-2 [overflow-wrap:anywhere] text-xs leading-relaxed text-gray-500">{member.description.trim()}</p>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
          <p className="flex min-w-0 items-center gap-1 text-xs text-gray-600"><MapPin size={10} className="shrink-0" aria-hidden="true" /><span className="truncate">{member.location.name}</span></p>
          <p className="flex items-center gap-1 text-xs text-gray-600">
            <span className="flex gap-0.5 text-[#8a7043]" aria-hidden="true">
              {Array.from({ length: 5 }, (_, index) => <Star key={index} size={10} fill={hasRating && index < Math.round(member.average_rating) ? 'currentColor' : 'none'} />)}
            </span>
            {hasRating ? <span aria-label={`${member.average_rating.toLocaleString('pt-PT')} estrelas`}>{member.average_rating.toLocaleString('pt-PT', { maximumFractionDigits: 1 })}</span> : 'Sem avaliações'}
          </p>
        </div>
      </Link>
    </article>
  )
}
