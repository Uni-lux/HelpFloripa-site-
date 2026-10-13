// Troca as regras do projeto demo-hf no emulador sem reiniciar (os dados continuam).
// Uso: node trocar-regras.mjs main   (firestore.rules do repositório, com tudo que ainda não foi publicado)
//      node trocar-regras.mjs pr25   (as regras que estão no ar: as do PR #25, commit 7f5a28c)
//      node trocar-regras.mjs caminho/arquivo.rules
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
const pr25 = new URL("saida/regras-pr25.rules", import.meta.url).pathname;
if (process.argv[2] === "pr25" && !existsSync(pr25)) {
  mkdirSync(new URL("saida/", import.meta.url), { recursive: true });
  writeFileSync(pr25, execSync("git show 7f5a28c:firestore.rules", { cwd: new URL("..", import.meta.url).pathname }));
}
const arq = process.argv[2] === "main" ? new URL("../firestore.rules", import.meta.url).pathname : process.argv[2] === "pr25" ? pr25 : process.argv[2];
const r = await fetch("http://127.0.0.1:8085/emulator/v1/projects/demo-hf:securityRules", { method: "PUT", body: JSON.stringify({ rules: { files: [{ name: "firestore.rules", content: readFileSync(arq, "utf8") }] } }) });
console.log("regras:", process.argv[2], r.status);
