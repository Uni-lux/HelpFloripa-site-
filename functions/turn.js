// =====================================================
// Servidor TURN das ligações (Etapa C): o Cloudflare Realtime TURN repassa o áudio/vídeo quando a rede não deixa os
// dois aparelhos se ligarem direto (alguns 4G, redes de empresa e de universidade). A chave fica só no servidor
// (segredos CF_TURN_KEY_ID e CF_TURN_TOKEN); o site recebe credenciais temporárias (4 h) pela função credenciaisTurn.
// Aqui só a CONTA e o formato (sem Firebase). Documentação: developers.cloudflare.com/realtime/turn/
// =====================================================
export const TTL = 4 * 3600;          // segundos que a credencial vale
export const POR_DIA = 60;            // pedidos por pessoa por dia (cada ligação pede no máximo 1; o site guarda 4 h)

// Endereço da API do Cloudflare para gerar as credenciais.
export const urlCloudflare = (base, keyId) => `${base}/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`;

// A resposta pode vir como { iceServers: [...] } (atual) ou { iceServers: {...} } (antiga). Tira as portas 53
// (o Cloudflare avisa que os navegadores travam nelas) e só aceita stun:/turn:/turns:.
export function lerServidores(resp) {
  const bruto = resp?.iceServers;
  const lista = Array.isArray(bruto) ? bruto : bruto ? [bruto] : [];
  return lista.map((s) => {
    const urls = (Array.isArray(s?.urls) ? s.urls : [s?.urls]).filter((u) => typeof u === "string" && /^(stun|turns?):/.test(u) && !/:53(\?|$)/.test(u));
    if (!urls.length) return null;
    const x = { urls };
    if (s.username) x.username = String(s.username);
    if (s.credential) x.credential = String(s.credential);
    return x;
  }).filter(Boolean);
}

// Limite por pessoa: { dia: "2026-11-03", n } → pode? e o novo estado.
export function limiteDia(estado, hoje, max = POR_DIA) {
  const n = estado?.dia === hoje ? Number(estado.n) || 0 : 0;
  return n >= max ? { pode: false, estado: { dia: hoje, n } } : { pode: true, estado: { dia: hoje, n: n + 1 } };
}
