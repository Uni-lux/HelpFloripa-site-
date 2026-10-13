#!/bin/bash
# Sobe o emulador do Firebase (firestore 8085, auth 9099) com o firestore.rules do repositório.
# O Firebase não aceita regras fora desta pasta: usa um atalho (regras-emulador.rules -> ../firestore.rules).
cd "$(dirname "$0")"
ln -sfn ../firestore.rules regras-emulador.rules
exec npx firebase emulators:start --only firestore,auth --project demo-hf
