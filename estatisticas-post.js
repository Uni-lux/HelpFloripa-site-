// =====================================================
// Estatísticas da publicação (só o autor): alcance, estrelas, comentários, salvos e de onde vieram.
// Tudo por contagem no servidor (getCountFromServer): não lê os documentos um a um.
// - alcance: diario/{id}/vistas/{uid} (uma por conta, com a origem: principais, seguindo, amigos, perfil...)
// - salvos: salvamentos (o autor vê quantos, não quem)
// - origem das estrelas: curtidas.origem; seguidores × não seguidores: compara com quem segue o autor
// =====================================================
import { $, el, fb, eu, numero, toast, erroAmigavel, criarFolha, abrirFolha, infoEstrelas, contarComentarios } from "./rede.js?v=35";

const ORIGENS = [["principais", "Principais"], ["seguindo", "Quem segue você"], ["amigos", "Amigos"], ["perfil", "Seu perfil"], ["link", "Link compartilhado"], ["tag", "Hashtags"], ["salvos", "Salvos"]];
const contar = (q) => fb.getCountFromServer(q).then((s) => s.data().count).catch(() => null);

export async function abrirEstatisticas(post) {
  if (post.autorId !== eu.uid) return;
  criarFolha("folhaEstat", { titulo: "Estatísticas da publicação", corpoClasse: "folha-corpo pad" });
  const corpo = $("c_folhaEstat");
  corpo.replaceChildren(el("div", "lista-vazia", "Calculando..."));
  abrirFolha("folhaEstat");
  try {
    const vistas = fb.collection(fb.db, "diario", post.id, "vistas");
    const curt = fb.collection(fb.db, "curtidas");
    const [alcance, est, coment, salvos, porOrigemV, porOrigemE, seguidores] = await Promise.all([
      contar(vistas),
      infoEstrelas(post.id, { recarregar: true }),
      contarComentarios(post.id, { recarregar: true }).catch(() => 0),
      contar(fb.query(fb.collection(fb.db, "salvamentos"), fb.where("postId", "==", post.id), fb.where("postAutorId", "==", eu.uid))),
      Promise.all(ORIGENS.map(([k]) => contar(fb.query(vistas, fb.where("origem", "==", k))))),
      Promise.all(ORIGENS.map(([k]) => contar(fb.query(curt, fb.where("postId", "==", post.id), fb.where("origem", "==", k))))),
      fb.getDocs(fb.query(fb.collection(fb.db, "relacoes"), fb.where("tipo", "==", "seguir"), fb.where("alvoId", "==", eu.uid), fb.limit(2000))).then((s) => new Set(s.docs.map((d) => d.data().seguidorId))).catch(() => new Set())
    ]);
    // Quem deu estrelas: seguidores × não seguidores (até 1.000 notas lidas).
    const notas = await fb.getDocs(fb.query(curt, fb.where("postId", "==", post.id), fb.limit(1000))).then((s) => s.docs.map((d) => d.data())).catch(() => []);
    const deSeg = notas.filter((n) => seguidores.has(n.uid)).length, deFora = notas.filter((n) => n.uid !== eu.uid && !seguidores.has(n.uid)).length;
    corpo.replaceChildren();
    // Números principais
    const cards = el("div", "estat-cards");
    const card = (rot, val, sub = "") => { const c = el("div", "estat-card"); c.append(el("strong", null, val), el("span", null, rot)); if (sub) c.appendChild(el("small", null, sub)); cards.appendChild(c); };
    const alc = alcance ?? 0;
    card("Alcance", alcance == null ? "—" : numero(alc), "contas que viram");
    card("Estrelas", numero(est.n), est.n ? `média ${est.media.toFixed(1).replace(".", ",")}` : "ninguém deu ainda");
    card("Comentários", numero(coment));
    card("Salvos", salvos == null ? "—" : numero(salvos));
    const inter = est.n + coment + (salvos || 0);
    card("Interações", numero(inter), alc ? `${(inter / alc).toFixed(1).replace(".", ",")} por conta que viu` : "estrelas, comentários e salvos");
    corpo.appendChild(cards);
    if (alcance == null) corpo.appendChild(el("p", "pub-dica", "Alcance e salvos começam a contar quando as regras novas forem publicadas."));
    // Barras
    const secao = (titulo, linhas, total) => {
      const s = el("div", "estat-secao"); s.appendChild(el("h3", null, titulo));
      const validas = linhas.filter(([, n]) => n);
      if (!total || !validas.length) { s.appendChild(el("p", "pub-dica", "Ainda sem dados.")); corpo.appendChild(s); return; }
      validas.sort((a, b) => b[1] - a[1]).forEach(([rot, n]) => {
        const l = el("div", "est-barra"); const tr = el("span", "trilho"); const i = el("i"); i.style.width = `${(n / total) * 100}%`; tr.appendChild(i);
        l.append(el("span", "rot largo", rot), tr, el("span", "qt", numero(n)), el("span", "pc", `${Math.round((n / total) * 100)}%`));
        s.appendChild(l);
      });
      corpo.appendChild(s);
    };
    const somaE = porOrigemE.reduce((a, n) => a + (n || 0), 0);
    secao("De onde vieram as estrelas", [...ORIGENS.map(([, r], i) => [r, porOrigemE[i] || 0]), ["Antes desta atualização", Math.max(0, est.n - somaE)]], est.n);
    secao("Quem deu estrelas", [["Seus seguidores", deSeg], ["Quem não segue você", deFora], ["Você", notas.some((n) => n.uid === eu.uid) ? 1 : 0]], notas.length);
    secao("Alcance por origem", ORIGENS.map(([, r], i) => [r, porOrigemV[i] || 0]), alc);
    corpo.appendChild(el("p", "pub-dica", "Alcance: cada conta conta uma vez, quando a publicação fica na tela por pelo menos 1 segundo. Você não entra na conta."));
  } catch (e) { corpo.replaceChildren(el("div", "lista-vazia", "Não foi possível calcular: " + erroAmigavel(e))); toast("Não foi possível calcular as estatísticas."); }
}
