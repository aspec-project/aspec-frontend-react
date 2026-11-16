import SelectMenu from '../ui/SelectMenu'
import { PublicFilterSearch, publicFilterLabelClass, publicFilterButtonClass, publicFilterClearClass } from '../ui/PublicFilterControls'

const buttonClassName = 'rounded text-sm font-medium text-[#0d1f35] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary'

export default function EventFilters({
  categoryId,
  locationId,
  search,
  searchEnabled,
  categories,
  locations,
  onCategoryChange,
  onLocationChange,
  onSearchChange,
  onSearch,
  onClear,
}) {
  return (
    <form onSubmit={onSearch} aria-label="Filtros de eventos" className="mb-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0 md:col-span-2 lg:col-span-2">
          <label htmlFor="event-search" className={publicFilterLabelClass}>Pesquisar eventos</label>
          <PublicFilterSearch
            id="event-search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Pesquisar eventos..."
            disabled={!searchEnabled}
            aria-describedby={!searchEnabled ? "event-search-unavailable" : undefined}
          />
          {!searchEnabled && <p id="event-search-unavailable" className="mt-2 text-sm text-gray-600">Pesquisa indisponível de momento.</p>}
        </div>
        <div className="min-w-0">
          <label id="event-category-label" htmlFor="event-category" className={publicFilterLabelClass}>Categoria</label>
          <SelectMenu
            id="event-category"
            value={categoryId}
            onChange={onCategoryChange}
            disabled={categories.loading || Boolean(categories.error)}
            describedBy={categories.error ? "event-category-error" : categories.loading ? "event-category-status" : undefined}
            label="Categoria"
            labelId="event-category-label"
            variant="public-filter"
            options={[{ value: '', label: 'Todas as categorias' }, ...categories.items.map((item) => ({ value: String(item.id), label: item.name }))]}
          />
          {categories.loading && <p id="event-category-status" role="status" className="mt-2 text-sm text-gray-600">A carregar categorias...</p>}
          {categories.error && (
            <div className="mt-3 space-y-2 text-sm">
              <p id="event-category-error" role="alert" className="text-red-700">Não foi possível carregar as categorias. {categories.error}</p>
              <button type="button" onClick={categories.onRetry} className={buttonClassName}>Tentar carregar categorias novamente</button>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <label id="event-location-label" htmlFor="event-location" className={publicFilterLabelClass}>Distrito</label>
          <SelectMenu
            id="event-location"
            value={locationId}
            onChange={onLocationChange}
            disabled={locations.loading || Boolean(locations.error)}
            describedBy={locations.error ? "event-location-error" : locations.loading ? "event-location-status" : undefined}
            label="Distrito"
            labelId="event-location-label"
            variant="public-filter"
            options={[{ value: '', label: 'Todos os distritos' }, ...locations.items.map((item) => ({ value: String(item.id), label: item.name }))]}
          />
          {locations.loading && <p id="event-location-status" role="status" className="mt-2 text-sm text-gray-600">A carregar distritos...</p>}
          {locations.error && (
            <div className="mt-3 space-y-2 text-sm">
              <p id="event-location-error" role="alert" className="text-red-700">Não foi possível carregar os distritos. {locations.error}</p>
              <button type="button" onClick={locations.onRetry} className={buttonClassName}>Tentar carregar distritos novamente</button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-4">
        <button type="submit" className={publicFilterButtonClass}>Pesquisar</button>
        <button type="button" onClick={onClear} className={publicFilterClearClass}>Limpar filtros</button>
      </div>
    </form>
  );
}
