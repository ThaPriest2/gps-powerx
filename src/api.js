// Frontend API client. All calls go to our own Express server; the postcode API key never reaches the browser.
async function request(path, options) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the GPS PowerX server. Is it running?');
  }
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    const err = new Error(json?.error || `Request failed (${res.status})`);
    err.data = json;
    err.status = res.status;
    throw err;
  }
  return json;
}

export const api = {
  config: () => request('/config'),
  state: () => request('/state'),
  lookup: (code) => request(`/postcode/${encodeURIComponent(code)}`),
  createBuilding: (postcode) => request('/buildings', { method: 'POST', body: { postcode } }),
  createAsset: (body) => request('/assets', { method: 'POST', body }),
  asset: (id) => request(`/assets/${encodeURIComponent(id)}`),
  createRequest: (body) => request('/requests', { method: 'POST', body }),
  updateRequest: (id, body) => request(`/requests/${id}`, { method: 'PATCH', body }),
  triggerAnomaly: (assetId) => request('/demo/anomaly', { method: 'POST', body: { assetId } }),
  resetDemo: () => request('/demo/reset', { method: 'POST' }),
};
