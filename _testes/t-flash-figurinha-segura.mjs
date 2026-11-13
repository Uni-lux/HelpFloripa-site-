// Figurinhas do Flash com dados fora do formato (13/11/2026): as regras não conseguem conferir se os textos são texto
// (limite de 1.000 expressões), então o site desenha com segurança: figurinha estragada não aparece e nada quebra.
// Roda: FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node t-flash-figurinha-segura.mjs  (rode o seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const agora = Date.now(), ts = (m) => Timestamp.fromMillis(m);
const JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
for (const d of (await db.collection("stories").where("autorId", "==", U.bruno).get()).docs) await d.ref.delete();
// Estragado: pergunta número, opções objeto, caixa com pergunta lista, contagem com título mapa e posição absurda.
await db.doc("stories/fgRuim").set({ restrito: false, autorId: U.bruno, nome: "Bruno", tipo: "imagem", midia: JPEG, criadoEm: ts(agora - 7200e3),
  enquete: { pergunta: 123, opcoes: [{ a: 1 }, null], x: "meio", y: 99, fimEm: ts(agora + 3600e3) },
  caixa: { pergunta: ["x"], anonima: "talvez", x: 0.5, y: 0.4 },
  contagem: { titulo: { t: "x" }, fim: ts(agora + 864e5), x: 0.5, y: 0.2 } });
// Certo (depois do estragado): a enquete aparece normal, mesmo com a posição fora (vai para dentro do quadro).
await db.doc("stories/fgBom").set({ restrito: false, autorId: U.bruno, nome: "Bruno", tipo: "imagem", midia: JPEG, criadoEm: ts(agora - 3600e3),
  enquete: { pergunta: "Abre no sábado?", opcoes: ["Sim", "Não", 7], x: 5, y: -3, fimEm: ts(agora + 3600e3) } });

const A = await navegador({ mobile: true });
const erros = [];
const pa = await entrar(A.ctx, "ana", "feed.html?flash=fgRuim");
pa.on("pageerror", (x) => erros.push(x.message));
await pa.waitForSelector(".story-visor", { timeout: 25000 }).catch(() => {});
await pa.waitForTimeout(1500);
ok(await pa.locator(".story-visor").count() === 1, "o flash com figurinhas estragadas abre");
ok(await pa.locator(".story-visor .story-enq").count() === 0, "nenhuma figurinha estragada aparece (enquete, caixa, contagem)");
await pa.screenshot({ path: "saida/flash-figurinha-ruim.png" });
await pa.goto(new URL("feed.html?flash=fgBom", pa.url()).href);
await pa.waitForSelector(".story-visor .story-enq", { timeout: 25000 }).catch(() => {});
const txt = await pa.locator(".story-visor .story-enq").first().textContent().catch(() => "");
ok(/Abre no sábado/.test(txt) && /Sim/.test(txt) && !/\b7\b/.test(txt), "enquete certa aparece (a opção que não é texto sai): " + txt.replace(/\s+/g, " ").slice(0, 80));
const caixa = await pa.locator(".story-visor .story-enq").first().boundingBox();
const quadro = await pa.locator(".story-visor .story-quadro").first().boundingBox();
ok(caixa && quadro && caixa.x >= quadro.x - 2 && caixa.x + caixa.width <= quadro.x + quadro.width + 2, "posição fora do quadro volta para dentro");
ok(!erros.length, "sem erros na página: " + erros.join(" | "));
await A.browser.close();
for (const id of ["fgRuim", "fgBom"]) await db.doc(`stories/${id}`).delete();
console.log(process.exitCode ? "Falhou" : "Tudo certo");
