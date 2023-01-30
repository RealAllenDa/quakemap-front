/// <reference types="vite/client" />

declare const VITE_RELEASE: string;

interface ImportMetaEnv {}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
