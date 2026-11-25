// Chamar uma Cloud Function "por ação" (corrida, roubos): { acao, ...dados } → resposta. Sem dependências.
// Erro do servidor com texto em português vira Error(mensagem) com .code; sem conexão vira "Sem conexão com o servidor".
let fns = null;
export async function chamarFuncao(nome, acao, dados = {}, timeout = 30000) {
  fns ||= import("https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js")
    .then((m) => {
      const f = m.getFunctions(window.firebaseApp, "southamerica-east1");
      if (window.__hfFuncoesEmulador) m.connectFunctionsEmulator(f, "127.0.0.1", window.__hfFuncoesEmulador); // só nos testes
      return { m, f };
    });
  const { m, f } = await fns;
  try { return (await m.httpsCallable(f, nome, { timeout })({ acao, ...dados })).data; }
  catch (e) {
    const codigo = String(e?.code || "").replace(/^functions\//, "");
    const x = new Error(["internal", "unavailable", "deadline-exceeded", "not-found"].includes(codigo) && !/[a-zà-ú]{3}/i.test(e?.message || "") ? "Sem conexão com o servidor. Tente de novo." : (e?.message || "Não foi possível agora."));
    x.code = codigo; throw x;
  }
}
export const acaoRoubos = (acao, dados) => chamarFuncao("roubos", acao, dados);
