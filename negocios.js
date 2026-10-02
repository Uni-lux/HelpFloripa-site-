// =====================================================
// Meus negócios (negocios.html)
// - Painel com os perfis de negócio da pessoa: nota, avaliações,
//   reclamações aguardando resposta e atalhos.
// - Formulário completo de cada tipo (serviços, delivery, lojinha, imóveis)
//   e os anúncios de imóveis.
// Links: negocios.html?tipo=servicos (abre o formulário) · ?novo=1
// =====================================================
import {
  $, el, icone, pintarAvatar, urlSegura, nomeCidade, toast, erroAmigavel, abrirFolha, fecharFolha,
  fb, eu, dados, salvarImagem, editarImagem, iniciarRede, montarBarraRede, pintarBarraRede, ouvirAvisos
} from "./rede.js?v=11";
import { lerResumos, estrelas, media, notaTexto } from "./avaliacoes.js?v=8";
import { buscarAnuncios, DIAS, PAGAMENTOS, UNIDADES_SERV, DIFERENCIAIS_SERV, CONDICAO, SECOES_CARDAPIO, CARACT_IMOVEL, CONDICOES_IMOVEL, PAGINA_TIPO } from "./vitrine.js?v=23";

const NEGOCIOS = {
  servicos: { rotulo: "Freelances", img: "servicos.webp", pagina: "servicos.html", desc: "Portfólio, preços, horários e pedidos de orçamento." },
  delivery: { rotulo: "Delivery", img: "lanchonetes.webp", pagina: "delivery.html", desc: "Cardápio com fotos, taxa, horário e pedidos prontos." },
  lojinha: { rotulo: "Lojinha", img: "shopping.webp", pagina: "shopping.html", desc: "Produtos com fotos, tamanhos, cores e estoque." },
  imoveis: { rotulo: "Imóveis", img: "imoveis.webp", pagina: "imoveis.html", desc: "Anúncios de aluguel, venda e temporada." }
};
let meusNegocios = [];

async function buscarNegocios(uid) {
  const snap = await fb.getDocs(fb.query(fb.collection(fb.db, "negocios"), fb.where("donoId", "==", uid), fb.limit(8)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => Object.keys(NEGOCIOS).indexOf(a.tipo) - Object.keys(NEGOCIOS).indexOf(b.tipo));
}
async function carregarMeusNegocios() {
  try { meusNegocios = await buscarNegocios(eu.uid); } catch (e) { console.warn("Negócios indisponíveis:", e); meusNegocios = []; }
  pintarPainel();
}

// ---------- painel ----------
let numeros = { resumos: {}, reclamacoes: {}, anuncios: 0 };
async function carregarNumeros() {
  try {
    const [resumos, avs, resp, ans] = await Promise.all([
      lerResumos(fb, meusNegocios.map((n) => "neg_" + n.id), { recarregar: true }),
      fb.getDocs(fb.query(fb.collection(fb.db, "avaliacoes"), fb.where("alvoId", "==", eu.uid), fb.limit(300))).catch(() => ({ docs: [] })),
      Promise.resolve(null),
      meusNegocios.some((n) => n.tipo === "imoveis") ? buscarAnuncios(fb, eu.uid).catch(() => []) : Promise.resolve([])
    ]);
    const recl = avs.docs.map((d) => ({ id: d.id, ...d.data() })).filter((a) => a.tipo === "negocio" && a.nota <= 2);
    const respondidas = new Set();
    await Promise.all(recl.map(async (r) => { try { if ((await fb.getDoc(fb.doc(fb.db, "reclamacoes", r.id))).exists()) respondidas.add(r.id); } catch {} }));
    const porNeg = {};
    recl.forEach((r) => { porNeg[r.negocioId] = porNeg[r.negocioId] || { total: 0, pendentes: 0 }; porNeg[r.negocioId].total++; if (!respondidas.has(r.id)) porNeg[r.negocioId].pendentes++; });
    numeros = { resumos, reclamacoes: porNeg, anuncios: ans.length };
  } catch (e) { console.warn("Números dos negócios:", e); }
  pintarPainel();
}
function pintarPainel() {
  const grade = $("painelNegocios");
  grade.replaceChildren();
  Object.entries(NEGOCIOS).forEach(([tipo, t]) => {
    const n = meusNegocios.find((x) => x.tipo === tipo);
    if (!n) {
      const c = el("button", `neg-card novo ${tipo}`); c.type = "button";
      const ic = el("span", "ic"); ic.appendChild(icone(tipo, "i"));
      c.append(ic, el("strong", null, `Criar perfil de ${t.rotulo}`), el("small", null, t.desc));
      c.addEventListener("click", () => novoNegocio(tipo));
      grade.appendChild(c);
      return;
    }
    const c = el("article", `neg-card ${tipo}`);
    const capa = el("div", "capa");
    const f = urlSegura((n.fotos || [])[0]) || t.img;
    capa.style.backgroundImage = `url("${f}")`;
    capa.appendChild(el("span", "tag", t.rotulo));
    const corpo = el("div", "corpo");
    const av = el("div", "avatar"); pintarAvatar(av, n.foto, n.nome);
    const resumo = numeros.resumos["neg_" + n.id];
    const rec = numeros.reclamacoes[n.id] || { total: 0, pendentes: 0 };
    const nums = el("div", "nums");
    const bloco = (valor, rot) => { const d = el("div"); d.append(el("b", null, valor), el("span", null, rot)); return d; };
    nums.append(
      bloco(resumo?.total ? notaTexto(media(resumo)) : "–", "nota"),
      bloco(String(resumo?.total || 0), resumo?.total === 1 ? "avaliação" : "avaliações"),
      tipo === "imoveis" ? bloco(String(numeros.anuncios), numeros.anuncios === 1 ? "anúncio" : "anúncios") : bloco(String(rec.pendentes), rec.pendentes === 1 ? "reclamação" : "reclamações")
    );
    const acoes = el("div", "acoes");
    const bE = el("button", "btn pri mini"); bE.type = "button"; bE.append(icone("lapis", "i xs"), document.createTextNode(tipo === "imoveis" ? "Editar e anúncios" : "Editar"));
    bE.addEventListener("click", () => abrirFormNegocio(n));
    const bV = el("a", "btn sec mini"); bV.append(icone("olho", "i xs"), document.createTextNode("Ver na vitrine"));
    bV.href = tipo === "imoveis" ? "imoveis.html" : `${PAGINA_TIPO[tipo]}?negocio=${encodeURIComponent(n.id)}`;
    acoes.append(bE, bV);
    if (rec.total) {
      const bR = el("a", "btn sec mini"); bR.append(icone("alerta", "i xs"), document.createTextNode(rec.pendentes ? `Responder (${rec.pendentes})` : "Reclamações"));
      bR.href = `reclamacoes.html?negocio=${encodeURIComponent(n.id)}`;
      acoes.appendChild(bR);
    }
    corpo.append(av, el("h3", null, n.nome || t.rotulo), el("div", "meta", [n.cidade, (n.itens || []).length ? `${n.itens.length} ${tipo === "servicos" ? "serviços" : tipo === "delivery" ? "itens no cardápio" : "produtos"}` : ""].filter(Boolean).join(" · ") || t.desc));
    if (resumo?.total) corpo.appendChild(estrelas(resumo));
    corpo.append(nums, acoes);
    c.append(capa, corpo);
    grade.appendChild(c);
  });
  const total = meusNegocios.length;
  $("resumoNegocios").textContent = total ? `${total} de 4 perfis criados` : "Você ainda não tem perfis de negócio";
  $("btnNovoNegocio").hidden = total >= 4;
}
// Anunciar é permitido a partir de 18 anos (a data vem do cadastro).
function maiorDeIdade() {
  const d = dados.dataNascimento;
  if (!d) return true;
  const n = new Date(d + "T00:00:00"), h = new Date();
  if (isNaN(n.getTime())) return true;
  let i = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) i--;
  return i >= 18;
}
function novoNegocio(tipo) {
  if (!maiorDeIdade()) { toast("Para criar um perfil de negócio é preciso ter 18 anos ou mais."); return; }
  abrirFormNegocio(null);
  if (tipo && NEGOCIOS[tipo]) document.querySelector(`#negTipo [data-valor="${tipo}"]`)?.click();
}
$("btnNovoNegocio").addEventListener("click", () => novoNegocio(null));

// =====================================================
// Formulário (o mesmo que ficava no perfil)
// =====================================================
let negEditando = null, negTipo = "servicos", negFoto = "";
function abrirFormNegocio(n) {
  negEditando = n;
  const usados = new Set(meusNegocios.map((x) => x.tipo));
  negTipo = n ? n.tipo : Object.keys(NEGOCIOS).find((k) => !usados.has(k)) || "servicos";
  negFoto = n?.foto || "";
  document.querySelectorAll("#negTipo [data-valor]").forEach((b) => {
    b.classList.toggle("on", b.dataset.valor === negTipo);
    b.disabled = n ? b.dataset.valor !== n.tipo : usados.has(b.dataset.valor);
  });
  $("negTipoAjuda").textContent = n ? "O tipo não pode ser trocado depois de criado." : "Você pode ter um perfil de cada tipo.";
  $("tNegocio").textContent = n ? "Editar perfil de negócio" : "Novo perfil de negócio";
  $("negNome").value = n?.nome || "";
  $("negDesc").value = n?.descricao || "";
  $("negDescCont").textContent = `${$("negDesc").value.length}/500`;
  $("negCidade").value = n?.cidade || nomeCidade(dados.cidade);
  $("negWhats").value = n?.whatsapp || "";
  $("negExcluir").hidden = !n;
  negExtra = JSON.parse(JSON.stringify({ ...(n || {}), criadoEm: null, atualizadoEm: null }));
  negExtra.fotos = Array.isArray(negExtra.fotos) ? negExtra.fotos : [];
  negExtra.itens = Array.isArray(negExtra.itens) ? negExtra.itens : [];
  pintarFotoNegocio();
  montarExtras();
  abrirFolha("folhaNegocio");
}

// ---------- campos próprios de cada tipo ----------
const CATS_NEGOCIO = {
  servicos: { limpeza: "Limpeza", reformas: "Reformas", beleza: "Saúde e Beleza", transporte: "Transporte", pets: "Pets", outros: "Outros" },
  delivery: { hamburguer: "Hambúrguer", pizza: "Pizza", sushi: "Sushi", doces: "Doces", bebidas: "Bebidas", outros: "Outros" },
  lojinha: { roupas: "Moda e roupas", calcados: "Calçados", acessorios: "Acessórios", beleza: "Beleza", eletronicos: "Eletrônicos", casa: "Casa e decoração", mercado: "Mercado", artesanato: "Artesanato", infantil: "Infantil", esportes: "Esportes", outros: "Outra (escrever)" },
  imoveis: { apartamento: "Apartamento", casa: "Casa", kitnet: "Kitnet", terreno: "Terreno", comercial: "Comercial", outros: "Outros" }
};
const CONFIG_EXTRAS = {
  servicos: { itens: { titulo: "Serviços e preços", dica: "Cada serviço que você faz, com preço e como cobra. O cliente escolhe na hora de pedir orçamento.", max: 12, foto: false, rotulo: "Nome do serviço" }, fotos: { titulo: "Portfólio: fotos de trabalhos", max: 3, proporcao: 4 / 3 } },
  delivery: { itens: { titulo: "Cardápio", dica: "Cada prato com foto, preço, seção (Lanches, Bebidas...) e descrição.", max: 12, foto: true, proporcao: 1, rotulo: "Nome do prato" }, fotos: { titulo: "Foto de capa", max: 1, proporcao: 2 } },
  lojinha: { itens: { titulo: "Produtos", dica: "Toque em \"Detalhes do produto\" para tamanho, cor, marca, estado e ficha técnica.", max: 12, foto: true, proporcao: 3 / 4, rotulo: "Nome do produto" }, fotos: null },
  imoveis: { itens: null, fotos: null }
};
let negExtra = {};
let negMaisAberto = false;
const numeroBR = (v) => { const t = String(v ?? "").replace(/[^\d,.-]/g, ""); if (!t) return null; const milhar = !t.includes(",") && /^-?\d{1,3}(\.\d{3})+$/.test(t); const n = Number(t.includes(",") || milhar ? t.replace(/\./g, "").replace(",", ".") : t); return Number.isFinite(n) ? n : null; };
const mostrarNumero = (v) => (v === null || v === undefined || v === "" ? "" : String(v).replace(".", ","));

function campo(rotulo, input, ajuda) {
  const c = document.createElement("div");
  c.className = "campo";
  const l = document.createElement("label");
  l.textContent = rotulo;
  if (input.id) l.htmlFor = input.id;
  c.append(l, input);
  if (ajuda) { const a = document.createElement("div"); a.className = "ajuda"; a.appendChild(document.createElement("span")).textContent = ajuda; c.appendChild(a); }
  return c;
}
function entrada(chave, { tipo = "text", placeholder = "", numero = false, max = 60 } = {}) {
  const i = document.createElement("input");
  i.type = tipo; i.id = "negX_" + chave; i.placeholder = placeholder; i.maxLength = max;
  if (numero) i.inputMode = "decimal";
  i.value = numero ? mostrarNumero(negExtra[chave]) : (negExtra[chave] ?? "");
  i.addEventListener("input", () => { negExtra[chave] = numero ? numeroBR(i.value) : i.value.trim(); });
  return i;
}
function seletor(chave, opcoes, aoMudar) {
  const s = document.createElement("select");
  s.id = "negX_" + chave;
  Object.entries(opcoes).forEach(([v, t]) => { const o = document.createElement("option"); o.value = v; o.textContent = t; s.appendChild(o); });
  if (!negExtra[chave] || !opcoes[negExtra[chave]]) negExtra[chave] = Object.keys(opcoes)[0];
  s.value = negExtra[chave];
  s.addEventListener("change", () => { negExtra[chave] = s.value; aoMudar?.(); });
  return s;
}
// Hora com duas listas (hora e minuto): evita o relógio do celular, que corta o botão "Definir" em alguns aparelhos.
function seletorHora(chave) {
  const box = document.createElement("div");
  box.className = "hora-sel";
  const [h0, m0] = String(negExtra[chave] || "").split(":");
  const hs = document.createElement("select"), mss = document.createElement("select");
  hs.setAttribute("aria-label", "Hora"); mss.setAttribute("aria-label", "Minutos");
  const vazio = document.createElement("option"); vazio.value = ""; vazio.textContent = "--"; hs.appendChild(vazio);
  for (let h = 0; h < 24; h++) { const o = document.createElement("option"); o.value = String(h).padStart(2, "0"); o.textContent = o.value; hs.appendChild(o); }
  ["00", "15", "30", "45"].forEach((m) => { const o = document.createElement("option"); o.value = m; o.textContent = m; mss.appendChild(o); });
  hs.value = h0 || "";
  mss.value = ["00", "15", "30", "45"].includes(m0) ? m0 : "00";
  const salvar = () => { negExtra[chave] = hs.value ? `${hs.value}:${mss.value}` : ""; };
  hs.addEventListener("change", salvar); mss.addEventListener("change", salvar);
  box.append(hs, document.createTextNode(":"), mss);
  return box;
}

function marcas(chave, opcoes, aoMudar, alvo = negExtra) {
  const box = document.createElement("div");
  box.className = "marcas";
  const atual = new Set(Array.isArray(alvo[chave]) ? alvo[chave] : []);
  Object.entries(opcoes).forEach(([v, t]) => {
    const l = document.createElement("label");
    l.className = "marca-op";
    const c = document.createElement("input");
    c.type = "checkbox"; c.checked = atual.has(v);
    l.classList.toggle("on", c.checked);
    c.addEventListener("change", () => { c.checked ? atual.add(v) : atual.delete(v); l.classList.toggle("on", c.checked); alvo[chave] = Object.keys(opcoes).filter((k) => atual.has(k)); aoMudar?.(); });
    l.append(c, document.createTextNode(t));
    box.appendChild(l);
  });
  return box;
}
function secao(titulo, dica) {
  const s = document.createElement("div");
  s.className = "neg-secao";
  const h = document.createElement("h3"); h.textContent = titulo; s.appendChild(h);
  if (dica) { const p = document.createElement("p"); p.textContent = dica; s.appendChild(p); }
  return s;
}
function grade(classe, ...filhos) { const g = document.createElement("div"); g.className = "grade-campos " + (classe || ""); g.append(...filhos); return g; }

let escolhaFoto = null; // callback do seletor de arquivo compartilhado
function pedirFoto(opcoes, aoEscolher) { escolhaFoto = { opcoes, aoEscolher }; $("negArquivoExtra").click(); }
$("negArquivoExtra").addEventListener("change", async () => {
  const arquivo = $("negArquivoExtra").files?.[0];
  $("negArquivoExtra").value = "";
  if (!arquivo || !escolhaFoto) return;
  try {
    const d = await editarImagem(arquivo, escolhaFoto.opcoes);
    if (d) escolhaFoto.aoEscolher(d);
  } catch (e) { toast(erroAmigavel(e)); }
});

function montarExtras() {
  const box = $("negExtras");
  box.replaceChildren();
  const t = negTipo;
  const cfg = CONFIG_EXTRAS[t];
  const info = secao(t === "imoveis" ? "Sobre você como anunciante" : "Detalhes");
  // Campos opcionais ficam recolhidos: o formulário continua simples.
  const mais = document.createElement("details");
  mais.className = "neg-mais";
  mais.open = negMaisAberto;
  mais.addEventListener("toggle", () => { negMaisAberto = mais.open; });
  const sumMais = document.createElement("summary");
  sumMais.append(document.createTextNode("Mais detalhes (opcional)"), Object.assign(document.createElement("small"), { textContent: { servicos: "dias, região, experiência, diferenciais e pagamento", delivery: "dias, entrega ou retirada e pagamento", lojinha: "formas de pagamento" }[t] || "" }));
  mais.appendChild(sumMais);
  if (t === "servicos") {
    // Várias profissões: cada área de atuação aparece no filtro da página.
    if (!Array.isArray(negExtra.categorias) || !negExtra.categorias.length) negExtra.categorias = negExtra.categoria ? [negExtra.categoria] : [];
    info.appendChild(campo("Áreas de atuação", marcas("categorias", CATS_NEGOCIO.servicos, () => montarExtras()), "Marque todas que você faz. Você aparece em cada filtro marcado."));
    if (negExtra.categorias.includes("transporte")) {
      const mot = document.createElement("div");
      mot.className = "neg-bloco";
      const t2 = document.createElement("strong"); t2.textContent = "Motorista";
      mot.append(t2,
        campo("Categorias da CNH", marcas("cnh", { A: "A · moto", B: "B · carro", C: "C · caminhão", D: "D · ônibus", E: "E · carreta" })),
        campo("Veículo (opcional)", entrada("veiculo", { placeholder: "Ex.: Fiorino, van 15 lugares, moto", max: 60 })));
      info.appendChild(mot);
    }
    info.appendChild(grade("", campo("A partir de (R$)", entrada("precoDesde", { numero: true, placeholder: "80" })), campo("Horário de atendimento", entrada("horario", { placeholder: "8h às 18h" }))));
    mais.appendChild(campo("Dias de atendimento", marcas("dias", DIAS)));
    info.appendChild(campo("Como você atende", marcas("atendimento", { domicilio: "Vou até o cliente", local: "No meu local", online: "Online" })));
    mais.appendChild(grade("", campo("Região que atende", entrada("regiao", { placeholder: "Ex.: Ilha toda, Continente", max: 80 })), campo("Anos de experiência", entrada("experiencia", { numero: true, placeholder: "5", max: 3 }))));
    mais.appendChild(campo("Diferenciais", marcas("diferenciais", DIFERENCIAIS_SERV), "Aparecem em destaque no seu perfil."));
    mais.appendChild(campo("Formas de pagamento", marcas("pagamentos", { pix: "Pix", credito: "Crédito", debito: "Débito", dinheiro: "Dinheiro" })));
  } else if (t === "imoveis") {
    info.appendChild(grade("", campo("Você é", seletor("tipoAnunciante", { proprietario: "Proprietário(a)", corretor: "Corretor(a)", imobiliaria: "Imobiliária" })), campo("CRECI (se tiver)", entrada("creci", { placeholder: "Ex.: 12345-J", max: 20 }))));
  } else {
    info.appendChild(campo("Categoria", seletor("categoria", CATS_NEGOCIO[t], () => { if (t === "lojinha") montarExtras(); }), "Define em qual filtro da página você aparece"));
    if (t === "lojinha" && negExtra.categoria === "outros") info.appendChild(campo("Sua categoria", entrada("categoriaPersonalizada", { placeholder: "Ex.: Papelaria, Plantas, Suplementos", max: 30 }), "Vira um filtro próprio na página do Shopping."));
  }
  if (t === "delivery") {
    info.appendChild(grade("", campo("Abre às", seletorHora("horaAbre")), campo("Fecha às", seletorHora("horaFecha"))));
    info.appendChild(grade("quatro",
      campo("Entrega mín. (min)", entrada("tempoMin", { numero: true, placeholder: "30", max: 4 })),
      campo("Entrega máx. (min)", entrada("tempoMax", { numero: true, placeholder: "50", max: 4 })),
      campo("Taxa (R$)", entrada("taxaEntrega", { numero: true, placeholder: "0 = grátis" })),
      campo("Pedido mín. (R$)", entrada("pedidoMinimo", { numero: true, placeholder: "20" }))));
    if (!Array.isArray(negExtra.opcoesEntrega)) negExtra.opcoesEntrega = ["entrega"];
    mais.appendChild(campo("Dias de funcionamento", marcas("dias", DIAS)));
    info.appendChild(campo("Como o cliente recebe", marcas("opcoesEntrega", { entrega: "Entrega", retirada: "Retirada no local" })));
    mais.appendChild(campo("Formas de pagamento", marcas("pagamentos", PAGAMENTOS)));
  }
  if (t === "lojinha") {
    info.appendChild(campo("Formas de receber", marcas("entrega", { entrega: "Entrega", retirada: "Retirada" })));
    mais.appendChild(campo("Formas de pagamento", marcas("pagamentos", { pix: "Pix", credito: "Crédito", debito: "Débito", dinheiro: "Dinheiro" })));
  }
  if (mais.children.length > 1) info.appendChild(mais);
  box.appendChild(info);

  if (t === "imoveis") {
    // Vários imóveis: cada um é um anúncio com fotos e dados próprios.
    const sec = secao("Meus imóveis", "Cada imóvel vira um anúncio na página de Imóveis. Quem abrir seu perfil vê todos.");
    const lista = document.createElement("div");
    lista.className = "neg-anuncios";
    lista.textContent = "Carregando...";
    const add = document.createElement("button");
    add.type = "button"; add.className = "btn pri mini neg-add";
    add.append(icone("mais", "i xs"), document.createTextNode("Anunciar imóvel"));
    add.addEventListener("click", () => abrirFormAnuncio(null));
    sec.append(lista, add);
    box.appendChild(sec);
    pintarMeusAnuncios(lista);
  }

  if (cfg.fotos) {
    const sec = secao(cfg.fotos.titulo, `Até ${cfg.fotos.max} ${cfg.fotos.max === 1 ? "foto" : "fotos"}. A primeira é a principal na vitrine.`);
    const fotos = document.createElement("div");
    fotos.className = "neg-fotos";
    const pintar = () => {
      fotos.replaceChildren();
      negExtra.fotos.forEach((f, i) => {
        const d = document.createElement("div");
        d.className = "neg-foto";
        d.style.backgroundImage = `url("${urlSegura(f)}")`;
        const x = document.createElement("button");
        x.type = "button"; x.className = "x"; x.setAttribute("aria-label", "Remover foto");
        x.appendChild(icone("fechar", "i xs"));
        x.addEventListener("click", () => { negExtra.fotos.splice(i, 1); pintar(); });
        d.appendChild(x);
        fotos.appendChild(d);
      });
      if (negExtra.fotos.length < cfg.fotos.max) {
        const add = document.createElement("button");
        add.type = "button"; add.className = "neg-foto add"; add.setAttribute("aria-label", "Adicionar foto");
        add.appendChild(icone("mais", "i"));
        add.addEventListener("click", () => pedirFoto({ titulo: cfg.fotos.titulo, proporcao: cfg.fotos.proporcao, larguraSaida: 1080, qualidade: 0.72, limiteBytes: 170000 }, (d) => { negExtra.fotos.push(d); pintar(); }));
        fotos.appendChild(add);
      }
    };
    pintar();
    sec.appendChild(fotos);
    box.appendChild(sec);
  }

  if (cfg.itens) {
    const c = cfg.itens;
    const sec = secao(c.titulo, c.dica);
    const lista = document.createElement("div");
    lista.className = "neg-itens";
    const addBtn = document.createElement("button");
    addBtn.type = "button"; addBtn.className = "btn sec mini neg-add";
    addBtn.append(icone("mais", "i xs"), document.createTextNode("Adicionar"));
    const pintar = () => {
      lista.replaceChildren();
      negExtra.itens.forEach((it, i) => {
        const linha = document.createElement("div");
        linha.className = "neg-item" + (c.foto ? "" : " sem-foto");
        if (c.foto) {
          const ft = document.createElement("button");
          ft.type = "button"; ft.className = "ft"; ft.setAttribute("aria-label", "Foto do item");
          if (urlSegura(it.foto)) ft.style.backgroundImage = `url("${it.foto}")`; else ft.appendChild(icone("camera", "i s"));
          ft.addEventListener("click", () => pedirFoto({ titulo: c.titulo, proporcao: c.proporcao, larguraSaida: 480, qualidade: 0.72, limiteBytes: 60000 }, (d) => { it.foto = d; pintar(); }));
          linha.appendChild(ft);
        }
        const nome = document.createElement("input");
        nome.placeholder = c.rotulo; nome.maxLength = 60; nome.value = it.nome || "";
        nome.addEventListener("input", () => { it.nome = nome.value.trim(); });
        // Serviços com mais de uma área: cada serviço diz a qual área pertence.
        if (t === "servicos" && (negExtra.categorias || []).length > 1) {
          const sel = document.createElement("select");
          sel.className = "area-item"; sel.setAttribute("aria-label", "Área do serviço");
          negExtra.categorias.forEach((k) => { const o = document.createElement("option"); o.value = k; o.textContent = CATS_NEGOCIO.servicos[k]; sel.appendChild(o); });
          if (!negExtra.categorias.includes(it.categoria)) it.categoria = negExtra.categorias[0];
          sel.value = it.categoria;
          sel.addEventListener("change", () => { it.categoria = sel.value; });
          linha.classList.add("com-area");
          linha.appendChild(sel);
        }
        const preco = document.createElement("input");
        preco.className = "preco"; preco.placeholder = "R$"; preco.inputMode = "decimal"; preco.maxLength = 12; preco.value = mostrarNumero(it.preco);
        preco.addEventListener("input", () => { it.preco = numeroBR(preco.value); });
        const rm = document.createElement("button");
        rm.type = "button"; rm.className = "rm"; rm.setAttribute("aria-label", "Remover");
        rm.appendChild(icone("lixo", "i s"));
        rm.addEventListener("click", () => { negExtra.itens.splice(i, 1); pintar(); });
        linha.append(nome, preco, rm);
        linha.appendChild(detalhesItem(t, it));
        // Lojinha: quantas unidades tem. Com 1 unidade, ao vender o produto sai da loja.
        if (t === "lojinha") {
          const est = document.createElement("label");
          est.className = "estoque-item";
          const inp = document.createElement("input");
          inp.type = "number"; inp.min = "0"; inp.max = "9999"; inp.inputMode = "numeric"; inp.placeholder = "sem limite";
          inp.value = Number.isInteger(it.estoque) ? String(it.estoque) : "";
          inp.addEventListener("input", () => { const v = parseInt(inp.value, 10); it.estoque = Number.isInteger(v) && v >= 0 ? Math.min(v, 9999) : null; });
          const um = document.createElement("button");
          um.type = "button"; um.className = "chip-um"; um.textContent = "Peça única";
          um.addEventListener("click", () => { it.estoque = 1; inp.value = "1"; });
          est.append(document.createTextNode("Estoque"), inp, document.createTextNode("unid."), um);
          linha.appendChild(est);
        }
        lista.appendChild(linha);
      });
      addBtn.hidden = negExtra.itens.length >= c.max;
    };
    addBtn.addEventListener("click", () => { negExtra.itens.push({ nome: "", preco: null, foto: "" }); pintar(); lista.lastChild?.querySelector("input")?.focus(); });
    pintar();
    sec.append(lista, addBtn);
    box.appendChild(sec);
  }
}
// Detalhes de cada item (abre e fecha): muda conforme o tipo do negócio.
function detalhesItem(t, it) {
  const det = document.createElement("details");
  det.className = "item-det";
  const sum = document.createElement("summary");
  sum.textContent = { servicos: "Detalhes do serviço", delivery: "Seção e descrição", lojinha: "Detalhes do produto" }[t] || "Detalhes";
  det.appendChild(sum);
  const corpo = document.createElement("div");
  corpo.className = "item-det-corpo";
  const txt = (chave, rotulo, { placeholder = "", max = 60, area = false, lista = null } = {}) => {
    const i = document.createElement(area ? "textarea" : "input");
    i.maxLength = max; i.placeholder = placeholder;
    const v = it[chave];
    i.value = Array.isArray(v) ? v.join(", ") : (v ?? "");
    if (lista) { i.setAttribute("list", lista); }
    i.addEventListener("input", () => { it[chave] = i.value; });
    const c = document.createElement("label"); c.className = "mini-campo";
    c.append(document.createTextNode(rotulo), i);
    return c;
  };
  const sel = (chave, rotulo, opcoes) => {
    const s = document.createElement("select");
    Object.entries(opcoes).forEach(([v, tx]) => { const o = document.createElement("option"); o.value = v; o.textContent = tx; s.appendChild(o); });
    if (!(it[chave] in opcoes)) it[chave] = Object.keys(opcoes)[0];
    s.value = it[chave];
    s.addEventListener("change", () => { it[chave] = s.value; });
    const c = document.createElement("label"); c.className = "mini-campo";
    c.append(document.createTextNode(rotulo), s);
    return c;
  };
  const num = (chave, rotulo, placeholder) => {
    const i = document.createElement("input");
    i.inputMode = "decimal"; i.placeholder = placeholder; i.maxLength = 12; i.value = mostrarNumero(it[chave]);
    i.addEventListener("input", () => { it[chave] = numeroBR(i.value); });
    const c = document.createElement("label"); c.className = "mini-campo";
    c.append(document.createTextNode(rotulo), i);
    return c;
  };
  if (t === "servicos") {
    corpo.append(
      sel("unidade", "Como cobra", UNIDADES_SERV),
      txt("duracao", "Duração média", { placeholder: "Ex.: 2 horas", max: 30 }),
      txt("descricao", "O que está incluso", { placeholder: "Ex.: até 3 cômodos, material incluso", max: 160, area: true }));
    corpo.classList.add("dois");
  } else if (t === "delivery") {
    if (!document.getElementById("secoesCardapio")) {
      const dl = document.createElement("datalist"); dl.id = "secoesCardapio";
      SECOES_CARDAPIO.forEach((x) => { const o = document.createElement("option"); o.value = x; dl.appendChild(o); });
      document.body.appendChild(dl);
    }
    corpo.append(
      txt("secao", "Seção do cardápio", { placeholder: "Ex.: Lanches", max: 24, lista: "secoesCardapio" }),
      num("precoAntigo", "Preço antes (promoção)", "R$"),
      txt("descricao", "Descrição / ingredientes", { placeholder: "Ex.: pão brioche, 180 g de carne, cheddar, bacon", max: 160, area: true }));
    corpo.classList.add("dois");
  } else if (t === "lojinha") {
    corpo.append(
      sel("condicao", "Estado", CONDICAO),
      txt("marca", "Marca", { placeholder: "Ex.: Nike", max: 30 }),
      num("precoAntigo", "Preço antes (promoção)", "R$"),
      txt("tamanhos", "Tamanhos (separe por vírgula)", { placeholder: "P, M, G  ou  37, 38, 39", max: 80 }),
      txt("cores", "Cores (separe por vírgula)", { placeholder: "Preto, Branco", max: 80 }),
      txt("descricao", "Descrição", { placeholder: "Conte como é o produto", max: 300, area: true }),
      txt("ficha", "Ficha técnica (uma por linha)", { placeholder: "Material: Algodão\nMedidas: 70 x 50 cm\nPeso: 200 g", max: 500, area: true }));
    corpo.classList.add("dois");
  }
  det.appendChild(corpo);
  return det;
}
const listaTexto = (v, max = 12) => (Array.isArray(v) ? v : String(v || "").split(",")).map((x) => String(x).trim().slice(0, 20)).filter(Boolean).slice(0, max);

// ---------- anúncios de imóveis (vários por pessoa) ----------
let meusAnuncios = [], anEdit = null, anEditandoId = null;
const FINALIDADES = { aluguel: "Aluguel", venda: "Venda", temporada: "Temporada" };

async function pintarMeusAnuncios(lista) {
  try { meusAnuncios = await buscarAnuncios(fb, eu.uid); } catch { meusAnuncios = []; }
  lista.replaceChildren();
  if (!meusAnuncios.length) {
    const p = document.createElement("p");
    p.className = "social-vazio";
    p.textContent = "Nenhum imóvel anunciado ainda.";
    lista.appendChild(p);
    return;
  }
  meusAnuncios.forEach((a) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "neg-anuncio";
    const ft = document.createElement("div");
    ft.className = "ft";
    if (urlSegura((a.fotos || [])[0])) ft.style.backgroundImage = `url("${a.fotos[0]}")`;
    const tx = document.createElement("div");
    tx.className = "tx";
    const t1 = document.createElement("strong");
    t1.textContent = a.titulo || `${CATS_NEGOCIO.imoveis[a.categoria] || "Imóvel"} · ${FINALIDADES[a.finalidade] || ""}`;
    const t2 = document.createElement("small");
    t2.textContent = [FINALIDADES[a.finalidade], moedaBR(a.preco), a.bairro].filter(Boolean).join(" · ");
    tx.append(t1, t2);
    b.append(ft, tx, icone("lapis", "i s"));
    b.addEventListener("click", () => abrirFormAnuncio(a));
    // Um toque para tirar do ar quando fechar negócio.
    const fim = document.createElement("button");
    fim.type = "button"; fim.className = "fechado";
    const rotuloFim = a.finalidade === "venda" ? "Vendido" : "Alugado";
    fim.append(icone("check", "i s"), document.createTextNode(rotuloFim));
    fim.title = `${rotuloFim}: apagar o anúncio`;
    fim.addEventListener("click", () => concluirAnuncio(a, () => pintarMeusAnuncios(lista)));
    const linha = document.createElement("div");
    linha.className = "neg-anuncio-linha";
    linha.append(b, fim);
    lista.appendChild(linha);
  });
}
async function concluirAnuncio(a, depois) {
  const rotulo = a.finalidade === "venda" ? "vendido" : "alugado";
  if (!confirm(`Imóvel ${rotulo}? O anúncio "${a.titulo || "sem título"}" será apagado e sai da vitrine.`)) return;
  try {
    await fb.deleteDoc(fb.doc(fb.db, "anuncios", a.id));
    toast(`Parabéns! Imóvel marcado como ${rotulo} e removido.`);
    depois?.();
  } catch (e) { toast("Não foi possível apagar: " + erroAmigavel(e)); }
}
const moedaBR = (v) => (Number(v) > 0 ? Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }) : "");

function abrirFormAnuncio(a) {
  anEditandoId = a?.id || null;
  anEdit = JSON.parse(JSON.stringify({ finalidade: "aluguel", categoria: "apartamento", cidade: nomeCidade(dados.cidade), fotos: [], ...(a || {}), criadoEm: null, atualizadoEm: null }));
  anEdit.mobiliadoLista = anEdit.mobiliado ? ["sim"] : [];
  anEdit.caracteristicas = Array.isArray(anEdit.caracteristicas) ? anEdit.caracteristicas : [];
  anEdit.condicoes = Array.isArray(anEdit.condicoes) ? anEdit.condicoes : [];
  $("tAnuncio").textContent = a ? "Editar imóvel" : "Anunciar imóvel";
  $("anExcluir").hidden = !a;
  const corpo = $("anCorpo");
  corpo.replaceChildren();
  const ent = (chave, { numero = false, placeholder = "", max = 60, tipo = "text" } = {}) => {
    const i = document.createElement("input");
    i.type = tipo; i.placeholder = placeholder; i.maxLength = max;
    if (numero) i.inputMode = "decimal";
    i.value = numero ? mostrarNumero(anEdit[chave]) : (anEdit[chave] ?? "");
    i.addEventListener("input", () => { anEdit[chave] = numero ? numeroBR(i.value) : i.value.trim(); });
    return i;
  };
  const sel = (chave, opcoes) => {
    const s = document.createElement("select");
    Object.entries(opcoes).forEach(([v, t]) => { const o = document.createElement("option"); o.value = v; o.textContent = t; s.appendChild(o); });
    s.value = anEdit[chave] in opcoes ? anEdit[chave] : Object.keys(opcoes)[0];
    anEdit[chave] = s.value;
    s.addEventListener("change", () => { anEdit[chave] = s.value; });
    return s;
  };
  const desc = document.createElement("textarea");
  desc.maxLength = 800; desc.placeholder = "Diferenciais, estado do imóvel, o que está incluso, regras..."; desc.value = anEdit.descricao || "";
  desc.addEventListener("input", () => { anEdit.descricao = desc.value.trim(); });

  const fotosSec = secao("Fotos do imóvel", "Até 5 fotos. A primeira é a capa do anúncio.");
  const fotos = document.createElement("div");
  fotos.className = "neg-fotos";
  const pintarFotos = () => {
    fotos.replaceChildren();
    anEdit.fotos.forEach((f, i) => {
      const d = document.createElement("div");
      d.className = "neg-foto";
      d.style.backgroundImage = `url("${urlSegura(f)}")`;
      const x = document.createElement("button");
      x.type = "button"; x.className = "x"; x.setAttribute("aria-label", "Remover foto");
      x.appendChild(icone("fechar", "i xs"));
      x.addEventListener("click", () => { anEdit.fotos.splice(i, 1); pintarFotos(); });
      d.appendChild(x);
      fotos.appendChild(d);
    });
    if (anEdit.fotos.length < 5) {
      const add = document.createElement("button");
      add.type = "button"; add.className = "neg-foto add"; add.setAttribute("aria-label", "Adicionar foto");
      add.appendChild(icone("mais", "i"));
      add.addEventListener("click", () => pedirFoto({ titulo: "Foto do imóvel", proporcao: 4 / 3, larguraSaida: 1080, qualidade: 0.7, limiteBytes: 150000 }, (d) => { anEdit.fotos.push(d); pintarFotos(); }));
      fotos.appendChild(add);
    }
  };
  pintarFotos();
  fotosSec.appendChild(fotos);

  corpo.append(
    fotosSec,
    campo("Título do anúncio", ent("titulo", { placeholder: "Ex.: Apartamento 2 quartos perto da UFSC", max: 80 })),
    grade("", campo("Finalidade", sel("finalidade", FINALIDADES)), campo("Tipo de imóvel", sel("categoria", CATS_NEGOCIO.imoveis))),
    grade("", campo("Preço (R$)", ent("preco", { numero: true, placeholder: "2500" }), "Aluguel: por mês · Temporada: por diária"), campo("Condomínio (R$)", ent("condominio", { numero: true }))),
    grade("quatro",
      campo("Quartos", ent("quartos", { numero: true, max: 3 })),
      campo("Banheiros", ent("banheiros", { numero: true, max: 3 })),
      campo("Vagas", ent("vagas", { numero: true, max: 3 })),
      campo("Área (m²)", ent("area", { numero: true, max: 7 }))),
    grade("tres",
      campo("Suítes", ent("suites", { numero: true, max: 3 })),
      campo("Andar", ent("andar", { placeholder: "Térreo, 5º", max: 12 })),
      campo("IPTU (R$/mês)", ent("iptu", { numero: true }))),
    grade("", campo("Bairro", ent("bairro", { placeholder: "Ex.: Trindade" })), campo("Cidade", ent("cidade", { placeholder: "Florianópolis" }))),
    grade("", campo("Disponível a partir de", ent("disponivel", { placeholder: "Imediato ou 10/12", max: 20 })), campo("Hóspedes (temporada)", ent("hospedes", { numero: true, max: 3 }))),
    campo("", marcas("mobiliadoLista", { sim: "Mobiliado" }, null, anEdit)),
    campo("Características", marcas("caracteristicas", CARACT_IMOVEL, null, anEdit)),
    campo("Condições", marcas("condicoes", CONDICOES_IMOVEL, null, anEdit), "Garantias do aluguel, financiamento, pets..."),
    campo("Descrição", desc)
  );
  abrirFolha("folhaAnuncio");
}

$("anSalvar").addEventListener("click", async () => {
  const a = anEdit;
  if (!Number(a.preco) && !confirm("Publicar sem preço? O anúncio vai mostrar \"Consultar\".")) return;
  const btn = $("anSalvar");
  btn.disabled = true; btn.textContent = "Publicando...";
  try {
    const ref = anEditandoId ? fb.doc(fb.db, "anuncios", anEditandoId) : fb.doc(fb.collection(fb.db, "anuncios"));
    const fotos = [];
    for (const [i, f] of (a.fotos || []).entries()) fotos.push(f.startsWith("data:") ? await salvarImagem(f, `anuncios/${eu.uid}_${ref.id}_f${i}.jpg`) : f);
    const dadosAn = {
      donoId: eu.uid, tipo: "imovel", ativo: true, titulo: a.titulo || "", finalidade: a.finalidade, categoria: a.categoria,
      preco: a.preco ?? null, condominio: a.condominio ?? null, quartos: a.quartos ?? null, banheiros: a.banheiros ?? null,
      vagas: a.vagas ?? null, area: a.area ?? null, bairro: a.bairro || "", cidade: a.cidade || "",
      mobiliado: (a.mobiliadoLista || []).includes("sim"), descricao: a.descricao || "", fotos,
      suites: a.suites ?? null, andar: String(a.andar || "").slice(0, 12), iptu: a.iptu ?? null, disponivel: String(a.disponivel || "").slice(0, 20),
      hospedes: a.hospedes ?? null, caracteristicas: (a.caracteristicas || []).filter((k) => CARACT_IMOVEL[k]), condicoes: (a.condicoes || []).filter((k) => CONDICOES_IMOVEL[k]),
      criadoEm: a.criadoEm || fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp()
    };
    if (!anEditandoId) dadosAn.criadoEm = fb.serverTimestamp();
    else delete dadosAn.criadoEm;
    if (JSON.stringify(dadosAn).length > 950000) throw new Error("Fotos pesadas demais. Remova uma foto e tente de novo.");
    await fb.setDoc(ref, dadosAn, { merge: true });
    fecharFolha("folhaAnuncio");
    toast(anEditandoId ? "Imóvel atualizado" : "Imóvel anunciado");
    const lista = document.querySelector("#negExtras .neg-anuncios");
    if (lista) pintarMeusAnuncios(lista);
  } catch (e) { toast("Não foi possível publicar: " + erroAmigavel(e)); }
  finally { btn.disabled = false; btn.textContent = "Publicar anúncio"; }
});
$("anExcluir").addEventListener("click", async () => {
  if (!anEditandoId || !confirm("Excluir este anúncio?")) return;
  try {
    await fb.deleteDoc(fb.doc(fb.db, "anuncios", anEditandoId));
    fecharFolha("folhaAnuncio");
    toast("Anúncio excluído");
    const lista = document.querySelector("#negExtras .neg-anuncios");
    if (lista) pintarMeusAnuncios(lista);
  } catch (e) { toast("Não foi possível excluir: " + erroAmigavel(e)); }
});

function pintarFotoNegocio() {
  pintarAvatar($("negAvatar"), negFoto, $("negNome").value || NEGOCIOS[negTipo].rotulo);
  $("negRemoverFoto").hidden = !negFoto;
}
$("negTipo").addEventListener("click", (e) => {
  const b = e.target.closest("[data-valor]");
  if (!b || b.disabled) return;
  negTipo = b.dataset.valor;
  document.querySelectorAll("#negTipo [data-valor]").forEach((x) => x.classList.toggle("on", x === b));
  negExtra = { fotos: [], itens: [] };
  montarExtras();
});
$("negDesc").addEventListener("input", () => { $("negDescCont").textContent = `${$("negDesc").value.length}/500`; });
$("negTrocarFoto").addEventListener("click", () => $("negArquivo").click());
$("negRemoverFoto").addEventListener("click", () => { negFoto = ""; pintarFotoNegocio(); });
$("negArquivo").addEventListener("change", async () => {
  const arquivo = $("negArquivo").files?.[0];
  $("negArquivo").value = "";
  if (!arquivo) return;
  try {
    const d = await editarImagem(arquivo, { titulo: "Foto do negócio", dica: "O círculo mostra como a foto ou logo aparece. Deixe o principal dentro da linha tracejada.", proporcao: 1, circulo: true, larguraSaida: 480, qualidade: 0.86, limiteBytes: 250000 });
    if (d) { negFoto = d; pintarFotoNegocio(); }
  } catch (e) { toast(erroAmigavel(e)); }
});
$("negSalvar").addEventListener("click", async () => {
  const nome = $("negNome").value.trim();
  if (nome.length < 2) { toast("Dê um nome ao seu negócio."); $("negNome").focus(); return; }
  const btn = $("negSalvar");
  btn.disabled = true; btn.textContent = "Salvando...";
  try {
    const id = `${eu.uid}_${negTipo}`;
    let foto = negFoto;
    if (foto.startsWith("data:")) foto = await salvarImagem(foto, `negocios/${id}.jpg`);
    const x = negExtra;
    if (negTipo === "servicos" && !(x.categorias || []).length) { throw new Error("Marque pelo menos uma área de atuação."); }
    const extras = { categoria: negTipo === "servicos" ? x.categorias[0] : (x.categoria || Object.keys(CATS_NEGOCIO[negTipo])[0]), fotos: [], itens: [] };
    const campos = {
      servicos: ["categorias", "precoDesde", "horario", "atendimento", "dias", "regiao", "experiencia", "diferenciais", "pagamentos"],
      delivery: ["horaAbre", "horaFecha", "tempoMin", "tempoMax", "taxaEntrega", "pedidoMinimo", "dias", "opcoesEntrega", "pagamentos"],
      lojinha: ["entrega", "pagamentos", "categoriaPersonalizada"],
      imoveis: ["tipoAnunciante", "creci"]
    }[negTipo];
    campos.forEach((k) => { extras[k] = x[k] ?? null; });
    if (negTipo === "lojinha") extras.categoriaPersonalizada = extras.categoria === "outros" ? String(x.categoriaPersonalizada || "").trim().slice(0, 30) : "";
    if (negTipo === "servicos") {
      const motorista = x.categorias.includes("transporte");
      extras.cnh = motorista ? (x.cnh || []) : [];
      extras.veiculo = motorista ? (x.veiculo || "") : "";
    }
    // Cadastro antigo de imóveis (um imóvel dentro do perfil): vira um anúncio antes de regravar o perfil.
    if (negTipo === "imoveis" && negEditando && (negEditando.preco || negEditando.quartos)) {
      const n0 = negEditando;
      await fb.addDoc(fb.collection(fb.db, "anuncios"), {
        donoId: eu.uid, tipo: "imovel", ativo: true, titulo: "", finalidade: n0.finalidade || "aluguel", categoria: n0.categoria || "outros",
        preco: n0.preco ?? null, condominio: n0.condominio ?? null, quartos: n0.quartos ?? null, banheiros: n0.banheiros ?? null,
        vagas: n0.vagas ?? null, area: n0.area ?? null, bairro: n0.bairro || "", cidade: n0.cidade || "", mobiliado: !!n0.mobiliado,
        descricao: n0.descricao || "", fotos: n0.fotos || [], criadoEm: fb.serverTimestamp(), atualizadoEm: fb.serverTimestamp()
      });
    }
    for (const [i, f] of (x.fotos || []).entries()) extras.fotos.push(f.startsWith("data:") ? await salvarImagem(f, `negocios/${id}_f${i}.jpg`) : f);
    for (const [i, it] of (x.itens || []).entries()) {
      if (!it.nome) continue;
      const fotoItem = it.foto && it.foto.startsWith("data:") ? await salvarImagem(it.foto, `negocios/${id}_i${i}.jpg`) : (it.foto || "");
      const item = { nome: it.nome, preco: it.preco ?? null, foto: fotoItem };
      const curto = (v, m) => String(v || "").trim().slice(0, m);
      if (negTipo === "lojinha") {
        item.estoque = Number.isInteger(it.estoque) && it.estoque >= 0 ? it.estoque : null;
        Object.assign(item, {
          condicao: CONDICAO[it.condicao] ? it.condicao : "novo", marca: curto(it.marca, 30), precoAntigo: Number(it.precoAntigo) > 0 ? Number(it.precoAntigo) : null,
          tamanhos: listaTexto(it.tamanhos), cores: listaTexto(it.cores), descricao: curto(it.descricao, 300), ficha: curto(it.ficha, 500)
        });
      }
      if (negTipo === "delivery") Object.assign(item, { secao: curto(it.secao, 24), descricao: curto(it.descricao, 160), precoAntigo: Number(it.precoAntigo) > 0 ? Number(it.precoAntigo) : null });
      if (negTipo === "servicos") Object.assign(item, { unidade: UNIDADES_SERV[it.unidade] ? it.unidade : "fixo", duracao: curto(it.duracao, 30), descricao: curto(it.descricao, 160) });
      if (negTipo === "servicos") item.categoria = x.categorias.includes(it.categoria) ? it.categoria : x.categorias[0];
      extras.itens.push(item);
    }
    const dadosNeg = {
      donoId: eu.uid, tipo: negTipo, nome, descricao: $("negDesc").value.trim(), cidade: $("negCidade").value.trim(),
      whatsapp: $("negWhats").value.trim(), foto, ...extras, atualizadoEm: fb.serverTimestamp()
    };
    if (JSON.stringify(dadosNeg).length > 950000) throw new Error("Fotos demais para um perfil. Remova algumas fotos e tente de novo.");
    dadosNeg.criadoEm = negEditando?.criadoEm || fb.serverTimestamp();
    await fb.setDoc(fb.doc(fb.db, "negocios", id), dadosNeg);
    fecharFolha("folhaNegocio");
    toast(negEditando ? "Perfil de negócio atualizado" : "Perfil de negócio criado");
    carregarMeusNegocios().then(carregarNumeros);
  } catch (e) { toast("Não foi possível salvar: " + erroAmigavel(e)); }
  finally { btn.disabled = false; btn.textContent = "Salvar"; }
});
$("negExcluir").addEventListener("click", async () => {
  if (!negEditando || !confirm(`Excluir o perfil "${negEditando.nome}"?`)) return;
  try {
    await fb.deleteDoc(fb.doc(fb.db, "negocios", negEditando.id));
    fecharFolha("folhaNegocio");
    toast("Perfil de negócio excluído");
    carregarMeusNegocios().then(carregarNumeros);
  } catch (e) { toast("Não foi possível excluir: " + erroAmigavel(e)); }
});

// ---------- início ----------
(async function iniciar() {
  try { await iniciarRede(); }
  catch (e) { $("painelNegocios").replaceChildren(el("div", "lista-vazia", e.message || "Não foi possível carregar.")); return; }
  montarBarraRede("");
  pintarBarraRede();
  ouvirAvisos({ notificarNovos: false });
  await carregarMeusNegocios();
  carregarNumeros();
  const p = new URLSearchParams(location.search);
  const tipo = p.get("tipo");
  if (tipo && NEGOCIOS[tipo]) {
    const n = meusNegocios.find((x) => x.tipo === tipo);
    if (n) abrirFormNegocio(n); else novoNegocio(tipo);
  } else if (p.get("novo")) novoNegocio(null);
  if (tipo || p.get("novo")) history.replaceState(null, "", "negocios.html");
})();
