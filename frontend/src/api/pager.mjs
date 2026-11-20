// Pure list helpers shared by the paged API lists and LearnerCorner.

// A poll re-fetches only the first page; keep any older pages the user already loaded with "Load more".
// Lists are newest first (ids descending), so anything older than the fresh page's last id is kept.
export function mergeFirstPage(current, page) {
  if (!page.length) return [];
  const fresh = new Set(page.map((d) => d.id));
  const oldest = page[page.length - 1].id;
  return [...page, ...current.filter((d) => !fresh.has(d.id) && d.id < oldest)];
}

// Appends an older page, skipping anything already shown (a new donation can shift the window).
export function appendPage(current, page) {
  const seen = new Set(current.map((d) => d.id));
  return [...current, ...page.filter((d) => !seen.has(d.id))];
}

// Client-side paging: page is 1-based and clamped into range.
export function paginate(items, page, perPage) {
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(Math.max(1, page), pages);
  return { items: items.slice((current - 1) * perPage, current * perPage), page: current, pages };
}
