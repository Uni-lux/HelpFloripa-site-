// =====================================================
// Gosto da pessoa (Diário → Principais), como as redes fazem:
// cada interação dá pontos ao autor e às hashtags da publicação
// (estrelas, comentar, salvar, enviar, compartilhar, ficar olhando).
// Os pontos perdem metade do peso a cada 14 dias. Fica só no aparelho
// (localStorage "hf-gosto"), sem campo novo no Firebase; as estrelas
// já dadas (curtidas.uid) completam o gosto num aparelho novo.
// =====================================================
const CHAVE = "hf-gosto";
const MEIA_VIDA = 14 * 864e5;
const MAX_AUTORES = 300, MAX_TAGS = 200;

// Peso de cada interação (autor, hashtags).
export const PESO = {
  estrela: (n) => [0.6 * n, 0.4 * n],
  comentar: [3, 2],
  salvar: [3, 2.5],
  republicar: [3.5, 2.5], // republicou para os seguidores: o sinal mais forte de que gostou
  enviar: [2.5, 2],
  compartilhar: [2.5, 2],
  olhar: [0.6, 0.4],      // ficou alguns segundos na publicação
  abrir: [1, 0.5]         // abriu os comentários ou o perfil pela publicação
};

let g = null;
function ler() {
  if (g) return g;
  try { g = JSON.parse(localStorage.getItem(CHAVE) || "{}"); } catch { g = {}; }
  if (!g.a || typeof g.a !== "object") g.a = {};
  if (!g.t || typeof g.t !== "object") g.t = {};
  return g;
}
const valor = (x, agora = Date.now()) => (x ? x.v * Math.pow(0.5, Math.max(0, agora - x.t) / MEIA_VIDA) : 0);
function somar(mapa, chave, pontos, agora) {
  if (!chave || !pontos) return;
  const x = mapa[chave];
  mapa[chave] = { v: Math.min(500, valor(x, agora) + pontos), t: agora };
}
function podar(mapa, max) {
  const k = Object.keys(mapa);
  if (k.length <= max) return;
  k.sort((a, b) => valor(mapa[a]) - valor(mapa[b])).slice(0, k.length - max).forEach((x) => delete mapa[x]);
}
function guardar() {
  podar(g.a, MAX_AUTORES); podar(g.t, MAX_TAGS);
  try { localStorage.setItem(CHAVE, JSON.stringify(g)); } catch {}
}

// Registra uma interação com a publicação. peso = PESO.x ou [autor, tags].
export function registrarGosto(post, peso, euUid = "") {
  if (!post || !peso) return;
  ler();
  const agora = Date.now();
  const [pa, pt] = peso;
  if (post.autorId && post.autorId !== euUid) somar(g.a, post.autorId, pa, agora);
  (Array.isArray(post.tags) ? post.tags : []).slice(0, 10).forEach((t) => somar(g.t, String(t).toLowerCase(), pt / Math.max(1, Math.sqrt(post.tags.length)), agora));
  guardar();
}

// Afinidade com uma publicação (0 = nenhuma; cresce devagar, sem dominar o engajamento).
export function afinidade(post) {
  ler();
  const agora = Date.now();
  const a = valor(g.a[post.autorId], agora);
  const t = (Array.isArray(post.tags) ? post.tags : []).reduce((s, x) => s + valor(g.t[String(x).toLowerCase()], agora), 0);
  return Math.log1p(a) * 0.9 + Math.log1p(t) * 0.6;
}

// Aparelho novo (ou um dia depois): soma as estrelas que a pessoa já deu (curtidas.uid).
export async function sincronizarGosto(fb, uid) {
  ler();
  if (g.sync && g.sync.u === uid && Date.now() - g.sync.t < 864e5) return;
  try {
    const s = await fb.getDocs(fb.query(fb.collection(fb.db, "curtidas"), fb.where("uid", "==", uid), fb.limit(150)));
    const agora = Date.now();
    const vistos = new Set(g.sync?.u === uid ? g.sync.ids || [] : []);
    s.docs.forEach((d) => {
      if (vistos.has(d.id)) return;
      const x = d.data();
      if (!x.postAutorId || x.postAutorId === uid) return;
      const t = x.criadoEm?.toMillis?.() || agora;
      const v = 0.5 * (Number(x.nota) || 0);
      const velho = g.a[x.postAutorId];
      // Conta com a data em que a estrela foi dada (estrelas antigas pesam menos).
      const novo = valor(velho, t) + v;
      g.a[x.postAutorId] = { v: Math.min(500, novo * Math.pow(0.5, Math.max(0, agora - t) / MEIA_VIDA)), t: agora };
      vistos.add(d.id);
    });
    g.sync = { u: uid, t: agora, ids: [...vistos].slice(-300) };
    guardar();
  } catch { /* sem índice ou sem rede: fica com o gosto do aparelho */ }
}
