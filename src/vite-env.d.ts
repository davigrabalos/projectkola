/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "1" = answer API calls from the bundled fixtures (offline work, e2e tests). */
  readonly VITE_USE_MOCK?: string;
}
