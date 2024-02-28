import { ensureDirSync } from "fs-extra";
import { fileURLToPath, URL } from "node:url";
import { copyFile, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { generateFolderHtml } from "./genFolder.js";
import { FileCoverageResult } from "../../interface.js";
import { generateCodeHtml } from "./genCode.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const resourceFiles = [
  "resource/base.css",
  "resource/block-navigation.js",
  "resource/prettify.css",
  "resource/prettify.js",
  "resource/sort-arrow-sprite.png",
  "resource/sorter.js",
];

export function genHtml(target: string, filesInfos: FileCoverageResult[]) {
  const resourceFolder = join(target, "resource");
  ensureDirSync(resourceFolder);
  for (const file of resourceFiles) {
    copyFile(join(__dirname, file), join(resourceFolder, basename(file)), () => {
      return;
    });
  }
  const html = generateFolderHtml(".", filesInfos);
  writeFileSync(join(target, "index.html"), html);
  for (const filesInfo of filesInfos) {
    const htmlpath = join(target, filesInfo.filename + ".html");
    const relativePath = relative(dirname(htmlpath), target);
    const html = generateCodeHtml(relativePath, filesInfo);
    ensureDirSync(dirname(htmlpath));
    writeFileSync(htmlpath, html);
  }
}
