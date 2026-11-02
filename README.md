# GPS PowerX — Postcode-Powered Energy Infrastructure

*Powering Every Building, Precisely.*

GPS PowerX gives distributed energy assets (solar, inverters, batteries, hybrid systems) a digital identity tied to Nigeria's Digital Postcode, so building-level energy infrastructure is easier to locate, monitor, maintain and scale.

```
Digital Postcode → Building ID → Energy Asset → Monitoring → Maintenance → Intelligence
```

## Run it

Requires Node 18+.

```bash
npm install
npm run dev          # API on :8787, app on http://localhost:5173
```

Production-style (single process, easy to deploy to Render/Railway/Fly):

```bash
npm run build
npm start            # serves the built app + API on http://localhost:8787
```

## Project structure

```
server/
  index.js            Express routes (state, postcode, buildings, assets, requests, demo controls)
  postcodeService.js  API service layer for the NIPOST Digital Postcode API (+ demo/fallback logic)
  seed.js             FICTIONAL test postcodes, 9 seeded buildings/assets, technicians, demo scenario
  telemetry.js        SIMULATED sensor model (no IoT hardware)
  analytics.js        Transparent rule-based health/priority/deployment logic (not ML)
  store.js            JSON-file store (server/data/db.json, auto-created, no database needed)
src/
  App.jsx             Shell, hash routing, polling, mode banner
  useRegistration.js  Registration wizard state (shared by manual flow and Pitch Demo)
  components/         PitchDemo, Pipeline, MapView (Leaflet), shared UI
  pages/              Overview, Register, MapPage, Assets, AssetDetail, Service, Insights
```

## Environment variables

Copy `.env.example` to `.env`. Nothing is hard-coded, and the API key is only ever used on the server.

| Variable | Purpose |
|---|---|
| `POSTCODE_API_BASE_URL` | Base URL of the official NIPOST Digital Postcode API |
| `POSTCODE_API_KEY` | API key (server-side only) |
| `POSTCODE_API_LOOKUP_PATH` | Lookup path, `{code}` is replaced by the postcode. Default `/postcode/{code}` |
| `POSTCODE_API_KEY_HEADER` / `POSTCODE_API_KEY_SCHEME` | Default `Authorization` / `Bearer`. For `x-api-key` style: header `x-api-key`, scheme empty |
| `POSTCODE_API_TIMEOUT_MS` | Default 8000 |
| `DEMO_MODE` | `true` forces DEMO MODE even if credentials exist |
| `PITCH_FALLBACK` | Default `true`: if the live API fails and the postcode is a built-in test code, show TEST data with a visible warning |
| `PORT` | Default 8787 |

## Demo mode vs live

- **DEMO MODE** is automatic when `POSTCODE_API_BASE_URL` / `POSTCODE_API_KEY` are empty, or forced with `DEMO_MODE=true`. A banner reads "DEMO MODE — Using test postcode data", and every building shows a DEMO badge.
- **Live** mode is used when both credentials are set. Building profiles then show a "LIVE · NIPOST API" badge.
- If the live call fails, a test postcode shows as "TEST DATA · live API unavailable" with a warning. Unknown postcodes show an error. Test data is never labelled live.
- The built-in postcodes (e.g. `LG5-7TQ-2M9`) are **fictional test codes, not issued by NIPOST**.

### Connecting the real API

1. Put the base URL and key in `.env`.
2. Check the official docs for the endpoint path, auth header and response shape. Adjust `POSTCODE_API_LOOKUP_PATH` and the header variables to match.
3. If the response fields differ from what `mapLive()` in `server/postcodeService.js` expects, edit that one function. It already accepts several common names (`state`, `lga`/`localGovernmentArea`, `latitude`/`lat`, `formattedAddress`/`address`, nested `location`).
4. Restart and look up a real postcode. Check that the badge says LIVE.

The endpoint path, auth scheme and field names were **not verified against the official documentation** (it was not available while building). Treat step 2–3 as required work.

## What is simulated (and labelled as such)

- Sensor readings and the output chart come from a deterministic model, with no IoT hardware connected. It uses a simulated midday, so generation is visible at any time of day.
- "AI Insights" are fixed threshold rules (listed in the app under *How these insights are calculated*). There is no trained model.

## Pitch Demo (3 minutes)

Click **Start Pitch Demo** (sidebar, mobile banner, or Overview hero). A guide panel gives the line to say and what appears on screen; each button performs the real action.

| Time | Click | Show on screen |
|---|---|---|
| 0:00 | **Reset data & begin** | Overview: hero, six-step chain, 9 buildings, map, "Why it matters" |
| 0:20 | **Look up postcode** | Register page resolves `LG5-7TQ-2M9` |
| 0:40 | **Register building** | Building profile: address, State, LGA, GPS, new Building ID, DEMO badge |
| 1:00 | **Register energy asset** | Hybrid system registered; chain postcode → building → asset |
| 1:20 | **Show on map** | Map zooms to the new marker; side panel shows building + energy info |
| 1:40 | **Open monitoring** | Asset page: health 100, simulated sensors, expected vs actual chart |
| 2:00 | **Simulate abnormal performance** | Status Degraded / High priority, alert banner, health score drops |
| 2:20 | **Create maintenance request** | Technician mode: request with postcode, location, technician assigned |
| 2:40 | **Show insights** | Priority queue, anomalies, deployment opportunities |

Re-run any time: the first step resets data.

## Known limitations

- NIPOST API endpoint, auth and field mapping unverified (see above).
- All telemetry is simulated; no real device integration.
- Insights are rule-based, not machine learning.
- Storage is a local JSON file: fine for a demo, resets on ephemeral hosts, and not for multi-user production. No authentication or roles.
- Map tiles come from OpenStreetMap and need internet. Markers still work offline, on a blank background.
- Bundle is ~766 KB (charts + map). Fine for a demo.
