const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

function getToken() {
  return localStorage.getItem("fh_token");
}

export function setToken(token) {
  if (!token) localStorage.removeItem("fh_token");
  else localStorage.setItem("fh_token", token);
}

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message = data?.message || data?.error || "Request failed";
    throw new Error(message);
  }
  return data;
}

