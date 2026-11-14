// Como o duo (Akai Ito) aparece no perfil (14/11/2026, pedido dele). Sem dependências.
// Um campo só, `duoCapa`, em usuarios/{uid} e em perfis_publicos/{uid}:
//   gaveta       = tocar na rosinha abre a gaveta com a prévia do perfil do duo, que abre o perfil
//   gaveta-fixa  = a mesma gaveta, mas só para ver (não abre o perfil)
//   clicavel     = a bolinha com a foto e o nome, como antes (abre o perfil)
//   foto         = a bolinha só para ver (sem o nome; não abre o perfil)
//   rosa         = só a rosinha
//   ocultar      = nada
// Sem o campo vale "gaveta". As regras do ar só aceitam clicavel/foto/rosa/ocultar: até a publicação o público grava o
// mais parecido (gaveta → clicavel, gaveta-fixa → foto, rosa → foto) e a conta guarda o escolhido.

export const ESTILOS_DUO = [
  { id: "gaveta", nome: "Gaveta", texto: "Tocando na rosinha abre uma gaveta com a prévia do perfil do seu duo." },
  { id: "bolinha", nome: "Bolinha", texto: "Tocando na rosinha aparece a fotinho do seu duo, como antes." },
  { id: "rosa", nome: "Só a rosinha", texto: "Só a rosinha na sua foto: ninguém vê a foto nem o nome do seu duo." },
  { id: "ocultar", nome: "Nada", texto: "Nada aparece no seu perfil: nem a rosinha." }
];
const VALORES = ["gaveta", "gaveta-fixa", "clicavel", "foto", "rosa", "ocultar"];
export const PADRAO_DUO = "gaveta";

export const valorDuo = (v) => (VALORES.includes(v) ? v : PADRAO_DUO);
// { estilo: gaveta|bolinha|rosa|ocultar, clique: true/false }
export function lerModoDuo(v) {
  const x = valorDuo(v);
  if (x === "gaveta" || x === "gaveta-fixa") return { estilo: "gaveta", clique: x === "gaveta" };
  if (x === "clicavel" || x === "foto") return { estilo: "bolinha", clique: x === "clicavel" };
  return { estilo: x, clique: false };
}
export function montarModoDuo(estilo, clique) {
  if (estilo === "gaveta") return clique ? "gaveta" : "gaveta-fixa";
  if (estilo === "bolinha") return clique ? "clicavel" : "foto";
  return estilo === "rosa" ? "rosa" : "ocultar";
}
// valor que as regras antigas aceitam
const RESERVA = { gaveta: "clicavel", "gaveta-fixa": "foto", rosa: "foto" };
// A conta guarda o valor de verdade; o público pode estar com a reserva enquanto as regras não forem publicadas.
export function duoDaConta(conta, publico) {
  if (!publico) return conta;
  if (conta && RESERVA[conta] === publico) return conta;
  return publico;
}
export function textoModoDuo(v) {
  const { estilo, clique } = lerModoDuo(v);
  if (estilo === "gaveta") return clique ? "Tocando na rosinha abre a gaveta com a prévia do seu duo; tocar nela abre o perfil." : "Tocando na rosinha abre a gaveta com a prévia do seu duo, só para ver (não abre o perfil).";
  if (estilo === "bolinha") return clique ? "Tocando na rosinha aparecem a foto e o nome do seu duo, que abrem o perfil." : "Tocando na rosinha aparece só a fotinho do seu duo. Ninguém abre o perfil por ela.";
  return ESTILOS_DUO.find((e) => e.id === estilo).texto;
}
// Grava na conta e no perfil público (com a reserva se as regras de agora recusarem). Devolve o valor público gravado.
export async function salvarModoDuo(fb, uid, valor) {
  await fb.setDoc(fb.doc(fb.db, "usuarios", uid), { duoCapa: valor }, { merge: true }).catch(() => {});
  const pub = fb.doc(fb.db, "perfis_publicos", uid);
  try { await fb.setDoc(pub, { uid, duoCapa: valor }, { merge: true }); return valor; }
  catch (err) {
    if (err?.code !== "permission-denied" || !RESERVA[valor]) throw err;
    await fb.setDoc(pub, { uid, duoCapa: RESERVA[valor] }, { merge: true });
    return RESERVA[valor];
  }
}
