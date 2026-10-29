// Vídeos com o Storage LIGADO: sobem e TOCAM no Diário (tipo Vídeo, abre nos Reels), no Flash e no Mensagens.
// - Diário: formulário → tipo Vídeo → escolher o arquivo → publicar: diario.tipo "video", link do Storage; o vídeo
//   toca sozinho no Diário (sem som) e o botão dos Reels abre a tela cheia.
// - Flash: criador → Galeria → vídeo → Compartilhar: stories.tipo "video"; o visor toca o vídeo.
// - Mensagens: anexar vídeo → enviar: tipoArquivo "video"; o vídeo carrega na conversa (com controles).
// Uso: node t-video.mjs (emulador com o Storage: ./emulador.sh; liga a chave só no teste, como o t-storage.mjs)
process.env.STORAGE = "1";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { navegador, entrar, USUARIOS as U, BASE } from "./nav.mjs";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const db = getFirestore(initializeApp({ projectId: "demo-hf" }));
const ST = /^http:\/\/127\.0\.0\.1:9199\/v0\/b\/[^/]+\/o\//;
if (!existsSync("saida/video-teste.webm")) execSync(`ffmpeg -y -loglevel error -f lavfi -i "testsrc=size=360x640:rate=15" -f lavfi -i "sine=frequency=440" -t 4 -c:v libvpx -b:v 200k -c:a libvorbis saida/video-teste.webm`);
const VID = new URL("saida/video-teste.webm", import.meta.url).pathname;
// Regras do Firestore com o link do emulador do Storage aceito (as do repositório voltam no fim).
const RG = new URL("saida/regras-storage-teste.rules", import.meta.url).pathname;
writeFileSync(RG, readFileSync(new URL("../firestore.rules", import.meta.url), "utf8").replaceAll("https://firebasestorage[.]googleapis[.]com/", "(https://firebasestorage[.]googleapis[.]com|http://127[.]0[.]0[.]1:9199)/"));
execSync(`node trocar-regras.mjs ${RG}`);
const voltarRegras = () => execSync("node trocar-regras.mjs main");
const tocando = (loc) => loc.evaluate((v) => new Promise((ok) => { const t0 = v.currentTime; if (v.paused) v.play().catch(() => {}); setTimeout(() => ok(v.readyState >= 2 && v.currentTime > t0), 1500); }));
for (const s of (await db.collection("stories").where("autorId", "==", U.ana).get()).docs) await s.ref.delete();

try {
  const A = await navegador({ mobile: true });
  const p = await entrar(A.ctx, "ana", "feed.html");
  const erros = []; p.on("pageerror", (e) => erros.push(e.message));
  await p.waitForSelector("#btnComporFeed", { timeout: 30000 }); await p.waitForTimeout(1500);
  // ---------- 1) Diário ----------
  await p.locator("#btnComporFeed").click(); await p.waitForTimeout(400);
  ok(await p.locator("#pubTipoVideo:visible").count() === 1, "com Storage, o tipo Vídeo aparece no formulário");
  const [fc] = await Promise.all([p.waitForEvent("filechooser"), p.locator("#pubTipoVideo").click()]);
  await fc.setFiles(VID); await p.waitForSelector("#pubPrevia video", { timeout: 8000 });
  await p.locator("#pubTexto").fill("Vídeo da obra #reforma");
  await p.locator("#pubEnviar").click();
  await p.waitForFunction(() => !document.getElementById("folhaPublicar")?.classList.contains("aberta"), null, { timeout: 40000 }).catch(() => {});
  await p.waitForTimeout(2000);
  const pv = (await db.collection("diario").where("autorId", "==", U.ana).get()).docs.map((d) => ({ id: d.id, ...d.data() })).find((x) => x.texto === "Vídeo da obra #reforma");
  ok(pv?.tipo === "video" && pv.mediaTipo === "video" && ST.test(pv.mediaUrl || ""), "Diário: vídeo no Storage, tipo Vídeo");
  const vDiario = p.locator(".post-card .post-midia-f.video video").first();
  await vDiario.scrollIntoViewIfNeeded().catch(() => {});
  ok(await vDiario.count() === 1 && await tocando(vDiario), "Diário: o vídeo toca");
  await p.locator(".post-card .video-reels").first().click(); await p.waitForSelector(".reels .reel video", { timeout: 10000 });
  ok(await tocando(p.locator(".reels .reel video").first()), "Reels: o vídeo publicado toca em tela cheia");
  await p.screenshot({ path: "saida/video-reels.png" });
  await p.goBack(); await p.waitForTimeout(600);

  // ---------- 2) Flash ----------
  await p.evaluate(async () => { const u = performance.getEntriesByType("resource").map((e) => e.name).find((n) => /stories\.js\?v=/.test(n)); (await import(u)).novoFlash(); });
  await p.waitForSelector(".flash-criar", { timeout: 10000 }); await p.waitForTimeout(500);
  const gal = p.locator(".flash-esc-btn", { hasText: "Galeria" });
  const [fc2] = await Promise.all([p.waitForEvent("filechooser"), gal.click()]);
  await fc2.setFiles(VID); await p.waitForTimeout(1500);
  ok(await p.locator(".flash-criar video").count() >= 1, "Flash: o vídeo aparece no criador");
  await p.locator(".flash-publicar").click();
  await p.waitForFunction(() => !document.querySelector(".flash-criar"), null, { timeout: 40000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const fl = (await db.collection("stories").where("autorId", "==", U.ana).get()).docs.map((d) => ({ id: d.id, ...d.data() })).find((x) => x.tipo === "video");
  ok(fl && ST.test(fl.midia || "") && fl.duracao >= 3, "Flash: vídeo no Storage (" + (fl?.duracao || 0) + " s)");
  await A.browser.close();
  if (fl) {
    const B = await navegador({ mobile: true });
    const pb = await entrar(B.ctx, "bruno", `feed.html?flash=${fl.id}`);
    await pb.waitForSelector(".story-visor video", { timeout: 20000 });
    ok(await tocando(pb.locator(".story-visor video").first()), "Flash: quem vê assiste ao vídeo");
    await pb.screenshot({ path: "saida/video-flash.png" });
    await B.browser.close();
  }

  // ---------- 3) Mensagens ----------
  const conv = [U.ana, U.bruno].sort().join("_");
  const M = await navegador({ mobile: true });
  const pm = await entrar(M.ctx, "bruno", `mensagens.html?conversa=${conv}`);
  await pm.waitForSelector("#btnAnexar", { timeout: 20000 }); await pm.waitForTimeout(2500);
  await pm.setInputFiles("#inputArquivo", VID); await pm.waitForTimeout(800);
  ok((await pm.locator("#anexoTipo").textContent()) === "Vídeo", "Mensagens: o vídeo entra como anexo");
  await pm.locator("#btnEnviar").click(); await pm.waitForTimeout(5000);
  const msg = (await db.collection(`conversas/${conv}/mensagens`).orderBy("criadoEm", "desc").limit(1).get()).docs[0]?.data();
  ok(msg?.tipoArquivo === "video" && ST.test(msg.arquivoUrl || ""), "Mensagens: vídeo no Storage");
  const vm = pm.locator(".bolha video").last();
  ok(await vm.count() === 1 && await tocando(vm), "Mensagens: o vídeo toca na conversa");
  await pm.screenshot({ path: "saida/video-mensagens.png" });
  await M.browser.close();
  ok(!erros.length, "sem erros na página: " + erros.join(" | ").slice(0, 300));
  if (pv) await db.doc(`diario/${pv.id}`).delete();
  if (fl) await db.doc(`stories/${fl.id}`).delete();
} finally { voltarRegras(); }
process.exit(process.exitCode || 0);
