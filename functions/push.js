// =====================================================
// Notificações com o app fechado (Etapa B, Firebase Cloud Messaging). Aqui só a CONTA (sem Firebase): o texto de cada
// aviso, a preferência da pessoa e o limite para não encher o celular. O envio fica em index.js.
// Tokens do aparelho: usuarios/{uid}.pushTokens [{t, em, app}] (até 5, o próprio site grava; push.js).
// Preferências: usuarios/{uid}.pushPref {ligado, mensagens, chamadas, seguidores, publicacoes, social, avisos} (false desliga).
// =====================================================

export const CATEGORIAS = ["mensagens", "chamadas", "seguidores", "publicacoes", "social", "avisos"];

// A pessoa quer este tipo? Sem preferência gravada = quer tudo (depois de ligar as notificações no aparelho).
export function quer(pref, categoria) {
  if (pref && pref.ligado === false) return false;
  return !pref || pref[categoria] !== false;
}

// Limite: o mesmo assunto (chave) no máximo 1 vez a cada `janela` ms (estrelas na mesma publicação, por exemplo).
// estado = { chave: ms do último }. Devolve { pode, estado (novo, só com as chaves das últimas 24 h) }.
export function limite(estado, chave, agora, janela) {
  const e = {};
  Object.entries(estado || {}).forEach(([k, v]) => { if (agora - Number(v) < 864e5) e[k] = Number(v); });
  if (e[chave] && agora - e[chave] < janela) return { pode: false, estado: e };
  e[chave] = agora;
  return { pode: true, estado: e };
}

const corta = (t, n) => { const s = String(t || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

// Resumo da mensagem do chat (texto, foto, áudio, cartão).
export function resumoMensagem(m) {
  if (m?.apagada) return "";
  if (m?.texto) return corta(m.texto, 140);
  if (m?.tipoArquivo === "imagem") return "📷 Foto";
  if (m?.tipoArquivo === "video") return "🎬 Vídeo";
  if (m?.tipoArquivo === "audio") return "🎤 Mensagem de voz";
  if (m?.tipoArquivo === "arquivo") return "📎 Arquivo";
  const c = m?.cartao;
  if (c?.pedido) return "🛍️ Novo pedido" + (c.titulo ? ": " + corta(String(c.titulo).replace(/^Pedido · /, ""), 60) : "");
  if (c?.tipo === "chamada") return "";
  if (c?.tipo === "flash") return "⚡ Respondeu ao seu flash";
  if (c?.tipo === "publicacao") return "Enviou uma publicação";
  if (c?.tipo === "local" || c?.tipo === "endereco") return "📍 Localização";
  if (c?.tipo === "pix") return "Cartão de Pix";
  if (c?.titulo) return corta(c.titulo, 100);
  return "Nova mensagem";
}

// Monta o aviso: { titulo, texto, url, tag, categoria, urgente? }. Devolve null quando não deve avisar.
export function montarAviso(tipo, x) {
  const nome = corta(x.nome || "Alguém", 40);
  switch (tipo) {
    case "mensagem": {
      const texto = resumoMensagem(x.mensagem);
      if (!texto) return null;
      return { categoria: "mensagens", titulo: nome, texto, url: `mensagens.html?conversa=${encodeURIComponent(x.conversa)}`, tag: "conv-" + x.conversa };
    }
    case "chamada":
      return { categoria: "chamadas", titulo: x.modo === "video" ? "Chamada de vídeo" : "Ligação de voz", texto: `${nome} está ligando para você`, url: `mensagens.html?conversa=${encodeURIComponent(x.conversa)}`, tag: "chamada-" + x.id, urgente: true, ttl: 45 };
    case "chamada_perdida":
      return { categoria: "chamadas", titulo: "Ligação perdida", texto: `${nome} tentou ${x.modo === "video" ? "uma chamada de vídeo" : "ligar"} para você`, url: `mensagens.html?conversa=${encodeURIComponent(x.conversa)}`, tag: "chamada-" + x.id };
    case "seguidor":
      return { categoria: "seguidores", titulo: "Novo seguidor", texto: `${nome} começou a seguir você`, url: `usuarios.html?perfil=${encodeURIComponent(x.uid)}`, tag: "seguidores" };
    case "curtida":
      return { categoria: "publicacoes", titulo: "Estrelas na sua publicação", texto: `${nome} deu ${x.nota} ${x.nota === 1 ? "estrela" : "estrelas"} na sua publicação`, url: `feed.html?post=${encodeURIComponent(x.postId)}`, tag: "estrelas-" + x.postId };
    case "comentario":
      return { categoria: "publicacoes", titulo: `${nome} comentou`, texto: corta(x.texto, 140) || "Comentou na sua publicação", url: `feed.html?post=${encodeURIComponent(x.postId)}`, tag: "coment-" + x.postId };
    case "resposta":
      return { categoria: "publicacoes", titulo: `${nome} respondeu`, texto: corta(x.texto, 140) || "Respondeu seu comentário", url: `feed.html?post=${encodeURIComponent(x.postId)}`, tag: "resp-" + x.postId };
    case "marcacao":
      return { categoria: "publicacoes", titulo: "Você foi marcado", texto: `${nome} marcou você numa publicação`, url: `feed.html?post=${encodeURIComponent(x.postId)}`, tag: "marc-" + x.postId };
    case "social":
      return { categoria: "social", titulo: "Pedido no social", texto: `${nome} quer adicionar você no social`, url: "notificacoes.html", tag: "social" };
    case "aviso":
      return { categoria: "avisos", titulo: "Help Floripa", texto: corta(x.titulo || x.texto, 140) || "Você tem um aviso da equipe", url: `suporte.html?aviso=${encodeURIComponent(x.id)}`, tag: "aviso-" + x.id, urgente: true };
    case "suporte":
      return { categoria: "avisos", titulo: "Suporte Help Floripa", texto: corta(x.texto, 140) || "A equipe respondeu seu chamado", url: `suporte.html?chamado=${encodeURIComponent(x.id)}`, tag: "suporte-" + x.id };
    case "teste":
      return { categoria: "avisos", titulo: "Help Floripa", texto: "As notificações estão funcionando neste aparelho. ✓", url: "configuracoes.html", tag: "teste", forcar: true };
    default: return null;
  }
}

// Janela do limite por tipo (ms): estrelas e seguidores juntam; mensagens e ligações sempre avisam.
export const JANELA = { curtida: 10 * 60000, seguidor: 5 * 60000, comentario: 60000, resposta: 60000, marcacao: 60000, social: 60000 };

// Corpo para o FCM: só "data" (o sw.js do site desenha a notificação). Tudo em texto, como o FCM pede.
export function corpoFcm(tokens, aviso) {
  const data = { titulo: aviso.titulo, texto: aviso.texto, url: aviso.url, tag: aviso.tag || "", categoria: aviso.categoria, urgente: aviso.urgente ? "1" : "" };
  return {
    tokens,
    data,
    webpush: { headers: { TTL: String(aviso.ttl || 86400), Urgency: aviso.urgente || aviso.categoria === "mensagens" ? "high" : "normal" } }
  };
}

// Tokens que o FCM disse que não valem mais (o aparelho desinstalou, tirou a permissão...).
export const TOKEN_MORTO = /registration-token-not-registered|invalid-registration-token|invalid-argument/;
