// =====================================================
// Funções do servidor (Cloud Functions, precisam do plano Blaze). Passo a passo: _regras/SERVIDOR-LEIA-ME.md
// FUNCOES_LIGADAS = true depois do deploy das funções (o Claude muda quando o dono avisar):
//  - "Responde rápido" passa a usar SÓ o tempo calculado no servidor (perfis_publicos.respostaServ) e o Mensagens
//    para de gravar o tempo pelo aparelho (perfis_publicos.atendimento.resposta, que dava para forjar).
// O Diário (ranking do servidor) e a conferência dos pedidos ligam sozinhos quando os dados aparecem.
// =====================================================
export const FUNCOES_LIGADAS = false;

// Tempo de resposta de um perfil público: o do servidor (se tem) ou, com as funções desligadas, o do aparelho.
// Devolve { media (min), n, servidor: true|false } ou null (menos de 3 respostas).
export function respostaDoPerfil(pf) {
  const s = pf?.respostaServ;
  if (s && Number(s.n) >= 3 && Number.isFinite(Number(s.media))) return { media: Number(s.media), n: Number(s.n), servidor: true };
  if (FUNCOES_LIGADAS) return null;
  const r = pf?.atendimento?.resposta;
  return r && Number(r.n) >= 3 && Number.isFinite(Number(r.media)) ? { media: Number(r.media), n: Number(r.n), servidor: false } : null;
}
