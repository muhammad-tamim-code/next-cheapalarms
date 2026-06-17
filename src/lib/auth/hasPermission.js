/**
 * Check a product permission from auth context (from GET /ca/v1/auth/me).
 */
export function hasPermission(authContext, permission) {
  if (!authContext?.permissions || !permission) {
    return false;
  }
  return authContext.permissions.includes(permission);
}

export function isOwner(authContext) {
  return authContext?.roleKey === "owner";
}
