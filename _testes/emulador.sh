#!/bin/bash
# Sobe o emulador do Firebase (firestore 8085, auth 9099, storage 9199) com o firestore.rules e o storage.rules do repositório.
# O Firebase não aceita regras fora desta pasta: usa atalhos (regras-emulador.rules -> ../firestore.rules, regras-storage.rules -> ../storage.rules).
cd "$(dirname "$0")"
ln -sfn ../firestore.rules regras-emulador.rules
ln -sfn ../storage.rules regras-storage.rules
exec npx firebase emulators:start --only firestore,auth,storage --project demo-hf
