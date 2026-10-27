#!/bin/bash
# Sobe o emulador do Firebase (firestore 8085, auth 9099, storage 9199) com o firestore.rules e o storage.rules do repositório.
# O Firebase não aceita regras fora desta pasta: usa atalhos (regras-emulador.rules -> ../firestore.rules, regras-storage.rules -> ../storage.rules).
cd "$(dirname "$0")"
ln -sfn ../firestore.rules regras-emulador.rules
ln -sfn ../storage.rules regras-storage.rules
# FUNCOES=1 sobe também as Cloud Functions (pagamento automático) apontando para o Mercado Pago de mentira (mp-falso.mjs, porta 5099).
if [ "$FUNCOES" = "1" ]; then
  ln -sfn ../functions funcoes
  cp ../planos-base.js ../functions/planos-base.js
  printf 'MP_ACCESS_TOKEN=TEST-token-falso\nMP_WEBHOOK_SECRET=segredo-de-teste\n' > ../functions/.secret.local
  printf 'MP_API=http://127.0.0.1:5099\n' > ../functions/.env.local
  exec npx firebase emulators:start --only firestore,auth,storage,functions --project demo-hf
fi
exec npx firebase emulators:start --only firestore,auth,storage --project demo-hf
