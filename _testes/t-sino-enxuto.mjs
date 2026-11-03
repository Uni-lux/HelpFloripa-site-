// Sino enxuto (02/11/2026): o que saiu do sino (mensagens, respostas da caixa, reações em comentários e no flash,
// avaliação boa do negócio) não aparece; o número do Mensagens continua; avaliação boa nova vira bolinha no Meus
// negócios; dentro da rede (rede.html) só UMA aba ouve o sino e as outras recebem os avisos dela.
// Uso: FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 node t-sino-enxuto.mjs (rodar seed.mjs antes)
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8085";
import { initializeApp } from "firebase-admin/app"; import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { navegador, entrar, BASE, USUARIOS as U } from "./nav.mjs";
initializeApp({ projectId: "demo-hf" }); const db = getFirestore();
const ok = (c, t) => { console.log(c ? "  ✔" : "  ✘", t); if (!c) process.exitCode = 1; };
const agora = Date.now(), ts = (m) => Timestamp.fromMillis(m);
const criados = [];
const pôr = async (c, id, d) => { await db.doc(`${c}/${id}`).set(d); criados.push(`${c}/${id}`); };
await db.doc(`usuarios/${U.ana}`).set({ notificacoesVistasEm: ts(agora - 3600e3) }, { merge: true });
await pôr("diario", "enxPost", { autorId: U.ana, nome: "Ana", texto: "post do sino enxuto", criadoEm: ts(agora - 2 * 3600e3) });
await pôr("relacoes", `${U.gui}_${U.ana}`, { tipo: "seguir", seguidorId: U.gui, alvoId: U.ana, criadoEm: ts(agora - 5 * 60e3) });
await pôr("caixa_respostas", "enxCx", { alvo: "d_enxPost", tipo: "d", itemId: "enxPost", autorId: U.ana, uid: U.bruno, nome: "Bruno", texto: "RESPOSTA-CAIXA", anonima: false, criadoEm: ts(agora - 4 * 60e3) });
await pôr("curtidas_comentarios", "enxReac", { uid: U.bruno, comentarioId: "x", comentarioAutorId: U.ana, reacao: "🔥", criadoEm: ts(agora - 3 * 60e3) });
await pôr("avaliacoes", "enxAval", { tipo: "negocio", autorId: U.dani, autorNome: "Dani", alvoId: U.ana, negocioId: `${U.ana}_servicos`, nota: 5, comentario: "Top", criadoEm: ts(agora - 2 * 60e3) });
await pôr("avaliacoes", "enxAvalB", { tipo: "negocio", autorId: U.dani, autorNome: "Dani", alvoId: U.bruno, negocioId: `${U.bruno}_servicos`, nota: 5, comentario: "Top", criadoEm: ts(agora - 2 * 60e3) });
const conv = [U.ana, U.bruno].sort().join("_");
await db.doc(`conversas/${conv}`).set({ ultimaMensagem: "MSG-NOVA", ultimaMensagemRemetenteId: U.bruno, atualizadoEm: ts(agora - 60e3) }, { merge: true });
await db.doc(`conversas/${conv}/mensagens/enxM1`).set({ remetenteId: U.bruno, texto: "MSG-NOVA", criadoEm: ts(agora - 60e3) });
criados.push(`conversas/${conv}/mensagens/enxM1`);
const erros = [];

// 1) página de Notificações (sozinha)
{
  const { browser, ctx } = await navegador({ mobile: true });
  const p = await entrar(ctx, "ana", "notificacoes.html");
  p.on("pageerror", (e) => erros.push(e.message));
  await p.waitForSelector(".nt2-item", { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(2500);
  const txt = await p.evaluate(() => document.body.innerText);
  ok(/começou a seguir|começaram a seguir/.test(txt), "seguidor novo continua no sino");
  ok(!/RESPOSTA-CAIXA|respondeu sua caixa/.test(txt), "resposta da caixa não vem para as notificações");
  ok(!/reagiu com 🔥 ao seu comentário/.test(txt), "reação em comentário não vem");
  ok(!/MSG-NOVA|enviou .* mensage/.test(txt), "mensagens não vêm para as notificações");
  ok(!/avaliou seu negócio/.test(txt), "avaliação boa do negócio não vem");
  ok(!(await p.locator(".nt2-chip", { hasText: "Mensagens" }).count()), "sem o filtro Mensagens");
  const badge = await p.evaluate(() => { const b = document.getElementById("badgeMensagens"); return b && !b.hidden ? b.textContent : ""; });
  ok(Number(badge) >= 1, `o número do Mensagens continua (${badge})`);
  await browser.close();
}

// 2) Meus negócios: bolinha "1 nova" nas avaliações (visita anterior marcada antes da avaliação)
{
  const { browser, ctx } = await navegador({ mobile: true });
  await ctx.addInitScript(([uid, t]) => { try { if (!sessionStorage.getItem("x")) { localStorage.setItem("hf-aval-visto-" + uid, String(t)); sessionStorage.setItem("x", "1"); } } catch {} }, [U.bruno, agora - 3600e3]);
  const p = await entrar(ctx, "bruno", "negocios.html");
  p.on("pageerror", (e) => erros.push(e.message));
  await p.waitForTimeout(5000);
  const novas = await p.locator(".ng-novas").allTextContents();
  ok(novas.some((t) => /1 nova/.test(t)), `bolinha de avaliação nova no Meus negócios (${novas.join(", ") || "nenhuma"})`);
  await browser.close();
}

// 3) dentro da rede: só uma aba ouve o sino
await db.doc(`usuarios/${U.ana}`).set({ notificacoesVistasEm: ts(agora - 3600e3) }, { merge: true });
{
  const { browser, ctx } = await navegador({ mobile: true, rede: true });
  const p = await entrar(ctx, "ana", "feed.html");
  p.on("pageerror", (e) => erros.push(e.message));
  await p.waitForURL(/rede\.html/, { timeout: 15000 }).catch(() => {});
  for (let i = 0; i < 40 && (await p.evaluate(() => document.querySelectorAll(".hf-quadro").length)) < 4; i++) await p.waitForTimeout(500);
  await p.waitForTimeout(12000);
  // (No emulador, que é HTTP/1.1, a 4ª aba às vezes fica sem conexão: o navegador abre só 6 por endereço e cada aba do
  // Firebase segura 2. No Firebase de verdade é HTTP/2, sem esse limite. Por isso compara as abas que ligaram.)
  const info = await p.evaluate(() => [...document.querySelectorAll(".hf-quadro")].map((f) => { try { const w = f.contentWindow; const b = w.document.getElementById("badgeAvisos"); return { id: f.dataset.id, dono: !!w.__hfSinoDono, recebeu: w.__hfSinoRecebido || 0, n: b && !b.hidden ? b.textContent : "0" }; } catch { return { id: f.dataset.id }; } }));
  const donos = info.filter((x) => x.dono).map((x) => x.id);
  ok(donos.length === 1, `só uma aba ouve o sino (${donos.join(", ")})`);
  const ligadas = info.filter((x) => x.dono || x.recebeu);
  ok(ligadas.length >= 2 && new Set(ligadas.map((x) => x.n)).size === 1 && ligadas[0].n !== "0", `as outras abas recebem os avisos da dona e mostram o mesmo número (${info.map((x) => `${x.id}:${x.dono ? "dona" : x.recebeu ? "recebe" : "—"}:${x.n ?? "?"}`).join(" · ")})`);
  await browser.close();
}
for (const c of criados) await db.doc(c).delete().catch(() => {});
ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.join(" | ") : ""));
