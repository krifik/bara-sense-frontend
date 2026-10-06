/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
  readonly VITE_APP_TAGLINE?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_WS_URL?: string
  readonly VITE_DEFAULT_TARIFF?: string
  readonly VITE_DEFAULT_HISTORY_DAYS?: string
  readonly VITE_POLL_INTERVAL_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
