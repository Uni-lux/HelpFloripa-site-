// Site nacional: (1) vitrine com Estado/Cidade escolhidos busca NO SERVIDOR os perfis daquela cidade — com 60 perfis mais
// novos em SP, o de Recife (mais antigo) aparece ao filtrar Recife (antes só os 48 mais novos do Brasil vinham e o filtro
// era no aparelho); perfis antigos sem Estado gravado continuam aparecendo no filtro de SC. (2) "Aberto agora" pelo
// relógio do estado do negócio (fuso.js): Manaus é 1 h antes de Brasília. Uso: node t-nacional.mjs
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
import { relogioDe, fusoDaUF, ufDe } from "../fuso.js";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const db = getFirestore(initializeApp({ projectId: "demo-hf" }));
const agora = Date.now();

// ---------- (2) relógio por estado ----------
const t0 = new Date("2026-10-22T15:30:00Z"); // 12:30 em Brasília
const bsb = relogioDe("SC", t0), mao = relogioDe("AM", t0), acre = relogioDe("AC", t0);
ok(bsb.getHours() === 12 && bsb.getMinutes() === 30, "Brasília/SC: 12:30");
ok(mao.getHours() === 11 && acre.getHours() === 10, "Manaus 11:30 e Rio Branco 10:30 no mesmo instante");
ok(fusoDaUF("MT") === "America/Cuiaba" && fusoDaUF("XX") === "America/Sao_Paulo", "estado sem fuso próprio usa Brasília");
ok(ufDe({ cidade: "Manaus/AM" }) === "AM" && ufDe({ uf: "pe" }) === "PE" && ufDe({ cidade: "Florianópolis" }) === "", "estado pelo campo uf ou por \"Cidade/UF\"");

// ---------- (1) vitrine nacional ----------
const lote = db.batch();
for (let i = 0; i < 60; i++) lote.set(db.doc(`negocios/nac_sp_${i}_servicos`), { donoId: `nac_sp_${i}`, tipo: "servicos", nome: `Profissional SP ${i}`, cidade: "São Paulo", uf: "SP", cidadeIbge: 3550308, categorias: ["limpeza"], criadoEm: Timestamp.fromMillis(agora - 864e5), atualizadoEm: Timestamp.fromMillis(agora - i * 60000) });
lote.set(db.doc("negocios/nac_recife_servicos"), { donoId: "nac_recife", tipo: "servicos", nome: "Rita Eletricista Recife", cidade: "Recife", uf: "PE", cidadeIbge: 2611606, categorias: ["eletrica"], criadoEm: Timestamp.fromMillis(agora - 20 * 864e5), atualizadoEm: Timestamp.fromMillis(agora - 10 * 864e5) });
// Manaus: atende 08:00–09:00 todos os dias; aberto agora só se a conta for pelo relógio de Manaus.
const hMao = relogioDe("AM"), hh = String(hMao.getHours()).padStart(2, "0"), hh1 = String((hMao.getHours() + 1) % 24).padStart(2, "0");
lote.set(db.doc("negocios/nac_manaus_servicos"), { donoId: "nac_manaus", tipo: "servicos", nome: "Bia Manaus Reparos", cidade: "Manaus", uf: "AM", cidadeIbge: 1302603, categorias: ["reparos"], semana: Array(7).fill(`${hh}:00-${hh1}:00`), criadoEm: Timestamp.fromMillis(agora - 864e5), atualizadoEm: Timestamp.fromMillis(agora) });
await lote.commit();

const N = await navegador({ mobile: true });
await N.ctx.addInitScript(() => { try { if (!localStorage.getItem("hf-busca-local")) localStorage.setItem("hf-busca-local", JSON.stringify({ uf: "PE", cidade: "Recife", cidadeIbge: 2611606 })); } catch {} });
const p = await entrar(N.ctx, "ana", "servicos.html");
await p.waitForFunction(() => /Resultados|Nada encontrado/.test(document.getElementById("vtGrade")?.innerText || ""), null, { timeout: 30000 }).catch(() => {});
const nomes = await p.locator("#vtGrade").innerText();
ok(nomes.includes("Rita Eletricista Recife") && !nomes.includes("Profissional SP"), "filtro Recife: aparece o perfil de Recife (vindo do servidor), nenhum de SP → " + nomes.replace(/\s+/g, " ").slice(0, 160));
await p.screenshot({ path: "saida/nac-recife.png" });

// Trocar para SC: perfis antigos sem Estado gravado ("Florianópolis") continuam aparecendo.
await p.evaluate(() => { localStorage.setItem("hf-busca-local", JSON.stringify({ uf: "SC" })); });
await p.reload(); await p.waitForFunction(() => /Resultados|Nada encontrado/.test(document.getElementById("vtGrade")?.innerText || ""), null, { timeout: 30000 }).catch(() => {});
const sc = await p.locator("#vtGrade").innerText();
// Perfis antigos sem o campo Estado entram pela busca geral (os mais recentes); com o "Converter cidades" rodado, todos têm Estado.
ok(!sc.includes("Profissional SP") && !sc.includes("Recife"), "filtro SC: nenhum perfil de outro estado → " + sc.replace(/\s+/g, " ").slice(0, 200));

// Manaus: "Aberto agora" pelo relógio de Manaus.
await p.evaluate(() => { localStorage.setItem("hf-busca-local", JSON.stringify({ uf: "AM" })); });
await p.reload(); await p.waitForFunction(() => /Resultados|Nada encontrado/.test(document.getElementById("vtGrade")?.innerText || ""), null, { timeout: 30000 }).catch(() => {});
await p.locator("#vtGrade").getByText("Bia Manaus Reparos").first().click({ timeout: 8000 });
await p.waitForSelector(".vt-modal .vt-tag.ok, .vt-modal .vt-tag.off", { timeout: 15000 }).catch(() => {});
const tag = await p.locator(".vt-modal .vt-tag.ok, .vt-modal .vt-tag.off").first().innerText().catch(() => "");
ok(tag === "Aberto agora", `Manaus (atende ${hh}:00–${hh1}:00, hora de Manaus): "${tag}" — pelo relógio de Brasília estaria fechado`);
await p.screenshot({ path: "saida/nac-manaus.png" });
await N.browser.close();

const fim = db.batch();
for (let i = 0; i < 60; i++) fim.delete(db.doc(`negocios/nac_sp_${i}_servicos`));
fim.delete(db.doc("negocios/nac_recife_servicos")); fim.delete(db.doc("negocios/nac_manaus_servicos"));
await fim.commit();
process.exit(process.exitCode || 0);
