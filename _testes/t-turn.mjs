// Etapa C: TURN das ligações. Conta (functions/turn.js), função credenciaisTurn no emulador falando com um Cloudflare de
// mentira (porta 5098, aqui mesmo), as ligações usando as credenciais (e guardando 4 h), e a volta para a conexão direta
// quando o serviço falha. Precisa de FUNCOES=1 ./emulador.sh. Roda: FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node t-turn.mjs
import http from "node:http";
import { initializeApp } from "firebase-admin/app"; import { getFirestore } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U } from "./nav.mjs";
import { lerServidores, limiteDia, urlCloudflare } from "../functions/turn.js";
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
let falhas = 0; const ok = (c, t) => { console.log((c ? "  ✔ " : "  ✘ ") + t); if (!c) falhas++; };

// ---------- 1) conta ----------
console.log("Conta");
const lidos = lerServidores({ iceServers: [{ urls: ["stun:stun.cloudflare.com:3478", "stun:stun.cloudflare.com:53"] }, { urls: ["turn:turn.cloudflare.com:3478?transport=udp", "turn:turn.cloudflare.com:53?transport=udp", "turns:turn.cloudflare.com:443?transport=tcp", "http://x"], username: "u", credential: "c" }] });
ok(lidos.length === 2 && !JSON.stringify(lidos).includes(":53") && !JSON.stringify(lidos).includes("http://") && lidos[1].username === "u", "tira as portas 53 e endereços que não são stun/turn");
ok(lerServidores({ iceServers: { urls: "turn:a:3478", username: "x", credential: "y" } }).length === 1, "aceita o formato antigo (um objeto só)");
ok(!limiteDia({ dia: "2026-11-03", n: 60 }, "2026-11-03").pode && limiteDia({ dia: "2026-11-02", n: 60 }, "2026-11-03").pode, "limite de 60 por dia, zera no dia seguinte");
ok(urlCloudflare("https://rtc.live.cloudflare.com", "abc") === "https://rtc.live.cloudflare.com/v1/turn/keys/abc/credentials/generate-ice-servers", "endereço da API do Cloudflare");

// ---------- 2) Cloudflare de mentira ----------
let modo = "ok"; const pedidos = [];
const servidor = http.createServer((req, res) => {
  let corpo = ""; req.on("data", (c) => (corpo += c)); req.on("end", () => {
    pedidos.push({ url: req.url, auth: req.headers.authorization, corpo });
    if (modo === "erro") { res.writeHead(500); res.end("{}"); return; }
    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ iceServers: [{ urls: ["stun:stun.cloudflare.com:3478", "turn:turn.cloudflare.com:3478?transport=udp", "turn:turn.cloudflare.com:53?transport=udp", "turns:turn.cloudflare.com:443?transport=tcp"], username: "usuario-temporario", credential: "senha-temporaria" }] }));
  });
});
await new Promise((ok) => servidor.listen(5098, "127.0.0.1", ok));

// ---------- 3) ligação com TURN ----------
console.log("Ligação com TURN");
await db.doc(`turn_uso/${U.bruno}`).delete().catch(() => {});
const espiar = () => {
  window.__hfTurnTeste = 1; window.__hfFuncoesEmulador = 5001;
  const O = window.RTCPeerConnection;
  if (O) window.RTCPeerConnection = class extends O { constructor(c) { super(c); (window.__iceUsado ||= []).push(c); } };
};
const A = await navegador({ mobile: true, camera: true }), B = await navegador({ mobile: true, camera: true });
await A.ctx.addInitScript(espiar); await B.ctx.addInitScript(espiar);
const erros = [];
const ana = await entrar(A.ctx, "ana", "feed.html");
const bru = await entrar(B.ctx, "bruno", `mensagens.html?conversa=${U.conv}`);
[ana, bru].forEach((p) => p.on("pageerror", (x) => erros.push(x.message)));
await bru.waitForSelector("#btnVideo:not([hidden])", { timeout: 20000 }); await bru.waitForTimeout(2500); await ana.waitForTimeout(2500);
await bru.click("#btnVideo");
await ana.waitForSelector(".hfl-bt.atender", { timeout: 20000 });
await ana.waitForTimeout(1500);
await ana.click(".hfl-bt.atender");
await bru.waitForSelector(".hfl.com-video", { timeout: 20000 }).catch(() => {});
await ana.waitForTimeout(3000);
const iceB = await bru.evaluate(() => window.__iceUsado?.at(-1)?.iceServers || []);
const iceA = await ana.evaluate(() => window.__iceUsado?.at(-1)?.iceServers || []);
const temTurn = (l) => l.some((s) => [].concat(s.urls).some((u) => /^turns?:/.test(u)) && s.username === "usuario-temporario" && s.credential === "senha-temporaria");
ok(temTurn(iceB), "quem liga usa o TURN com a credencial temporária");
ok(temTurn(iceA), "quem atende também (pedido enquanto tocava)");
ok(!JSON.stringify([iceA, iceB]).includes(":53"), "sem as portas 53");
ok(iceB.some((s) => [].concat(s.urls).includes("stun:stun.l.google.com:19302")), "continua com o STUN de sempre");
ok(pedidos.length >= 1 && pedidos.every((x) => x.auth === "Bearer token-teste" && x.url === "/v1/turn/keys/chave-teste/credentials/generate-ice-servers" && JSON.parse(x.corpo).ttl === 14400), "função chama o Cloudflare com o segredo, a chave e 4 h");
ok(!JSON.stringify(await bru.evaluate(() => document.documentElement.outerHTML)).includes("token-teste"), "o segredo do Cloudflare não chega ao site");
const vid = async (p) => p.evaluate(() => { const v = document.querySelector(".hfl-remoto"); return v ? v.videoWidth : 0; });
ok(await vid(bru) > 0 && await vid(ana) > 0, "chamada de vídeo conectou");
ok((await db.doc(`turn_uso/${U.bruno}`).get()).get("n") >= 1, "conta o uso do dia por pessoa");
await bru.locator(".hfl-bt.fim").click();
await ana.waitForSelector(".hfl", { state: "detached", timeout: 10000 }).catch(() => {});
await bru.waitForTimeout(1500);

// 2ª ligação na mesma aba: usa a credencial guardada (não pede de novo)
const antes = pedidos.length;
await bru.click("#btnLigar");
await ana.waitForSelector(".hfl-bt.atender", { timeout: 20000 });
await bru.waitForTimeout(1500);
ok(pedidos.length === antes || pedidos.length === antes + 1, `2ª ligação do Bruno usa a credencial guardada (pedidos: ${antes} → ${pedidos.length}, o +1 é da Ana)`);
ok(temTurn(await bru.evaluate(() => window.__iceUsado?.at(-1)?.iceServers || [])), "2ª ligação também com TURN");
await bru.locator(".hfl-bt.fim").click();
await ana.waitForSelector(".hfl", { state: "detached", timeout: 10000 }).catch(() => {});
await bru.waitForTimeout(1500);

// ---------- 4) serviço fora do ar: liga direto ----------
console.log("Sem o serviço");
modo = "erro";
await bru.evaluate(() => sessionStorage.removeItem("hf-turn")); await ana.evaluate(() => sessionStorage.removeItem("hf-turn"));
const t0 = Date.now();
await bru.click("#btnVideo");
await ana.waitForSelector(".hfl-bt.atender", { timeout: 20000 });
const esperou = Date.now() - t0;
await ana.waitForTimeout(1200);
await ana.click(".hfl-bt.atender");
await bru.waitForSelector(".hfl.com-video", { timeout: 20000 }).catch(() => {});
await ana.waitForTimeout(3000);
ok(!temTurn(await bru.evaluate(() => window.__iceUsado?.at(-1)?.iceServers || [])), "Cloudflare com erro: liga sem TURN");
ok(await vid(bru) > 0, "e a chamada conecta assim mesmo (rede direta)");
ok(esperou < 9000, `não segura a ligação (tocou em ${esperou} ms)`);
ok(await bru.evaluate(() => JSON.parse(sessionStorage.getItem("hf-turn") || "{}").falhou > Date.now()), "só tenta de novo em 10 min");
await bru.locator(".hfl-bt.fim").click();
ok(!erros.length, "sem erros " + erros.join(" | "));

await A.browser.close(); await B.browser.close(); servidor.close();
await db.doc(`turn_uso/${U.bruno}`).delete().catch(() => {}); await db.doc(`turn_uso/${U.ana}`).delete().catch(() => {});
console.log(falhas ? `${falhas} falha(s)` : "tudo certo");
process.exit(falhas ? 1 : 0);
