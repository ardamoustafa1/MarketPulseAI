import {
  memo,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type Filter<T> = {
  key: keyof T;
  label: string;
  options: string[];
};

type TableProps<T extends Record<string, string | number>> = {
  title: string;
  columns: Array<{ key: keyof T; label: string }>;
  data: T[];
  filters?: Filter<T>[];
  renderDetails: (row: T) => ReactNode;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  getRowId?: (row: T, index: number) => string;
  searchableKeys?: Array<keyof T>;
  searchPlaceholder?: string;
  pageSize?: number;
};

const DEFAULT_SEARCH_PLACEHOLDER = 'Search records';

const FilterSelect = memo(function FilterSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
});

const SkeletonRow = memo(function SkeletonRow({ columnCount }: { columnCount: number }) {
  return (
    <tr>
      {Array.from({ length: columnCount }).map((_, index) => (
        <td key={`skeleton-cell-${index}`}>
          <span className="skeleton-line" />
        </td>
      ))}
    </tr>
  );
});

export function DataTable<T extends Record<string, string | number>>({
  title,
  columns,
  data,
  filters = [],
  renderDetails,
  isLoading = false,
  emptyTitle = 'No results found',
  emptyDescription = 'Try adjusting your filters or check upstream sources.',
  getRowId,
  searchableKeys,
  searchPlaceholder = DEFAULT_SEARCH_PLACEHOLDER,
  pageSize = 8,
}: TableProps<T>) {
  const [selected, setSelected] = useState<T | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const [bootLoading, setBootLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => setBootLoading(false), 550);
    return () => window.clearTimeout(timer);
  }, []);

  const tableLoading = isLoading || bootLoading;
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const normalizedSearch = deferredSearchTerm.trim().toLowerCase();
  const effectiveSearchKeys = searchableKeys ?? columns.map((column) => column.key);

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const filterMatch = filters.every((filter) => {
        const activeValue = selectedFilters[String(filter.key)];
        if (!activeValue || activeValue === 'all') {
          return true;
        }
        return String(row[filter.key]) === activeValue;
      });

      if (!filterMatch) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return effectiveSearchKeys.some((key) =>
        String(row[key]).toLowerCase().includes(normalizedSearch)
      );
    });
  }, [data, effectiveSearchKeys, filters, normalizedSearch, selectedFilters]);

  useEffect(() => {
    setPage(1);
  }, [normalizedSearch, selectedFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const startIndex = (pageSafe - 1) * pageSize;
  const visibleRows = useMemo(
    () => filteredData.slice(startIndex, startIndex + pageSize),
    [filteredData, startIndex, pageSize]
  );

  return (
    <section className="panel table-panel">
      <div className="panel-header">
        <h3>{title}</h3>
        <p>{filteredData.length} records</p>
      </div>

      {(filters.length > 0 || columns.length > 0) && (
        <div className="filters-row">
          <label>
            Search
            <input
              value={searchTerm}
              placeholder={searchPlaceholder}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          {filters.map((filter) => (
            <FilterSelect
              key={String(filter.key)}
              label={filter.label}
              options={filter.options}
              value={selectedFilters[String(filter.key)] ?? 'all'}
              onChange={(nextValue) =>
                setSelectedFilters((prev) => ({
                  ...prev,
                  [String(filter.key)]: nextValue,
                }))
              }
            />
          ))}
        </div>
      )}

      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableLoading &&
            Array.from({ length: 5 }).map((_, idx) => (
              <SkeletonRow key={`skeleton-${idx}`} columnCount={columns.length} />
            ))}

          {!tableLoading &&
            visibleRows.map((row, index) => (
              <tr
                key={getRowId ? getRowId(row, startIndex + index) : `${title}-${startIndex + index}`}
                onClick={() => setSelected(row)}
                className="data-row"
              >
                {columns.map((column) => (
                  <td key={String(column.key)}>{String(row[column.key])}</td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>

      {!tableLoading && filteredData.length > pageSize && (
        <div className="table-footer">
          <p>
            Showing {startIndex + 1}-{Math.min(startIndex + pageSize, filteredData.length)} of{' '}
            {filteredData.length}
          </p>
          <div className="pager">
            <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
              Previous
            </button>
            <span>
              Page {pageSafe} / {totalPages}
            </span>
            <button type="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
              Next
            </button>
          </div>
        </div>
      )}

      {!tableLoading && filteredData.length === 0 && (
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden>
            ◎
          </span>
          <h4>{emptyTitle}</h4>
          <p>{emptyDescription}</p>
        </div>
      )}

      {selected && (
        <aside className="drawer" role="dialog">
          <div className="drawer-header">
            <h4>Record Details</h4>
            <button type="button" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <div className="drawer-content">{renderDetails(selected)}</div>
        </aside>
      )}
    </section>
  );
}
