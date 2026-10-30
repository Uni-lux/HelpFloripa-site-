// Estrelas e reações nos seus flashes (stories/{id}/reacoes/{uid}) para o sino e a página de Notificações, como no
// Instagram ("Ana curtiu seu story"). Lê os seus flashes das últimas 48 h (consulta com o índice stories: autorId +
// criadoEm; sem ele não mostra) e as reações de cada um. Guardado 2 min no aparelho para não reler a cada página.
// Sem dependências: recebe as funções do Firestore (fs) e o banco (db).
const msDe = (t) => (t?.toMillis ? t.toMillis() : t?.seconds ? t.seconds * 1000 : Number(t) || 0);
export async function lerReacoesFlash(fs, db, uid) {
  if (!uid) return [];
  const chave = "hf-flash-reac-" + uid;
  try { const c = JSON.parse(sessionStorage.getItem(chave) || "null"); if (c && Date.now() - c.em < 120000) return c.itens; } catch {}
  let flashes = [];
  try {
    const desde = fs.Timestamp.fromMillis(Date.now() - 48 * 3600e3);
    flashes = (await fs.getDocs(fs.query(fs.collection(db, "stories"), fs.where("autorId", "==", uid), fs.where("criadoEm", ">=", desde), fs.orderBy("criadoEm", "desc"), fs.limit(10)))).docs;
  } catch { return []; }
  const itens = [];
  await Promise.all(flashes.map(async (f) => {
    const r = await fs.getDocs(fs.query(fs.collection(db, "stories", f.id, "reacoes"), fs.limit(100))).catch(() => ({ docs: [] }));
    r.docs.forEach((x) => {
      const v = x.data();
      if (x.id === uid || (!v.curtiu && !v.emoji)) return;
      itens.push({ tipo: "flash", id: `f_${f.id}_${x.id}`, flashId: f.id, uid: x.id, curtiu: !!v.curtiu, emoji: v.emoji || "", quando: msDe(v.em) || msDe(f.data().criadoEm) });
    });
  }));
  try { sessionStorage.setItem(chave, JSON.stringify({ em: Date.now(), itens })); } catch {}
  return itens;
}
export function textoFlash(i) {
  const emoji = i.emoji && i.emoji !== "⭐" ? i.emoji : "";
  if (i.curtiu && emoji) return `deu uma estrela e reagiu com ${emoji} ao seu flash`;
  if (i.curtiu || i.emoji === "⭐") return "deu uma estrela no seu flash";
  return `reagiu com ${emoji} ao seu flash`;
}
