import { dirname } from "node:path";

export type GlobPattern = string | string[];

export function normalizePattern(pattern: GlobPattern): string[] {
  return Array.isArray(pattern) ? pattern : [pattern];
}

function normalizeNamespacePart(part?: string): string {
  return (part ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

export function getLocalNamespace(relFilePath: string, jsonPrefix?: unknown): string {
  if (typeof jsonPrefix === "string" && jsonPrefix.trim()) {
    return normalizeNamespacePart(jsonPrefix);
  }

  const srcRelPath = relFilePath.replace(/^src[\\/]/, "");
  const dir = dirname(srcRelPath).replace(/\\/g, "/");
  return dir === "." ? "" : normalizeNamespacePart(dir);
}

export function joinNamespace(globalPrefix: string | undefined, localNamespace: string): string {
  const cleanGlobal = normalizeNamespacePart(globalPrefix);
  const cleanLocal = normalizeNamespacePart(localNamespace);

  if (cleanGlobal && cleanLocal) {
    return `${cleanGlobal}/${cleanLocal}`;
  }

  return cleanGlobal || cleanLocal;
}

export function getMessageId(namespace: string, key: string): string {
  return namespace ? `${namespace}.${key}` : key;
}
