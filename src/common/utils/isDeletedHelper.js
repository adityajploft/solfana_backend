export function activeOnly(where = {}) {
  return {
    ...where,
    deletedAt: null,
  };
}
