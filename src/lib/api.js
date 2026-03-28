const TOKEN_KEY = 'studyflow_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function api(path, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  const body = options.body;
  if (body != null && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`/api${path}`, {
    ...options,
    headers,
    body: body != null && typeof body === 'object' && !(body instanceof FormData) ? JSON.stringify(body) : body,
  });
  if (res.status === 204) {
    return null;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || res.statusText);
    err.status = res.status;
    throw err;
  }
  return data;
}
