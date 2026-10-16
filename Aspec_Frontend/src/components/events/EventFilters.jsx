const selectClassName = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315a79] disabled:opacity-60";
const buttonClassName = "rounded text-sm font-medium text-[#0d1f35] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79]";

const searchButtonClassName = "rounded-lg bg-[#0d1f35] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#183650] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315a79] disabled:cursor-not-allowed disabled:opacity-50";

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
      <div className="grid gap-4 md:grid-cols-4">
        <div className="min-w-0 md:col-span-2">
          <label htmlFor="event-search" className="mb-1.5 block text-sm font-medium text-gray-700">Pesquisar eventos</label>
          <input
            id="event-search"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Pesquisar eventos..."
            disabled={!searchEnabled}
            aria-describedby={!searchEnabled ? "event-search-unavailable" : undefined}
            className={selectClassName}
          />
          {!searchEnabled && <p id="event-search-unavailable" className="mt-2 text-sm text-gray-600">Pesquisa indisponível de momento.</p>}
        </div>
        <div className="min-w-0">
          <label htmlFor="event-category" className="mb-1.5 block text-sm font-medium text-gray-700">Categoria</label>
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
          <label htmlFor="event-location" className="mb-1.5 block text-sm font-medium text-gray-700">Distrito</label>
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
      <div className="mt-4 flex flex-wrap items-center justify-end gap-4">
        <button type="submit" className={searchButtonClassName}>Pesquisar</button>
        <button type="button" onClick={onClear} className={buttonClassName}>Limpar filtros</button>
      </div>
    </form>
  );
}
