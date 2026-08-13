import { mkdir, writeFile } from "node:fs/promises";

await mkdir(new URL("../dist", import.meta.url), { recursive: true });
await writeFile(
  new URL("../dist/index.html", import.meta.url),
  "<!doctype html><html lang=\"ko\"><meta charset=\"utf-8\"><title>ChoiceFlow</title><body>ChoiceFlow</body></html>",
  "utf8",
);
