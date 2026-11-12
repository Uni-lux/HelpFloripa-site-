// Deslizar entre as abas da barra de baixo (Diário, Explorar, Comunidade, Mensagens, Perfil), como no Instagram:
// - a página acompanha o dedo e a próxima aba aparece ao lado (ícone e nome);
// - dedo para a ESQUERDA = próxima aba, para a DIREITA = anterior; no Diário (a 1ª) para a direita abre o Flash;
// - solta depois de 1/3 da tela OU com um deslize rápido (velocidade), senão a página volta para o lugar;
// - sem aba para aquele lado, a página só "estica" um pouco e volta (como fim de lista);
// - enquanto o dedo arrasta, a página de destino já é preparada pelo navegador (prerender, Chrome), então ela
//   aparece na hora; tocar num item da barra também prepara a página no toque.
// Sem dependências. Ligado pela barra de baixo (barra-rede.js) e pelo Mensagens (barra no HTML).
// A aba atual é o link com aria-current="page" na #barraRede; trocar = clicar nele (o Diário troca para o
// Explorar sem recarregar). O Flash abre por window.__hfAbrirFlash (feed.js).
// Não atrapalha: começa a 24 px das bordas (o "voltar" do celular usa as bordas), ignora campos, vídeos e
// janelas abertas; carrossel só fica com o gesto se ainda pode rolar para aquele lado.

import { casca } from "./quadro-rede.js?v=2";

const CAMADAS = [
  ".folha.aberta", ".story-visor", ".flash-criar", ".visor-exp", ".reels", "div.hfc", ".hf-confirma-fundo",
  ".pa-pagina", ".foto-grande", ".hfe-fundo", ".esc-lista", ".pv-fundo", ".pl-fundo", ".vt-local-fundo",
  ".vt-modal", ".hf-den", ".hf-aval", ".hfl", ".cr-fundo", ".nt-ed", ".nt-folha-fundo", ".gaveta.aberta", ".chat-gaveta.aberta", ".painel.aberto", "dialog[open]",
].join(",");
// Janela aberta de verdade? As folhas do perfil (usuarios.html) ficam no HTML com aria-modal="true" mesmo FECHADAS:
// antes qualquer [aria-modal] contava como janela aberta e, por isso, o Perfil não deslizava (04/11/2026).
export function camadaAberta() {
  if (document.querySelector(CAMADAS)) return true;
  for (const x of document.querySelectorAll("[aria-modal='true']")) {
    if (x.closest(".folha") && !x.closest(".folha.aberta")) continue;
    if (x.hidden || !x.getClientRects().length) continue;
    const st = getComputedStyle(x);
    if (st.visibility === "hidden" || st.display === "none" || st.opacity === "0") continue;
    return true;
  }
  return false;
}
const BORDA = 24, TRAVA = 12;

const CSS = `
.df-painel { position: fixed; top: 0; bottom: 0; z-index: 70; width: 0; overflow: hidden; pointer-events: none;
  display: grid; place-items: center; background: var(--bg, #070b0e); color: var(--text, #fff); }
.df-painel.esq { left: 0; box-shadow: inset -1px 0 0 var(--line, rgba(255,255,255,.08)); }
.df-painel.dir { right: 0; box-shadow: inset 1px 0 0 var(--line, rgba(255,255,255,.08)); }
.df-painel .df-miolo { display: grid; justify-items: center; align-content: center; gap: 10px; width: 42vw; min-width: 140px; height: 100%; text-align: center;
  opacity: 0; transform: scale(.86); will-change: transform, opacity; }
.df-painel.esq .df-miolo { margin-left: auto; }
.df-painel .df-ic { width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center;
  background: var(--panel-2, #18212a); border: 1px solid var(--line, rgba(255,255,255,.12)); transition: background .15s, border-color .15s; }
.df-painel .df-ic svg { width: 28px; height: 28px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.df-painel .df-nome { font: 800 15px/1.2 system-ui, sans-serif; letter-spacing: .01em; }
.df-painel .df-dica { font: 600 12px/1.3 system-ui, sans-serif; opacity: .6; }
.df-painel .df-dica:empty { display: none; }
.df-painel.pronto .df-ic { background: #00adee; border-color: #00adee; color: #fff; }
.df-painel.flash { background: radial-gradient(circle at 50% 45%, #10324a, #05090c 70%); color: #fff; }
.df-painel.flash .df-ic { background: linear-gradient(135deg, #5ad8ff, #00adee 45%, #0062d6); border: 3px solid rgba(255,255,255,.9); box-shadow: 0 8px 26px rgba(0,140,238,.5); }
.df-movendo { will-change: transform; }
.df-anima { transition: transform .22s cubic-bezier(.2,.8,.2,1), opacity .22s ease !important; }
.df-painel.df-anima { transition: width .22s cubic-bezier(.2,.8,.2,1) !important; }
html.df-puxando, html.df-puxando body { overscroll-behavior-x: none; }
html.df-puxando body { overflow-x: hidden; }
/* resposta ao toque na barra de baixo */
#barraRede a { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
#barraRede a:active > :first-child { transform: scale(.86); transition: transform .08s; }
/* Sem a regra de "reduzir movimento": a animação segue o dedo e termina o gesto (pedido dele com as animações do celular desligadas). */
`;
const ICONES = {
  "Diário": '<rect x="3" y="3" width="18" height="8" rx="2"/><rect x="3" y="13" width="18" height="8" rx="2"/>',
  "Explorar": '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  "Comunidade": '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  "Mensagens": '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  "Perfil": '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  flash: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
};

let ligado = false;

// Prepara a página de destino (prerender do Chrome; nos outros navegadores não faz nada).
const preparadas = new Set();
const podePreparar = (() => { try { return !!HTMLScriptElement.supports?.("speculationrules"); } catch { return false; } })();
// modo "prerender" = a página inteira roda por trás (dados e tudo); "prefetch" = só baixa o HTML (não roda nada).
export function preparar(href, modo = "prerender") {
  if (!podePreparar || !href) return;
  let u; try { u = new URL(href, location.href); } catch { return; }
  if (u.origin !== location.origin || u.pathname === location.pathname || preparadas.has(u.href) || preparadas.size >= 6) return;
  preparadas.add(u.href);
  const s = document.createElement("script"); s.type = "speculationrules";
  s.textContent = JSON.stringify({ [modo]: [{ source: "list", urls: [u.href], eagerness: "immediate" }] });
  document.head.appendChild(s);
}

// Prepara a página do link quando o dedo PARA em cima dele (como os apps: quando o toque termina, a página já está
// carregando). Só depois de 70 ms parado: começar a rolar a lista em cima de um cartão não prepara nada (cada página
// preparada lê dados do Firebase). No computador, ao passar o mouse por 120 ms. escolher(url) → "prerender" | "prefetch" | null.
export function prepararAoTocar(escolher) {
  if (!podePreparar) return;
  let tempo = 0, x0 = 0, y0 = 0;
  const alvo = (e) => { const a = e.target?.closest?.("a[href]"); if (!a || a.target === "_blank") return null; let u; try { u = new URL(a.href, location.href); } catch { return null; } const m = escolher(u); return m ? { u, m } : null; };
  const cancelar = () => { clearTimeout(tempo); tempo = 0; };
  document.addEventListener("touchstart", (e) => {
    cancelar();
    const a = e.touches.length === 1 && alvo(e); if (!a) return;
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    tempo = setTimeout(() => preparar(a.u.href, a.m), 70);
  }, { passive: true, capture: true });
  document.addEventListener("touchmove", (e) => { if (tempo && Math.hypot(e.touches[0].clientX - x0, e.touches[0].clientY - y0) > 8) cancelar(); }, { passive: true, capture: true });
  document.addEventListener("touchcancel", cancelar, { passive: true, capture: true });
  if (matchMedia("(hover: hover)").matches) {
    let sobre = 0;
    document.addEventListener("mouseover", (e) => { clearTimeout(sobre); const a = alvo(e); if (a) sobre = setTimeout(() => preparar(a.u.href, a.m), 120); }, { passive: true });
    document.addEventListener("mouseout", () => clearTimeout(sobre), { passive: true });
  }
}
// Vitrines: a página sozinha é preparada inteira; com ?negocio= / ?anuncio= / ?item= (abre um perfil e conta a visita
// nas estatísticas do negócio) só o HTML, para não contar visita de quem não abriu.
const VITRINES = /\/(servicos|delivery|shopping|imoveis|saude|automotivo|comunidade|mural)\.html$/;
export function escolherVitrine(u) {
  if (!VITRINES.test(u.pathname)) return null;
  return ["negocio", "anuncio", "item", "novo"].some((k) => u.searchParams.has(k)) ? "prefetch" : "prerender";
}

function examinar(n) {
  const rolam = [];
  for (let x = n; x && x !== document.body && x.nodeType === 1; x = x.parentElement) {
    if (x.matches?.("[data-sem-deslizar], #barraRede")) return null;
    if (/^(INPUT|TEXTAREA|SELECT|VIDEO|CANVAS|AUDIO|IFRAME)$/.test(x.tagName) || x.isContentEditable) return null;
    if (x.scrollWidth > x.clientWidth + 4) {
      const ox = getComputedStyle(x).overflowX;
      if (ox === "auto" || ox === "scroll") rolam.push(x);
    }
  }
  return rolam;
}
const podeRolar = (els, lado) => els.some((x) => (lado === "dir" ? x.scrollLeft > 8 : x.scrollLeft < x.scrollWidth - x.clientWidth - 8));

function abas() {
  const links = [...document.querySelectorAll("#barraRede a")];
  const i = links.findIndex((a) => a.getAttribute("aria-current") === "page");
  return { links, i };
}
const nomeDe = (a) => (a?.querySelector("span:last-child")?.textContent || a?.textContent || "").replace(/\d+$/, "").trim();
const mesmaPagina = (a) => { try { return new URL(a.href, location.href).pathname === location.pathname; } catch { return false; } };

function destino(lado) {
  const { links, i } = abas();
  if (i < 0) return null;
  // Dentro da rede numa página só (rede.html): a casca sabe a ordem das abas e mostra a vizinha de verdade.
  const S = casca();
  if (S) {
    const k = S.atual;
    if (lado === "dir" && k === "diario") return typeof window.__hfAbrirFlash === "function" ? { flash: true, nome: "Novo flash", dica: "Solte para criar", ir: () => window.__hfAbrirFlash() } : null;
    const viz = S.vizinho(k, lado);
    if (!viz) return null;
    // Diário ↔ Explorar ficam no mesmo quadro (o feed troca por dentro).
    if (["diario", "explorar"].includes(viz) && ["diario", "explorar"].includes(k)) return { nome: S.nomeDe(viz), k: viz, aqui: true, ir: () => S.ir(viz) };
    return { cruzado: true, k: viz, nome: S.nomeDe(viz) };
  }
  if (lado === "dir") {
    if (i === 0) return typeof window.__hfAbrirFlash === "function" ? { flash: true, nome: "Novo flash", dica: "Solte para criar", ir: () => window.__hfAbrirFlash() } : null;
    const a = links[i - 1];
    return { nome: nomeDe(a), a, aqui: mesmaPagina(a), ir: () => a.click() };
  }
  if (i >= links.length - 1) return null;
  const a = links[i + 1];
  return { nome: nomeDe(a), a, aqui: mesmaPagina(a), ir: () => a.click() };
}
const conteudo = () => document.querySelector("main.pagina") || document.querySelector(".app") || document.querySelector("main");

export function ligarDeslizarFlash() {
  if (ligado || (window.top !== window && !casca())) return;
  if (!matchMedia("(pointer: coarse)").matches) return; // só no toque
  ligado = true;
  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);

  // Tocar num item da barra já prepara a página dele.
  if (!casca()) document.addEventListener("touchstart", (e) => { const a = e.target.closest?.("#barraRede a"); if (a) preparar(a.href); }, { passive: true, capture: true });

  let ini = null, lado = "", alvo = null, mover = null, painel = null, previa = null, pronto = false, pontos = [];
  const W = () => innerWidth;

  const zerar = () => { ini = null; lado = ""; alvo = null; pronto = false; pontos = []; };
  const limparEstilo = (m) => { if (!m) return; m.classList.remove("df-anima", "df-movendo"); m.style.transform = ""; m.style.opacity = ""; };
  const tirarPainel = () => { painel?.remove(); painel = null; };

  function montarPainel() {
    painel = document.createElement("div");
    painel.className = `df-painel ${lado === "dir" ? "esq" : "dir"}${alvo?.flash ? " flash" : ""}`;
    painel.setAttribute("aria-hidden", "true");
    const ic = ICONES[alvo?.flash ? "flash" : alvo?.nome] || ICONES.Perfil;
    painel.innerHTML = `<div class="df-miolo"><span class="df-ic"><svg viewBox="0 0 24 24">${ic}</svg></span><span class="df-nome"></span><span class="df-dica"></span></div>`;
    painel.querySelector(".df-nome").textContent = alvo?.nome || "";
    painel.querySelector(".df-dica").textContent = alvo?.dica || "";
    document.body.appendChild(painel);
  }

  function seguir(dx) {
    if (!mover) return;
    if (!alvo) { // sem aba para esse lado: estica um pouco
      const d = Math.sign(dx) * Math.min(44, Math.abs(dx) * 0.22);
      mover.style.transform = `translate3d(${d}px,0,0)`;
      return;
    }
    const d = lado === "dir" ? Math.max(0, dx) : Math.min(0, dx);
    mover.style.transform = `translate3d(${d}px,0,0)`;
    if (previa) {
      // A outra aba de verdade entra pelo lado, colada na que sai (sem painel, sem sombra).
      previa.el.style.transform = `translate3d(${(lado === "dir" ? -W() : W()) + d}px,0,0)`;
      const ok = Math.abs(d) >= W() * 0.33;
      if (ok !== pronto) { pronto = ok; if (ok && navigator.userActivation?.hasBeenActive) navigator.vibrate?.(10); }
      return;
    }
    const largura = Math.abs(d);
    painel.style.width = largura + "px";
    const p = Math.min(1, largura / (W() * 0.33));
    const miolo = painel.firstChild;
    miolo.style.opacity = String(Math.min(1, p * 1.4));
    miolo.style.transform = `scale(${0.86 + 0.14 * p})`;
    const agora = p >= 1;
    if (agora !== pronto) { pronto = agora; painel.classList.toggle("pronto", agora); if (agora && navigator.userActivation?.hasBeenActive) navigator.vibrate?.(10); }
  }

  function voltarAoLugar() {
    const m = mover, pn = painel, pv = previa;
    painel = null; previa = null;
    if (pv) {
      for (const x of [m, pv.el]) x.classList.add("df-anima");
      m.style.transform = "translate3d(0,0,0)"; pv.el.style.transform = `translate3d(${lado === "dir" ? -W() : W()}px,0,0)`;
      setTimeout(() => { pv.cancelar(); limparEstilo(m); }, 230);
      return;
    }
    if (!m) { pn?.remove(); return; }
    m.classList.add("df-anima"); m.style.transform = "translate3d(0,0,0)";
    if (pn) { pn.classList.add("df-anima"); pn.style.width = "0px"; }
    setTimeout(() => { limparEstilo(m); pn?.remove(); }, 240);
  }

  function concluir() {
    const m = mover, pn = painel, a = alvo, l = lado, pv = previa;
    painel = null; previa = null;
    if (pv) {
      for (const x of [m, pv.el]) x.classList.add("df-anima");
      m.style.transform = `translate3d(${l === "dir" ? W() : -W()}px,0,0)`; pv.el.style.transform = "translate3d(0,0,0)";
      setTimeout(() => { a.ir(); pv.fim(); limparEstilo(m); }, 220);
      return;
    }
    if (a.flash) { painel = pn; voltarAoLugar(); setTimeout(() => a.ir(), 60); return; }
    const fim = l === "dir" ? W() : -W();
    m.classList.add("df-anima"); m.style.transform = `translate3d(${fim}px,0,0)`;
    pn.classList.add("df-anima"); pn.style.width = W() + "px";
    pn.firstChild.style.opacity = "1"; pn.firstChild.style.transform = "scale(1)";
    setTimeout(() => {
      a.ir();
      if (!a.aqui) return; // outra página: fica coberto até ela abrir
      // mesma página (Diário ↔ Explorar): o conteúdo novo entra pelo outro lado
      m.classList.remove("df-anima");
      m.style.transform = `translate3d(${l === "dir" ? -W() * 0.35 : W() * 0.35}px,0,0)`; m.style.opacity = "0.4";
      pn.remove();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        m.classList.add("df-anima"); m.style.transform = "translate3d(0,0,0)"; m.style.opacity = "1";
        setTimeout(() => limparEstilo(m), 240);
      }));
    }, 200);
  }

  // Voltou para esta página pela memória do navegador: tudo no lugar.
  addEventListener("pageshow", () => { document.documentElement.classList.remove("df-puxando"); limparEstilo(conteudo()); document.querySelectorAll(".df-painel").forEach((x) => x.remove()); painel = null; });

  document.addEventListener("touchstart", (e) => {
    zerar();
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    if (t.clientX < BORDA || t.clientX > W() - BORDA) return;
    if (!window.firebaseAuth?.currentUser) return;
    if (abas().i < 0) return;
    if (camadaAberta() || document.documentElement.classList.contains("hf-volta-flash")) return;
    if (document.body.classList.contains("chat-aberto")) return; // conversa aberta no Mensagens
    const rolam = examinar(e.target);
    if (!rolam) return;
    if ((getSelection?.() || "").toString()) return;
    ini = { x: t.clientX, y: t.clientY, rolam, esq0: rolam.map((x) => x.scrollLeft) };
    pontos = [[t.clientX, performance.now()]];
  }, { passive: true, capture: true });

  document.addEventListener("touchmove", (e) => {
    if (!ini || e.touches.length !== 1) return;
    const t = e.touches[0], dx = t.clientX - ini.x, dy = t.clientY - ini.y;
    if (!lado) {
      if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) { zerar(); return; } // está rolando a página
      if (Math.abs(dx) <= TRAVA || Math.abs(dx) <= Math.abs(dy) * 1.4) return;
      lado = dx > 0 ? "dir" : "esq";
      if (podeRolar(ini.rolam, lado) || ini.rolam.some((x, k) => Math.abs(x.scrollLeft - ini.esq0[k]) > 2)) { zerar(); return; }
      alvo = destino(lado);
      if (alvo?.cruzado) {
        // Outra aba da rede: a casca arrasta as duas abas juntas (a vizinha aparece de verdade, já carregada).
        // A posição vem da tela inteira (screenX): o quadro anda junto com o dedo.
        if (!casca().comecar(casca().atual, lado)) { zerar(); return; }
        ini.cruzado = true; ini.sx = t.screenX - Math.sign(dx) * 2;
        pontos = [[t.screenX, performance.now()]];
        document.documentElement.classList.add("df-puxando");
        if (e.cancelable) e.preventDefault();
        return;
      }
      mover = conteudo();
      const kAlvo = alvo?.k || alvo?.a?.dataset?.barra;
      if (alvo?.aqui && kAlvo && typeof window.__hfPreviaAba === "function") {
        previa = window.__hfPreviaAba(kAlvo);
        if (previa) { mover = previa.atual; previa.el.classList.add("df-movendo"); }
      }
      if (!mover) { zerar(); return; }
      ini.x = t.clientX - Math.sign(dx) * 2; // começa a seguir daqui (sem pulo)
      document.documentElement.classList.add("df-puxando");
      mover.classList.remove("df-anima"); mover.classList.add("df-movendo");
      document.querySelectorAll(".df-painel").forEach((x) => x.remove()); painel = null;
      if (alvo && !previa) { montarPainel(); if (alvo.a && !alvo.aqui) preparar(alvo.a.href); }
    }
    if (e.cancelable) e.preventDefault();
    if (ini.cruzado) {
      const d = t.screenX - ini.sx;
      pontos.push([t.screenX, performance.now()]); if (pontos.length > 6) pontos.shift();
      casca().mover(d);
      const agora = Math.abs(d) >= W() * 0.33 && Math.sign(d) === (lado === "dir" ? 1 : -1);
      if (agora !== pronto) { pronto = agora; if (agora && navigator.userActivation?.hasBeenActive) navigator.vibrate?.(10); }
      return;
    }
    pontos.push([t.clientX, performance.now()]); if (pontos.length > 6) pontos.shift();
    seguir(t.clientX - ini.x);
  }, { passive: false, capture: true });

  const fim = (cancelou) => {
    if (!ini) return;
    const tinha = !!lado, a = alvo;
    // velocidade dos últimos ~120 ms (px/ms)
    let v = 0;
    if (pontos.length > 1) { const [x1, t1] = pontos[pontos.length - 1]; const [x0, t0] = pontos.find(([, tt]) => t1 - tt < 120) || pontos[0]; v = t1 > t0 ? (x1 - x0) / (t1 - t0) : 0; }
    const dx = pontos.length ? pontos[pontos.length - 1][0] - (ini.cruzado ? ini.sx : ini.x) : 0;
    const certoLado = (lado === "dir" && dx > 0) || (lado === "esq" && dx < 0);
    const rapido = Math.abs(v) > 0.45 && Math.sign(v) === Math.sign(dx) && Math.abs(dx) > 30;
    const vai = !cancelou && tinha && a && certoLado && (pronto || rapido);
    document.documentElement.classList.remove("df-puxando");
    if (ini.cruzado) { casca()?.terminar(!!vai, v); zerar(); return; }
    if (tinha) { if (vai) concluir(); else voltarAoLugar(); }
    zerar();
  };
  document.addEventListener("touchend", () => fim(false), { capture: true });
  document.addEventListener("touchcancel", () => fim(true), { capture: true });
}
