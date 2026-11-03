// =====================================================
// Etapa D: passar as fotos antigas (guardadas como "data:image/..." DENTRO dos documentos) para o Firebase Storage.
// Cada documento fica leve (só o link), as listas cabem no aparelho e as fotos vêm em cache do navegador.
// Aqui só a CONTA (sem Firebase): quais campos olhar em cada coleção, para qual pasta do storage.rules vai cada foto e
// como fica o documento depois. O envio fica em index.js (função migrarFotos, só os donos, pelo painel).
// =====================================================

export const COLECOES = ["usuarios", "perfis_publicos", "negocios", "anuncios", "diario", "stories", "comunidade"];
export const RE_DATA = /^data:image\/(jpeg|jpg|png|webp);base64,/;
export const ehData = (v) => typeof v === "string" && RE_DATA.test(v) && v.length > 100;

// Bytes e tipo de uma data URL.
export function lerData(v) {
  const m = String(v).match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.*)$/s);
  if (!m) return null;
  const tipo = m[1] === "image/jpg" ? "image/jpeg" : m[1];
  return { tipo, ext: tipo === "image/png" ? "png" : tipo === "image/webp" ? "webp" : "jpg", bytes: Buffer.from(m[2], "base64") };
}

// Dono do documento (o arquivo do Storage começa com o uid dele: regra meuArquivo do storage.rules).
export function donoDe(colecao, id, d) {
  if (colecao === "usuarios" || colecao === "perfis_publicos") return id;
  if (colecao === "negocios" || colecao === "anuncios" || colecao === "comunidade") return d.donoId || d.uid || "";
  return d.autorId || d.uid || "";
}

// Fotos do documento: [{ caminho: ["fotos", 2] | ["itens", 1, "foto"] | ["fotoPerfil"], valor, pasta (sem extensão) }].
// "carimbo" deixa o nome único (o aparelho guarda cada foto em cache por 1 ano: foto trocada nunca aparece velha).
export function fotosDoDoc(colecao, id, d, carimbo = Date.now().toString(36)) {
  const dono = donoDe(colecao, id, d), s = "_m" + carimbo, out = [];
  if (!dono) return out;
  const pôr = (caminho, valor, pasta) => { if (ehData(valor)) out.push({ caminho, valor, pasta }); };
  const lista = (campo, pasta) => (Array.isArray(d[campo]) ? d[campo] : []).forEach((v, i) => pôr([campo, i], v, pasta(i)));
  switch (colecao) {
    case "usuarios": case "perfis_publicos":
      pôr(["fotoPerfil"], d.fotoPerfil, `fotosPerfil/${dono}${s}`);
      pôr(["fotoCapa"], d.fotoCapa, `fotosCapa/${dono}${s}`);
      break;
    case "negocios":
      pôr(["foto"], d.foto, `negocios/${id}${s}`);
      pôr(["capa"], d.capa, `negocios/${id}_capa${s}`);
      lista("fotos", (i) => `negocios/${id}_f${i}${s}`);
      (Array.isArray(d.itens) ? d.itens : []).forEach((it, i) => pôr(["itens", i, "foto"], it?.foto, `negocios/${id}_i${i}${s}`));
      break;
    case "anuncios":
      lista("fotos", (i) => `anuncios/${dono}_${id}_f${i}${s}`);
      break;
    case "diario":
      pôr(["mediaUrl"], d.mediaUrl, `diario/${dono}/${id}_0${s}`);
      lista("midias", (i) => `diario/${dono}/${id}_${i}${s}`);
      break;
    case "stories":
      pôr(["mediaUrl"], d.mediaUrl, `stories/${dono}/${id}${s}`);
      break;
    case "comunidade":
      lista("fotos", (i) => `comunidade/${dono}/${id}_${i}${s}`);
      break;
  }
  return out;
}

// O que gravar no documento: troca cada data URL pelo link (mesma foto em dois campos = um envio só, um link só).
// links: Map(valor data URL → link). Devolve { campos de nível de cima a gravar }.
export function documentoNovo(d, fotos, links) {
  const novo = {};
  const raiz = new Set(fotos.map((f) => f.caminho[0]));
  for (const campo of raiz) {
    const copia = structuredClone(d[campo]);
    let alvo = { [campo]: copia };
    fotos.filter((f) => f.caminho[0] === campo).forEach((f) => {
      let o = alvo; const c = f.caminho;
      for (let k = 0; k < c.length - 1; k++) o = o[c[k]];
      if (links.has(f.valor)) o[c.at(-1)] = links.get(f.valor);
    });
    novo[campo] = alvo[campo];
  }
  return novo;
}

// Link público do Storage (o mesmo formato que o site recebe do getDownloadURL).
export const linkDoStorage = (base, bucket, caminho, token) => `${base}/v0/b/${bucket}/o/${encodeURIComponent(caminho)}?alt=media&token=${token}`;
