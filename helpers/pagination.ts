// Page parameters arrive as query strings, so everything here is parsed rather
// than trusted: a value that is not a positive whole number means "not
// supplied", never an error. A bad link shows the first page instead of a 400.
export interface PageQuery {
  page: number;
  limit: number;
  // False when neither parameter was sent, which keeps the unpaged payload
  // available until every client asks for pages.
  paginated: boolean;
}

export interface PageRange {
  page: number;
  pages: number;
  skip: number;
}

export const defaultLimit = 10;
export const maxLimit = 50;

const toCount = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value.trim());

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const readPageQuery = (query: unknown): PageQuery => {
  const source = (query ?? {}) as Record<string, unknown>;
  const limit = toCount(source.limit) ?? defaultLimit;

  return {
    page: toCount(source.page) ?? 1,
    limit: Math.min(limit, maxLimit),
    paginated: source.page !== undefined || source.limit !== undefined,
  };
};

export const countPages = (total: number, limit: number) =>
  limit > 0 ? Math.ceil(total / limit) : 0;

// An out-of-range page is clamped to the last one, so a stale link, or a page
// that lost its only row to a delete, still renders a full page rather than an
// empty one. An empty collection answers page 1 of 0 pages.
export const pageRange = (query: PageQuery, total: number): PageRange => {
  const pages = countPages(total, query.limit);
  const page = pages > 0 ? Math.min(Math.max(query.page, 1), pages) : 1;

  return { page, pages, skip: (page - 1) * query.limit };
};
