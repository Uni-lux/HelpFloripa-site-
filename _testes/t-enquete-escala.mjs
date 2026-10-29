// Enquete aguentando muita gente: contagem em 10 pedaços (enquete_contas/{alvo}_{fatia}) e leitura só quando o
// resultado vai aparecer. Mede pelo proxy-contador.mjs (8086): quem passa ou vota não lê a contagem (o resultado sai
// no fim); no fim lê no máximo 10 pedaços uma vez e guarda de vez; a autora vê os números o tempo todo.
// Uso: FS_PORTA=8086 node t-enquete-escala.mjs   (emulador + servidor-csp + proxy-contador + seed)
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
if (process.env.FS_PORTA !== "8086") { console.error("Rode com FS_PORTA=8086 (medidor de leituras)."); process.exit(1); }
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const contador = (c) => fetch("http://127.0.0.1:8086/__" + c).then((r) => (c === "contagem" ? r.json() : r.text()));

// Enquete da Ana com 1.240 votos já espalhados nos 10 pedaços (Sim 930 · Não 310).
const id = "pEscala", alvo = `d_${id}`;
await db.doc(`diario/${id}`).set({ autorId: U.ana, nome: "Ana Souza", texto: "Enquete grande", enquete: { pergunta: "Abre domingo?", opcoes: ["Sim", "Não"], fimEm: Timestamp.fromMillis(Date.now() + 5 * 3600e3) }, criadoEm: Timestamp.now() });
for (let f = 0; f < 10; f++) await db.doc(`enquete_contas/${alvo}_${f}`).set({ n0: 93, n1: 31 });
for (const q of ["edu", "bruno"]) await db.doc(`enquete_votos/${alvo}_${U[q]}`).delete().catch(() => {});

const B = await navegador({ mobile: true });
const pb = await entrar(B.ctx, "bruno", "sobre.html"); await pb.waitForTimeout(2500);
await contador("zerar");
await pb.goto(BASE + `usuarios.html?post=${id}`);
const enq = pb.locator(".visor-exp .enquete", { hasText: "Abre domingo?" }).first();
await enq.waitFor({ timeout: 30000 }); await enq.scrollIntoViewIfNeeded(); await pb.waitForTimeout(3000);
let c = await contador("contagem");
const contEnq = () => (c.contagensPor.enquete_votos || 0) + (c.contagensPor.enquete_contas || 0);
ok(!c.colecoes.enquete_contas && !contEnq(), `quem ainda não votou não lê a contagem (pedaços lidos: ${c.colecoes.enquete_contas || 0}, contagens de votos: ${contEnq()})`);
ok(!/voto/.test(await enq.locator(".enq-rodape").textContent()) || /toque para votar/.test(await enq.locator(".enq-rodape").textContent()), "antes de votar: só as opções, sem número de votos");
await contador("zerar");
await pb.waitForFunction(() => /toque para votar/.test(document.querySelector(".visor-exp .enquete .enq-rodape")?.textContent || ""), null, { timeout: 15000 }).catch(() => {});
await enq.locator(".enq-op", { hasText: "Não" }).tap();
await pb.waitForFunction(() => /votos/.test(document.querySelector(".visor-exp .enquete .enq-rodape")?.textContent || ""), null, { timeout: 15000 }).catch(() => {});
c = await contador("contagem");
const v = (await db.doc(`enquete_votos/${alvo}_${U.bruno}`).get()).data();
let soma = [0, 0];
for (let f = 0; f < 10; f++) { const x = (await db.doc(`enquete_contas/${alvo}_${f}`).get()).data() || {}; soma[0] += x.n0 || 0; soma[1] += x.n1 || 0; }
ok(Number.isInteger(v?.fatia) && soma[1] === 311 && soma[0] === 930, `voto foi com a fatia ${v?.fatia} e o pedaço subiu (Não: 311)`);
ok(!c.colecoes.enquete_contas && !contEnq(), `depois de votar não lê a contagem (pedaços lidos: ${c.colecoes.enquete_contas || 0}, contagens de votos: ${contEnq()})`);
const rod = await enq.locator(".enq-rodape").textContent();
ok(/Voto registrado · resultado em/.test(rod) && (await enq.locator(".enq-pct").count()) === 0 && (await enq.locator(".enq-op.minha", { hasText: "Não" }).count()) === 1, `depois de votar: escolha marcada, sem %: "${rod.trim()}"`);
await enq.screenshot({ path: "saida/enquete-votou-espera.png" });
// A enquete termina: quem votou abre e vê o resultado final (lido 1 vez, ≤10 pedaços) e depois guardado de vez.
await db.doc(`diario/${id}`).update({ "enquete.fimEm": Timestamp.fromMillis(Date.now() - 60000) });
await contador("zerar");
await pb.goto(BASE + "sobre.html"); await pb.goto(BASE + `usuarios.html?post=${id}`);
const fimE = pb.locator(".visor-exp .enquete", { hasText: "Abre domingo?" }).first();
await fimE.waitFor({ timeout: 30000 }); await fimE.scrollIntoViewIfNeeded();
await pb.waitForFunction(() => /Resultado final/.test(document.querySelector(".visor-exp .enquete .enq-rodape")?.textContent || ""), null, { timeout: 15000 }).catch(() => {});
c = await contador("contagem");
const rodF = await fimE.locator(".enq-rodape").textContent(), pcts = await fimE.locator(".enq-pct").allTextContents();
ok(/Resultado final · 1\.241 votos/.test(rodF) && pcts.join(",") === "75%,25%" && (c.colecoes.enquete_contas || 0) <= 10 && !contEnq(), `no fim: "${rodF.trim()}" · ${pcts.join(" / ")} (${c.colecoes.enquete_contas || 0} pedaços lidos)`);
await fimE.screenshot({ path: "saida/enquete-escala.png" });
await contador("zerar");
await pb.goto(BASE + "sobre.html"); await pb.goto(BASE + `usuarios.html?post=${id}`);
await pb.locator(".visor-exp .enquete", { hasText: "Abre domingo?" }).first().waitFor({ timeout: 30000 }); await pb.waitForTimeout(3000);
c = await contador("contagem");
ok(!c.colecoes.enquete_contas, `reabrir a enquete encerrada usa o resultado guardado de vez (pedaços lidos: ${c.colecoes.enquete_contas || 0})`);
// volta a ficar aberta para a parte da autora
await db.doc(`diario/${id}`).update({ "enquete.fimEm": Timestamp.fromMillis(Date.now() + 5 * 3600e3) });
await B.browser.close();

// Autora: vê os números sem votar; "Ver votos" usa a contagem (mostra que a lista tem só os mais recentes).
const A = await navegador({ mobile: true });
const pa = await entrar(A.ctx, "ana", `usuarios.html?post=${id}`);
const ea = pa.locator(".visor-exp .enquete", { hasText: "Abre domingo?" }).last();
await ea.waitFor({ timeout: 30000 }); await ea.scrollIntoViewIfNeeded();
await pa.waitForFunction(() => /votos/.test(document.querySelector(".visor-exp .enquete .enq-rodape")?.textContent || ""), null, { timeout: 15000 }).catch(() => {});
ok(/1\.241 votos/.test(await ea.locator(".enq-rodape").textContent()), "a autora vê o total sem votar");
await ea.locator(".enq-ver").click();
await pa.waitForSelector(".vv-grupo", { timeout: 15000 }).catch(() => {});
const nums = await pa.locator(".vv-n").allTextContents();
ok(nums[0]?.startsWith("930") && nums[1]?.startsWith("311") && (await pa.locator(".vv-mais").count()) >= 1, `Ver votos com os números da contagem: ${nums.join(" / ")}`);
await A.browser.close();
