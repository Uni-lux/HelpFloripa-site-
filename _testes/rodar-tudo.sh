#!/bin/bash
# Roda a regressão inteira. Antes: npm install, emulador e servidor no ar (veja o README).
# Uso: ./rodar-tudo.sh pr25   (regras que estão no ar)   |   ./rodar-tudo.sh main   (regras do repositório)
cd "$(dirname "$0")"
R=${1:-pr25}
curl -s -m 3 http://127.0.0.1:8085 > /dev/null || { echo "Emulador fora do ar: rode ./emulador.sh em outro terminal."; exit 1; }
curl -s -m 3 http://127.0.0.1:5057/index.html > /dev/null || { echo "Servidor fora do ar: rode node servidor-csp.mjs em outro terminal."; exit 1; }
F="Metadata\|trace-warn\|PERMISSION_DENIED\|evaluation error\|GrpcConnection\|false for\|ERR_FAILED\|Could not reach\|typically"
echo "== testes de regras (firestore.rules do repositório, projeto demo-regras)"; node testes-regras.mjs 2>&1 | grep "✘\|passaram"
echo "== regras do emulador: $R"; node trocar-regras.mjs $R
node seed.mjs > /dev/null 2>&1
for t in "t-chat.mjs bruno" "t-chat.mjs ana" "t-audio.mjs" "t-atend.mjs" "t-aval.mjs" "t-etapa4.mjs" "t-painel2.mjs" "t-saida.mjs" "t-chat2.mjs" "t-menu-sair.mjs" "t-busca.mjs pc" "t-local.mjs"; do
  echo "== $t"; node seed.mjs > /dev/null 2>&1; timeout 300 node $t 2>&1 | grep -v "$F"
done
A=ar; [ "$R" = "main" ] && A=novas
echo "== t-apagar.mjs $A"; node seed.mjs > /dev/null 2>&1; timeout 300 node t-apagar.mjs $A 2>&1 | grep -v "$F"
M="antigo"; [ "$R" = "main" ] && M="normal antigo"
echo "== t-feed.mjs"; for m in $M; do node seed.mjs > /dev/null 2>&1; timeout 200 node t-feed.mjs $m 2>&1 | grep -v "$F"; done
echo "== t-diario.mjs"; node seed.mjs > /dev/null 2>&1; D=ar; [ "$R" = "main" ] && D=; timeout 300 node t-diario.mjs $D 2>&1 | grep -v "$F"
echo "== t-forms.mjs"; node seed.mjs > /dev/null 2>&1; timeout 300 node t-forms.mjs pc $RANDOM 2>&1 | grep -v "$F"
if [ "$R" = "main" ]; then
  echo "== t-equipe.mjs (precisa das regras novas)"; for m in cel pc; do node seed.mjs > /dev/null 2>&1; timeout 200 node t-equipe.mjs $m 2>&1 | grep -v "$F"; done
  echo "== t-coment.mjs"; node seed.mjs > /dev/null 2>&1; timeout 300 node t-coment.mjs 2>&1 | grep -v "$F"
  echo "== t-social2.mjs"; node seed.mjs > /dev/null 2>&1; timeout 300 node t-social2.mjs 2>&1 | grep -v "$F"
  echo "== t-principais.mjs"; node seed.mjs > /dev/null 2>&1; timeout 200 node t-principais.mjs 2>&1 | grep -v "$F"
  echo "== t-recalc.mjs"; node seed.mjs > /dev/null 2>&1; timeout 200 node t-recalc.mjs 2>&1 | grep -v "$F"
  echo "== t-eq-apagar.mjs"; node seed.mjs > /dev/null 2>&1; timeout 300 node t-eq-apagar.mjs 2>&1 | grep -v "$F"
  echo "== t-virada.mjs"; node seed.mjs > /dev/null 2>&1; timeout 200 node t-virada.mjs 2>&1 | grep -v "$F"
fi
echo "== Excel pelo painel"; rm -rf saida/excel; node seed.mjs > /dev/null 2>&1; timeout 300 node t-excel.mjs | grep -c baixado; python3 checar-todos.py saida/excel
echo "== Excel com casos extremos"; rm -rf saida/xlsx; mkdir -p saida/xlsx; node gerar-xlsx.mjs ../planilha.js saida/xlsx > /dev/null; python3 checar-todos.py saida/xlsx
