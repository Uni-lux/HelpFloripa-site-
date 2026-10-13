// =====================================================
// Endereço para o Brasil todo (cadastro, configurações, negócios, imóveis e busca)
// - Estado (27 UFs) e Cidade da lista oficial do IBGE (municipios/{UF}.json, 5.571
//   municípios), guardando o código IBGE da cidade (cidadeIbge)
// - Bairro, Rua, Número, Complemento e CEP; o CEP preenche o resto sozinho (ViaCEP)
// - resolverCidade(): converte as cidades antigas ("Florianópolis", "Florianópolis/SC",
//   "florianopolis") para { cidade, uf, cidadeIbge }
// =====================================================
export const UFS = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"], ["CE", "Ceará"],
  ["DF", "Distrito Federal"], ["ES", "Espírito Santo"], ["GO", "Goiás"], ["MA", "Maranhão"], ["MT", "Mato Grosso"],
  ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"], ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"],
  ["PE", "Pernambuco"], ["PI", "Piauí"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"], ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"], ["SP", "São Paulo"],
  ["SE", "Sergipe"], ["TO", "Tocantins"]
];
export const NOME_UF = Object.fromEntries(UFS);
// Primeiros dois dígitos do código IBGE = estado (confere se a cidade é mesmo daquele estado).
export const CODIGO_UF = { RO: 11, AC: 12, AM: 13, RR: 14, PA: 15, AP: 16, TO: 17, MA: 21, PI: 22, CE: 23, RN: 24, PB: 25, PE: 26, AL: 27, SE: 28, BA: 29, MG: 31, ES: 32, RJ: 33, SP: 35, PR: 41, SC: 42, RS: 43, MS: 50, MT: 51, GO: 52, DF: 53 };

export const semAcento = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
// Chave de comparação: sem acento, sem hífen/apóstrofo/espaços repetidos ("Pingo-d'Água" = "pingo d agua").
const chave = (s) => semAcento(s).replace(/[-'’`´.]/g, " ").replace(/\s+/g, " ").trim();

// "Florianópolis/SC" (ou só a cidade, se não houver estado).
export function textoCidade(o) {
  if (!o) return "";
  const c = String(o.cidade || "").trim();
  if (!c) return "";
  return o.uf ? `${c}/${o.uf}` : c;
}

// ---------- lista de cidades (um arquivo por estado, baixado só quando precisa) ----------
const cacheUf = new Map();
export function cidadesDe(uf) {
  uf = String(uf || "").toUpperCase();
  if (!NOME_UF[uf]) return Promise.resolve([]);
  if (!cacheUf.has(uf)) {
    cacheUf.set(uf, fetch(new URL(`municipios/${uf}.json?v=2`, import.meta.url))
      .then((r) => { if (!r.ok) throw new Error("lista de cidades indisponível"); return r.json(); })
      .then((l) => l.map(([codigo, nome, pop]) => ({ codigo, nome, pop: pop || 0, k: chave(nome) })))
      .catch((e) => { cacheUf.delete(uf); throw e; }));
  }
  return cacheUf.get(uf);
}
export async function cidadePorCodigo(codigo) {
  codigo = Number(codigo);
  const uf = Object.keys(CODIGO_UF).find((u) => CODIGO_UF[u] === Math.floor(codigo / 100000));
  if (!uf) return null;
  const c = (await cidadesDe(uf)).find((x) => x.codigo === codigo);
  return c ? { cidade: c.nome, uf, cidadeIbge: c.codigo } : null;
}

// ---------- conversão das cidades antigas ----------
const ANTIGAS = { florianopolis: "Florianópolis", saojose: "São José" };
// Nomes antigos de municípios que mudaram (o que as pessoas ainda digitam).
const APELIDOS = { "assu": "acu", "floripa": "florianopolis", "sao jose sc": "sao jose" };
export async function resolverCidade(texto, ufDica = "") {
  let t = String(texto ?? "").trim();
  if (!t) return null;
  if (ANTIGAS[t]) t = ANTIGAS[t];
  let uf = String(ufDica || "").toUpperCase();
  // "Cidade/UF", "Cidade - UF", "Cidade, UF", "Cidade (UF)"
  const m = t.match(/^(.*?)\s*(?:\/|-|,|\()\s*([A-Za-z]{2})\s*\)?$/);
  if (m && NOME_UF[m[2].toUpperCase()]) { t = m[1]; uf = m[2].toUpperCase(); }
  let k = chave(t);
  if (APELIDOS[k]) k = APELIDOS[k];
  if (!k) return null;
  const achar = async (u) => (await cidadesDe(u).catch(() => [])).filter((c) => c.k === k).map((c) => ({ cidade: c.nome, uf: u, cidadeIbge: c.codigo }));
  if (uf) { const r = await achar(uf); return r[0] || null; }
  // Sem estado: o Help Floripa começou em SC, então SC primeiro; depois o Brasil todo (só se o nome for único).
  const sc = await achar("SC");
  if (sc.length) return sc[0];
  const todos = (await Promise.all(UFS.map(([u]) => achar(u)))).flat();
  return todos.length === 1 ? todos[0] : null;
}

// ---------- CEP ----------
export const soDigitos = (s) => String(s ?? "").replace(/\D/g, "");
export const formatarCep = (s) => { const d = soDigitos(s).slice(0, 8); return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; };
export async function buscarCep(cep) {
  cep = soDigitos(cep);
  if (cep.length !== 8) throw new Error("CEP incompleto");
  // Só o CEP é enviado ao ViaCEP; nada da conta vai junto.
  const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { referrerPolicy: "no-referrer", credentials: "omit" });
  if (!r.ok) throw new Error("CEP indisponível");
  const j = await r.json();
  if (j.erro) return null;
  return { cep, uf: j.uf || "", cidade: j.localidade || "", cidadeIbge: Number(j.ibge) || null, bairro: j.bairro || "", rua: j.logradouro || "", complemento: j.complemento || "" };
}

// ---------- visual ----------
function css() {
  if (document.getElementById("hfEnderecoCss")) return;
  const st = document.createElement("style");
  st.id = "hfEnderecoCss";
  st.textContent = `
.hf-end { display: grid; gap: 14px; }
.hf-end-linha { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr); gap: 12px; }
.hf-end-linha.meio { grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); }
.hf-end .campo { min-width: 0; margin: 0; }
.hf-end .campo label { display: block; }
.hf-end .campo input, .hf-end .campo select { width: 100%; min-width: 0; box-sizing: border-box; }
.hf-end .opcional { font-weight: 500; opacity: .65; font-size: .9em; }
.hf-end-cidade { position: relative; }
.hf-end-lista { position: absolute; left: 0; right: 0; top: calc(100% + 4px); z-index: 60; max-height: 264px; overflow-y: auto; margin: 0; padding: 4px; list-style: none;
  background: var(--panel, var(--vt-card, #fff)); color: var(--text, var(--vt-text, #0e1a21)); border: 1px solid var(--line, var(--vt-line, #d5dee4)); border-radius: 12px; box-shadow: 0 14px 34px rgba(0,0,0,.28); }
.hf-end-lista[hidden] { display: none; }
.hf-end-lista li { padding: 9px 10px; border-radius: 8px; cursor: pointer; font-size: 14.5px; }
.hf-end-lista li[aria-selected="true"], .hf-end-lista li:hover { background: color-mix(in srgb, var(--accent, #00adee) 14%, transparent); }
.hf-end-lista li b { font-weight: 800; }
.hf-end-lista .vazio { color: var(--muted, var(--vt-muted, #5d6f7b)); cursor: default; background: none !important; }
.hf-end .ajuda.erro { color: var(--danger, #e5484d); }
.hf-end .ajuda.ok { color: var(--ok, #2fbf71); }
@media (max-width: 420px) { .hf-end-linha, .hf-end-linha.meio { grid-template-columns: minmax(0, 1fr); } }
`;
  document.head.appendChild(st);
}

let contador = 0;
const el = (t, cls, txt) => { const e = document.createElement(t); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

// Monta os campos dentro de "box" (usa as classes .campo / .ajuda da página).
// campos: quais aparecem, na ordem do formulário ("cep", "uf", "cidade", "bairro", "rua", "numero", "complemento", "referencia")
// obrigatorios: quais não podem ficar vazios (padrão: uf e cidade)
// Devolve { ler(), validar(), definir(valor), pronto } — validar() devolve a mensagem de erro (ou "").
export function camposEndereco(box, { campos = ["cep", "uf", "cidade", "bairro", "rua", "numero", "complemento"], valor = {}, obrigatorios = ["uf", "cidade"], dicaCep = "Digite o CEP para preencher o resto sozinho", rotuloCidade = "Cidade", aoMudar = () => {} } = {}) {
  css();
  const id = `hfEnd${++contador}`;
  const tem = (c) => campos.includes(c);
  const obrig = (c) => obrigatorios.includes(c);
  const raiz = el("div", "hf-end");
  const campo = (c, rotulo, input, ajuda) => {
    const d = el("div", "campo");
    const l = el("label", null, rotulo); l.htmlFor = `${id}-${c}`;
    if (!obrig(c) && c !== "cep") { const o = el("span", "opcional", " (opcional)"); l.appendChild(o); }
    input.id = `${id}-${c}`;
    d.append(l, input);
    if (ajuda) d.appendChild(ajuda);
    return d;
  };
  const texto = (c, max, extra = {}) => { const i = el("input"); i.type = "text"; i.maxLength = max; Object.assign(i, extra); i.addEventListener("input", () => aoMudar()); return i; };
  const E = {};
  // CEP
  let stCep = null;
  if (tem("cep")) {
    E.cep = texto("cep", 9, { inputMode: "numeric", autocomplete: "postal-code", placeholder: "00000-000" });
    stCep = el("span", "ajuda", dicaCep);
    raiz.appendChild(campo("cep", "CEP", E.cep, stCep));
  }
  // Estado + Cidade
  E.uf = el("select"); E.uf.autocomplete = "address-level1";
  E.uf.append(new Option("Selecione", ""), ...UFS.map(([s, n]) => new Option(`${n} (${s})`, s)));
  E.cidade = texto("cidade", 80, { autocomplete: "off", placeholder: "Escolha o estado primeiro", spellcheck: false });
  E.cidade.setAttribute("role", "combobox"); E.cidade.setAttribute("aria-autocomplete", "list"); E.cidade.setAttribute("aria-expanded", "false");
  const lista = el("ul", "hf-end-lista"); lista.id = `${id}-lista`; lista.setAttribute("role", "listbox"); lista.hidden = true;
  E.cidade.setAttribute("aria-controls", lista.id);
  const stCidade = el("span", "ajuda");
  const caixaCidade = campo("cidade", rotuloCidade, E.cidade, stCidade); caixaCidade.classList.add("hf-end-cidade"); caixaCidade.insertBefore(lista, stCidade);
  const linha1 = el("div", "hf-end-linha"); linha1.append(campo("uf", "Estado", E.uf), caixaCidade);
  raiz.appendChild(linha1);
  if (tem("bairro")) { E.bairro = texto("bairro", 60, { autocomplete: "address-level3" }); raiz.appendChild(campo("bairro", "Bairro", E.bairro)); }
  if (tem("rua")) { E.rua = texto("rua", 100, { autocomplete: "address-line1", placeholder: "Rua, avenida, servidão..." }); raiz.appendChild(campo("rua", "Rua", E.rua)); }
  if (tem("numero") || tem("complemento")) {
    const l2 = el("div", "hf-end-linha meio");
    if (tem("numero")) { E.numero = texto("numero", 10, { inputMode: "text", placeholder: "Ex.: 120 ou s/n" }); l2.appendChild(campo("numero", "Número", E.numero)); }
    if (tem("complemento")) { E.complemento = texto("complemento", 60, { autocomplete: "address-line2", placeholder: "Apto, bloco, sala" }); l2.appendChild(campo("complemento", "Complemento", E.complemento)); }
    raiz.appendChild(l2);
  }
  if (tem("referencia")) { E.referencia = texto("referencia", 100, { placeholder: "Ex.: perto da padaria" }); raiz.appendChild(campo("referencia", "Ponto de referência", E.referencia)); }
  box.appendChild(raiz);

  // ---------- cidade: busca na lista do estado ----------
  let cidades = [], escolhida = null, sel = -1, opcoes = [];
  async function carregarUf(uf, manter = false) {
    lista.hidden = true;
    if (!manter) { escolhida = null; E.cidade.value = ""; }
    E.cidade.disabled = !uf;
    E.cidade.placeholder = uf ? "Digite para buscar" : "Escolha o estado primeiro";
    stCidade.textContent = ""; stCidade.className = "ajuda";
    cidades = [];
    if (!uf) return;
    try { cidades = await cidadesDe(uf); }
    catch { stCidade.textContent = "Não foi possível carregar as cidades. Confira a internet."; stCidade.className = "ajuda erro"; }
  }
  function mostrar() {
    const q = chave(E.cidade.value);
    if (!cidades.length || document.activeElement !== E.cidade) { lista.hidden = true; return; }
    // Primeiro as que começam com o que foi digitado, depois as que contêm; em cada grupo,
    // as mais populosas antes (digitar "sao jo" em SC mostra São José antes de São João Batista).
    const ini = [], meio = [];
    for (const c of cidades) { if (!q || c.k.startsWith(q)) ini.push(c); else if (c.k.includes(q)) meio.push(c); }
    const porPop = (a, b) => b.pop - a.pop || a.k.localeCompare(b.k);
    opcoes = [...ini.sort(porPop), ...meio.sort(porPop)].slice(0, 8);
    sel = opcoes.length ? 0 : -1;
    lista.replaceChildren(...(opcoes.length ? opcoes.map((c, i) => {
      const li = el("li"); li.id = `${id}-op${i}`; li.setAttribute("role", "option"); li.setAttribute("aria-selected", String(i === sel));
      const pos = q ? chave(c.nome).indexOf(q) : -1;
      if (pos >= 0 && c.nome.length === c.k.length) { li.append(c.nome.slice(0, pos), el("b", null, c.nome.slice(pos, pos + q.length)), c.nome.slice(pos + q.length)); }
      else li.textContent = c.nome;
      li.addEventListener("mousedown", (e) => { e.preventDefault(); escolher(c); });
      return li;
    }) : [el("li", "vazio", "Nenhuma cidade com esse nome neste estado")]));
    lista.hidden = false;
    E.cidade.setAttribute("aria-expanded", "true");
    E.cidade.setAttribute("aria-activedescendant", sel >= 0 ? `${id}-op${sel}` : "");
  }
  function escolher(c) {
    escolhida = c; E.cidade.value = c.nome; lista.hidden = true; E.cidade.setAttribute("aria-expanded", "false");
    E.cidade.removeAttribute("aria-invalid"); stCidade.textContent = ""; stCidade.className = "ajuda";
    aoMudar();
  }
  function marcarSel(i) {
    const lis = [...lista.querySelectorAll("li[role=option]")]; if (!lis.length) return;
    sel = (i + lis.length) % lis.length;
    lis.forEach((li, j) => li.setAttribute("aria-selected", String(j === sel)));
    lis[sel].scrollIntoView({ block: "nearest" });
    E.cidade.setAttribute("aria-activedescendant", lis[sel].id);
  }
  E.cidade.addEventListener("input", () => { escolhida = null; mostrar(); });
  E.cidade.addEventListener("focus", mostrar);
  E.cidade.addEventListener("keydown", (e) => {
    if (lista.hidden && (e.key === "ArrowDown" || e.key === "ArrowUp")) { mostrar(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); marcarSel(sel + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); marcarSel(sel - 1); }
    else if (e.key === "Enter" && !lista.hidden && opcoes[sel]) { e.preventDefault(); escolher(opcoes[sel]); }
    else if (e.key === "Escape") { lista.hidden = true; }
  });
  E.cidade.addEventListener("blur", () => setTimeout(() => {
    lista.hidden = true; E.cidade.setAttribute("aria-expanded", "false");
    if (escolhida || !E.cidade.value.trim()) return;
    // Digitou o nome inteiro sem tocar na lista: aceita se bater com uma cidade do estado.
    const k = chave(E.cidade.value);
    const c = cidades.find((x) => x.k === k);
    if (c) escolher(c);
    else { stCidade.textContent = "Escolha uma cidade da lista."; stCidade.className = "ajuda erro"; E.cidade.setAttribute("aria-invalid", "true"); }
  }, 120));
  E.uf.addEventListener("change", () => { carregarUf(E.uf.value); aoMudar(); });

  // ---------- CEP: preenche o resto ----------
  let ultimoCep = "";
  async function aplicarCep(forcar = false) {
    const cep = soDigitos(E.cep.value);
    if (cep.length !== 8 || (cep === ultimoCep && !forcar)) return;
    ultimoCep = cep;
    stCep.textContent = "Buscando CEP..."; stCep.className = "ajuda";
    try {
      const r = await buscarCep(cep);
      if (soDigitos(E.cep.value) !== cep) return;
      if (!r) { stCep.textContent = "CEP não encontrado. Preencha à mão."; stCep.className = "ajuda erro"; return; }
      if (r.uf && NOME_UF[r.uf]) {
        E.uf.value = r.uf;
        await carregarUf(r.uf);
        const c = cidades.find((x) => x.codigo === r.cidadeIbge) || cidades.find((x) => x.k === chave(r.cidade));
        if (c) escolher(c);
      }
      if (E.bairro && r.bairro) E.bairro.value = r.bairro;
      if (E.rua && r.rua) E.rua.value = r.rua;
      if (E.complemento && r.complemento && !E.complemento.value) E.complemento.value = r.complemento;
      stCep.textContent = "Endereço preenchido pelo CEP. Confira e complete."; stCep.className = "ajuda ok";
      (E.numero && !E.numero.value ? E.numero : null)?.focus();
      aoMudar();
    } catch { stCep.textContent = "Não foi possível buscar o CEP agora. Preencha à mão."; stCep.className = "ajuda erro"; }
  }
  if (E.cep) {
    E.cep.addEventListener("input", () => { const p = E.cep.selectionStart, a = E.cep.value.length; E.cep.value = formatarCep(E.cep.value); try { E.cep.setSelectionRange(p + E.cep.value.length - a, p + E.cep.value.length - a); } catch {} aplicarCep(); });
  }

  // ---------- valor ----------
  async function definir(v = {}) {
    v = v || {};
    for (const c of ["bairro", "rua", "numero", "complemento", "referencia"]) if (E[c]) E[c].value = v[c] || "";
    if (E.cep) { E.cep.value = formatarCep(v.cep); ultimoCep = soDigitos(v.cep); stCep.textContent = dicaCep; stCep.className = "ajuda"; }
    let local = v.uf && v.cidadeIbge ? { uf: v.uf, cidade: v.cidade, cidadeIbge: Number(v.cidadeIbge) } : null;
    // Endereço antigo (só o nome da cidade): tenta achar na lista do IBGE.
    if (!local && v.cidade) local = await resolverCidade(v.cidade, v.uf).catch(() => null);
    const uf = local?.uf || (NOME_UF[String(v.uf || "").toUpperCase()] ? String(v.uf).toUpperCase() : "");
    E.uf.value = uf;
    await carregarUf(uf);
    const c = local && cidades.find((x) => x.codigo === local.cidadeIbge);
    if (c) { escolhida = c; E.cidade.value = c.nome; }
    else if (v.cidade) { E.cidade.value = String(v.cidade).replace(/\s*\/\s*[A-Za-z]{2}$/, ""); stCidade.textContent = "Confira a cidade: escolha uma da lista."; stCidade.className = "ajuda erro"; }
  }
  function ler() {
    const o = {};
    if (E.cep) o.cep = soDigitos(E.cep.value);
    o.uf = E.uf.value || "";
    o.cidade = escolhida ? escolhida.nome : "";
    o.cidadeIbge = escolhida ? escolhida.codigo : null;
    for (const c of ["bairro", "rua", "numero", "complemento", "referencia"]) if (E[c]) o[c] = E[c].value.trim();
    return o;
  }
  function validar() {
    const v = ler();
    const falha = (c, msg) => { E[c]?.focus(); E[c]?.setAttribute("aria-invalid", "true"); return msg; };
    if (E.cep && v.cep && v.cep.length !== 8) return falha("cep", "CEP inválido: são 8 números.");
    if (obrig("uf") && !v.uf) return falha("uf", "Escolha o estado.");
    if ((obrig("cidade") || E.cidade.value.trim()) && !v.cidadeIbge) { stCidade.textContent = "Escolha uma cidade da lista."; stCidade.className = "ajuda erro"; return falha("cidade", v.uf ? "Escolha a cidade na lista." : "Escolha o estado e a cidade."); }
    for (const c of ["bairro", "rua", "numero", "complemento"]) if (obrig(c) && E[c] && !v[c]) return falha(c, `Preencha ${c === "numero" ? "o número" : c === "rua" ? "a rua" : c === "bairro" ? "o bairro" : "o complemento"}.`);
    return "";
  }
  const pronto = definir(valor);
  return { ler, validar, definir, pronto, elementos: E };
}

// ---------- gravar com os campos novos de local ----------
// Até as regras novas serem publicadas no Firebase, o servidor recusa uf/cidadeIbge/rua...
// nos documentos públicos. Então grava com eles e, se vier "permission-denied", grava de
// novo sem eles (o local completo continua salvo na parte privada da conta, que aceita).
// Depois da primeira recusa, nesta aba já grava direto sem os campos novos.
export const NOVOS = {
  perfil: ["uf", "cidadeIbge"],
  negocio: ["uf", "cidadeIbge", "bairro", "rua", "numero", "complemento", "cep"],
  anuncio: ["uf", "cidadeIbge", "rua", "numero", "complemento", "cep"]
};
const CHAVE_ANTIGAS = "hf-regras-local-antigas";
const regrasAntigas = () => { try { return sessionStorage.getItem(CHAVE_ANTIGAS) === "1"; } catch { return false; } };
export const servidorComRegrasAntigas = regrasAntigas;
const semCampos = (dados, campos) => { const o = { ...dados }; campos.forEach((k) => delete o[k]); return o; };
// Devolve true quando gravou com os campos novos e false quando precisou gravar sem eles.
export async function gravarComLocal(gravar, dados, campos) {
  if (regrasAntigas()) { await gravar(semCampos(dados, campos)); return false; }
  try { await gravar(dados); return true; }
  catch (e) {
    if (e?.code !== "permission-denied" || !campos.some((k) => k in dados)) throw e;
    await gravar(semCampos(dados, campos));
    try { sessionStorage.setItem(CHAVE_ANTIGAS, "1"); } catch {}
    console.info("[Endereço] Regras antigas no servidor: local completo guardado só na parte privada da conta.");
    return false;
  }
}
