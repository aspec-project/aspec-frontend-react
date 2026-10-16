import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import EventFilters from "../components/events/EventFilters";
import EventCard from "../components/events/EventCard";
import { getEventsPage, getEventsCapabilities, getEventsErrorMessage } from "../services/events";
import { getEventCategories, getLocations } from "../services/referenceLists";

function useFilterOptions(loadOptions) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ attempt: -1, items: [], error: "" });

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const items = await loadOptions(controller.signal);

        if (!controller.signal.aborted) {
          setResult({ attempt, items, error: "" });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          const status = error?.response?.status;

          setResult({
            attempt,
            items: [],
            error: status === 419 || status === 429
              ? getEventsErrorMessage(error)
              : "Tente novamente.",
          });
        }
      }
    }

    load();

    return () => controller.abort();
  }, [attempt, loadOptions]);

  const loading = result.attempt !== attempt;

  return {
    items: loading ? [] : result.items,
    error: loading ? "" : result.error,
    loading,
    onRetry: () => setAttempt((current) => current + 1),
  };
}

const paginationButtonClassName = "inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-[#0D1F35] hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#315A79] disabled:cursor-not-allowed disabled:opacity-50";

export default function EventsPage() {
  const [query, setQuery] = useState({ categoryId: "", locationId: "", search: "", page: 1 });
  const [draftSearch, setDraftSearch] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ key: "", data: null, error: "" });
  const categories = useFilterOptions(getEventCategories);
  const locations = useFilterOptions(getLocations);
  const capabilities = getEventsCapabilities();
  const { categoryId, locationId, search, page } = query;
  const queryKey = JSON.stringify([categoryId, locationId, search, page, attempt]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const data = await getEventsPage({ categoryId, locationId, search, page }, controller.signal);

        if (!controller.signal.aborted) {
          setResult({ key: queryKey, data, error: "" });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({ key: queryKey, data: null, error: getEventsErrorMessage(error) });
        }
      }
    }

    load();

    return () => controller.abort();
  }, [categoryId, locationId, search, page, queryKey]);

  /*
   * Uma resposta pertence à consulta que a originou. Durante a mudança de
   * filtros ou página, os resultados anteriores deixam de ser apresentados.
   */
  const loading = result.key !== queryKey;
  const data = loading ? null : result.data;
  const error = loading ? "" : result.error;

  function changeFilter(field, value, options) {
    if (value && !options.some((option) => option.id === value)) return;

    setQuery((current) => ({ ...current, [field]: value, page: 1 }));
  }

  function changePage(nextPage) {
    if (
      !data ||
      !Number.isInteger(nextPage) ||
      nextPage < 1 ||
      nextPage > data.pagination.last_page
    ) return;

    setQuery((current) => ({ ...current, page: nextPage }));
  }

  return (
    <div className="min-h-[65vh] bg-gray-50 text-[#0D1F35]">
      <header className="bg-[linear-gradient(135deg,#0d1f35,#060f1a)] py-14">
        <div className="mx-auto max-w-7xl px-6">
          <h1 className="text-2xl font-medium leading-normal text-primary">Agenda de Eventos</h1>
          <p className="mt-2 text-sm text-white/80">Encontre e inscreva-se nos próximos eventos ASPEC em todo o país.</p>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <EventFilters
          categoryId={categoryId}
          locationId={locationId}
          search={draftSearch}
          searchEnabled={capabilities.search}
          categories={categories}
          locations={locations}
          onCategoryChange={(value) => changeFilter("categoryId", value, categories.items)}
          onLocationChange={(value) => changeFilter("locationId", value, locations.items)}
          onSearchChange={(value) => {
            if (!capabilities.search) return;
            setDraftSearch(value);
            if (value === "") {
              setQuery((current) => ({ ...current, search: "", page: 1 }));
              setAttempt((current) => current + 1);
            }
          }}
          onSearch={(event) => {
            event.preventDefault();
            setQuery((current) => ({ ...current, search: capabilities.search ? draftSearch.trim() : "", page: 1 }));
            setAttempt((current) => current + 1);
          }}
          onClear={() => {
            setDraftSearch("");
            setQuery({ categoryId: "", locationId: "", search: "", page: 1 });
            setAttempt((current) => current + 1);
          }}
        />
        <section aria-label="Resultados da agenda" aria-busy={loading}>
          {loading ? (
            <p role="status" className="py-16 text-center text-gray-600">A carregar eventos...</p>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
              <p role="alert">{error}</p>
              <button
                type="button"
                onClick={() => setAttempt((current) => current + 1)}
                className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-700"
              >
                Tentar novamente
              </button>
            </div>
          ) : data.items.length === 0 ? (
            <p role="status" className="py-16 text-center text-gray-600">
              Não foram encontrados eventos para os filtros selecionados.
            </p>
          ) : (
            <>
              <p className="mb-6 text-sm text-gray-500">
                {data.pagination.total} {data.pagination.total === 1 ? "evento encontrado" : "eventos encontrados"}
              </p>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {data.items.map((event, index) => <EventCard key={`${event.id}-${index}`} event={event} />)}
              </div>
            </>
          )}
          {data && data.pagination.last_page > 1 && (
            <nav aria-label="Paginação de eventos" className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                disabled={data.pagination.current_page <= 1}
                onClick={() => changePage(data.pagination.current_page - 1)}
                className={paginationButtonClassName}
              >
                <ChevronLeft size={18} aria-hidden="true" /> Anterior
              </button>
              <p className="text-sm text-gray-600">Página {data.pagination.current_page} de {data.pagination.last_page}</p>
              <button
                type="button"
                disabled={data.pagination.current_page >= data.pagination.last_page}
                onClick={() => changePage(data.pagination.current_page + 1)}
                className={paginationButtonClassName}
              >
                Seguinte <ChevronRight size={18} aria-hidden="true" />
              </button>
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
