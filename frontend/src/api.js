const TOKEN_KEY = "stockflow_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

function errorMessage(data, status) {
  if (!data) return `Request failed (${status})`;
  const d = data.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    return d
      .map((e) => `${(e.loc || []).slice(1).join(".") || "field"}: ${(e.msg || "").replace(/^Value error, /, "")}`)
      .join("; ");
  }
  return `Request failed (${status})`;
}

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return null;
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) {
    if (res.status === 401 && token) {
      clearToken();
      window.dispatchEvent(new Event("stockflow:logout"));
    }
    throw new Error(errorMessage(data, res.status));
  }
  return data;
}

export const api = {
  signup: (b) => request("POST", "/auth/signup", b),
  login: (b) => request("POST", "/auth/login", b),
  me: () => request("GET", "/auth/me"),
  dashboard: () => request("GET", "/dashboard"),
  listProducts: (q) => request("GET", `/products${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  getProduct: (id) => request("GET", `/products/${id}`),
  createProduct: (b) => request("POST", "/products", b),
  updateProduct: (id, b) => request("PUT", `/products/${id}`, b),
  deleteProduct: (id) => request("DELETE", `/products/${id}`),
  adjustStock: (id, b) => request("POST", `/products/${id}/adjust`, b),
  getSettings: () => request("GET", "/settings"),
  updateSettings: (b) => request("PUT", "/settings", b),
};
