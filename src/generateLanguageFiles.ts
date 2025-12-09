import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { glob } from "glob";

type Locale = string;
type Messages = Record<string, string>;
type LangsMap = Record<Locale, Messages>;

async function getMatchingFiles(pattern: string, cwd: string, debug?: boolean): Promise<string[]> {
  try {
    const files = await glob(pattern, { nodir: true, cwd });

    if (debug) {
      console.log(`[i18n] matched ${files.length} file(s) with pattern "${pattern}" from "${cwd}"`);
      if (files.length > 0) {
        console.log("[i18n] files:", files);
      }
    }

    return files;
  } catch (err) {
    console.error("[i18n] Error fetching i18n files:", err);
    return [];
  }
}

const createLangs = (prefix: string, values: LangsMap): LangsMap => {
  return Object.keys(values).reduce<LangsMap>((acc, lang) => {
    const source = values[lang] || {};
    const prefixed: Messages = {};

    for (const [key, value] of Object.entries(source)) {
      prefixed[`${prefix}.${key}`] = value;
    }

    acc[lang] = prefixed;
    return acc;
  }, {});
};

const removePrefix = <T extends Record<string, any>>(obj: T): Omit<T, "$prefix"> => {
  const { $prefix: _ignored, ...newObj } = obj;
  return newObj;
};

const removeDefault = <T extends Record<string, any>>(obj: T): Omit<T, "default"> => {
  const { default: _ignored, ...newObj } = obj;
  return newObj;
};

const mergeWithDefault = (values: LangsMap, languages: string[]): LangsMap => {
  const { default: defaultLang = {}, ...otherLangs } = values;
  const mergedLangs: LangsMap = {};

  for (const lang of languages) {
    mergedLangs[lang] = {
      ...(defaultLang as Messages),
      ...(otherLangs[lang] || {}),
    };
  }

  return mergedLangs;
};

const extractLangs = async (absFilePath: string, relFilePath: string, languages: string[], prefix?: string, debug?: boolean): Promise<LangsMap | null> => {
  try {
    const fileContent = await readFile(absFilePath, "utf-8");
    const jsonContent = JSON.parse(fileContent);

    const srcRelPath = relFilePath.replace(/^src[\\/]/, "");
    const middle = jsonContent?.$prefix ? jsonContent.$prefix : dirname(srcRelPath).replace(/\\/g, "/");

    const rawValues = jsonContent?.$prefix ? removePrefix(jsonContent) : jsonContent;
    const merged = mergeWithDefault(rawValues, languages);

    const prefixKey = prefix ? `${prefix}/${middle}` : middle;

    if (debug) {
      console.log(`[i18n] process file: ${relFilePath}`);
      console.log(`[i18n] namespace: ${prefixKey}`);
      console.log(`[i18n] locales: ${Object.keys(merged).join(", ")}`);
    }

    return createLangs(prefixKey, removeDefault(merged));
  } catch (err) {
    console.error(`[i18n] Error reading/processing file ${absFilePath}:`, err);
    return null;
  }
};

const mergeLangs = (...langs: LangsMap[]): LangsMap => {
  return langs.reduce<LangsMap>((acc, lang) => {
    for (const locale of Object.keys(lang)) {
      acc[locale] ??= {};
      Object.assign(acc[locale], lang[locale]);
    }
    return acc;
  }, {});
};

const sortObjectByKeys = (obj: LangsMap): LangsMap => {
  const sortedObj: LangsMap = {};

  for (const locale of Object.keys(obj).sort()) {
    const messages = obj[locale];
    const sortedMessages: Messages = {};

    for (const key of Object.keys(messages).sort()) {
      sortedMessages[key] = messages[key];
    }

    sortedObj[locale] = sortedMessages;
  }

  return sortedObj;
};

// ⭐ 核心：只有内容变化才写文件
async function writeJsonIfChanged(filePath: string, data: unknown, debug?: boolean): Promise<boolean> {
  const next = JSON.stringify(data, null, 2) + "\n";

  try {
    const old = await readFile(filePath, "utf-8");
    if (old === next) {
      if (debug) {
        console.log(`[i18n] ${filePath} unchanged, skip writing`);
      }
      return false;
    }
  } catch {
    // file does not exist or cannot be read; treat as changed
  }

  await writeFile(filePath, next, "utf-8");

  if (debug) {
    console.log(`[i18n] Wrote ${filePath}`);
  }

  return true;
}

export type GenerateLanguageFilesOptions = {
  cwd: string;
  pattern: string;
  outputDir: string;
  languages: string[];
  prefix?: string;
  debug?: boolean;
};

export const generateLanguageFiles = async (opts: GenerateLanguageFilesOptions) => {
  const { pattern, cwd, outputDir, languages, prefix, debug } = opts;

  const relFiles = await getMatchingFiles(pattern, cwd, debug);

  if (relFiles.length === 0) {
    if (debug) {
      console.warn(`[i18n] No i18n files matched pattern "${pattern}". Skip generating language files.`);
    }
    return;
  }

  const langsList: LangsMap[] = [];

  for (const relFile of relFiles) {
    const absFile = join(cwd, relFile);
    const langs = await extractLangs(absFile, relFile, languages, prefix, debug);
    if (langs) {
      langsList.push(langs);
    }
  }

  const mergedLangs = mergeLangs(...langsList);
  const sortedMergedLangs = sortObjectByKeys(mergedLangs);

  await mkdir(outputDir, { recursive: true });

  for (const lang of Object.keys(sortedMergedLangs)) {
    const filePath = join(outputDir, `${lang}.json`);
    await writeJsonIfChanged(filePath, sortedMergedLangs[lang], debug);
  }
};
