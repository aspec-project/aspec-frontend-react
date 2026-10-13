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
  return (
    <article className="flex flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0d1f35] text-lg font-semibold text-white" aria-hidden="true">
        {logo && failedLogo !== logo ? <img src={logo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" onError={() => setFailedLogo(logo)} /> : title.trim().charAt(0).toLocaleUpperCase('pt-PT')}
      </div>
      <div className="min-w-0"><h2 className="break-words text-sm font-semibold text-[#0d1f35]">{title}</h2>
      <p className="mt-1 text-xs text-gray-600">{member.sector.name}</p></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
      <p className="flex items-center gap-1 text-xs text-gray-600"><MapPin size={14} aria-hidden="true" />{member.location.name}</p>
      <p className="flex items-center gap-1 text-xs text-[#7a5b25]"><Star size={14} aria-hidden="true" />
        {member.reviews_count === 0 || member.average_rating === null ? 'Sem avaliações' : <span aria-label={`${member.average_rating.toLocaleString('pt-PT')} estrelas, ${member.reviews_count} avaliações`}>{member.average_rating.toLocaleString('pt-PT', { maximumFractionDigits: 1 })} ({member.reviews_count})</span>}
      </p>
      </div>
      <Link to={`/membros/${encodeURIComponent(member.id)}`} aria-label={`Ver perfil: ${title}`} className="mt-auto pt-3 text-xs font-semibold text-[#0d1f35] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79]">Ver perfil →</Link>
    </article>
  )
}
