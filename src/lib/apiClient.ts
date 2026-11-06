// Browser-side fetch for the protected /api/admin and /api/partner routes.
// A 401 means the session cookie is missing or expired, so the user is sent back to the login page.
type Area = 'admin' | 'partner'

// Full page load (not router.push) so no protected data stays in React state after logout/expiry.
const goToLogin = (area: Area) => window.location.replace(new URL(`/${area}/login`, window.location.origin).href)

export type ApiResult<T> = { ok: boolean; status: number; data: (T & { error?: string }) | null }

export async function callApi<T = Record<string, unknown>>(
  area: Area,
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: unknown,
): Promise<ApiResult<T>> {
  const res = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  }).catch(() => null)

  if (res?.status === 401) {
    localStorage.removeItem(area)
    goToLogin(area)
  }
  const data = (await res?.json().catch(() => null)) as (T & { error?: string }) | null
  return { ok: !!res?.ok, status: res?.status ?? 0, data }
}

export async function logout(area: Area) {
  await fetch(`/api/${area}/logout`, { method: 'POST' }).catch(() => null)
  localStorage.removeItem(area)
  goToLogin(area)
}
