import { writeFileSync } from "node:fs";
const mod = await import(process.argv[2]);
const out = process.argv[3];
const dias = Array.from({ length: 30 }, (_, i) => [`${String(i + 1).padStart(2, "0")}/09`, (i * 7) % 11]);
const salvar = async (n, blob) => writeFileSync(`${out}/${n}`, Buffer.from(await blob.arrayBuffer()));
const estat = [
  { nome: "Resumo antigo", cabecalho: ["Indicador", "Período", "Período anterior"], linhas: [["Novos usuários", 12, 9], ["Mensagens", "1234", 800], ["Denúncias", 0, 2]], grafico: { tipo: "coluna", titulo: "Relatório — últimos 30 dias" } },
  { nome: "Novos usuários por dia", cabecalho: ["Dia", "Atual", "Anterior"], linhas: dias.map(([d, v]) => [d, v, v + 1]), grafico: { tipo: "linha", titulo: "Novos usuários por dia" } },
  { nome: "Total de usuários", cabecalho: ["Dia", "Total"], linhas: dias, grafico: { tipo: "linha", titulo: "Total" } },
  { nome: "Cidades", cabecalho: ["Cidade", "Pessoas"], linhas: [["Florianópolis", 10], ["Florianópolis/SC", 3], ["São José & Palhoça <SC> \"x\"", 2]], grafico: { tipo: "barra", titulo: "Cidades" } },
  { nome: "Tipos de conta", cabecalho: ["Tipo", "Pessoas"], linhas: [["Pessoal", 8], ["Profissional", 4]], grafico: { tipo: "pizza", titulo: "Tipos" } },
  { nome: "Bairros", cabecalho: ["Bairro", "Pessoas"], linhas: [], grafico: { tipo: "barra", titulo: "Bairros" } },
  { nome: "Total acumulado", cabecalho: ["Dia", "Total"], linhas: dias, grafico: { tipo: "linha" }, total: false },
  { nome: "Decimais", cabecalho: ["Item", "Valor", "Nota"], linhas: [["a", 1.5, "4,5"], ["b", 2.25, 3]], grafico: { tipo: "coluna" } },
];
await salvar("estatisticas.xlsx", mod.gerarXlsxMulti(estat.slice(1), { titulo: "Estatísticas do Help Floripa", periodo: "Últimos 30 dias (13/09/2026 a 13/10/2026)", filtro: "Cidade: Florianópolis · Bairro: Centro", autor: "Carla Equipe", indicadores: [["Usuários (total)", 1520, ""], ["Novos usuários", 120, 90], ["Ativos no período", 640, 700], ["Novos negócios", 12, 0], ["Média de nota", 4.6, 4.4]] }));
const extremos = [
  { nome: "Cidades", cabecalho: ["A"], linhas: [["x"]] },
  { nome: "CIDADES", cabecalho: ["A", "B"], linhas: [["y", 1]], grafico: { tipo: "coluna", titulo: "dup" } },
  { nome: "'Aspas' do João's", cabecalho: ["Nome", "Valor"], linhas: [["a", -1.5], ["b", 2]], grafico: { tipo: "linha", titulo: "aspas ' \" <>" } },
  { nome: "Um nome de aba muito comprido que passa de 31 letras", cabecalho: ["Nome", "Valor"], linhas: [["😀 emoji", 3], ["meia \uD83D surrogate", 4], ["ctrl\u0001\u0008\u000B￾", 5]], grafico: { tipo: "pizza", titulo: "pizza" } },
  { nome: "Um nome de aba muito comprido que passa de 31 letras", cabecalho: ["N"], linhas: [] },
  { nome: "History", cabecalho: ["N"], linhas: [["texto enorme " + "x".repeat(40000)]] },
  { nome: "a/b\\c?d*e[f]g:h", cabecalho: ["Dia", "Valor"], linhas: Array.from({ length: 2000 }, (_, i) => [`d${i}`, i * 1.25]), grafico: { tipo: "coluna", titulo: "grande" } },
  { nome: "", cabecalho: [], linhas: [] },
  { nome: "Só texto", cabecalho: ["Nome", "CEP"], linhas: [["Ana", "08800000"], ["Bia", "0123"], ["", ""]], grafico: { tipo: "coluna", titulo: "sem números" } },
  { nome: "Linhas irregulares", cabecalho: ["A", "B"], linhas: [["1", "2", "3", "4"], [], [null, undefined, 5]] },
];
await salvar("extremos.xlsx", mod.gerarXlsxMulti(extremos, { titulo: "Teste 'extremo' & <especial>", periodo: "x", indicadores: [["a", 1, 2], ["b", "texto", null], ["c", 0, 0]] }));
await salvar("extremos-sem-capa.xlsx", mod.gerarXlsxMulti(extremos));
await salvar("vazio.xlsx", mod.gerarXlsxMulti([]));
for (const t of ["coluna", "barra", "linha", "pizza"]) await salvar(`single-${t}.xlsx`, mod.gerarXlsx(["Cidade", "Pessoas", "Antes"], [["Florianópolis", 3, 1], ["São José", 2, 4]], "cidades-" + t, { tipo: t, titulo: "T " + t }));
console.log("ok");
