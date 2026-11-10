// =====================================================
// Mapa ao vivo: qual serviço usar.
// Hoje: OpenStreetMap (azulejos), Nominatim (endereços) e OSRM (rotas) — grátis, sem chave, mas com uso limitado
// (bons para testes e começo; com muito movimento eles bloqueiam).
// Para usar o Mapbox: crie um token PÚBLICO (pk.…) em account.mapbox.com, restrinja ao domínio helpfloripa.com.br
// e cole em `mapboxToken`. O resto troca sozinho (azulejos, busca de endereço, rotas com trânsito).
// O token pk. pode ficar no site (é público e limitado pelo domínio); NUNCA coloque aqui um token secreto (sk.).
// =====================================================
export const MAPA = {
  mapboxToken: "",
  estiloEscuro: "mapbox/dark-v11",
  estiloClaro: "mapbox/streets-v12"
};
export const usaMapbox = () => /^pk\./.test(MAPA.mapboxToken || "");
