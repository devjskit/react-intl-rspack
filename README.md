# @devjskit/react-intl-rspack

@devjskit/react-intl-rspack is a Rspack plugin that automates internationalization workflow for React applications using `react-intl`.

It provides:

- 🔍 Automatic scanning of `*.i18n.json` and `i18n.json` files
- 🏗️ Auto-generation of per-language JSON files under `/langs`
- 🧩 Auto-generation of a single `i18n.gen.tsx` runtime entry file
- 🏷️ Consistent message ids based on `$prefix`, file location, and optional global `prefix`
- 🔄 Safe watch mode with no infinite rebuild loop  
- ⚛️ A built-in `createMessages` + `createI18n` factory for React/`react-intl`

This eliminates repetitive manual work and ensures a clean, maintainable i18n structure for any Rspack-based React project.

---

## ✨ Features

- File-based i18n architecture using `.i18n.json` and `i18n.json`
- Auto-generates a root i18n entry (`i18n.gen.tsx` by default)
- Supports multiple languages, including locale names like `en-US` and `zh-CN`
- Automatic merging and sorting of languages
- Safe incremental rebuilds — only rewrites files when content changes
- Flexible `$prefix` naming for component-level or module-level i18n groups
- Fully typed with generated TypeScript definitions

---

## 📦 Installation

```sh
npm install @devjskit/react-intl-rspack react-intl@^10
# or
yarn add @devjskit/react-intl-rspack react-intl@^10
# or
pnpm add @devjskit/react-intl-rspack react-intl@^10
```

`react-intl` is a required peer dependency. The supported range is `^7.0.0 || ^8.0.0 || ^10.0.0`; v10 is recommended for new projects. `@rsbuild/core` is an optional peer dependency and supports `^1.0.0 || ^2.0.0`.

---

## 🔧 Rspack Configuration

```ts
import { ReactIntlRspack } from "@devjskit/react-intl-rspack";

export default {
  plugins: [
    ReactIntlRspack({
      pattern: "src/**/*.i18n.json",
      languages: ["en-US", "zh-CN", "zh-HK"],
      destination: "langs",
      generatedI18nFile: "src/i18n.gen.tsx",
      prefix: "app",
      debug: false,
    }),
  ],
};
```

---

## 📝 Example `.i18n.json`

```json
{
  "$prefix": "Meta",
  "default": {
    "title": "Hello World",
    "description": "This is a test"
  },
  "zh-CN": {
    "title": "你好，世界"
  }
}
```

### Generated import/export name

``` tsx
MetaJson → MetaI18n
```

---

## 📁 Output Structure

``` tsx
src/
  i18n.gen.tsx
  app.i18n.json
  components/
    header/
      header.i18n.json
langs/
  en-US.json
  zh-CN.json
  zh-HK.json
```

---

## ⚙️ Auto-generated `i18n.gen.tsx`

The plugin generates:

- Utilities (`createMessages`, `mergeLangs`)
- `I18nProps` type (based on configured `languages`)
- A `createI18n` factory
- Exported `XXXI18n` functions for each `.i18n.json`

Example:

```ts
import MetaJson from "./meta.i18n.json";

export const MetaI18n = createI18n({ ...MetaJson, $prefix: "app/Meta" });
```

Usage:

```tsx
<MetaI18n name="title" />
```

The generated component renders a `FormattedMessage` whose id is built from `$prefix` and `name`. In the example above, `name="title"` resolves to `app/Meta.title`.

---

## 🧩 How It Works

### 1. Scan i18n files

Handles patterns like:

``` tsx
src/**/header.i18n.json
src/**/meta/info.i18n.json
src/**/i18n.json
```

### 2. Determine namespace and export name

Message ids use this namespace order:

- JSON `$prefix`, when present
- Otherwise the file directory under `src/`
- Optional global `prefix`, prepended with `/`

Examples:

``` tsx
src/app.i18n.json + name="title" → title
src/components/header/header.i18n.json + name="title" → components/header.title
{ "$prefix": "Meta" } + name="title" → Meta.title
prefix: "app" + { "$prefix": "Meta" } + name="title" → app/Meta.title
```

Export names use `$prefix` or the file name converted to PascalCase:

``` tsx
Meta → MetaI18n
header.i18n.json → HeaderI18n
```

### 3. Emit language files  

Created under:

``` tsx
langs/en-US.json
langs/zh-CN.json
langs/zh-HK.json
```

Each language file merges `default` messages with locale-specific overrides and sorts keys for deterministic output.

### 4. Generate `i18n.gen.tsx`

Includes imports, types, runtime factories, and module exports.

---

## 🛠 API

### `ReactIntlRspack(options)`

| Option | Type | Default | Description |
|--------|------|----------|-------------|
| `pattern` | `string | string[]` | `"src/**/{*.i18n.json,i18n.json}"` | Files to scan and watch |
| `languages` | `string[]` | `["en-US", "zh-CN"]` | Supported languages/locales |
| `destination` | `string` | `"langs"` | Folder for language outputs |
| `generatedI18nFile` | `string` | `"src/i18n.gen.tsx"` | Generated root file |
| `prefix` | `string` | `""` | Optional global namespace prefix |
| `debug` | `boolean` | `false` | Log debug output |

---

## 🧪 Component Usage Example

```tsx
import { MetaI18n } from "../i18n.gen";

export function Header() {
  return (
    <h1>
      <MetaI18n name="title" />
    </h1>
  );
}
```

---

## 🚀 Roadmap

- Type-safe key inference for `name`
- Optional async language loading
- CLI tool for one-time generation

---

## 🤝 Contributing

Pull requests are welcome!  
Please open an issue before making major changes.

---

## 📄 License

MIT © 2025 DevJSKit
