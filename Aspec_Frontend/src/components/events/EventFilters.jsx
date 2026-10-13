import { Search } from "lucide-react";

const selectClassName = "w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-[#0D1F35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315A79] disabled:cursor-not-allowed disabled:bg-gray-100";
const buttonClassName = "rounded text-sm font-medium text-[#0D1F35] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315A79] disabled:cursor-not-allowed disabled:text-gray-500 disabled:no-underline";

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
  onClear,
}) {
  return (
    <section aria-label="Filtros de eventos" className="mb-8 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="event-search" className="text-sm font-semibold text-[#0D1F35]">Pesquisar eventos</label>
            <button type="button" disabled={!searchEnabled || !search} onClick={() => onSearchChange("")} className={buttonClassName}>Limpar pesquisa</button>
          </div>
          <div className="relative">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              id="event-search"
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Pesquisar eventos..."
              disabled={!searchEnabled}
              aria-describedby={!searchEnabled ? "event-search-unavailable" : undefined}
              className={`${selectClassName} pl-9`}
            />
          </div>
          {!searchEnabled && <p id="event-search-unavailable" className="mt-2 text-sm text-gray-600">Pesquisa indisponível de momento.</p>}
        </div>
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="event-category" className="text-sm font-semibold text-[#0D1F35]">Categoria</label>
            <button type="button" disabled={!categoryId} onClick={() => onCategoryChange("")} className={buttonClassName}>Limpar categoria</button>
          </div>
          <select
            id="event-category"
            value={categoryId}
            onChange={(event) => onCategoryChange(event.target.value)}
            disabled={categories.loading || Boolean(categories.error)}
            aria-describedby={categories.error ? "event-category-error" : categories.loading ? "event-category-status" : undefined}
            className={selectClassName}
          >
            <option value="">Todas as categorias</option>
            {categories.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          {categories.loading && <p id="event-category-status" role="status" className="mt-2 text-sm text-gray-600">A carregar categorias...</p>}
          {categories.error && (
            <div className="mt-3 space-y-2 text-sm">
              <p id="event-category-error" role="alert" className="text-red-700">Não foi possível carregar as categorias. {categories.error}</p>
              <button type="button" onClick={categories.onRetry} className={buttonClassName}>Tentar carregar categorias novamente</button>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="event-location" className="text-sm font-semibold text-[#0D1F35]">Distrito</label>
            <button type="button" disabled={!locationId} onClick={() => onLocationChange("")} className={buttonClassName}>Limpar distrito</button>
          </div>
          <select
            id="event-location"
            value={locationId}
            onChange={(event) => onLocationChange(event.target.value)}
            disabled={locations.loading || Boolean(locations.error)}
            aria-describedby={locations.error ? "event-location-error" : locations.loading ? "event-location-status" : undefined}
            className={selectClassName}
          >
            <option value="">Todos os distritos</option>
            {locations.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          {locations.loading && <p id="event-location-status" role="status" className="mt-2 text-sm text-gray-600">A carregar distritos...</p>}
          {locations.error && (
            <div className="mt-3 space-y-2 text-sm">
              <p id="event-location-error" role="alert" className="text-red-700">Não foi possível carregar os distritos. {locations.error}</p>
              <button type="button" onClick={locations.onRetry} className={buttonClassName}>Tentar carregar distritos novamente</button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <button type="button" disabled={!categoryId && !locationId && !search} onClick={onClear} className={buttonClassName}>Limpar filtros</button>
      </div>
    </section>
  );
}
