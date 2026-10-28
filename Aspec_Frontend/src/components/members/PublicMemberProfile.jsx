import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Globe, Link2, Lock, MapPin } from 'lucide-react'
import RatingStars from './RatingStars'
import MemberReviews from './MemberReviews'
import { groupBusinessHours } from '../../utils/businessHours'
import PortfolioImageDialog from './PortfolioImageDialog'

const cardClass = 'rounded-xl border border-gray-100 bg-white p-6 shadow-sm'
const sidebarClass = 'rounded-xl border border-gray-100 bg-white p-5 shadow-sm'
const linkClass = 'rounded font-semibold text-[#0d1f35] underline focus-visible:outline-2 focus-visible:outline-offset-4'

function ProfileImage({ src, title, logo = false, index, onOpen }) {
  const [failed, setFailed] = useState(null)
  const visible = src && failed !== src
  const alt = logo ? `Logótipo de ${title}` : `Imagem ${index + 1} do portefólio de ${title}`
  const className = logo ? 'flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#8a7043] text-3xl font-semibold text-white' : 'flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-sm text-gray-600'
  const content = visible ? (
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-cover"
      referrerPolicy="no-referrer"
      onError={() => setFailed(src)}
    />
  ) : logo ? title.trim().charAt(0).toLocaleUpperCase('pt-PT') : 'Imagem indisponível'

  if (!logo && visible && onOpen) {
    return (
      <button
        type="button"
        aria-label={`Ampliar imagem ${index + 1} do portefólio de ${title}`}
        aria-haspopup="dialog"
        className={`${className} cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79]`}
        onClick={() => onOpen(index)}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={className}>
      {content}
    </div>
  )
}

function Rating({ member }) {
  const hasRating = member.average_rating !== null && member.reviews_count > 0
  return (
    <div className="text-center">
      <p className={hasRating ? 'mb-2 text-4xl font-semibold leading-normal text-[#0d1f35]' : 'mb-2 text-sm text-gray-600'}>
        {hasRating ? member.average_rating.toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : 'Sem avaliações'}
      </p>
      <RatingStars rating={hasRating ? member.average_rating : null} />
      <p className="mt-3 text-sm leading-relaxed text-gray-600">Baseado em {member.reviews_count} {member.reviews_count === 1 ? 'avaliação' : 'avaliações'}</p>
    </div>
  )
}

function SocialIcon({ platform, size = 16, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
      {platform === 'facebook' && <path d="M14 22v-9h3l.5-4H14V7c0-1.2.4-2 2-2h2V1.5C17.4 1.2 16.2 1 15 1c-3 0-5 1.8-5 5v3H7v4h3v9z" />}
      {platform === 'linkedin' && <><circle cx="4" cy="4" r="2" /><path d="M2 8h4v14H2zM9 8h4v2c1-1.5 2.5-2.3 4-2.3 3.5 0 5 2.2 5 6.3v8h-4v-8c0-2-.6-3-2-3s-3 1-3 3v8H9z" /></>}
      {platform === 'instagram' && <g fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".5" fill="currentColor" /></g>}
      {platform === 'youtube' && <><rect x="2" y="5" width="20" height="14" rx="4" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m10 8 6 4-6 4z" /></>}
    </svg>
  )
}

const socialIcons = new Map(['facebook', 'instagram', 'linkedin', 'youtube'].map((platform) => [
  platform, (props) => <SocialIcon platform={platform} {...props} />,
]))

function ContactLink({ href, label, Icon, accessibleName = label }) {
  return (
    <a className="group flex min-w-0 items-start gap-3 rounded focus-visible:outline-2 focus-visible:outline-offset-4" href={href} aria-label={accessibleName} target="_blank" rel="noopener noreferrer">
      <Icon size={16} className="mt-0.5 shrink-0 text-[#8a7043]" aria-hidden="true" />
      <span className="min-w-0 text-sm text-[#0d1f35]">
        <span className="block font-medium">{label}</span>
        <span className="mt-1 block break-words text-xs leading-relaxed text-gray-600 group-hover:underline">{href}</span>
      </span>
    </a>
  )
}

function Contacts({ member, allowContacts, showLockedContacts }) {
  if (showLockedContacts) {
    return (
      <section aria-label="Contactos reservados" className={`${sidebarClass} flex items-center justify-center`}>
        <div className="flex w-full max-w-xs flex-col items-center text-center text-sm leading-relaxed text-gray-600">
          <Lock size={24} className="mb-3 text-[#8a7043]" aria-hidden="true" />
          <p>Os contactos estão disponíveis para membros ASPEC ativos.</p>
          <div className="mt-4 flex w-full flex-col gap-3">
            <Link className="rounded-lg bg-[#0d1f35] px-4 py-2 text-center font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4" to="/login">Entrar</Link>
            <Link className="rounded-lg border border-gray-300 px-4 py-2 text-center font-semibold text-[#0d1f35] focus-visible:outline-2 focus-visible:outline-offset-4" to="/registo">Candidatar-me</Link>
          </div>
        </div>
      </section>
    )
  }
  const contacts = allowContacts ? member.members_only : null
  if (!contacts) return null
  const fields = [['Telefone comercial', contacts.commercial_phone], ['Email comercial', contacts.commercial_email]]
  const visibleFields = fields.filter(([, value]) => value?.trim())
  const socialLinks = contacts.social_links.filter((item) => item.url)
  return (
    <section className={sidebarClass}>
      <h2 className="text-base font-medium leading-normal text-[#0d1f35]">Contactos</h2>
      {contacts.website_url && (
        <div className="mt-4"><ContactLink href={contacts.website_url} label="Website" Icon={Globe} accessibleName="Visitar website" /></div>
      )}
      {socialLinks.length > 0 && (
        <ul className="mt-4 space-y-3">
          {socialLinks.map((item, index) => (
            <li key={`${item.platform_id}-${index}`}>
              <ContactLink href={item.url} label={item.platform} Icon={socialIcons.get(item.platform.trim().toLocaleLowerCase('pt-PT')) ?? Link2} />
            </li>
          ))}
        </ul>
      )}
      {visibleFields.length === 0 && !contacts.website_url && socialLinks.length === 0 && <p className="mt-4 text-sm text-gray-600">Contactos não disponíveis.</p>}
      {visibleFields.length > 0 && (
        <dl className="mt-4 space-y-4">
          {visibleFields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm font-medium">{label}</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-600">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}

function LocationCard({ address }) {
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
  return (
    <section className={sidebarClass}>
      <h2 className="text-base font-medium leading-normal text-[#0d1f35]">Localização</h2>
      <div className="mt-4 flex h-32 items-center justify-center rounded-lg bg-gray-100 text-[#8a7043]" aria-hidden="true"><MapPin size={32} /></div>
      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-600">{address}</p>
      <a className={`${linkClass} mt-4 inline-block text-sm`} href={mapUrl} target="_blank" rel="noopener noreferrer">Ver no Google Maps</a>
    </section>
  )
}

export default function PublicMemberProfile({ member, allowContacts, showLockedContacts = false, allowReview = false, allowComments = false }) {
  const [selectedImage, setSelectedImage] = useState(null)
  const closeImage = useCallback(() => setSelectedImage(null), [])
  const title = member.business_name || member.name
  const portfolioImages = member.portfolio.map((item, index) => ({
    id: item.id, src: item.image_url, index, alt: `Imagem ${index + 1} do portefólio de ${title}`,
  })).filter((image) => image.src)
  const address = allowContacts ? member.members_only?.address?.trim() : null
  const hasRating = member.average_rating !== null && member.reviews_count > 0
  return (
    <>
    <section className="bg-[#0d1f35] pb-16 pt-10 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-start gap-6 md:flex-row">
          <ProfileImage key={member.id} src={member.logo_url} title={title} logo />
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-medium leading-normal">{title}</h1>
            <p className="mb-3 mt-2 text-sm leading-relaxed text-white/75">{member.sector.name}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-white/80">
              <p className="flex items-center gap-2"><MapPin size={13} aria-hidden="true" className="text-primary" />{member.location.name}, Portugal</p>
              <p className="flex items-center gap-2">
                <RatingStars rating={hasRating ? member.average_rating : null} size={13} />
                <span>{hasRating ? `${member.average_rating.toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} (${member.reviews_count} ${member.reviews_count === 1 ? 'avaliação' : 'avaliações'})` : 'Sem avaliações'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
    <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <section className={cardClass}>
          <h2 className="text-lg font-medium leading-normal text-[#0d1f35]">Sobre o Negócio</h2>
          <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-600">{member.description?.trim() || 'Descrição não disponível.'}</p>
        </section>
        <section className={cardClass}>
          <h2 className="text-lg font-medium leading-normal text-[#0d1f35]">Horário de Atendimento</h2>
          <dl className="mt-4 space-y-3">
            {groupBusinessHours(member.business_hours).map(({ label, intervals }) => (
              <div key={label} className="flex flex-wrap justify-between gap-2 text-sm leading-relaxed">
                <dt>{label}</dt>
                <dd>{intervals.length > 0 ? intervals.map((item) => `${item.open_time} – ${item.close_time}`).join(' / ') : 'Encerrado'}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className={cardClass}>
          <h2 className="text-lg font-medium leading-normal text-[#0d1f35]">Portefólio</h2>
          {member.portfolio.length ? (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {member.portfolio.map((item, index) => <ProfileImage key={item.id} src={item.image_url} title={title} index={index} onOpen={setSelectedImage} />)}
            </div>
          ) : <p className="mt-4 text-sm leading-relaxed text-gray-600">Sem imagens no portefólio.</p>}
        </section>
        {allowComments && <MemberReviews memberId={member.id} allowReview={allowReview} />}
      </div>
      <aside className="space-y-6">
        <section className={sidebarClass}>
          <h2 className="mb-4 text-base font-medium leading-normal text-[#0d1f35]">Classificação Global</h2>
          <Rating member={member} />
        </section>
        <Contacts member={member} allowContacts={allowContacts} showLockedContacts={showLockedContacts} />
        {address && <LocationCard address={address} />}
      </aside>
    </div>
    {selectedImage !== null && <PortfolioImageDialog images={portfolioImages} initialIndex={portfolioImages.findIndex((image) => image.index === selectedImage)} onClose={closeImage} />}
    </>
  )
}
