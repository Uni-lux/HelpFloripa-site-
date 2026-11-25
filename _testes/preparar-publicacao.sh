#!/bin/bash
# Monta a versão das regras que vai para o Firebase (o firestore.rules com comentários continua sendo a fonte):
#   1) compactar-regras.py  — tira comentários, linhas vazias e recuo (limite de 256 KB de TEXTO do console);
#   2) minificar-regras.py  — encurta nomes de funções/parâmetros/let (mesma lógica);
#   3) encurtar-regras.py   — troca expressões repetidas por atalhos (N, R, U, T, D) e "let" (limite de 256.000 bytes
#      COMPILADOS); Flash (stories) e negócios ficam protegidos por estarem perto do limite de 1.000 expressões.
#   4) divide em partes para o console e grava _regras/firestore-publicar.rules (o que o Cloud Shell publica).
# Depois: node testes-regras.mjs saida/remontado-com-marcas.rules
set -e
cd "$(dirname "$0")"
python3 compactar-regras.py ../firestore.rules saida/publicar-1-compacto.rules
python3 minificar-regras.py saida/publicar-1-compacto.rules saida/publicar-2-nomes.rules
HF_PROTEGER=stories,negocios HF_MINREP=2 python3 encurtar-regras.py saida/publicar-2-nomes.rules ../_regras/firestore-publicar.rules N,R,U,T,D N,R,U,T N,R,U,T --embrulhar
python3 dividir-regras.py ../_regras/firestore-publicar.rules ../_regras
