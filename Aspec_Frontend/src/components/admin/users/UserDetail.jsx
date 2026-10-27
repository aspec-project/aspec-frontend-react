import { useId } from 'react'
import { Briefcase, Church, Clock, Globe, Image, Link2, Mail, Phone, Star, UserRound } from 'lucide-react'
import UserReviewCounts from './UserReviewCounts'
import { safeMemberUrl } from '../../../services/members'
import {
  getDisplayName,
  getRoleLabel,
  getStatusBadge,
  groupBusinessHours,
} from '../../../utils/adminUsers'
import { formatDate } from '../../../utils/dateFormat'

const NOT_PROVIDED = 'Não indicado'

/**
 * Indica se um valor de campo está vazio (null, undefined ou texto vazio).
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isEmpty(value) {
  return value === null || value === undefined || value === ''
}

/**
 * Cartão branco com ícone e título, anunciado como região com o nome do título.
 *
 * @param {{title: string, icon: import('react').ComponentType, className?: string, children: import('react').ReactNode}} props
 * @returns {JSX.Element}
 */
function DetailCard({ title, icon: Icon, className = '', children }) {
  const id = useId()

  return (
    <section aria-labelledby={id} className={`rounded-xl bg-white p-6 shadow-sm ${className}`}>
      <h2 id={id} className="flex items-center gap-2 font-semibold text-[#0d1f35]">
        <Icon size={18} aria-hidden="true" className="shrink-0 text-[#8a7043]" />
        {title}
      </h2>
      {children}
    </section>
  )
}

/**
 * Lista de pares rótulo/valor numa linha cada; valores vazios aparecem como "Não indicado".
 *
 * @param {{fields: [string, import('react').ReactNode][]}} props
 * @returns {JSX.Element}
 */
function FieldList({ fields }) {
  return (
    <dl className="mt-4 divide-y divide-gray-100 text-sm">
      {fields.map(([label, value]) => (
        <div key={label} className="flex items-start justify-between gap-4 py-3">
          <dt className="text-gray-500">{label}</dt>
          <dd className="min-w-0 break-words text-right font-medium text-gray-800">{isEmpty(value) ? NOT_PROVIDED : value}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Ligação externa num novo separador, só para URLs http/https sem credenciais;
 * outros valores aparecem como texto, sem ligação.
 *
 * @param {{href: string}} props
 * @returns {JSX.Element}
 */
function ExternalLink({ href }) {
  const safe = safeMemberUrl(href)

  if (!safe) {
    return <span className="break-all">{href}</span>
  }

  return (
    <a href={safe} target="_blank" rel="noopener noreferrer" className="break-all text-[#0d1f35] underline">
      {href}
    </a>
  )
}

/**
 * Contactos comerciais, website e redes sociais, uma linha com ícone por item. Nunca usa os
 * contactos pessoais da conta (o perfil da API também os repete em email/phone).
 *
 * @param {{profile: object}} props
 * @returns {JSX.Element}
 */
function ContactList({ profile }) {
  const socialLinks = profile.social_links ?? []
  const rows = [
    { key: 'email', Icon: Mail, label: 'Email profissional', value: profile.commercial_email },
    { key: 'phone', Icon: Phone, label: 'Telefone da empresa', value: profile.commercial_phone },
    { key: 'website', Icon: Globe, label: 'Website', value: profile.website_url ? <ExternalLink href={profile.website_url} /> : null },
    ...socialLinks.map((link) => ({ key: link.platform_id, Icon: Link2, label: link.platform, value: <ExternalLink href={link.url} /> })),
  ]

  return (
    <>
      <ul className="mt-4 space-y-4 text-sm">
        {rows.map(({ key, Icon, label, value }) => (
          <li key={key} className="flex items-start gap-3">
            <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5f5f4] text-gray-600">
              <Icon size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="break-words text-gray-800">{isEmpty(value) ? NOT_PROVIDED : value}</p>
            </div>
          </li>
        ))}
      </ul>
      {socialLinks.length === 0 && <p className="mt-4 text-sm text-gray-600">Sem redes sociais.</p>}
    </>
  )
}

/**
 * Detalhe de um utilizador do backoffice em cartões: Conta, Contactos e redes, Avaliações,
 * Congregação, Sobre o negócio, Horário de atendimento e Imagens (logótipo primeiro).
 * Sem perfil de membro (ex.: admins) mostra só a Conta e o aviso de que não há perfil.
 * O cabeçalho com o nome e as ações fica na banda da página (UserDetailHeader).
 *
 * @param {{user: object, busy?: boolean}} props
 * @returns {JSX.Element}
 */
export default function UserDetail({ user, busy = false }) {
  const profile = user.member_profile
  const name = getDisplayName(user)

  const account = (
    <DetailCard title="Conta" icon={UserRound}>
      <FieldList
        fields={[
          ['Responsável', profile?.name],
          ['Email pessoal', user.email],
          ['Telefone pessoal', user.phone],
          ['Perfil', getRoleLabel(user)],
          ['Núcleo', profile?.location?.name],
          ['Subscrição', getStatusBadge(user).label],
          ['Membro desde', formatDate(user.created_at)],
        ]}
      />
    </DetailCard>
  )

  if (!profile) {
    return (
      <div aria-busy={busy} className={`grid items-start gap-6 transition-opacity lg:grid-cols-3 ${busy ? 'opacity-60' : ''}`}>
        {account}
        <DetailCard title="Perfil de membro" icon={Briefcase}>
          <p className="mt-4 text-sm text-gray-600">Este utilizador não tem perfil de membro.</p>
        </DetailCard>
      </div>
    )
  }

  const logoUrl = safeMemberUrl(profile.logo_url, true)
  const portfolio = (profile.portfolio ?? [])
    .map((image) => ({ id: image.id, url: safeMemberUrl(image.image_url, true) }))
    .filter((image) => image.url)
  const images = [
    ...(logoUrl ? [{ key: 'logo', url: logoUrl, alt: `Logótipo de ${name}`, logo: true }] : []),
    ...portfolio.map((image, index) => ({ key: image.id, url: image.url, alt: `Imagem ${index + 1} do portefólio de ${name}` })),
  ]
  const hours = groupBusinessHours(profile.business_hours)

  return (
    <div aria-busy={busy} className={`space-y-6 transition-opacity ${busy ? 'opacity-60' : ''}`}>
      <div className="grid items-start gap-6 lg:grid-cols-3">
        {account}

        <DetailCard title="Contactos e redes" icon={Globe}>
          <ContactList profile={profile} />
        </DetailCard>

        <DetailCard title="Avaliações" icon={Star}>
          <UserReviewCounts counts={user.review_counts} />
        </DetailCard>

        <DetailCard title="Congregação" icon={Church}>
          <FieldList fields={[['Congregação', profile.congregation], ['Cargo', profile.role_in_congregation]]} />
        </DetailCard>

        <DetailCard title="Sobre o negócio" icon={Briefcase}>
          {isEmpty(profile.description) ? (
            <p className="mt-4 text-sm text-gray-600">Sem descrição.</p>
          ) : (
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">{profile.description}</p>
          )}
        </DetailCard>

        <DetailCard title="Horário de atendimento" icon={Clock}>
          {hours.length > 0 ? (
            <dl className="mt-4 divide-y divide-gray-100 text-sm">
              {hours.map((group) => (
                <div key={group.label} className="flex justify-between gap-4 py-3">
                  <dt className="text-gray-600">{group.label}</dt>
                  <dd className={group.closed ? 'font-medium text-red-600' : 'font-medium text-gray-800'}>{group.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-gray-600">Sem horário definido.</p>
          )}
        </DetailCard>
      </div>

      <DetailCard title={`Imagens (${images.length})`} icon={Image}>
        {images.length > 0 ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {images.map((image) => (
                <img
                  key={image.key}
                  src={image.url}
                  alt={image.alt}
                  referrerPolicy="no-referrer"
                  className={`aspect-square w-full rounded-lg object-cover ${image.logo ? 'bg-[#f5f1e8]' : 'bg-slate-100'}`}
                />
              ))}
            </div>
            {logoUrl && <p className="mt-3 text-xs text-gray-500">A primeira imagem é o logótipo.</p>}
          </>
        ) : (
          <p className="mt-4 text-sm text-gray-600">Sem imagens.</p>
        )}
      </DetailCard>
    </div>
  )
}
