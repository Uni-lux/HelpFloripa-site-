// =====================================================
// Estatísticas da publicação (só o autor), como no Instagram:
// - cabeçalho com a publicação e quando saiu
// - números principais (alcance, estrelas, comentários, salvos e taxa de engajamento),
//   cada um comparado com a média das suas últimas publicações
// - evolução no tempo (alcance e interações, em gráficos separados), horários em que mais viram,
//   distribuição das estrelas, de onde veio o alcance e seguidores × não seguidores
// - dicas automáticas tiradas desses números
// Dados: diario/{id}/vistas (uma por conta, com origem), curtidas (nota, origem, data),
// comentarios, salvamentos (só a contagem). Sem as regras novas, alcance e salvos ficam "—".
// =====================================================
import {
  $, el, icone, fb, eu, numero, toast, erroAmigavel, criarFolha, abrirFolha, infoEstrelas, contarComentarios,
  lerResumosEstrelas, fotosDoPost, ms, paraData, dataCompleta, tempoRelativo
} from "./rede.js?v=78";

const ORIGENS = [["principais", "Principais"], ["seguindo", "Quem segue você"], ["amigos", "Amigos"], ["perfil", "Seu perfil"], ["link", "Link compartilhado"], ["tag", "Hashtags"], ["salvos", "Salvos"]];
const contar = (q) => fb.getCountFromServer(q).then((s) => s.data().count).catch(() => null);
const pct = (v) => `${Math.round(v * 100)}%`;
const fmt1 = (v) => v.toFixed(1).replace(".", ",");

// Média das suas últimas publicações (sem esta), para comparar.
async function mediaDasOutras(post) {
  const s = await fb.getDocs(fb.query(fb.collection(fb.db, "diario"), fb.where("autorId", "==", eu.uid), fb.limit(40))).catch(() => ({ docs: [] }));
  const outras = s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.id !== post.id)
    .sort((a, b) => ms(b.criadoEm) - ms(a.criadoEm)).slice(0, 12);
  if (!outras.length) return null;
  const [res, coms, alcs] = await Promise.all([
    lerResumosEstrelas(outras.map((p) => p.id)).catch(() => new Map()),
    Promise.all(outras.map((p) => contarComentarios(p.id).catch(() => 0))),
    Promise.all(outras.map((p) => contar(fb.collection(fb.db, "diario", p.id, "vistas"))))
  ]);
  const media = (l) => (l.length ? l.reduce((a, n) => a + n, 0) / l.length : 0);
  const alcValidos = alcs.filter((n) => n != null);
  return {
    n: outras.length,
    estrelas: media(outras.map((p) => res.get(p.id)?.total || 0)),
    comentarios: media(coms),
    alcance: alcValidos.length ? media(alcValidos) : null
  };
}

export async function abrirEstatisticas(post) {
  if (post.autorId !== eu.uid) return;
  criarFolha("folhaEstat", { titulo: "Estatísticas da publicação", corpoClasse: "folha-corpo pad" });
  const corpo = $("c_folhaEstat");
  corpo.replaceChildren(el("div", "lista-vazia", "Calculando..."));
  abrirFolha("folhaEstat");
  try {
    const vistasCol = fb.collection(fb.db, "diario", post.id, "vistas");
    const curt = fb.collection(fb.db, "curtidas");
    const [vistasSnap, alcanceN, est, coment, salvos, notas, coms, seguidores, media] = await Promise.all([
      fb.getDocs(fb.query(vistasCol, fb.limit(2000))).catch(() => null),
      contar(vistasCol),
      infoEstrelas(post.id, { recarregar: true }),
      contarComentarios(post.id, { recarregar: true }).catch(() => 0),
      contar(fb.query(fb.collection(fb.db, "salvamentos"), fb.where("postId", "==", post.id), fb.where("postAutorId", "==", eu.uid))),
      fb.getDocs(fb.query(curt, fb.where("postId", "==", post.id), fb.limit(1000))).then((s) => s.docs.map((d) => d.data())).catch(() => []),
      fb.getDocs(fb.query(fb.collection(fb.db, "comentarios"), fb.where("postId", "==", post.id), fb.limit(300))).then((s) => s.docs.map((d) => d.data())).catch(() => []),
      fb.getDocs(fb.query(fb.collection(fb.db, "relacoes"), fb.where("tipo", "==", "seguir"), fb.where("alvoId", "==", eu.uid), fb.limit(2000))).then((s) => new Set(s.docs.map((d) => d.data().seguidorId))).catch(() => new Set()),
      mediaDasOutras(post).catch(() => null)
    ]);
    const vistas = vistasSnap ? vistasSnap.docs.map((d) => ({ uid: d.id, ...d.data() })) : null;
    const alcance = vistas ? Math.max(vistas.length, alcanceN || 0) : alcanceN;
    corpo.replaceChildren();

    // ---------- cabeçalho: a publicação ----------
    const cab = el("div", "estat-cab");
    const mini = el("div", "estat-mini");
    const foto = fotosDoPost(post)[0];
    if (foto && post.mediaTipo !== "video") { const im = document.createElement("img"); im.src = foto; im.alt = ""; mini.appendChild(im); }
    else if (post.mediaTipo === "video") { mini.classList.add("video"); mini.appendChild(icone("play", "i s")); }
    else { mini.classList.add("texto"); mini.textContent = String(post.texto || "").slice(0, 40); }
    const info = el("div", "estat-info");
    const tipo = post.mediaTipo === "video" ? "Vídeo" : foto ? (fotosDoPost(post).length > 1 ? `${fotosDoPost(post).length} fotos` : "Foto") : "Texto";
    info.append(el("strong", null, String(post.texto || tipo).split("\n")[0].slice(0, 70) || tipo), el("small", null, `${tipo} · ${dataCompleta(paraData(post.criadoEm))} · ${tempoRelativo(paraData(post.criadoEm))}`));
    cab.append(mini, info);
    corpo.appendChild(cab);

    // ---------- números principais ----------
    const inter = est.n + coment + (salvos || 0);
    const taxa = alcance ? inter / alcance : null;
    const cards = el("div", "estat-cards");
    const compara = (valor, base) => {
      if (base == null || valor == null || media == null) return null;
      if (!base) return valor ? { txt: "acima da sua média", sobe: true } : null;
      const d = (valor - base) / base;
      if (Math.abs(d) < 0.1) return { txt: "na sua média", sobe: null };
      return { txt: `${d > 0 ? "▲" : "▼"} ${pct(Math.abs(d))} ${d > 0 ? "acima" : "abaixo"} da média`, sobe: d > 0 };
    };
    const card = (ic, rot, val, sub, cmp) => {
      const c = el("div", "estat-card");
      const t = el("span", "rot"); t.append(icone(ic, "i xs"), document.createTextNode(rot));
      c.append(t, el("strong", null, val));
      if (cmp) { const k = el("small", "cmp" + (cmp.sobe === true ? " sobe" : cmp.sobe === false ? " desce" : ""), cmp.txt); c.appendChild(k); }
      else if (sub) c.appendChild(el("small", null, sub));
      cards.appendChild(c);
    };
    card("olho", "Alcance", alcance == null ? "—" : numero(alcance), "contas que viram", compara(alcance, media?.alcance));
    card("estrela", "Estrelas", numero(est.n), est.n ? `média ${fmt1(est.media)} de 5` : "ninguém deu ainda", compara(est.n, media?.estrelas));
    card("chat", "Comentários", numero(coment), "", compara(coment, media?.comentarios));
    card("salvo", "Salvos", salvos == null ? "—" : numero(salvos), "só você vê quantos");
    // Até 100%: porcentagem; acima disso (a mesma conta deu estrela, comentou e salvou), "x por conta".
    const valorTaxa = taxa == null ? "—" : taxa <= 1 ? pct(taxa) : `${fmt1(taxa)}×`;
    card("coracao", "Engajamento", valorTaxa, taxa == null ? "interações ÷ alcance" : `${numero(inter)} ${inter === 1 ? "interação" : "interações"} de ${numero(alcance)} ${alcance === 1 ? "conta" : "contas"}`);
    corpo.appendChild(cards);
    if (alcance == null) corpo.appendChild(el("p", "pub-dica", "Alcance e salvos começam a contar quando as regras novas forem publicadas."));
    if (media) corpo.appendChild(el("p", "pub-dica", media.n === 1 ? "Comparado com a sua publicação anterior." : `Comparado com a média das suas ${media.n} últimas publicações.`));

    // ---------- dicas ----------
    const dicas = [];
    const origemTop = vistas?.length ? ORIGENS.map(([k, r]) => [r, vistas.filter((v) => v.origem === k).length]).sort((a, b) => b[1] - a[1])[0] : null;
    if (media?.estrelas && est.n >= media.estrelas * 1.5 && est.n >= 3) dicas.push(`Esta publicação está indo ${fmt1(est.n / media.estrelas)}× melhor que a sua média em estrelas.`);
    if (origemTop && origemTop[1]) dicas.push(`A maior parte do alcance veio de “${origemTop[0]}” (${pct(origemTop[1] / vistas.length)}).`);
    const horas = vistas?.length ? horasMaisVistas(vistas) : null;
    if (horas) dicas.push(`Quem viu, viu mais por volta das ${horas}h. Publicar perto desse horário costuma dar mais alcance.`);
    if (taxa != null && alcance >= 10) dicas.push(taxa >= 0.15 ? "Ótima taxa de engajamento: quem vê, interage." : "Dica: termine o texto com uma pergunta para puxar comentários.");
    if (dicas.length) {
      const d = el("div", "estat-dicas"); d.appendChild(el("h3", null, "Destaques"));
      dicas.slice(0, 3).forEach((t) => { const l = el("p"); l.append(icone("estrela", "i xs"), document.createTextNode(t)); d.appendChild(l); });
      corpo.appendChild(d);
    }

    // ---------- evolução no tempo ----------
    const inicio = ms(post.criadoEm) || Date.now();
    const quando = (x) => ms(x.criadoEm) || 0;
    if (vistas?.length) corpo.appendChild(secaoGrafico("Alcance ao longo do tempo", "contas que viram, somadas", vistas.map(quando), inicio));
    const tempos = [...notas.map(quando), ...coms.map(quando)].filter(Boolean);
    if (tempos.length) corpo.appendChild(secaoGrafico("Interações ao longo do tempo", "estrelas e comentários, somados", tempos, inicio));
    if (vistas?.length >= 3) corpo.appendChild(secaoHoras(vistas));

    // ---------- barras ----------
    const secao = (titulo, linhas, total, cor) => {
      const s = el("div", "estat-secao"); s.appendChild(el("h3", null, titulo));
      const validas = linhas.filter(([, n]) => n);
      if (!total || !validas.length) { s.appendChild(el("p", "pub-dica", "Ainda sem dados.")); corpo.appendChild(s); return; }
      validas.forEach(([rot, n]) => {
        const l = el("div", "est-barra"); const tr = el("span", "trilho"); const i = el("i"); i.style.width = `${(n / total) * 100}%`; if (cor) i.style.background = cor; tr.appendChild(i);
        l.append(el("span", "rot largo", rot), tr, el("span", "qt", numero(n)), el("span", "pc", `${Math.round((n / total) * 100)}%`));
        l.title = `${rot}: ${numero(n)} (${Math.round((n / total) * 100)}%)`;
        s.appendChild(l);
      });
      corpo.appendChild(s);
    };
    if (est.n) secao("Distribuição das estrelas", [5, 4, 3, 2, 1].map((k) => [`${k} ${k === 1 ? "estrela" : "estrelas"}`, est.dist?.[k - 1] || 0]), est.n, "#f5b301");
    const ordenar = (l) => l.sort((a, b) => b[1] - a[1]);
    if (vistas) secao("De onde veio o alcance", ordenar(ORIGENS.map(([k, r]) => [r, vistas.filter((v) => v.origem === k).length])), vistas.length);
    if (vistas?.length) {
      const deSeg = vistas.filter((v) => seguidores.has(v.uid)).length;
      secao("Quem viu", [["Seus seguidores", deSeg], ["Quem não segue você", vistas.length - deSeg]], vistas.length);
    }
    const somaE = ORIGENS.reduce((a, [k]) => a + notas.filter((n) => n.origem === k).length, 0);
    secao("De onde vieram as estrelas", ordenar([...ORIGENS.map(([k, r]) => [r, notas.filter((n) => n.origem === k).length]), ["Antes desta atualização", Math.max(0, est.n - somaE)]]), est.n);
    const deSegE = notas.filter((n) => seguidores.has(n.uid)).length, deForaE = notas.filter((n) => n.uid !== eu.uid && !seguidores.has(n.uid)).length;
    secao("Quem deu estrelas", [["Seus seguidores", deSegE], ["Quem não segue você", deForaE], ["Você", notas.some((n) => n.uid === eu.uid) ? 1 : 0]], notas.length);
    corpo.appendChild(el("p", "pub-dica", "Alcance: cada conta conta uma vez, quando a publicação fica na tela por pelo menos 1 segundo. Você não entra na conta."));
  } catch (e) { corpo.replaceChildren(el("div", "lista-vazia", "Não foi possível calcular: " + erroAmigavel(e))); toast("Não foi possível calcular as estatísticas."); }
}

// Hora do dia com mais visualizações (só quando há uma hora que se destaca).
function horasMaisVistas(vistas) {
  const h = new Array(24).fill(0);
  vistas.forEach((v) => { const t = ms(v.criadoEm); if (t) h[new Date(t).getHours()]++; });
  const max = Math.max(...h);
  if (max < 3) return null;
  return h.indexOf(max);
}

// Gráfico de área (um só valor, somado no tempo), com linha guia e caixinha ao passar o dedo/mouse.
export function secaoGrafico(titulo, sub, tempos, inicio) {
  const s = el("div", "estat-secao");
  const cab = el("div", "estat-graf-cab"); cab.append(el("h3", null, titulo), el("small", null, sub));
  s.appendChild(cab);
  const agora = Date.now();
  const total = Math.max(1, agora - inicio);
  // Por hora até 3 dias; depois, por dia.
  const passo = total <= 72 * 3600e3 ? 3600e3 : 24 * 3600e3;
  const n = Math.min(60, Math.max(2, Math.ceil(total / passo)));
  const pontos = new Array(n).fill(0);
  tempos.forEach((t) => { const k = Math.min(n - 1, Math.max(0, Math.floor((t - inicio) / passo))); pontos[k]++; });
  for (let i = 1; i < n; i++) pontos[i] += pontos[i - 1];
  const W = 320, H = 120, P = 6;
  const max = Math.max(1, pontos[n - 1]);
  const x = (i) => P + (i / (n - 1)) * (W - 2 * P), y = (v) => H - 18 - (v / max) * (H - 30);
  const linha = pontos.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${linha} L${x(n - 1).toFixed(1)},${H - 18} L${x(0).toFixed(1)},${H - 18} Z`;
  const rotT = (i) => (passo === 3600e3 ? (i === 0 ? "publicou" : `${i}h`) : (i === 0 ? "dia 1" : `dia ${i + 1}`));
  const box = el("div", "estat-graf");
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${titulo}: ${pontos[n - 1]} no total">
    <line x1="${P}" x2="${W - P}" y1="${H - 18}" y2="${H - 18}" class="eixo"/>
    <line x1="${P}" x2="${W - P}" y1="${y(max)}" y2="${y(max)}" class="guia"/>
    <path d="${area}" class="area"/><path d="${linha}" class="linha"/>
    <line class="mira" y1="6" y2="${H - 18}" x1="0" x2="0" visibility="hidden"/>
    <circle class="ponto" r="4" cx="0" cy="0" visibility="hidden"/>
  </svg>`;
  const rotulos = el("div", "estat-graf-eixo"); rotulos.append(el("span", null, rotT(0)), el("span", null, passo === 3600e3 ? "agora" : "hoje"));
  const dica = el("div", "estat-graf-dica"); dica.hidden = true;
  box.append(dica);
  const topo = el("span", "estat-graf-max", numero(max)); box.appendChild(topo);
  const svg = box.querySelector("svg"), mira = svg.querySelector(".mira"), ponto = svg.querySelector(".ponto");
  const mover = (ev) => {
    const r = svg.getBoundingClientRect();
    const i = Math.round(((ev.clientX - r.left) / r.width * W - P) / (W - 2 * P) * (n - 1));
    const k = Math.min(n - 1, Math.max(0, i));
    mira.setAttribute("x1", x(k)); mira.setAttribute("x2", x(k)); mira.setAttribute("visibility", "visible");
    ponto.setAttribute("cx", x(k)); ponto.setAttribute("cy", y(pontos[k])); ponto.setAttribute("visibility", "visible");
    dica.hidden = false; dica.textContent = `${rotT(k)}: ${numero(pontos[k])}`;
    dica.style.left = `${(x(k) / W) * 100}%`;
  };
  const sair = () => { mira.setAttribute("visibility", "hidden"); ponto.setAttribute("visibility", "hidden"); dica.hidden = true; };
  svg.addEventListener("pointermove", mover); svg.addEventListener("pointerdown", mover); svg.addEventListener("pointerleave", sair);
  s.append(box, rotulos);
  return s;
}

// Horários do dia em que mais viram (24 colunas).
export function secaoHoras(vistas) {
  const s = el("div", "estat-secao");
  const cab = el("div", "estat-graf-cab"); cab.append(el("h3", null, "Horários em que mais viram"), el("small", null, "visualizações por hora do dia"));
  s.appendChild(cab);
  const h = new Array(24).fill(0);
  vistas.forEach((v) => { const t = ms(v.criadoEm); if (t) h[new Date(t).getHours()]++; });
  const max = Math.max(1, ...h), top = h.indexOf(Math.max(...h));
  const box = el("div", "estat-horas");
  h.forEach((v, i) => {
    const b = el("span", "col" + (i === top && v ? " top" : "")); const barra = el("i"); barra.style.height = `${Math.max(v ? 6 : 2, (v / max) * 100)}%`;
    b.appendChild(barra); b.title = `${i}h: ${v} ${v === 1 ? "visualização" : "visualizações"}`;
    box.appendChild(b);
  });
  const eixo = el("div", "estat-graf-eixo"); ["0h", "6h", "12h", "18h", "23h"].forEach((t) => eixo.appendChild(el("span", null, t)));
  s.append(box, eixo);
  return s;
}
