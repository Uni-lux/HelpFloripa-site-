// Avisos do Flash para o sino e a página de Notificações: os lembretes de contagem regressiva que acabaram (você pediu
// "Lembrar-me"). As estrelas e reações nos seus flashes NÃO vêm mais para cá (02/11/2026, decidido com o dono): ficam
// na Atividade do flash, sem ler as reações de cada flash a cada página. Guardado 2 min no aparelho.
// Sem dependências: recebe as funções do Firestore (fs) e o banco (db).
const msDe = (t) => (t?.toMillis ? t.toMillis() : t?.seconds ? t.seconds * 1000 : Number(t) || 0);
export async function lerReacoesFlash(fs, db, uid) {
  if (!uid) return [];
  const chave = "hf-flash-reac-" + uid;
  try { const c = JSON.parse(sessionStorage.getItem(chave) || "null"); if (c && Date.now() - c.em < 120000) return c.itens; } catch {}
  const itens = [];
  // Contagens regressivas em que você pediu "Lembrar-me" e que já acabaram (até 7 dias depois).
  try {
    const l = await fs.getDocs(fs.query(fs.collection(db, "contagem_lembretes"), fs.where("uid", "==", uid), fs.limit(40)));
    l.docs.forEach((d) => {
      const v = d.data(), fim = msDe(v.fim);
      if (fim && fim <= Date.now() && fim > Date.now() - 7 * 864e5) itens.push({ tipo: "flash", id: `c_${v.flashId}`, flashId: v.flashId, uid: v.autorId, contagem: String(v.titulo || "").slice(0, 40), quando: fim });
    });
  } catch {}
  // Estrelas e reações nos seus flashes saíram do sino (02/11/2026): ficam na Atividade do flash (Visualizações).
  try { sessionStorage.setItem(chave, JSON.stringify({ em: Date.now(), itens })); } catch {}
  return itens;
}
export function textoFlash(i) {
  if (i.contagem) return `· a contagem “${i.contagem}” terminou ⏰`;
  const emoji = i.emoji && i.emoji !== "⭐" ? i.emoji : "";
  if (i.curtiu && emoji) return `deu uma estrela e reagiu com ${emoji} ao seu flash`;
  if (i.curtiu || i.emoji === "⭐") return "deu uma estrela no seu flash";
  return `reagiu com ${emoji} ao seu flash`;
}
