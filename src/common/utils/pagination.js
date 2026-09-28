export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 50
};

export function getPagination(query) {
  const page = Math.max(parseInt(query.page) || PAGINATION.DEFAULT_PAGE, 1);

  const limit = Math.min(
    parseInt(query.limit) || PAGINATION.DEFAULT_LIMIT,
    PAGINATION.MAX_LIMIT
  );

  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
    search: query.search?.trim() || null
  };
}
