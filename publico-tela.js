// =====================================================
// Tela "Público da publicação" (formulário de publicar e ⋯ → Público da publicação)
// Quem vê, idade, gênero e lugar (Brasil, estados, cidades ou perto de um lugar). Grava em diario.publico
// (publico-alvo.js). As funções do rede.js chegam por parâmetro (ajuda), para não carregar o rede.js de novo.
// =====================================================
import { GENEROS, SEGUIDORES, IDADE_MIN, IDADE_MAX, RAIOS, resumoPublico, publicoParaGravar } from "./publico-alvo.js?v=1";
import { UFS, NOME_UF, cidadesDe, cidadePorCodigo, semAcento } from "./endereco.js?v=1";

const FAIXAS = [["", "", "Todas"], [18, "", "18+"], [18, 24, "18–24"], [25, 34, "25–34"], [35, 44, "35–44"], [45, 54, "45–54"], [55, "", "55+"]];
const LOCAIS = [["brasil", "Todo o Brasil"], ["estados", "Estados"], ["cidades", "Cidades"], ["perto", "Perto de um lugar"]];

// atual = diario.publico (ou null) · ajuda = { abrirLista, fecharFolha, el, icone, toast, posicaoDe, pedirLocalizacao, rotuloPosicao, dados }
// Devolve (Promise) o público limpo para gravar (null = todos) ou undefined se a pessoa fechou sem concluir.
export function escolherPublico(atual, ajuda) {
  const { abrirLista, fecharFolha, el, icone, toast, posicaoDe, pedirLocalizacao, rotuloPosicao, dados = {} } = ajuda;
  const x = JSON.parse(JSON.stringify(atual || {}));
  x.local ||= "brasil"; x.seguidores ||= "todos"; x.ufs ||= []; x.cidades ||= [];
  const nomes = new Map(); // código IBGE -> "Cidade/UF"
  return new Promise((resolver) => {
    const corpo = abrirLista("Público da publicação");
    let feito = false;
    const folha = document.getElementById("folhaLista");
    const aoFechar = () => { folha?.removeEventListener("fechada", aoFechar); if (!feito) resolver(undefined); };
    folha?.addEventListener("fechada", aoFechar);
    const caixa = el("div", "pa");
    corpo.replaceChildren(caixa);

    const secao = (ic, titulo, sub) => {
      const s = el("section", "pa-sec");
      const t = el("div", "pa-tit"); t.append(icone(ic, "i s"), el("strong", null, titulo));
      s.appendChild(t); if (sub) s.appendChild(el("small", "pa-sub", sub));
      caixa.appendChild(s); return s;
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
    const resumo = el("div", "pa-resumo");
    const nomeCidade = (c) => nomes.get(String(c)) || c;

    function pintar() {
      caixa.replaceChildren();
      // Quem vê
      secao("pessoa-mais", "Quem vê", "Entre quem já segue você e quem ainda não segue")
        .appendChild(chips(SEGUIDORES, (v) => x.seguidores === v, (v) => { x.seguidores = v; }));
      // Idade
      const sId = secao("relogio", "Idade", "Pela data de nascimento da conta. A conta no Help Floripa é a partir de 16 anos.");
      sId.appendChild(chips(FAIXAS.map(([a, b, n]) => [`${a}-${b}`, n]), (v) => v === `${x.idadeMin || ""}-${x.idadeMax || ""}`, (v) => { const [a, b] = v.split("-"); x.idadeMin = a ? Number(a) : ""; x.idadeMax = b ? Number(b) : ""; }));
      const faixa = el("div", "pa-idade");
      const sel = (valor, rot, ehMax) => {
        const s = document.createElement("select"); s.setAttribute("aria-label", rot);
        const o0 = new Option(ehMax ? "Sem limite" : "16", ""); s.appendChild(o0);
        for (let i = IDADE_MIN; i <= 65; i++) s.appendChild(new Option(String(i), String(i)));
        s.value = valor ? String(valor) : "";
        s.addEventListener("change", () => { if (ehMax) x.idadeMax = s.value ? Number(s.value) : ""; else x.idadeMin = s.value ? Number(s.value) : ""; pintar(); });
        return s;
      };
      faixa.append(el("span", null, "De"), sel(x.idadeMin, "Idade mínima", false), el("span", null, "até"), sel(x.idadeMax, "Idade máxima", true), el("span", null, "anos"));
      sId.appendChild(faixa);
      // Gênero
      secao("pessoa-mais", "Gênero", "Quem informou o gênero nas Configurações.")
        .appendChild(chips([["", "Todos"], ...GENEROS], (v) => (x.genero || "") === v, (v) => { x.genero = v; }));
      // Lugar
      const sL = secao("local", "Lugar", "Pelo lugar que a pessoa escolheu no site (\"Você está em\") ou a cidade do perfil.");
      sL.appendChild(chips(LOCAIS, (v) => x.local === v, (v) => { x.local = v; }));
      if (x.local === "estados") {
        sL.appendChild(chips(UFS.map(([u]) => [u, u]), (u) => x.ufs.includes(u), (u) => { x.ufs = x.ufs.includes(u) ? x.ufs.filter((y) => y !== u) : [...x.ufs, u]; }, "pa-ufs"));
        sL.appendChild(el("small", "pa-sub", x.ufs.length ? x.ufs.map((u) => NOME_UF[u]).join(", ") : "Toque nos estados (um ou vários)."));
      }
      if (x.local === "cidades") sL.appendChild(blocoCidades());
      if (x.local === "perto") sL.appendChild(blocoPerto());
      resumo.replaceChildren(el("small", null, "Quem vai ver"), el("strong", null, resumoPublico(publicoParaGravar(x) || {}, nomeCidade)));
      caixa.appendChild(resumo);
      caixa.appendChild(el("p", "pa-nota", "Vale no Diário, no Explorar e nos Reels. No seu perfil e pelo link da publicação, todos continuam vendo. Quem não informou a idade ou o gênero não vê publicações com esse filtro."));
      const acoes = el("div", "pa-acoes");
      const limpar = el("button", "btn sec", "Para todos"); limpar.type = "button";
      limpar.addEventListener("click", () => concluir(null));
      const ok = el("button", "btn pri", "Concluir"); ok.type = "button";
      ok.addEventListener("click", () => {
        if (x.local === "estados" && !x.ufs.length) { toast("Escolha pelo menos um estado ou volte para Todo o Brasil."); return; }
        if (x.local === "cidades" && !x.cidades.length) { toast("Adicione pelo menos uma cidade ou volte para Todo o Brasil."); return; }
        if (x.local === "perto" && !x.perto) { toast("Escolha o lugar do centro."); return; }
        concluir(publicoParaGravar(x));
      });
      acoes.append(limpar, ok);
      caixa.appendChild(acoes);
    }
    function concluir(v) { feito = true; resolver(v); fecharFolha("folhaLista"); }

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
      const campo = el("input"); campo.type = "search"; campo.placeholder = "Digite a cidade"; campo.setAttribute("aria-label", "Cidade"); campo.autocomplete = "off";
      const sug = el("div", "pa-sug");
      const buscar = async () => {
        const q = semAcento(campo.value); sug.replaceChildren();
        if (q.length < 2) return;
        const l = (await cidadesDe(uf.value).catch(() => [])).filter((c) => c.k.includes(q)).sort((a, b) => (b.k.startsWith(q) - a.k.startsWith(q)) || b.pop - a.pop).slice(0, 6);
        l.forEach((c) => {
          const b = el("button", "pa-sug-it", `${c.nome}/${uf.value}`); b.type = "button";
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
    // Perto de um lugar: a sua cidade ou a sua localização, e o raio em km.
    function blocoPerto() {
      const w = el("div", "pa-perto");
      const atualTxt = el("p", "pa-centro", x.perto ? `Centro: ${x.perto.nome || "lugar escolhido"}` : "Escolha o centro:");
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
      w.append(atualTxt, botoes);
      if (x.perto) {
        w.appendChild(el("small", "pa-sub", "Raio"));
        w.appendChild(chips(RAIOS.map((k) => [k, `${k} km`]), (k) => x.perto.km === k, (k) => { x.perto.km = k; }));
      }
      return w;
    }
    pintar();
  });
}
