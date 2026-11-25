/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DISPATCH_CONTACT_URL?: string;
  readonly DEV?: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
