# Regras do Firestore — publicação

> **Versão de 14/10/2026:** igual à publicada em 13/10, mais **várias fotos numa publicação do Diário**
> (campo `midias`, de 2 a 4 fotos). Para publicar, o processo é o mesmo: apagar tudo no console e colar as 9 partes.

Esta pasta começa com `_`, então o GitHub Pages **não publica** nada daqui. São as regras do
`firestore.rules` divididas em **9 partes** (cada uma com menos de 12.800 bytes, cortadas em fim de
linha), para colar no console do Firebase.

- Arquivo de origem: `firestore.rules` (105.240 bytes, 1.935 linhas, sha256 começa com `8a8a384b1c6217b5`).
- Cada parte termina com a linha `// ===== FIM DA PARTE X DE 9 =====`. É um comentário: **pode colar junto**,
  não atrapalha (os testes rodaram nas regras com e sem essas linhas).
- Conferido: as 9 partes juntas, sem as linhas de fim, são **exatamente** o `firestore.rules`, byte a byte.
- Testes de regras no arquivo remontado: **143 passaram, 0 falharam**, sem o aviso de limite de 1.000 expressões.

## Como publicar (uma vez só)
1. Abra o **console do Firebase** → projeto **helpfloripa-61e0d** → **Firestore Database** → aba **Regras**.
2. Clique dentro do editor, selecione tudo (Ctrl+A, ou "Selecionar tudo" no celular) e **apague**.
3. Abra `parte-1-de-9.txt`, copie **tudo** e cole no editor.
4. Vá até o fim do que colou (depois da linha `// ===== FIM DA PARTE 1 DE 9 =====`), abra a parte 2,
   copie tudo e cole logo abaixo. Repita até a parte 9, **em ordem**.
5. Confira: a primeira linha do editor é `rules_version = '2';` e a última é
   `// ===== FIM DA PARTE 9 DE 9 =====`, logo depois de uma linha só com `}`.
6. Clique em **Publicar**. Se o console mostrar um erro (linha vermelha), **não publique**: provavelmente
   uma parte ficou faltando ou repetida. Confira se as 9 linhas `FIM DA PARTE` aparecem, de 1 a 9, uma vez cada.

> As regras do ar continuam valendo até o clique em Publicar. A troca leva até 1 minuto para valer.

## O que passa a funcionar depois de publicar
- **Diário: várias fotos numa publicação** (até 4, deslizando para o lado). Antes de publicar as regras, quem
  escolher várias fotos publica só a primeira, com um aviso.
- O resto (toque duplo para dar estrelas, quem deu estrelas, Salvos, editar legenda) já funciona com as regras de hoje.

## Conferência no site depois de publicar
1. **Diário → publicar:** escolher 2 ou 3 fotos (aparecem as miniaturas com 2/4, 3/4), publicar e conferir que a
   publicação mostra "1/3" e desliza para o lado. No perfil, a miniatura tem o ícone de várias fotos.

Depois disso, os próximos passos combinados: rodar o workflow **"Converter cidades"** (primeiro simulando) e
configurar o segredo `FIREBASE_SERVICE_ACCOUNT` para a limpeza automática de contas, **antes** de liberar o site.

## Para gerar as partes de novo (se o firestore.rules mudar)
```bash
python3 _testes/dividir-regras.py          # gera _regras/parte-X-de-N.txt e confere byte a byte
cd _testes && node testes-regras.mjs saida/remontado-com-marcas.rules
```
