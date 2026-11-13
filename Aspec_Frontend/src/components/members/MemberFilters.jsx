import SelectMenu from '../ui/SelectMenu'
import { PublicFilterSearch, publicFilterLabelClass, publicFilterButtonClass, publicFilterClearClass } from '../ui/PublicFilterControls'

export const directoryButtonClass = 'rounded-lg bg-[#0d1f35] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#183650] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50'

export default function MemberFilters({ filters, draftSearch, changeSearch, changeFilter, onSearch, clearFilters, references, loading, fieldErrors }) {
  return (
    <form onSubmit={onSearch} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm" aria-label="Pesquisar membros">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0 md:col-span-2 lg:col-span-2">
          <label htmlFor="member-search" className={publicFilterLabelClass}>Pesquisar</label>
          <PublicFilterSearch iconSize={15} id="member-search" value={draftSearch} onChange={(event) => changeSearch(event.target.value)} placeholder="Nome, nome comercial ou descrição" aria-invalid={!!fieldErrors.search} aria-describedby={fieldErrors.search ? 'member-search-error' : undefined} />
          {fieldErrors.search && <p id="member-search-error" className="mt-1 text-sm text-red-700">{fieldErrors.search}</p>}
        </div>
        {[['sector_id', 'Setor', references.sectors, 'Todos os setores'], ['location_id', 'Distrito', references.locations, 'Todos os distritos']].map(([key, label, options, placeholder]) => (
          <div key={key} className="min-w-0">
            <label id={`member-${key}-label`} htmlFor={`member-${key}`} className={publicFilterLabelClass}>{label}</label>
            <SelectMenu id={`member-${key}`} label={label} labelId={`member-${key}-label`} variant="public-filter" value={filters[key]} onChange={(value) => changeFilter(key, value)} disabled={!references.ready} invalid={!!fieldErrors[key]} describedBy={fieldErrors[key] ? `member-${key}-error` : undefined} options={[{ value: '', label: placeholder }, ...options.map((item) => ({ value: String(item.id), label: item.name }))]} />
            {fieldErrors[key] && <p id={`member-${key}-error`} className="mt-1 text-sm text-red-700">{fieldErrors[key]}</p>}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-gray-700">Avaliação mínima</legend>
          <div className="flex flex-wrap gap-2">
            {[['', 'Todas'], ['3', '3+'], ['4', '4+'], ['4.5', '4,5+']].map(([value, label]) => <button key={value} type="button" aria-label={value ? `Pelo menos ${value.replace('.', ',')} estrelas` : undefined} aria-pressed={filters.min_rating === value} onClick={() => changeFilter('min_rating', value)} className={`rounded-full border px-3 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] ${filters.min_rating === value ? 'border-[#0d1f35] bg-[#0d1f35] text-white' : 'border-gray-300 text-gray-700'}`}>{value && <><span aria-hidden="true" className="text-primary">★</span>{' '}</>}{label}</button>)}
          </div>
          {fieldErrors.min_rating && <p className="mt-1 text-sm text-red-700" role="alert">{fieldErrors.min_rating}</p>}
        </fieldset>
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={loading} className={publicFilterButtonClass}>Pesquisar</button>
          <button type="button" onClick={clearFilters} className={publicFilterClearClass}>Limpar filtros</button>
        </div>
      </div>
    </form>
  )
}
