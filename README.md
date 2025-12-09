# @devjskit/react-intl-rspack

@devjskit/react-intl-rspack is a Rspack plugin that automates internationalization workflow for React applications using `react-intl`.

It provides:

- 🔍 Automatic scanning of `*.i18n.json` files  
- 🏗️ Auto-generation of per-language JSON files under `/langs`
- 🧩 Auto-generation of a single `i18n.gen.ts` runtime entry file  
- 🏷️ Consistent naming based on `$prefix` or filename  
- 🔄 Safe watch mode with no infinite rebuild loop  
- ⚛️ A built-in `createMessages` + `createI18n` factory for React/`react-intl`

This eliminates repetitive manual work and ensures a clean, maintainable i18n structure for any Rspack-based React project.

---

## ✨ Features

- File-based i18n architecture using `.i18n.json`
- Auto-generates a root i18n entry (`i18n.gen.ts`)
- Supports multiple languages
- Automatic merging and sorting of languages
- Safe incremental rebuilds — only rewrites files when content changes
- Flexible `$prefix` naming for component-level or module-level i18n groups
- Fully typed with generated TypeScript definitions

---

## 📦 Installation

```sh
npm install @devjskit/react-intl-rspack
# or
yarn add @devjskit/react-intl-rspack
# or
pnpm add @devjskit/react-intl-rspack
```

---

## 🔧 Rspack Configuration

```ts
import { ReactIntlRspack } from "@devjskit/react-intl-rspack";

export default {
  plugins: [
    ReactIntlRspack({
      pattern: "src/**/*.i18n.json",
      languages: ["en", "zh", "hk"],
      destination: "langs",
      generatedI18nFile: "src/i18n.gen.ts",
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
  "title": "Hello World",
  "description": "This is a test"
}
```

### Generated import/export name:

``` tsx
MetaJson → MetaI18n
```

---

## 📁 Output Structure

``` tsx
src/
  i18n.gen.ts
  components/
    header/
      header.i18n.json
langs/
  en.json
  zh.json
  hk.json
```

---

## ⚙️ Auto-generated `i18n.gen.ts`

The plugin generates:

- Utilities (`createMessages`, `mergeLangs`)
- `I18nProps` type (based on configured `languages`)
- A `createI18n` factory
- Exported `XXXI18n` functions for each `.i18n.json`

Example:

```ts
import MetaJson from "./components/meta.i18n.json";

export const MetaI18n = createI18n(MetaJson);
```

Usage:

```tsx
<MetaI18n name="title" />
```

---

## 🧩 How It Works

### 1. Scan `.i18n.json` files  

Handles patterns like:

``` tsx
src/**/header.i18n.json
src/**/meta/info.i18n.json
```

### 2. Determine group name  

Using:

- `$prefix`
- filename fallback

Converted to PascalCase:

``` tsx
foo.bar → FooBar
header.i18n.json → Header
```

### 3. Emit language files  

Created under:

``` tsx
langs/en.json
langs/zh.json
langs/hk.json
```

### 4. Generate `i18n.gen.ts`  

Includes imports, types, runtime factories, and module exports.

---

## 🛠 API

### `ReactIntlRspack(options)`

| Option | Type | Default | Description |
|--------|------|----------|-------------|
| `pattern` | `string | string[]` | `"src/**/*.i18n.json"` | Files to watch |
| `languages` | `string[]` | `["en", "zh"]` | Supported languages |
| `destination` | `string` | `"langs"` | Folder for language outputs |
| `generatedI18nFile` | `string` | `"src/i18n.gen.ts"` | Generated root file |
| `prefix` | `string` | `""` | Optional prefix |
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
