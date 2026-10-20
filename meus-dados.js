// =====================================================
// "Baixar meus dados" (LGPD, art. 18) — configuracoes.html
// - Relatório para ler: uma página HTML completa, que abre em qualquer navegador (também
//   offline) e pode ser salva em PDF. Cada parte com título, nomes no lugar dos códigos,
//   datas por extenso, fotos e áudios, e as conversas como num chat.
// - Arquivo técnico (JSON): os mesmos dados, para levar a outro serviço.
// =====================================================
const PESSOA = new Set(["autorId", "alvoId", "seguidorId", "uid", "donoId", "remetenteId", "bloqueadorId", "bloqueadoId", "postAutorId", "comentarioAutorId",
  "participantes", "marcados", "silenciados", "abertoPor", "responsavel", "de", "para", "mencoes", "ocultoPara", "lista"]);
const ESCONDER = new Set(["busca", "_txt", "ocultasMsg", "mensagens", "lidoPor", "digitando", "suporteLido"]);
const ROTULOS = {
  nome: "Nome", nickname: "@usuário", email: "E-mail", bio: "Bio", cidade: "Cidade", cidadeNome: "Cidade", uf: "Estado", cidadeIbge: "Código IBGE da cidade",
  bairro: "Bairro", rua: "Rua", numero: "Número", complemento: "Complemento", cep: "CEP", endereco: "Endereço", telefone: "Telefone", whatsapp: "WhatsApp",
  fotoPerfil: "Foto de perfil", fotoCapa: "Foto de capa", capa: "Foto de capa", foto: "Foto", fotos: "Fotos", criadoEm: "Criado em", atualizadoEm: "Atualizado em",
  ultimoAcesso: "Último acesso", aceiteTermos: "Aceitou os Termos de Uso", aceiteTermosEm: "Termos aceitos em", verificado: "Perfil verificado",
  solicitacaoVerificacao: "Pedido de verificação", descricao: "Descrição", texto: "Texto", mediaUrl: "Foto ou vídeo", mediaTipo: "Tipo de mídia", midias: "Fotos",
  tags: "Hashtags", marcados: "Pessoas marcadas", nota: "Nota", comentario: "Comentário", autorId: "Autor", alvoId: "Para quem", seguidorId: "Seguidor",
  participantes: "Pessoas", status: "Situação", tipo: "Tipo", motivo: "Motivo", assunto: "Assunto", mensagem: "Mensagem", resposta: "Resposta", salvos: "Publicações salvas",
  colecoes: "Coleções", silenciados: "Pessoas silenciadas", atendimento: "Atendimento", flashConfig: "Configurações do Flash", enquete: "Enquete", enquetes: "Suas enquetes",
  caixa: "Caixa de perguntas", remetenteId: "Enviada por", categoria: "Categoria", categorias: "Categorias", categoriaPersonalizada: "Categoria (personalizada)",
  itens: "Itens", horario: "Horário", dias: "Dias", regiao: "Região de atendimento", experiencia: "Experiência", diferenciais: "Diferenciais", pagamentos: "Pagamentos",
  precoDesde: "Preço a partir de", preco: "Preço", titulo: "Título", finalidade: "Finalidade", ativo: "No ar", donoId: "Dono", negocioId: "Negócio", negocioNome: "Negócio",
  abertaEm: "Aberta em", resolvidaEm: "Resolvida em", lidoEm: "Lido em", editadoEm: "Editado em", editadaEm: "Editada em", agendadoPara: "Agendada para",
  quemComenta: "Quem pode comentar", comentarioFixo: "Comentário fixado", postId: "Publicação", origem: "Origem", socialVisibilidade: "Quem vê o seu Social",
  duoCapa: "Rosinha do duo no perfil", mostrarOnline: "Mostrar quando estou on-line", confirmacaoLeitura: "Confirmação de leitura", tema: "Tema", sons: "Sons",
  desativadaAte: "Desativada até", exclusaoPedidaEm: "Exclusão pedida em", ocultoAte: "Escondido até", bloqueadorId: "Quem bloqueou", bloqueadoId: "Quem foi bloqueado",
  semana: "Horário da semana", almoco: "Almoço", volta: "Volta em", ausente: "Ausente", uid: "Pessoa", uidCliente: "Cliente", cliente: "Cliente"
};
const VALORES = {
  status: { aceito: "Aceito", pendente: "Pendente", aberta: "Aberta", resolvida: "Resolvida", nova: "Nova", em_analise: "Em análise", descartada: "Descartada", fechado: "Fechado", aberto: "Aberto" },
  tipo: { seguir: "Seguir", servicos: "Freelances", delivery: "Delivery", lojinha: "Shopping", imoveis: "Imóveis", imovel: "Imóvel", duo: "Duo", namoro: "Namorado(a)",
    casamento: "Cônjuge", melhor_amigo: "Melhor amigo(a)", amigo: "Amigo(a)", irmao: "Irmão(ã)", pai_mae: "Pai/Mãe", filho: "Filho(a)", primo: "Primo(a)", tio: "Tio(a)",
    sobrinho: "Sobrinho(a)", avo: "Avô/Avó", neto: "Neto(a)", parceiro: "Parceiro(a) de trabalho", alerta: "Alerta", grave: "Grave", info: "Informativo" },
  finalidade: { aluguel: "Aluguel", venda: "Venda", temporada: "Temporada" },
  mediaTipo: { image: "Foto", video: "Vídeo" },
  tema: { sistema: "Igual ao aparelho", escuro: "Escuro", claro: "Claro" },
  quemComenta: { todos: "Todos", seguidores: "Só seguidores", mutuos: "Seguidores que você segue", ninguem: "Ninguém" },
  socialVisibilidade: { todos: "Todos", seguidores: "Seguidores", ninguem: "Só você" }
};
const humano = (k) => ROTULOS[k] || String(k).replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase()).replace(/\bEm$/, "em");
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ehData = (v) => v && typeof v === "object" && typeof v.toDate === "function";
const dataTxt = (v) => {
  const d = ehData(v) ? v.toDate() : v instanceof Date ? v : null;
  return d && !isNaN(d) ? d.toLocaleString("pt-BR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
};
const dataCurta = (v) => { const d = ehData(v) ? v.toDate() : null; return d ? d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""; };
const midia = (s) => typeof s === "string" && /^(data:(image|audio|video)\/|https:\/\/firebasestorage\.googleapis\.com\/)/.test(s);
const ehUid = (s) => typeof s === "string" && /^[A-Za-z0-9]{20,36}$/.test(s);

// ---------- juntar ----------
export async function juntarDados(fb, uid, obterPerfil) {
  const lista = (col, campo, op = "==") => fb.getDocs(fb.query(fb.collection(fb.db, col), fb.where(campo, op, uid))).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))).catch(() => []);
  const um = (col, id) => fb.getDoc(fb.doc(fb.db, col, id)).then((s) => (s.exists() ? s.data() : null)).catch(() => null);
  const [conta, perfil, negocios, anuncios, publicacoes, comentarios, estrelasDadas, seguindo, seguidores, conexoes, bloqueios, avaliacoesFeitas, avaliacoesRecebidas,
    reclamacoesFeitas, reclamacoesRecebidas, chamados, avisos, conversas, enquetesVotadas, respostasCaixa] = await Promise.all([
    um("usuarios", uid), um("perfis_publicos", uid), lista("negocios", "donoId"), lista("anuncios", "donoId"), lista("diario", "autorId"), lista("comentarios", "autorId"),
    lista("curtidas", "uid"), lista("relacoes", "seguidorId"), lista("relacoes", "alvoId"), lista("vinculos", "participantes", "array-contains"), lista("bloqueios", "bloqueadorId"),
    lista("avaliacoes", "autorId"), lista("avaliacoes", "alvoId"), lista("queixas", "autorId"), lista("queixas", "alvoId"), lista("suporte", "uid"), lista("avisos", "uid"),
    lista("conversas", "participantes", "array-contains"), lista("enquete_votos", "uid"), lista("caixa_respostas", "uid")
  ]);
  // Mensagens das suas conversas (até 1.000 por conversa).
  for (const c of conversas) {
    c.mensagens = await fb.getDocs(fb.query(fb.collection(fb.db, "conversas", c.id, "mensagens"), fb.orderBy("criadoEm", "asc"), fb.limit(1000))).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))).catch(() => []);
  }
  const dados = { conta, perfil, negocios, anuncios, publicacoes, comentarios, estrelasDadas, seguindo, seguidores, conexoes, bloqueios, avaliacoesFeitas, avaliacoesRecebidas,
    reclamacoesFeitas, reclamacoesRecebidas, chamados, avisos, conversas, enquetesVotadas, respostasCaixa };
  // Nomes das pessoas que aparecem (no lugar dos códigos).
  const uids = new Set();
  const coletar = (v, k) => {
    if (Array.isArray(v)) v.forEach((x) => coletar(x, k));
    else if (v && typeof v === "object" && !ehData(v)) Object.entries(v).forEach(([kk, x]) => coletar(x, kk));
    else if (PESSOA.has(k) && ehUid(v) && v !== uid) uids.add(v);
  };
  coletar(dados);
  const nomes = new Map();
  await Promise.all([...uids].slice(0, 400).map((u) => obterPerfil(u).then((p) => nomes.set(u, p?.nome ? `${p.nome}${p.nickname ? " (@" + p.nickname + ")" : ""}` : "")).catch(() => {})));
  return { dados, nomes };
}

// ---------- arquivo técnico ----------
export function jsonDos(dados) {
  const limpar = (v) => JSON.parse(JSON.stringify(v, (k, x) => (x && typeof x === "object" && typeof x.toDate === "function" ? x.toDate().toISOString() : x)));
  return JSON.stringify(limpar({ geradoEm: new Date().toISOString(), aviso: "Cópia dos seus dados no Help Floripa (LGPD, art. 18). Senha e dados de segurança do login ficam no Google Firebase e não são incluídos.", ...dados }), null, 2);
}

// ---------- relatório para ler ----------
export function relatorioHTML({ dados, nomes }, uid) {
  const eu = dados.conta || {};
  const quem = (u) => (u === uid ? "Você" : nomes.get(u) || "Conta do Help Floripa");
  // Um valor qualquer, legível.
  function valor(k, v, nivel = 0) {
    if (v == null || v === "" || (Array.isArray(v) && !v.length)) return "";
    if (ehData(v)) return esc(dataTxt(v));
    if (typeof v === "boolean") return v ? "Sim" : "Não";
    if (typeof v === "number") return esc(k === "preco" || k === "precoDesde" || k === "taxaEntrega" || k === "pedidoMinimo" ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : v.toLocaleString("pt-BR"));
    if (typeof v === "string") {
      if (midia(v)) {
        if (/^data:audio/.test(v)) return `<audio controls src="${esc(v)}"></audio>`;
        if (/^data:video/.test(v)) return `<video controls src="${esc(v)}"></video>`;
        return `<img class="foto" src="${esc(v)}" alt="">`;
      }
      if (PESSOA.has(k) && ehUid(v)) return `<span class="pessoa">${esc(quem(v))}</span>`;
      if (VALORES[k]?.[v]) return esc(VALORES[k][v]);
      return `<span class="txt">${esc(v)}</span>`;
    }
    if (Array.isArray(v)) {
      if (v.every((x) => typeof x === "string" && midia(x))) return `<div class="fotos">${v.map((x) => valor(k, x)).join("")}</div>`;
      if (v.every((x) => typeof x !== "object" || x === null || ehData(x))) {
        return `<div class="chips">${v.map((x) => `<span>${PESSOA.has(k) && ehUid(x) ? esc(quem(x)) : k === "tags" ? "#" + esc(x) : valor(k, x) || "—"}</span>`).join("")}</div>`;
      }
      return v.map((x, i) => `<div class="sub"><b>${i + 1}.</b>${tabela(x, nivel + 1)}</div>`).join("");
    }
    if (typeof v === "object") return tabela(v, nivel + 1);
    return esc(v);
  }
  function tabela(o, nivel = 0) {
    if (!o || typeof o !== "object") return valor("", o, nivel);
    const linhas = Object.entries(o).filter(([k, v]) => !ESCONDER.has(k) && !(nivel === 0 && k === "id") && !(k === "uid" && v === uid))
      .map(([k, v]) => [k, valor(k, v, nivel)]).filter(([, h]) => h);
    if (!linhas.length) return `<span class="vazio">—</span>`;
    return `<dl class="${nivel ? "aninhada" : ""}">${linhas.map(([k, h]) => `<dt>${esc(humano(k))}</dt><dd>${h}</dd>`).join("")}</dl>`;
  }
  const cartao = (titulo, sub, corpo) => `<article class="cartao"><header><h3>${esc(titulo)}</h3>${sub ? `<small>${esc(sub)}</small>` : ""}</header>${corpo}</article>`;
  const resumo = (t, n = 70) => { const s = String(t || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
  const quando = (x) => dataTxt(x.criadoEm || x.abertaEm || x.em || x.atualizadoEm);

  const SECOES = [
    ["conta", "Sua conta", "Os dados que você informou no cadastro e nas configurações.", () => dados.conta ? cartao("Dados da conta", "", tabela(dados.conta)) : ""],
    ["perfil", "Seu perfil público", "O que as outras pessoas veem no seu perfil.", () => dados.perfil ? cartao("Perfil público", "", tabela(dados.perfil)) : ""],
    ["negocios", "Seus negócios", "Perfis de Freelances, Delivery, Shopping e Imóveis.", () => dados.negocios.map((n) => cartao(n.nome || "Negócio", VALORES.tipo[n.tipo] || "", tabela(n))).join("")],
    ["anuncios", "Seus anúncios", "Imóveis anunciados.", () => dados.anuncios.map((a) => cartao(a.titulo || "Anúncio", VALORES.finalidade[a.finalidade] || "", tabela(a))).join("")],
    ["publicacoes", "Suas publicações", "Tudo o que você publicou no Diário.", () => dados.publicacoes.sort((a, b) => (b.criadoEm?.toMillis?.() || 0) - (a.criadoEm?.toMillis?.() || 0)).map((p) => cartao(resumo(p.texto || p.enquete?.pergunta) || "Publicação", quando(p), tabela(p))).join("")],
    ["comentarios", "Seus comentários", "", () => dados.comentarios.map((c) => cartao(resumo(c.texto) || "Comentário", quando(c), tabela(c))).join("")],
    ["estrelas", "Estrelas que você deu", "", () => linhasSimples(dados.estrelasDadas, (x) => `${"★".repeat(Math.max(0, Math.min(5, Number(x.nota) || 0)))} <span class="cinza">para a publicação de</span> ${esc(quem(x.postAutorId))}`)],
    ["seguindo", "Quem você segue", "", () => linhasSimples(dados.seguindo, (x) => esc(quem(x.alvoId)))],
    ["seguidores", "Quem segue você", "", () => linhasSimples(dados.seguidores, (x) => esc(quem(x.seguidorId)))],
    ["conexoes", "Vínculos do Social", "", () => linhasSimples(dados.conexoes, (x) => `${esc(quem((x.participantes || []).find((u) => u !== uid)))} <span class="cinza">· ${esc(VALORES.tipo[x.tipo] || "Vínculo")} · ${esc(VALORES.status[x.status] || x.status || "")}</span>`)],
    ["bloqueios", "Contas que você bloqueou", "", () => linhasSimples(dados.bloqueios, (x) => esc(quem(x.bloqueadoId)))],
    ["avaliacoesFeitas", "Avaliações que você fez", "", () => dados.avaliacoesFeitas.map((a) => cartao(`${"★".repeat(Number(a.nota) || 0)} para ${quem(a.alvoId)}`, quando(a), tabela(a))).join("")],
    ["avaliacoesRecebidas", "Avaliações que você recebeu", "", () => dados.avaliacoesRecebidas.map((a) => cartao(`${"★".repeat(Number(a.nota) || 0)} de ${quem(a.autorId)}`, quando(a), tabela(a))).join("")],
    ["reclamacoesFeitas", "Reclamações que você abriu", "", () => dados.reclamacoesFeitas.map((q) => cartao(q.negocioNome || "Reclamação", quando(q), tabela(q))).join("")],
    ["reclamacoesRecebidas", "Reclamações sobre você", "", () => dados.reclamacoesRecebidas.map((q) => cartao(q.negocioNome || "Reclamação", quando(q), tabela(q))).join("")],
    ["enquetes", "Enquetes em que você votou", "", () => linhasSimples(dados.enquetesVotadas, (x) => `Opção ${Number(x.opcao) + 1} <span class="cinza">· ${x.tipo === "f" ? "num flash" : "numa publicação"}</span>`)],
    ["caixa", "Suas respostas em caixas de perguntas", "", () => dados.respostasCaixa.map((r) => cartao(resumo(r.texto) || "Resposta", quando(r), tabela(r))).join("")],
    ["suporte", "Chamados no suporte", "", () => dados.chamados.map((s) => cartao(s.assunto || "Chamado", quando(s), tabela(s))).join("")],
    ["avisos", "Avisos da equipe", "", () => dados.avisos.map((a) => cartao(a.titulo || "Aviso", quando(a), tabela(a))).join("")],
    ["conversas", "Suas conversas", "Mensagens das conversas no Mensagens (até 1.000 por conversa).", () => dados.conversas.map(conversa).join("")]
  ];
  function linhasSimples(lista, fn) {
    if (!lista.length) return "";
    return `<div class="cartao"><ul class="linhas">${lista.map((x) => `<li><span>${fn(x)}</span><time>${esc(dataCurta(x.criadoEm || x.em))}</time></li>`).join("")}</ul></div>`;
  }
  function conteudoMsg(m) {
    if (m.apagada) return `<i class="cinza">Mensagem apagada</i>`;
    const partes = [];
    if (m.texto) partes.push(`<p>${esc(m.texto)}</p>`);
    const url = m.arquivoUrl || m.url;
    if (m.tipoArquivo === "imagem" && midia(url)) partes.push(`<img class="foto" src="${esc(url)}" alt="">`);
    else if (m.tipoArquivo === "audio" && midia(url)) partes.push(`<audio controls src="${esc(url)}"></audio>`);
    else if (m.tipoArquivo === "video" && midia(url)) partes.push(`<video controls src="${esc(url)}"></video>`);
    else if (m.tipoArquivo === "cartao") partes.push(`<span class="etq">${esc(m.cartao?.tipo === "flash" ? "Flash" : m.cartao?.tipo === "publicacao" ? "Publicação enviada" : m.cartao?.titulo || "Cartão")}</span>`);
    else if (m.tipoArquivo === "avaliacao") partes.push(`<span class="etq">Pedido de avaliação</span>`);
    else if (m.tipoArquivo && !partes.length) partes.push(`<span class="etq">Anexo (${esc(m.tipoArquivo)})</span>`);
    if (m.editadaEm) partes.push(`<small class="cinza">editada</small>`);
    return partes.join("") || `<i class="cinza">(sem texto)</i>`;
  }
  function conversa(c) {
    const outro = (c.participantes || []).find((u) => u !== uid);
    const msgs = (c.mensagens || []).map((m) => {
      const minha = m.remetenteId === uid;
      return `<div class="msg ${minha ? "minha" : ""}"><div class="balao"><b>${esc(minha ? "Você" : quem(m.remetenteId))}</b>${conteudoMsg(m)}<time>${esc(dataCurta(m.criadoEm))}</time></div></div>`;
    }).join("");
    return `<article class="cartao conversa"><header><h3>Conversa com ${esc(quem(outro))}</h3><small>${(c.mensagens || []).length} ${(c.mensagens || []).length === 1 ? "mensagem" : "mensagens"}</small></header><div class="chat">${msgs || '<p class="cinza">Sem mensagens.</p>'}</div></article>`;
  }

  const conta = (n) => (Array.isArray(n) ? n.length : n ? 1 : 0);
  const quantos = { conta: conta(dados.conta), perfil: conta(dados.perfil), negocios: dados.negocios.length, anuncios: dados.anuncios.length, publicacoes: dados.publicacoes.length,
    comentarios: dados.comentarios.length, estrelas: dados.estrelasDadas.length, seguindo: dados.seguindo.length, seguidores: dados.seguidores.length, conexoes: dados.conexoes.length,
    bloqueios: dados.bloqueios.length, avaliacoesFeitas: dados.avaliacoesFeitas.length, avaliacoesRecebidas: dados.avaliacoesRecebidas.length, reclamacoesFeitas: dados.reclamacoesFeitas.length,
    reclamacoesRecebidas: dados.reclamacoesRecebidas.length, enquetes: dados.enquetesVotadas.length, caixa: dados.respostasCaixa.length, suporte: dados.chamados.length,
    avisos: dados.avisos.length, conversas: dados.conversas.length };
  const corpo = SECOES.map(([id, titulo, sub, fn]) => {
    const h = fn();
    return `<section id="${id}"><div class="sec-cab"><h2>${esc(titulo)}</h2><span class="n">${quantos[id]}</span></div>${sub ? `<p class="sec-sub">${esc(sub)}</p>` : ""}${h || '<p class="nada">Nada por aqui.</p>'}</section>`;
  }).join("");
  const indice = SECOES.map(([id, titulo]) => `<a href="#${id}"><span>${esc(titulo)}</span><b>${quantos[id]}</b></a>`).join("");
  const gerado = new Date().toLocaleString("pt-BR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const foto = midia(eu.fotoPerfil) ? `<img class="av" src="${esc(eu.fotoPerfil)}" alt="">` : `<span class="av">${esc(String(eu.nome || "?").trim().charAt(0).toUpperCase())}</span>`;

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Seus dados no Help Floripa</title>
<style>
:root { --bg: #f3f6f8; --panel: #fff; --text: #0f1b22; --muted: #5f707b; --line: #e2e8ec; --accent: #00adee; }
@media (prefers-color-scheme: dark) { :root { --bg: #0b1014; --panel: #10181d; --text: #e9eef1; --muted: #8b9ba6; --line: #22313a; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
.pagina { width: min(860px, 100%); margin: 0 auto; padding: 20px 16px 60px; }
.topo { display: flex; align-items: center; gap: 16px; padding: 22px; border-radius: 22px; background: linear-gradient(135deg, #003b54, #00adee); color: #fff; }
.marca { font-weight: 900; letter-spacing: .5px; font-size: 13px; opacity: .9; }
.marca span { color: #bdf0ff; }
.topo h1 { margin: 2px 0 4px; font-size: 24px; line-height: 1.2; }
.topo p { margin: 0; opacity: .9; font-size: 13.5px; }
.av { flex: none; width: 64px; height: 64px; border-radius: 50%; object-fit: cover; display: grid; place-items: center; background: rgba(255,255,255,.2); font-size: 26px; font-weight: 800; border: 3px solid rgba(255,255,255,.6); }
.aviso { margin: 14px 0; padding: 14px 16px; border-radius: 16px; background: var(--panel); border: 1px solid var(--line); color: var(--muted); font-size: 13.5px; }
.aviso b { color: var(--text); }
.botoes { display: flex; gap: 8px; flex-wrap: wrap; margin: 0 0 14px; }
.botoes button { height: 42px; padding: 0 16px; border-radius: 12px; border: 0; background: var(--accent); color: #001a24; font: inherit; font-weight: 800; cursor: pointer; }
.indice { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 6px; margin: 0 0 22px; }
.indice a { display: flex; justify-content: space-between; gap: 8px; padding: 10px 14px; border-radius: 12px; background: var(--panel); border: 1px solid var(--line); color: var(--text); text-decoration: none; font-weight: 650; font-size: 14px; }
.indice b { color: var(--accent); }
section { margin: 0 0 26px; }
.sec-cab { display: flex; align-items: center; gap: 10px; margin: 0 2px 2px; }
h2 { margin: 0; font-size: 19px; }
.n { padding: 1px 9px; border-radius: 999px; background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); font-weight: 800; font-size: 13px; }
.sec-sub { margin: 0 2px 10px; color: var(--muted); font-size: 13.5px; }
.nada { margin: 6px 2px; color: var(--muted); font-size: 14px; }
.cartao { background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 16px; margin: 10px 0; break-inside: avoid; }
.cartao header { margin: 0 0 10px; }
.cartao h3 { margin: 0; font-size: 16px; }
.cartao header small { color: var(--muted); }
dl { display: grid; grid-template-columns: minmax(120px, 34%) 1fr; gap: 8px 14px; margin: 0; }
dt { color: var(--muted); font-size: 13.5px; font-weight: 650; }
dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
dl.aninhada { padding: 10px 12px; border-radius: 12px; background: var(--bg); grid-template-columns: minmax(100px, 38%) 1fr; }
@media (max-width: 560px) { dl, dl.aninhada { grid-template-columns: 1fr; gap: 2px; } dd { margin-bottom: 8px; } }
.txt { white-space: pre-wrap; }
.sub { display: flex; gap: 8px; margin: 0 0 6px; } .sub > b { color: var(--muted); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; } .chips span { padding: 2px 10px; border-radius: 999px; background: var(--bg); border: 1px solid var(--line); font-size: 13.5px; }
.foto { display: block; max-width: min(100%, 320px); max-height: 320px; border-radius: 12px; border: 1px solid var(--line); }
.fotos { display: flex; flex-wrap: wrap; gap: 8px; } .fotos .foto { max-width: 150px; max-height: 150px; }
audio, video { max-width: 100%; }
.linhas { list-style: none; margin: 0; padding: 0; }
.linhas li { display: flex; justify-content: space-between; gap: 12px; padding: 9px 2px; border-bottom: 1px solid var(--line); }
.linhas li:last-child { border-bottom: 0; }
.linhas time, .cinza { color: var(--muted); font-size: 13px; }
.vazio { color: var(--muted); }
.chat { display: grid; gap: 6px; padding: 10px; border-radius: 14px; background: var(--bg); max-height: none; }
.msg { display: flex; } .msg.minha { justify-content: flex-end; }
.balao { max-width: 82%; padding: 8px 12px; border-radius: 14px 14px 14px 4px; background: var(--panel); border: 1px solid var(--line); overflow-wrap: anywhere; }
.msg.minha .balao { border-radius: 14px 14px 4px 14px; background: color-mix(in srgb, var(--accent) 16%, var(--panel)); }
.balao b { display: block; font-size: 12px; color: var(--accent); }
.balao p { margin: 2px 0; white-space: pre-wrap; }
.balao time { display: block; text-align: right; font-size: 11px; color: var(--muted); }
.etq { display: inline-block; padding: 2px 8px; border-radius: 8px; background: var(--bg); font-size: 13px; font-weight: 650; }
.rodape { margin-top: 30px; color: var(--muted); font-size: 12.5px; text-align: center; }
@media print { body { background: #fff; color: #000; } .botoes { display: none; } .cartao { border-color: #ccc; } .topo { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head>
<body><div class="pagina">
<div class="topo">${foto}<div><div class="marca">HELP <span>FLORIPA</span></div><h1>Seus dados</h1><p>${esc(eu.nome || "")}${eu.email ? " · " + esc(eu.email) : ""}<br>Gerado em ${esc(gerado)}</p></div></div>
<div class="aviso"><b>Cópia dos seus dados no Help Floripa</b>, conforme a Lei Geral de Proteção de Dados (LGPD, art. 18). A senha e os dados de segurança do login ficam guardados com o Google Firebase e não entram nesta cópia. Guarde este arquivo em lugar seguro: ele tem informações pessoais.</div>
<div class="botoes"><button type="button" onclick="window.print()">Imprimir ou salvar em PDF</button></div>
<nav class="indice" aria-label="Partes do relatório">${indice}</nav>
${corpo}
<p class="rodape">Help Floripa · helpfloripa.com.br · Dúvidas sobre os seus dados: página de Privacidade ou Suporte.</p>
</div></body></html>`;
}
