#!/usr/bin/env python3
"""Gera as artes SVG do topo das vitrines (mesmo modelo da servicos-arte.svg):
fundo em degradê da cor da classe, pontinhos, anéis com o ícone grande no centro,
5 ícones em volta ligados por linhas tracejadas, pins e estrelas.
Rodar na raiz do site: python3 scripts/arte/gerar-artes.py"""

# Ícones em coordenadas 24×24 (traço fino, estilo dos ícones do site)
I = {
  "moto": '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/>',
  "pizza": '<path d="M15 11h.01M11 15h.01M16 16h.01M2 16l20 6-6-20A20 20 0 0 0 2 16"/><path d="M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4"/>',
  "cafe": '<path d="M10 2v2M14 2v2M6 2v2M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>',
  "burguer": '<path d="M5 11a2 2 0 0 1-2-2 9 7 0 0 1 18 0 2 2 0 0 1-2 2Z"/><path d="M3 14h18"/><path d="M5 17h14a2 2 0 0 1-2 3H7a2 2 0 0 1-2-3Z"/>',
  "sorvete": '<path d="M7 11l4.08 10.35a1 1 0 0 0 1.84 0L17 11"/><path d="M17 7A5 5 0 0 0 7 7"/><path d="M17 7a2 2 0 0 1 0 4H7a2 2 0 0 1 0-4"/>',
  "relogio": '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  "sacola": '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  "camiseta": '<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>',
  "celular": '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
  "etiqueta": '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r="1"/>',
  "presente": '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
  "carrinho": '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  "predio": '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4M10 10h4M10 14h4M10 18h4"/>',
  "chave": '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  "cama": '<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
  "mapa": '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15M9 3.236v15"/>',
  "arvore": '<path d="M8 19h8a4 4 0 0 0 3.8-2.8 4 4 0 0 0-1.6-4.5c1-1.1 1-2.7.4-4-.7-1.2-2.2-2-3.6-1.7a3 3 0 0 0-6 0c-1.4-.2-2.9.5-3.6 1.7-.7 1.3-.5 2.9.4 4a4 4 0 0 0-1.6 4.5A4 4 0 0 0 8 19Z"/><path d="M12 19v3"/>',
  "contrato": '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M8 13h8M8 17h5"/>',
  "coracao-pulso": '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
  "estetoscopio": '<path d="M11 2v2M5 2v2M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/>',
  "pilula": '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
  "cruz": '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 8v8M8 12h8"/>',
  "agenda": '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4M16 2v4M3 10h18M9 16l2 2 4-4"/>',
  "sorriso": '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
  "coracao-mao": '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66M18 15l-2-2M15 18l-2-2"/>',
  "troca": '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  "lupa": '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  "pessoas": '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  "broto": '<path d="M7 20h10M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
}

PAGINAS = {
  # nome: (fundo escuro, meio, claro, brilho, brilho2, traço claro, traço forte, pontos, anel, satélite, pin, pin pequeno, estrela, centro, satélites)
  "delivery":   ("#1f0800", "#8a2c00", "#ff6a00", "#ffb15e", "#ffd166", "#ffe6c2", "#ff8a3d", "#ffd0a0", "#ffb27a", "#4a1700", "#ffc15e", "#ffd9a8", "#fff1a8",
                 "moto", ["pizza", "cafe", "burguer", "sorvete", "relogio"]),
  "shopping":   ("#140326", "#5b1a9e", "#b44bff", "#ff8ad8", "#ff8ad8", "#fbe0ff", "#c084fc", "#e9c6ff", "#e3b3ff", "#3a0d66", "#ff8ad8", "#f5c2ff", "#ffe08a",
                 "sacola", ["camiseta", "celular", "etiqueta", "presente", "carrinho"]),
  "imoveis":    ("#011a0c", "#0b6b3a", "#1fbf62", "#7af0a8", "#a4f0b6", "#dcfce7", "#4ade80", "#b5f5cc", "#8ff0b4", "#053b20", "#a4f0b6", "#d1fae5", "#ffe08a",
                 "predio", ["chave", "cama", "mapa", "arvore", "contrato"]),
  "saude":      ("#001a17", "#07766b", "#12cdb9", "#7ff5e6", "#9ff3e6", "#d5fbf5", "#2dd4bf", "#b4f7ee", "#8ff0e2", "#03413a", "#9ff3e6", "#ccfbf1", "#ffe08a",
                 "coracao-pulso", ["estetoscopio", "pilula", "cruz", "agenda", "sorriso"]),
  "comunidade": ("#220010", "#8f1d4a", "#ff4f86", "#ffb38a", "#ffb38a", "#ffe4ea", "#fb7185", "#ffc6d6", "#ffb3c8", "#560c2a", "#ffb38a", "#ffd2df", "#ffe08a",
                 "coracao-mao", ["presente", "troca", "cama", "lupa", "pessoas"]),
}

# Mesmas posições da arte de Freelances
SAT = [(700, 120), (1120, 110), (1130, 470), (760, 520), (980, 600)]
NOMES = {"delivery": "Delivery", "shopping": "Shopping", "imoveis": "Imóveis", "saude": "Saúde", "comunidade": "Comunidade"}

def svg(nome, c):
  (f0, f1, f2, br, br2, t0, t1, pts, anel, sat, pin, pin2, est, centro, sats) = c
  sat_svg = "\n".join(
    f'''  <g transform="translate({x} {y})">
    <circle r="44" fill="{sat}" fill-opacity=".6" stroke="{anel}" stroke-opacity=".35" stroke-width="2"/>
    <g transform="translate(-24 -24) scale(2)" fill="none" stroke="url(#traco)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">{I[k]}</g>
  </g>''' for (x, y), k in zip(SAT, sats))
  linhas = "\n".join(f'    <path d="M930 280 Q {q} {x} {y}"/>' for (x, y), q in zip(SAT, ["780 140", "1080 120", "1110 380", "820 470", "960 520"]))
  return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
  <!-- Arte do topo de {NOMES[nome]} (mesmo modelo da servicos-arte.svg). Gerada por scripts/arte/gerar-artes.py -->
  <defs>
    <linearGradient id="fundo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{f0}"/>
      <stop offset=".45" stop-color="{f1}"/>
      <stop offset="1" stop-color="{f2}"/>
    </linearGradient>
    <radialGradient id="brilho" cx=".78" cy=".35" r=".55">
      <stop offset="0" stop-color="{br}" stop-opacity=".5"/>
      <stop offset=".55" stop-color="{f2}" stop-opacity=".12"/>
      <stop offset="1" stop-color="{f2}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="brilho2" cx=".1" cy="1" r=".6">
      <stop offset="0" stop-color="{br2}" stop-opacity=".3"/>
      <stop offset="1" stop-color="{br2}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="traco" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{t0}"/>
      <stop offset="1" stop-color="{t1}"/>
    </linearGradient>
    <pattern id="pontos" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.3" fill="{pts}" opacity=".18"/>
    </pattern>
  </defs>
  <rect width="1200" height="800" fill="url(#fundo)"/>
  <rect width="1200" height="800" fill="url(#pontos)"/>
  <rect width="1200" height="800" fill="url(#brilho)"/>
  <rect width="1200" height="800" fill="url(#brilho2)"/>

  <g fill="none" stroke="{anel}" stroke-opacity=".16">
    <circle cx="930" cy="280" r="170" stroke-width="2"/>
    <circle cx="930" cy="280" r="250" stroke-width="1.5"/>
    <circle cx="930" cy="280" r="340" stroke-width="1"/>
  </g>
  <circle cx="930" cy="280" r="128" fill="#ffffff" fill-opacity=".04"/>
  <g transform="translate(930 280) scale(5) translate(-12 -12)" fill="none" stroke="url(#traco)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">{I[centro]}</g>

  <g fill="none" stroke="{t0}" stroke-opacity=".35" stroke-width="2" stroke-dasharray="3 9" stroke-linecap="round">
{linhas}
  </g>

{sat_svg}

  <g>
    <path d="M590 640 c0 -22 18 -38 38 -38 s38 16 38 38 c0 28 -38 62 -38 62 s-38 -34 -38 -62z" fill="{pin}" fill-opacity=".9"/>
    <circle cx="628" cy="640" r="13" fill="{f0}"/>
  </g>
  <g fill="{pin2}" fill-opacity=".55">
    <path d="M1080 700 c0 -13 10 -22 22 -22 s22 9 22 22 c0 16 -22 36 -22 36 s-22 -20 -22 -36z"/>
    <path d="M520 260 c0 -10 8 -18 18 -18 s18 8 18 18 c0 13 -18 29 -18 29 s-18 -16 -18 -29z"/>
  </g>
  <g fill="{est}">
    <path d="M820 470 l7 15 16 2 -12 11 3 16 -14 -8 -14 8 3 -16 -12 -11 16 -2z" fill-opacity=".95"/>
    <path d="M1060 330 l5 10 11 1.5 -8 7.5 2 11 -10 -5.5 -10 5.5 2 -11 -8 -7.5 11 -1.5z" fill-opacity=".8"/>
  </g>
  <g fill="#ffffff">
    <circle cx="640" cy="200" r="3" fill-opacity=".7"/>
    <circle cx="1170" cy="300" r="2.5" fill-opacity=".6"/>
    <circle cx="860" cy="660" r="2.5" fill-opacity=".6"/>
    <circle cx="560" cy="420" r="2" fill-opacity=".5"/>
    <path d="M1040 520 v14 M1033 527 h14" stroke="#ffffff" stroke-opacity=".7" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M600 110 v12 M594 116 h12" stroke="#ffffff" stroke-opacity=".6" stroke-width="2.5" stroke-linecap="round"/>
  </g>
</svg>
'''

for nome, c in PAGINAS.items():
  with open(f"{nome}-arte.svg", "w", encoding="utf-8") as f:
    f.write(svg(nome, c))
  print("ok", nome)
