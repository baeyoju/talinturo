const API_ROOT = "/api";

let pendingRequests = 0;
const loadingListeners = new Set();

function notifyLoadingListeners() {
  loadingListeners.forEach((listener) => listener());
}

export function subscribeToApiLoading(listener) {
  loadingListeners.add(listener);
  return () => loadingListeners.delete(listener);
}

export function getPendingApiRequests() {
  return pendingRequests;
}

export async function api(path, options = {}) {
  pendingRequests += 1;
  notifyLoadingListeners();

  try {
    const response = await fetch(`${API_ROOT}${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const missingRecords = Array.isArray(payload.missing_data)
        ? payload.missing_data.map(({ table, records }) => `${table}: ${records}`).join(" ")
        : "";
      const message = payload.error || `Request failed (${response.status})`;
      throw new Error(missingRecords ? `${message} ${missingRecords}` : message);
    }
    return payload;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "Cannot reach the Flask API. Start the backend and check DATABASE_URL and PostgreSQL settings in the terminal running Flask.",
      );
    }
    throw error;
  } finally {
    pendingRequests -= 1;
    notifyLoadingListeners();
  }
}
