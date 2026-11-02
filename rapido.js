// Leitura rápida (como os apps grandes fazem): mostra na hora a cópia que o Firebase já guarda no aparelho
// (cache persistente do Firestore) e busca a versão do servidor por trás; quando ela chega, `aoAtualizar` recebe.
// Sem cópia no aparelho, espera o servidor como antes. Sem dependências: recebe as funções do Firestore (fb).

// Um documento. Devolve o snapshot da cópia (ou do servidor, se não houver cópia).
export async function docRapido(fb, ref, aoAtualizar) {
  if (fb.getDocFromCache) {
    try {
      const copia = await fb.getDocFromCache(ref);
      fb.getDoc(ref).then((s) => aoAtualizar?.(s)).catch(() => {});
      return copia;
    } catch { /* não tem cópia: vai ao servidor */ }
  }
  return fb.getDoc(ref);
}

// Uma consulta. A cópia só é usada se a mesma consulta já trouxe algo antes neste aparelho (marca no localStorage);
// senão uma lista vazia do cache poderia esconder o que existe no servidor.
export async function docsRapido(fb, consulta, chave, aoAtualizar) {
  const marca = "hf-rapido-" + chave;
  let usou = false;
  try { usou = localStorage.getItem(marca) === "1"; } catch {}
  const doServidor = () => fb.getDocs(consulta).then((s) => { try { localStorage.setItem(marca, "1"); } catch {} return s; });
  if (usou && fb.getDocsFromCache) {
    try {
      const copia = await fb.getDocsFromCache(consulta);
      doServidor().then((s) => aoAtualizar?.(s)).catch(() => {});
      return copia;
    } catch { /* segue para o servidor */ }
  }
  return doServidor();
}
