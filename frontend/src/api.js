const BASE = "/api/v1";
let accessToken = null; // lives in memory only, never localStorage
let refreshPromise = null;

export function setToken(token) {
  accessToken = token;
}

// turns a backend error into one readable sentence
export function errorText(err) {
  const fe = err.fieldErrors;
  if (fe && typeof fe === "object") {
    const list = Array.isArray(fe)
      ? fe.map((f) => f.message || String(f))
      : Object.values(fe);
    if (list.length > 0) return list.join(". ");
  }
  return err.message;
}

function send(path, options) {
  return fetch(BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: "Bearer " + accessToken } : {}),
      ...options.headers,
    },
  });
}

// when many calls fail at once, only ONE refresh call is made
function refreshOnce() {
  if (!refreshPromise) {
    refreshPromise = fetch(BASE + "/auth/refresh", { method: "POST" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Session expired");
        const data = await res.json();
        accessToken = data.accessToken;
        return data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function api(path, options = {}) {
  let res = await send(path, options);

  // token expired? refresh once, then retry the call one time
  if (res.status === 401 && !path.startsWith("/auth/")) {
    try {
      await refreshOnce();
      res = await send(path, options);
    } catch (err) {
      // refresh failed, we fall through with the 401
    }
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const err = new Error((data && data.message) || "Something went wrong");
    err.status = res.status;
    err.fieldErrors = data && data.fieldErrors;
    throw err;
  }
  return data;
}