/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "1" = call the Worker's /api (real ingested jobs). Unset: the bundled mock data answers (the default for now). */
  readonly VITE_USE_API?: string;
}
