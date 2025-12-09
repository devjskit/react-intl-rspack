import fs from "node:fs/promises";
import path from "node:path";
import { globSync } from "glob";

export type GenerateRootI18nFileOptions = {
  pattern: string | string[];
  cwd: string;
  output: string;
  debug: boolean;
  languages: string[];
};

type I18nEntry = {
  importVar: string;
  exportName: string;
  importPath: string;
};

function toPascalCase(raw: string): string {
  if (!raw) return "";

  let s = raw.trim();

  // Strip common suffixes
  s = s
    .replace(/\.i18n\.json$/i, "")
    .replace(/\.json$/i, "")
    .replace(/\.i18n$/i, "");

  // Remove leading "./" or "../"
  s = s.replace(/^(\.\/|\.\.\/)+/, "");

  // Remove non-alphanumeric prefix
  s = s.replace(/^[^a-zA-Z0-9]+/, "");

  const segments = s.match(/[a-zA-Z0-9]+/g);
  if (!segments) return "";

  return segments.map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1)).join("");
}

async function writeFileIfChanged(filePath: string, content: string): Promise<boolean> {
  try {
    const old = await fs.readFile(filePath, "utf8");
    if (old === content) {
      return false;
    }
  } catch {
    // File does not exist or cannot be read; treat as changed
  }

  await fs.writeFile(filePath, content, "utf8");
  return true;
}

function normalizePattern(pattern: string | string[]): string[] {
  return Array.isArray(pattern) ? pattern : [pattern];
}

function getI18nFiles(patterns: string[], cwd: string, outputRel: string): string[] {
  const globPatterns = [...patterns, `!${outputRel}`];
  return globSync(globPatterns, { cwd, nodir: true });
}

async function getPrefixFromJson(absFile: string, relFile: string, debug: boolean): Promise<string | undefined> {
  try {
    const jsonStr = await fs.readFile(absFile, "utf8");
    const data = JSON.parse(jsonStr);
    if (typeof data.$prefix === "string" && data.$prefix.trim()) {
      return data.$prefix.trim();
    }
  } catch (e) {
    if (debug) {
      console.warn(`[ReactIntlRspack] Failed to read/parse ${relFile} for $prefix:`, e);
    }
  }
  return undefined;
}

async function buildI18nEntries(files: string[], cwd: string, outputDirAbs: string, debug: boolean): Promise<I18nEntry[]> {
  const entries: I18nEntry[] = [];

  for (const relFile of files) {
    const absFile = path.join(cwd, relFile);

    const prefix = await getPrefixFromJson(absFile, relFile, debug);
    const baseName = prefix ?? path.basename(relFile);
    const varBase = toPascalCase(baseName);

    const importVar = `${varBase}Json`;
    const exportName = `${varBase}I18n`;

    const importPath = path
      .relative(outputDirAbs, absFile)
      .replace(/\\/g, "/")
      .replace(/^(?!\.)/, "./");

    entries.push({ importVar, exportName, importPath });
  }

  return entries;
}

function buildI18nTypeAndFactory(languages: string[]): string {
  const languageLines = languages.length > 0 ? languages.map((lang) => `  ${lang}?: Record<string, string>;`).join("\n") : "";

  const languageBlock = languageLines ? `\n${languageLines}` : "";

  return `
export type I18nProps = {
  $prefix: string;
  default: Record<string, string>;${languageBlock}
};

export interface MessageDescriptor {
  id: string;
  defaultMessage: string;
}

export interface Messages {
  messages: Record<string, MessageDescriptor>;
  keys: string[];
}

export const createMessages = (prefix: string,values: Record<string, string>): Messages => {
  const messages: Record<string, MessageDescriptor> = Object.entries(values).reduce(
    (acc, [key, value]) => {
      acc[key] = { id: \`\${prefix}.\${key}\`, defaultMessage: value };
      return acc;
    },
    {} as Record<string, MessageDescriptor>,
  );
  const keys = Object.keys(messages);
  return { messages, keys };
};

export function mergeLangs(...langs: Array<Record<string, Record<string, string>>>): Record<string, Record<string, string>> {
  const merged: Record<string, Record<string, string>> = {};
  for (const lang of langs) {
    for (const ns of Object.keys(lang)) {
      if (!merged[ns]) {
        merged[ns] = {};
      }
      Object.assign(merged[ns], lang[ns]);
    }
  }
  const sorted: Record<string, Record<string, string>> = {};
  for (const ns of Object.keys(merged).sort()) {
    const entries = merged[ns];
    const sortedEntries: Record<string, string> = {};
    for (const key of Object.keys(entries).sort()) {
      sortedEntries[key] = entries[key];
    }
    sorted[ns] = sortedEntries;
  }
  return sorted;
}

export const createI18n = (i18n: I18nProps) => {
  const { keys, messages } = createMessages(i18n.$prefix, i18n.default);
  return ({ name, ...props }: { name: string; values?: Record<string, any> }) => {
    return keys.includes(name) && <FormattedMessage {...defineMessages(messages)[name]} {...props} />;
  };
};
`.trimStart();
}

function buildImportsForEntries(entries: I18nEntry[]): string {
  if (entries.length === 0) return "";
  return entries.map((entry) => `import ${entry.importVar} from "${entry.importPath}";`).join("\n");
}

function buildExportsForEntries(entries: I18nEntry[]): string {
  if (entries.length === 0) return "";
  return entries.map((entry) => `export const ${entry.exportName} = createI18n(${entry.importVar});`).join("\n");
}

export async function generateRootI18nFile(options: GenerateRootI18nFileOptions) {
  const { pattern, cwd, output, debug, languages } = options;

  const outputAbs = path.join(cwd, output);
  const outputDirAbs = path.dirname(outputAbs);

  const patternList = normalizePattern(pattern);
  const outputRel = path.relative(cwd, outputAbs).replace(/\\/g, "/");

  const files = getI18nFiles(patternList, cwd, outputRel);

  let content: string;

  if (files.length === 0) {
    content = [`// Auto-generated by ReactIntlRspack: no i18n json files found.`, `export {};`, ``].join("\n");
  } else {
    const entries = await buildI18nEntries(files, cwd, outputDirAbs, debug);
    const header = [`import { defineMessages, FormattedMessage } from "react-intl";`].join("\n");
    const jsonImports = buildImportsForEntries(entries);
    const importsBlock = [header, jsonImports].filter(Boolean).join("\n");
    const typeAndFactory = buildI18nTypeAndFactory(languages);
    const exportsBlock = buildExportsForEntries(entries);
    const blocks = [importsBlock, typeAndFactory, exportsBlock].map((b) => b.trim()).filter(Boolean);
    content = blocks.join("\n\n") + "\n";
  }

  await fs.mkdir(outputDirAbs, { recursive: true });

  const changed = await writeFileIfChanged(outputAbs, content);

  if (debug) {
    console.log(`[ReactIntlRspack] Generated i18n root file: ${path.relative(cwd, outputAbs)} (changed: ${changed})`);
  }
}
