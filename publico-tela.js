// =====================================================
// Página "Público da publicação" (como o "Promover" do Instagram), em tela cheia:
// - Automático (para todos) ou Personalizado: quem vê (seguidores), localização (Brasil, estados, cidades ou um raio),
//   idade (faixas prontas ou de/até) e gênero.
// - Alcance estimado com dados reais: contas com perfil no lugar escolhido (contagem no servidor, perfis_publicos por
//   uf/cidadeIbge; raio = cidades cujo centro está dentro dele), seus seguidores; idade e gênero não são públicos, então
//   só reduzem (o texto diz isso).
// - Públicos salvos (usuarios.publicosSalvos, até 10) para usar de novo.
// Grava em diario.publico (publico-alvo.js). As funções do rede.js chegam por parâmetro (ajuda), para não carregar o
// rede.js de novo. Devolve (Promise) o público para gravar (null = todos) ou undefined se fechou sem concluir.
// =====================================================
import { GENEROS, SEGUIDORES, IDADE_MIN, RAIOS, resumoPublico, publicoParaGravar, temPublico } from "./publico-alvo.js?v=1";
import { UFS, NOME_UF, cidadesDe, cidadePorCodigo, semAcento } from "./endereco.js?v=1";
import { carregarCidades, distanciaKm } from "./perto.js?v=2";

const FAIXAS = [["", "", "Todas as idades"], [18, "", "18+"], [18, 24, "18–24"], [25, 34, "25–34"], [35, 44, "35–44"], [45, 54, "45–54"], [55, "", "55+"]];
const LOCAIS = [["brasil", "Todo o Brasil", "local"], ["estados", "Estados", "grade"], ["cidades", "Cidades", "casa"], ["perto", "Raio", "pin"]];
const IDADE_TOPO = 65; // "65+" no controle = sem limite
const num = (n) => Number(n || 0).toLocaleString("pt-BR");
const cacheAlcance = new Map();

// ---------- alcance estimado (contagens no servidor) ----------
async function contar(fb, filtros) {
  const q = fb.query(fb.collection(fb.db, "perfis_publicos"), ...filtros);
  return (await fb.getCountFromServer(q)).data().count;
}
async function emLotes(fb, campo, valores) {
  let total = 0;
  for (let i = 0; i < valores.length && i < 300; i += 30) total += await contar(fb, [fb.where(campo, "in", valores.slice(i, i + 30))]);
  return total;
}
async function cidadesNoRaio(perto) {
  const geo = await carregarCidades();
  return Object.entries(geo).filter(([, [lat, lng]]) => distanciaKm(perto, { lat, lng }) <= perto.km).map(([c]) => Number(c));
}
let totalBr = null;
const totalBrasil = (fb) => (totalBr ||= contar(fb, []).catch((e) => { totalBr = null; throw e; }));
export async function estimarAlcance(fb, x, uid) {
  const p = publicoParaGravar(x) || {};
  const chave = JSON.stringify([p.local, p.ufs, p.cidades, p.perto, p.seguidores]);
  if (cacheAlcance.has(chave)) return cacheAlcance.get(chave);
  const r = (async () => {
    let lugar, muitas = false;
    if (p.local === "estados") lugar = await emLotes(fb, "uf", p.ufs);
    else if (p.local === "cidades") lugar = await emLotes(fb, "cidadeIbge", p.cidades.map(Number));
    else if (p.local === "perto") { const c = await cidadesNoRaio(p.perto); muitas = c.length > 300; lugar = c.length ? await emLotes(fb, "cidadeIbge", c) : 0; }
    else lugar = await contar(fb, []);
    let seg = null;
    if (p.seguidores && uid) seg = (await fb.getCountFromServer(fb.query(fb.collection(fb.db, "relacoes"), fb.where("tipo", "==", "seguir"), fb.where("alvoId", "==", uid)))).data().count;
    const n = p.seguidores === "seguidores" ? Math.min(lugar, seg ?? lugar) : p.seguidores === "novos" ? Math.max(0, lugar - (seg || 0)) : lugar;
    const total = p.local && p.local !== "brasil" ? await totalBrasil(fb) : lugar;
    return { n, lugar, seg, muitas, total, reduz: !!(p.idadeMin || p.idadeMax || p.genero) };
  })();
  cacheAlcance.set(chave, r);
  r.catch(() => cacheAlcance.delete(chave));
  return r;
}

// ajuda = { el, icone, toast, fb, uid, dados, salvarConta(campos), posicaoDe, pedirLocalizacao, rotuloPosicao }
export function escolherPublico(atual, ajuda) {
  const { el, icone, toast, fb, uid, dados = {}, salvarConta, posicaoDe, pedirLocalizacao, rotuloPosicao } = ajuda;
  const x = JSON.parse(JSON.stringify(atual || {}));
  x.local ||= "brasil"; x.seguidores ||= "todos"; x.ufs ||= []; x.cidades ||= [];
  let modo = temPublico({ publico: atual }) ? "personalizado" : "automatico";
  const nomes = new Map(); // código IBGE -> "Cidade/UF"
  const nomeCidade = (c) => nomes.get(String(c)) || c;
  return new Promise((resolver) => {
    const pagina = el("div", "pa-pagina"); pagina.setAttribute("role", "dialog"); pagina.setAttribute("aria-modal", "true"); pagina.setAttribute("aria-label", "Público da publicação");
    const topo = el("header", "pa-topo");
    const voltar = el("button", "pa-voltar"); voltar.type = "button"; voltar.setAttribute("aria-label", "Voltar sem mudar"); voltar.setAttribute("data-fechar", ""); voltar.appendChild(icone("voltar", "i"));
    const tit = el("div", "pa-titulo"); tit.append(el("strong", null, "Público"), el("small", null, "Quem vê esta publicação no Diário"));
    const concluir = el("button", "btn pri pa-ok", "Concluir"); concluir.type = "button";
    topo.append(voltar, tit, concluir);
    const corpo = el("div", "pa-corpo");
    pagina.append(topo, corpo);
    document.body.appendChild(pagina);
    document.body.classList.add("travado");
    let feito = false;
    const fechar = (v) => {
      if (feito) return; feito = true;
      document.removeEventListener("keydown", esc, true);
      pagina.remove();
      if (!document.querySelector(".folha.aberta, .visor-exp, .reels")) document.body.classList.remove("travado");
      resolver(v);
    };
    voltar.addEventListener("click", () => fechar(undefined));
    // Esc (e o "voltar" do celular, que o voltar.js manda como Esc) fecha só esta página, não o formulário de baixo.
    const esc = (e) => { if (e.key === "Escape" && !document.querySelector(".hfc")) { e.preventDefault(); e.stopPropagation(); fechar(undefined); } };
    document.addEventListener("keydown", esc, true);
    concluir.addEventListener("click", () => {
      if (modo === "automatico") return fechar(null);
      if (x.local === "estados" && !x.ufs.length) return toast("Escolha pelo menos um estado ou volte para Todo o Brasil.");
      if (x.local === "cidades" && !x.cidades.length) return toast("Adicione pelo menos uma cidade ou volte para Todo o Brasil.");
      if (x.local === "perto" && !x.perto) return toast("Escolha o centro do raio.");
      fechar(publicoParaGravar(x));
    });
    // A página sai também pelo "voltar" do celular (voltar.js clica no [data-fechar]).
    const obs = new MutationObserver(() => { if (!pagina.isConnected) { obs.disconnect(); if (!feito) { feito = true; document.removeEventListener("keydown", esc, true); resolver(undefined); } } });
    obs.observe(document.body, { childList: true });

    const secao = (ic, titulo, sub) => {
      const s = el("section", "pa-sec");
      const t = el("div", "pa-tit"); const i = el("span", "pa-ic"); i.appendChild(icone(ic, "i s")); t.append(i, el("strong", null, titulo));
      s.appendChild(t); if (sub) s.appendChild(el("p", "pa-sub", sub));
      corpo.appendChild(s); return s;
    };
    const chips = (lista, ativo, aoEscolher, classe = "") => {
      const w = el("div", "pa-chips " + classe);
      lista.forEach(([v, nome]) => {
        const b = el("button", "pa-chip", nome); b.type = "button";
        b.setAttribute("aria-pressed", String(ativo(v)));
        b.addEventListener("click", () => { aoEscolher(v); pintar(); });
        w.appendChild(b);
      });
      return w;
    };
    const opcaoGrande = (v, titulo, texto, ic, ativo, aoEscolher) => {
      const b = el("button", "pa-opcao"); b.type = "button"; b.setAttribute("aria-pressed", String(ativo));
      const i = el("span", "pa-opcao-ic"); i.appendChild(icone(ic, "i"));
      const t = el("span", "pa-opcao-tx"); t.append(el("strong", null, titulo), el("small", null, texto));
      const r = el("span", "pa-radio");
      b.append(i, t, r); b.addEventListener("click", () => { aoEscolher(v); pintar(); });
      return b;
    };

    // ---------- resumo e alcance ----------
    const resumo = el("div", "pa-resumo");
    const rTit = el("small", null, "Quem vai ver"), rTx = el("strong"), rAlc = el("div", "pa-alcance"), rNota = el("p", "pa-alc-nota");
    resumo.append(rTit, rTx, rAlc);
    let vezAlcance = 0;
    function pintarAlcance() {
      const minha = ++vezAlcance;
      const pub = modo === "automatico" ? null : publicoParaGravar(x);
      rTx.textContent = modo === "automatico" ? "Todos, em todo o Brasil" : resumoPublico(pub || {}, nomeCidade);
      rAlc.replaceChildren(el("span", "pa-alc-n", "…"), el("span", "pa-alc-rot", "calculando o alcance"));
      rNota.textContent = "";
      if (!fb) { rAlc.replaceChildren(); return; }
      if (modo === "personalizado" && ((x.local === "estados" && !x.ufs.length) || (x.local === "cidades" && !x.cidades.length) || (x.local === "perto" && !x.perto))) {
        rAlc.replaceChildren(el("span", "pa-alc-rot", "Escolha o lugar para ver o alcance")); return;
      }
      estimarAlcance(fb, modo === "automatico" ? {} : x, uid).then((a) => {
        if (minha !== vezAlcance) return;
        const barra = el("div", "pa-alc-barra"); const enche = el("i"); barra.appendChild(enche);
        enche.style.width = Math.max(3, Math.min(100, (a.n / Math.max(1, a.total || a.n || 1)) * 100)) + "%";
        barra.title = `${num(a.n)} de ${num(a.total)} contas no Brasil`;
        rAlc.replaceChildren(el("span", "pa-alc-n", (a.reduz ? "até " : "") + num(a.n)), el("span", "pa-alc-rot", a.n === 1 ? "conta com perfil" : "contas com perfil"), barra);
        const notas = [];
        if (modo === "personalizado" && x.seguidores === "seguidores") notas.push(`Você tem ${num(a.seg)} ${a.seg === 1 ? "seguidor" : "seguidores"}.`);
        if (a.reduz) notas.push("Idade e gênero diminuem esse número: só entra quem informou.");
        if (a.muitas) notas.push("Raio grande: contamos as 300 cidades mais próximas.");
        notas.push("Estimativa pelas contas com cidade no perfil. Pessoas que escolheram outro lugar no site também podem ver.");
        rNota.textContent = notas.join(" ");
      }).catch(() => { if (minha === vezAlcance) rAlc.replaceChildren(el("span", "pa-alc-rot", "Não foi possível calcular o alcance agora.")); });
    }

    // ---------- públicos salvos ----------
    const salvos = () => (Array.isArray(dados.publicosSalvos) ? dados.publicosSalvos : []).filter((s) => s?.nome && s.p).slice(0, 10);
    async function gravarSalvos(lista) {
      dados.publicosSalvos = lista;
      try { await salvarConta?.({ publicosSalvos: lista }); } catch { toast("Não foi possível salvar o público."); }
    }

    function pintar() {
      corpo.replaceChildren(resumo, rNota);
      pintarAlcance();
      // Públicos salvos
      const ls = salvos();
      if (ls.length) {
        const s = secao("salvo", "Seus públicos salvos");
        const w = el("div", "pa-salvos");
        ls.forEach((sv, i) => {
          const b = el("button", "pa-salvo"); b.type = "button";
          b.append(el("strong", null, sv.nome), el("small", null, resumoPublico(sv.p, nomeCidade)));
          b.addEventListener("click", () => { Object.assign(x, { idadeMin: "", idadeMax: "", genero: "", local: "brasil", ufs: [], cidades: [], perto: null, seguidores: "todos" }, JSON.parse(JSON.stringify(sv.p))); x.ufs ||= []; x.cidades ||= []; modo = "personalizado"; pintar(); });
          const apagar = el("button", "pa-salvo-x"); apagar.type = "button"; apagar.setAttribute("aria-label", `Apagar o público ${sv.nome}`); apagar.appendChild(icone("fechar", "i xs"));
          apagar.addEventListener("click", (e) => { e.stopPropagation(); gravarSalvos(ls.filter((_, k) => k !== i)); pintar(); });
          const it = el("div", "pa-salvo-it"); it.append(b, apagar); w.appendChild(it);
        });
        s.appendChild(w);
      }
      // Modo
      const sm = secao("pessoa-mais", "Tipo de público");
      const gm = el("div", "pa-opcoes");
      gm.append(
        opcaoGrande("automatico", "Automático", "Para todos, em todo o Brasil. O Diário mostra a quem combinar mais.", "estrela", modo === "automatico", (v) => { modo = v; }),
        opcaoGrande("personalizado", "Personalizado", "Você escolhe quem vê: lugar, idade, gênero e seguidores.", "config", modo === "personalizado", (v) => { modo = v; })
      );
      sm.appendChild(gm);
      if (modo === "personalizado") {
        // Quem vê
        const sq = secao("pessoa-mais", "Quem vê", "Entre quem já segue você e quem ainda não segue.");
        const gq = el("div", "pa-opcoes");
        const desc = { todos: "Seguidores e quem ainda não segue você", seguidores: "Só quem já segue você", novos: "Só quem ainda não segue (para conquistar seguidores)" };
        SEGUIDORES.forEach(([v, nome]) => gq.appendChild(opcaoGrande(v, nome, desc[v], v === "novos" ? "pessoa-mais" : "olho", x.seguidores === v, (k) => { x.seguidores = k; })));
        sq.appendChild(gq);
        // Localização
        const sl = secao("local", "Localização", "Pelo lugar que a pessoa escolheu no site (\"Você está em\") ou a cidade do perfil.");
        const abas = el("div", "pa-abas"); abas.setAttribute("role", "tablist");
        LOCAIS.forEach(([v, nome, ic]) => {
          const b = el("button", "pa-aba"); b.type = "button"; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", String(x.local === v));
          b.append(icone(ic, "i xs"), document.createTextNode(nome));
          b.addEventListener("click", () => { x.local = v; pintar(); });
          abas.appendChild(b);
        });
        sl.appendChild(abas);
        if (x.local === "brasil") sl.appendChild(el("p", "pa-sub", "Todos os estados e cidades."));
        if (x.local === "estados") sl.appendChild(blocoEstados());
        if (x.local === "cidades") sl.appendChild(blocoCidades());
        if (x.local === "perto") sl.appendChild(blocoPerto());
        // Idade
        const si = secao("relogio", "Idade", "Pela data de nascimento da conta (a conta no Help Floripa é a partir de 16 anos).");
        si.appendChild(chips(FAIXAS.map(([a, b, n]) => [`${a}-${b}`, n]), (v) => v === `${x.idadeMin || ""}-${x.idadeMax || ""}`, (v) => { const [a, b] = v.split("-"); x.idadeMin = a ? Number(a) : ""; x.idadeMax = b ? Number(b) : ""; }));
        si.appendChild(blocoIdade());
        // Gênero
        const sg = secao("pessoa-mais", "Gênero", "De quem informou o gênero nas Configurações (privado).");
        sg.appendChild(chips([["", "Todos"], ...GENEROS], (v) => (x.genero || "") === v, (v) => { x.genero = v; }, "pa-seg"));
        // Salvar este público
        const sv = secao("salvo", "Salvar este público", "Para usar de novo nas próximas publicações.");
        const f = el("form", "pa-salvar");
        const nome = el("input"); nome.type = "text"; nome.maxLength = 30; nome.placeholder = "Ex.: Clientes de SC"; nome.setAttribute("aria-label", "Nome do público");
        const ok = el("button", "btn sec", "Salvar"); ok.type = "submit";
        f.append(nome, ok); sv.appendChild(f);
        f.addEventListener("submit", async (e) => {
          e.preventDefault();
          const p = publicoParaGravar(x), n = nome.value.trim();
          if (!p) return toast("Escolha pelo menos uma opção para salvar.");
          if (!n) return toast("Dê um nome ao público.");
          await gravarSalvos([{ nome: n.slice(0, 30), p }, ...salvos().filter((s) => s.nome !== n)].slice(0, 10));
          toast("Público salvo"); pintar();
        });
      }
      corpo.appendChild(el("p", "pa-nota", "Vale no Diário, no Explorar e nos Reels. No seu perfil e pelo link da publicação, todos continuam vendo. Quem publica não fica sabendo a idade ou o gênero de ninguém: a conferência é feita no aparelho de quem lê."));
    }

    function blocoEstados() {
      const w = el("div", "pa-estados");
      const busca = el("input", "pa-busca"); busca.type = "search"; busca.placeholder = "Buscar estado"; busca.setAttribute("aria-label", "Buscar estado");
      const grade = el("div", "pa-chips pa-ufs");
      const desenhar = () => {
        const q = semAcento(busca.value);
        grade.replaceChildren(...UFS.filter(([u, n]) => !q || semAcento(n).includes(q) || u.toLowerCase() === q).map(([u, n]) => {
          const b = el("button", "pa-chip", u); b.type = "button"; b.title = n; b.setAttribute("aria-pressed", String(x.ufs.includes(u)));
          b.addEventListener("click", () => { x.ufs = x.ufs.includes(u) ? x.ufs.filter((y) => y !== u) : [...x.ufs, u]; pintar(); });
          return b;
        }));
      };
      busca.addEventListener("input", desenhar); desenhar();
      const todos = el("div", "pa-linha-acoes");
      const sul = el("button", "pa-link", "Sul"); sul.type = "button"; sul.addEventListener("click", () => { x.ufs = [...new Set([...x.ufs, "PR", "SC", "RS"])]; pintar(); });
      const sud = el("button", "pa-link", "Sudeste"); sud.type = "button"; sud.addEventListener("click", () => { x.ufs = [...new Set([...x.ufs, "SP", "RJ", "MG", "ES"])]; pintar(); });
      const limpar = el("button", "pa-link", "Limpar"); limpar.type = "button"; limpar.addEventListener("click", () => { x.ufs = []; pintar(); });
      todos.append(sul, sud, limpar);
      w.append(busca, todos, grade, el("small", "pa-sub", x.ufs.length ? x.ufs.map((u) => NOME_UF[u]).join(", ") : "Toque nos estados (um ou vários)."));
      return w;
    }
    // Cidades: escolher o estado e digitar a cidade (até 10).
    function blocoCidades() {
      const w = el("div", "pa-cidades");
      const lista = el("div", "pa-escolhidas");
      x.cidades.forEach((c) => {
        const ch = el("span", "chip-extra", nomeCidade(c));
        const b = el("button", null, "×"); b.type = "button"; b.setAttribute("aria-label", `Tirar ${nomeCidade(c)}`);
        b.addEventListener("click", () => { x.cidades = x.cidades.filter((y) => y !== c); pintar(); });
        ch.appendChild(b); lista.appendChild(ch);
        if (!nomes.has(String(c))) cidadePorCodigo(c).then((r) => { if (r) { nomes.set(String(c), `${r.cidade}/${r.uf}`); pintar(); } }).catch(() => {});
      });
      if (x.cidades.length >= 10) { w.append(lista, el("small", "pa-sub", "Até 10 cidades.")); return w; }
      const linha = el("div", "pa-cid-linha");
      const uf = document.createElement("select"); uf.setAttribute("aria-label", "Estado da cidade");
      UFS.forEach(([u, n]) => uf.appendChild(new Option(`${n} (${u})`, u)));
      uf.value = x._uf || dados.uf || "SC";
      const campo = el("input", "pa-busca"); campo.type = "search"; campo.placeholder = "Digite a cidade"; campo.setAttribute("aria-label", "Cidade"); campo.autocomplete = "off";
      const sug = el("div", "pa-sug");
      const buscar = async () => {
        const q = semAcento(campo.value); sug.replaceChildren();
        if (q.length < 2) return;
        const l = (await cidadesDe(uf.value).catch(() => [])).filter((c) => c.k.includes(q)).sort((a, b) => (b.k.startsWith(q) - a.k.startsWith(q)) || b.pop - a.pop).slice(0, 6);
        l.forEach((c) => {
          const b = el("button", "pa-sug-it"); b.type = "button"; b.append(icone("local", "i xs"), document.createTextNode(`${c.nome}/${uf.value}`));
          b.addEventListener("click", () => { const k = String(c.codigo); nomes.set(k, `${c.nome}/${uf.value}`); if (!x.cidades.includes(k)) x.cidades = [...x.cidades, k]; x._uf = uf.value; pintar(); });
          sug.appendChild(b);
        });
        if (!l.length) sug.appendChild(el("small", "pa-sub", "Nenhuma cidade com esse nome neste estado."));
      };
      campo.addEventListener("input", buscar);
      uf.addEventListener("change", () => { x._uf = uf.value; buscar(); });
      linha.append(uf, campo);
      w.append(lista, linha, sug);
      return w;
    }
    // Raio: a sua cidade ou a sua localização, e a distância.
    function blocoPerto() {
      const w = el("div", "pa-perto");
      const centro = el("div", "pa-centro");
      centro.append(icone("pin", "i s"), el("span", null, x.perto ? `Centro: ${x.perto.nome || "lugar escolhido"}` : "Escolha o centro do raio"));
      const botoes = el("div", "pa-chips");
      const usar = (p, nome) => { x.perto = { lat: p.lat, lng: p.lng, km: x.perto?.km || 25, nome }; pintar(); };
      const bCid = el("button", "pa-chip", "Minha cidade"); bCid.type = "button";
      bCid.addEventListener("click", async () => {
        const p = await posicaoDe(dados).catch(() => null);
        if (!p) { toast("Sua cidade não está no perfil. Use a localização ou escolha cidades."); return; }
        usar(p, String(dados.cidade || "").split("/")[0] || "Sua cidade");
      });
      const bGps = el("button", "pa-chip", "Minha localização"); bGps.type = "button";
      bGps.addEventListener("click", async () => {
        try { toast("Localizando..."); const p = await pedirLocalizacao(); usar({ lat: p.lat, lng: p.lng }, (await rotuloPosicao(p).catch(() => "")) || "Perto de mim"); }
        catch (e) { toast(e?.message || "Não deu para pegar a sua localização."); }
      });
      botoes.append(bCid, bGps);
      w.append(centro, botoes);
      if (x.perto) {
        const k = el("div", "pa-raio");
        const rot = el("strong", null, `${x.perto.km} km`);
        const r = el("input"); r.type = "range"; r.min = "0"; r.max = String(RAIOS.length - 1); r.step = "1"; r.value = String(Math.max(0, RAIOS.indexOf(x.perto.km))); r.setAttribute("aria-label", "Raio em km");
        r.addEventListener("input", () => { rot.textContent = `${RAIOS[r.value]} km`; });
        r.addEventListener("change", () => { x.perto.km = RAIOS[r.value]; pintar(); });
        const marcas = el("div", "pa-raio-marcas"); RAIOS.forEach((n) => marcas.appendChild(el("span", null, String(n))));
        k.append(el("span", "pa-sub", "Raio"), rot, r, marcas);
        w.appendChild(k);
      }
      return w;
    }
    // Idade: dois controles (de / até), 65 = sem limite.
    function blocoIdade() {
      const w = el("div", "pa-idade");
      const min = Number(x.idadeMin) || IDADE_MIN, max = Number(x.idadeMax) || IDADE_TOPO;
      const rot = el("strong", "pa-idade-rot", `${min} a ${max >= IDADE_TOPO ? "65+" : max} anos`);
      const faixa = el("div", "pa-duplo");
      const a = el("input"); a.type = "range"; a.min = String(IDADE_MIN); a.max = String(IDADE_TOPO); a.value = String(min); a.setAttribute("aria-label", "Idade mínima");
      const b = el("input"); b.type = "range"; b.min = String(IDADE_MIN); b.max = String(IDADE_TOPO); b.value = String(max); b.setAttribute("aria-label", "Idade máxima");
      const pinta = () => { const va = Math.min(Number(a.value), Number(b.value)), vb = Math.max(Number(a.value), Number(b.value)); rot.textContent = `${va} a ${vb >= IDADE_TOPO ? "65+" : vb} anos`; faixa.style.setProperty("--de", ((va - IDADE_MIN) / (IDADE_TOPO - IDADE_MIN)) * 100 + "%"); faixa.style.setProperty("--ate", ((vb - IDADE_MIN) / (IDADE_TOPO - IDADE_MIN)) * 100 + "%"); };
      const grava = () => { const va = Math.min(Number(a.value), Number(b.value)), vb = Math.max(Number(a.value), Number(b.value)); x.idadeMin = va > IDADE_MIN ? va : ""; x.idadeMax = vb < IDADE_TOPO ? vb : ""; pintar(); };
      [a, b].forEach((i) => { i.addEventListener("input", pinta); i.addEventListener("change", grava); });
      faixa.append(el("span", "pa-duplo-trilho"), a, b);
      pinta();
      w.append(rot, faixa);
      return w;
    }
    pintar();
  });
}
