# Entregas e corridas: trocar o mapa para o Mapbox

Hoje o mapa das Entregas e corridas (`entregas.html` e `entregador.html`) usa serviços grátis e sem chave:
OpenStreetMap (desenho do mapa), Nominatim (busca de endereço) e OSRM (rota pela rua). Eles servem para testar e
para o começo, mas **não aceitam muito movimento** (bloqueiam quem usa demais). Com o Mapbox o site ganha mapa no
tema escuro de verdade, busca de endereço melhor e rotas com trânsito.

## O que fazer (uns 10 minutos)
1. Crie a conta em **account.mapbox.com** (tem cota grátis por mês; acima dela cobra por uso).
2. Em **Tokens**, clique em **Create a token**:
   - Nome: `Help Floripa site`.
   - Deixe só os escopos **públicos** marcados (os que começam com `styles:`, `fonts:` e `datasets:read` já vêm).
     **Não marque nenhum escopo secreto.**
   - Em **URL restrictions**, coloque `https://helpfloripa.com.br` e `https://www.helpfloripa.com.br`
     (assim ninguém usa o token em outro site).
3. Copie o token (começa com **`pk.`**) e mande para o Claude, ou cole em `mapa-config.js`, no campo `mapboxToken`.
   O token `pk.` é público por natureza (aparece no navegador de qualquer jeito); a proteção é a restrição de URL.
   **Nunca** use um token que começa com `sk.` no site.
4. Pronto: o mapa, a busca de endereço e as rotas trocam sozinhos (o código já está preparado em `mapa-vivo.js`).
   Lembre de aumentar o `?v=` de `mapa-config.js` onde ele é importado (o `versoes.py` faz isso).

## O que muda na CSP
As páginas `entregas.html` e `entregador.html` já liberam `api.mapbox.com` (imagens e conexões). Nada a fazer.

## Custos (para acompanhar no painel do Mapbox)
- Mapa: cobrado por carregamento do mapa na página (cada vez que alguém abre a tela de entregas).
- Busca de endereço: cada busca (o site espera a pessoa parar de digitar antes de buscar).
- Rotas: cada cálculo de rota (o site guarda as rotas repetidas e recalcula a rota ao vivo no máximo 1 vez por minuto).
