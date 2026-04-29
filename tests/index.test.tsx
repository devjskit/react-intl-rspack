import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { generateLanguageFiles } from "../src/generateLanguageFiles";
import { generateRootI18nFile } from "../src/generateRootI18nFile";

async function createFixtureProject(): Promise<string> {
  const cwd = await mkdtemp(join(tmpdir(), "react-intl-rspack-"));

  await writeJson(cwd, "src/app.i18n.json", {
    default: {
      cta: "Go",
    },
  });

  await writeJson(cwd, "src/components/header/header.i18n.json", {
    default: {
      title: "Header",
      subtitle: "Welcome",
    },
    "zh-CN": {
      title: "Header zh",
    },
  });

  await writeJson(cwd, "src/meta.i18n.json", {
    $prefix: "Meta",
    default: {
      description: "Default description",
    },
    "zh-CN": {
      description: "Description zh",
    },
  });

  return cwd;
}

async function writeJson(cwd: string, relPath: string, data: unknown): Promise<void> {
  const absPath = join(cwd, relPath);
  await mkdir(dirname(absPath), { recursive: true });
  await writeFile(absPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function readText(cwd: string, relPath: string): Promise<string> {
  return readFile(join(cwd, relPath), "utf8");
}

test("generates deterministic language files with defaults, overrides, and shared namespaces", async () => {
  const cwd = await createFixtureProject();

  try {
    await generateLanguageFiles({
      cwd,
      pattern: "src/**/*.i18n.json",
      outputDir: join(cwd, "langs"),
      languages: ["zh-CN", "en-US"],
      prefix: "app",
      debug: false,
    });

    expect(await readText(cwd, "langs/en-US.json")).toBe(
      `${JSON.stringify(
        {
          "app.cta": "Go",
          "app/Meta.description": "Default description",
          "app/components/header.subtitle": "Welcome",
          "app/components/header.title": "Header",
        },
        null,
        2,
      )}\n`,
    );

    expect(await readText(cwd, "langs/zh-CN.json")).toBe(
      `${JSON.stringify(
        {
          "app.cta": "Go",
          "app/Meta.description": "Description zh",
          "app/components/header.subtitle": "Welcome",
          "app/components/header.title": "Header zh",
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("generates a root i18n module whose message ids match language file namespaces", async () => {
  const cwd = await createFixtureProject();

  try {
    await generateRootI18nFile({
      cwd,
      pattern: ["src/**/*.i18n.json"],
      output: "src/i18n.gen.tsx",
      languages: ["en-US", "zh-CN"],
      prefix: "app",
      debug: false,
    });

    const content = await readText(cwd, "src/i18n.gen.tsx");

    expect(content).toContain(`  "en-US"?: Record<string, string>;`);
    expect(content).toContain(`  "zh-CN"?: Record<string, string>;`);
    expect(content).toContain(`acc[key] = { id: prefix ? \`\${prefix}.\${key}\` : key, defaultMessage: value };`);
    expect(content).toContain(`import AppJson from "./app.i18n.json";`);
    expect(content).toContain(`import HeaderJson from "./components/header/header.i18n.json";`);
    expect(content).toContain(`import MetaJson from "./meta.i18n.json";`);
    expect(content).toContain(`export const AppI18n = createI18n({ ...AppJson, $prefix: "app" });`);
    expect(content).toContain(`export const HeaderI18n = createI18n({ ...HeaderJson, $prefix: "app/components/header" });`);
    expect(content).toContain(`export const MetaI18n = createI18n({ ...MetaJson, $prefix: "app/Meta" });`);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("does not add a leading dot to ids for top-level i18n files without a prefix", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "react-intl-rspack-"));

  try {
    await writeJson(cwd, "src/app.i18n.json", {
      default: {
        title: "App",
      },
    });

    await generateLanguageFiles({
      cwd,
      pattern: "src/**/*.i18n.json",
      outputDir: join(cwd, "langs"),
      languages: ["en-US"],
      debug: false,
    });

    await generateRootI18nFile({
      cwd,
      pattern: "src/**/*.i18n.json",
      output: "src/i18n.gen.tsx",
      languages: ["en-US"],
      debug: false,
    });

    expect(await readText(cwd, "langs/en-US.json")).toBe(
      `${JSON.stringify(
        {
          title: "App",
        },
        null,
        2,
      )}\n`,
    );

    expect(await readText(cwd, "src/i18n.gen.tsx")).toContain(`export const AppI18n = createI18n({ ...AppJson, $prefix: "" });`);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
