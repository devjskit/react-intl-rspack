import path from "node:path";
import type { Compiler } from "@rspack/core";
import { globSync } from "glob";
import { generateLanguageFiles } from "./gen-files-core";
import { generateRootI18nFile } from "./gen-i18n-file";

export type ReactIntlRspackOptions = {
  pattern?: string;
  destination?: string;
  languages?: string[];
  prefix?: string;
  debug?: boolean;
  generatedI18nFile?: string;
};

export function ReactIntlRspack(userOptions: ReactIntlRspackOptions = {}) {
  const pluginName = "ReactIntlRspack";

  const options = {
    pattern: userOptions.pattern ?? "src/**/{*.i18n.json,i18n.json}",
    destination: userOptions.destination ?? "langs",
    languages: userOptions.languages ?? ["en", "zh"],
    prefix: userOptions.prefix ?? "",
    debug: userOptions.debug ?? false,
    generatedI18nFile: userOptions.generatedI18nFile ?? "src/i18n.gen.tsx",
  };

  return {
    name: pluginName,

    apply(compiler: Compiler) {
      const context = compiler.options.context || process.cwd();
      const outputDir = path.join(context, options.destination);

      const runGenerate = async () => {
        await generateLanguageFiles({
          pattern: options.pattern,
          cwd: context,
          outputDir,
          languages: options.languages,
          prefix: options.prefix,
          debug: options.debug,
        });
        await generateRootI18nFile({
          pattern: options.pattern,
          cwd: context,
          languages: options.languages,
          output: options.generatedI18nFile,
          debug: options.debug,
        });
      };

      compiler.hooks.beforeCompile.tapPromise(pluginName, async () => {
        await runGenerate();
      });

      compiler.hooks.afterCompile.tap(pluginName, (compilation) => {
        const files = globSync(options.pattern, {
          cwd: context,
          nodir: true,
        });

        for (const relFile of files) {
          const absFile = path.join(context, relFile);
          compilation.fileDependencies.add(absFile);
        }

        // const treeFileAbs = path.join(context, options.treeFile);
        // compilation.fileDependencies.add(treeFileAbs);
      });
    },
  };
}
