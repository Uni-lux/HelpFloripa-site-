# Pacote de figurinhas da Help Floripa (09/11/2026): mascote "bolinha" ciano com expressões + frase curta.
# Formato das figurinhas do WhatsApp: WebP 512×512, fundo transparente, contorno branco, até 100 KB.
# Uso: python3 scripts/arte/gerar-figurinhas.py  → figurinhas/hf-01.webp ... + figurinhas/pacote.json
# Fonte: Inter Display ExtraBold (licença OFL), só para desenhar o texto nas imagens.
import json, math, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
SAIDA = os.path.join(RAIZ, "figurinhas")
os.makedirs(SAIDA, exist_ok=True)
FONTE = "/usr/share/fonts/opentype/inter/InterDisplay-ExtraBold.otf"
G = 1024  # desenha em 2× e reduz (bordas lisas)
CIANO, CIANO_E = (0, 173, 238), (0, 120, 180)
TINTA = (8, 18, 26)

# (arquivo, frase, expressão, cor da etiqueta, extra)
LISTA = [
    ("hf-01", "Oi!", "feliz", (0, 173, 238), "mao"),
    ("hf-02", "Kkkkk", "risada", (255, 176, 32), None),
    ("hf-03", "Amei!", "amor", (229, 72, 127), "coracoes"),
    ("hf-04", "Combinado!", "piscada", (34, 197, 94), "joinha"),
    ("hf-05", "Valeu!", "feliz", (0, 173, 238), "brilho"),
    ("hf-06", "Sério?!", "surpreso", (139, 92, 246), None),
    ("hf-07", "Poxa...", "triste", (100, 116, 139), "lagrima"),
    ("hf-08", "Hmm...", "pensando", (14, 165, 233), None),
    ("hf-09", "Bom dia!", "feliz", (255, 160, 0), "sol"),
    ("hf-10", "Boa noite", "dormindo", (59, 70, 160), "lua"),
    ("hf-11", "Tô chegando!", "piscada", (0, 173, 238), "velocidade"),
    ("hf-12", "Obrigado!", "fechado", (229, 72, 127), "coracoes"),
    ("hf-13", "Fechado!", "confiante", (34, 197, 94), "joinha"),
    ("hf-14", "Pix enviado", "feliz", (0, 168, 150), "check"),
    ("hf-15", "Já volto", "piscada", (255, 122, 26), "relogio"),
    ("hf-16", "Parabéns!", "risada", (176, 102, 255), "confete"),
]

def arco(d, caixa, ini, fim, larg, cor=TINTA):
    d.arc(caixa, ini, fim, fill=cor, width=larg)

def olhos(d, cx, cy, tipo):
    ex, ey, r = 120, -40, 40
    for s in (-1, 1):
        x = cx + s * ex
        y = cy + ey
        if tipo in ("feliz", "surpreso", "pensando", "confiante"):
            d.ellipse((x - r, y - r * 1.25, x + r, y + r * 1.25), fill=TINTA)
            d.ellipse((x - r * .15 + 10, y - r * .9, x + r * .45 + 10, y - r * .3), fill="white")
        elif tipo in ("risada", "fechado"):
            arco(d, (x - 50, y - 30, x + 50, y + 50), 200, 340, 22)
        elif tipo == "piscada":
            if s < 0:
                d.ellipse((x - r, y - r * 1.25, x + r, y + r * 1.25), fill=TINTA)
                d.ellipse((x - r * .15 + 10, y - r * .9, x + r * .45 + 10, y - r * .3), fill="white")
            else:
                arco(d, (x - 50, y - 30, x + 50, y + 50), 200, 340, 22)
        elif tipo == "triste":
            d.ellipse((x - r, y - r * 1.1 + 10, x + r, y + r * 1.1 + 10), fill=TINTA)
            d.ellipse((x - r * .15 + 10, y - r * .6 + 10, x + r * .45 + 10, y + 10), fill="white")
            d.line((x - s * 10 - 40, y - 85, x - s * 10 + 40, y - 85 - s * 18), fill=TINTA, width=16)
        elif tipo == "dormindo":
            arco(d, (x - 50, y - 50, x + 50, y + 30), 20, 160, 20)
        elif tipo == "amor":
            coracao(d, x, y, 58, (229, 40, 90))

def boca(d, cx, cy, tipo):
    y = cy + 95
    if tipo in ("feliz", "piscada", "fechado"):
        arco(d, (cx - 95, y - 85, cx + 95, y + 55), 20, 160, 22)
    elif tipo in ("risada", "amor"):
        d.chord((cx - 110, y - 70, cx + 110, y + 90), 0, 180, fill=TINTA)
        d.chord((cx - 60, y + 30, cx + 60, y + 88), 0, 180, fill=(255, 110, 130))
    elif tipo == "surpreso":
        d.ellipse((cx - 38, y - 30, cx + 38, y + 60), fill=TINTA)
    elif tipo == "triste":
        arco(d, (cx - 80, y, cx + 80, y + 110), 200, 340, 20)
    elif tipo == "pensando":
        d.line((cx - 60, y + 20, cx + 60, y + 5), fill=TINTA, width=20)
    elif tipo == "dormindo":
        d.ellipse((cx - 22, y + 5, cx + 22, y + 45), fill=TINTA)
    elif tipo == "confiante":
        arco(d, (cx - 100, y - 70, cx + 60, y + 40), 30, 150, 22)
    # bochechas
    for s in (-1, 1):
        d.ellipse((cx + s * 185 - 38, cy + 50, cx + s * 185 + 38, cy + 90), fill=(255, 140, 170, 150))

def coracao(d, x, y, r, cor):
    d.ellipse((x - r, y - r * .8, x, y + r * .2), fill=cor)
    d.ellipse((x, y - r * .8, x + r, y + r * .2), fill=cor)
    d.polygon([(x - r * .97, y - r * .15), (x + r * .97, y - r * .15), (x, y + r * 1.05)], fill=cor)

def estrela(d, x, y, r, cor):
    p = []
    for i in range(10):
        a = math.pi / 5 * i - math.pi / 2
        rr = r if i % 2 == 0 else r * .45
        p.append((x + rr * math.cos(a), y + rr * math.sin(a)))
    d.polygon(p, fill=cor)

def extra(d, tipo, cx, cy, corte):
    if tipo == "coracoes":
        coracao(d, cx + 300, cy - 260, 60, (229, 40, 90)); coracao(d, cx - 310, cy - 200, 42, (255, 90, 130))
    elif tipo == "brilho":
        estrela(d, cx + 300, cy - 270, 55, (255, 200, 40)); estrela(d, cx - 300, cy - 230, 38, (255, 220, 90))
    elif tipo == "sol":
        sx, sy = cx + 290, cy - 280
        for i in range(12):
            a = math.pi / 6 * i
            d.line((sx + 70 * math.cos(a), sy + 70 * math.sin(a), sx + 110 * math.cos(a), sy + 110 * math.sin(a)), fill=(255, 190, 30), width=18)
        d.ellipse((sx - 58, sy - 58, sx + 58, sy + 58), fill=(255, 200, 40))
    elif tipo == "lua":
        mx, my = cx + 290, cy - 270
        d.ellipse((mx - 75, my - 75, mx + 75, my + 75), fill=(255, 220, 110))
        d.ellipse((mx - 35, my - 95, mx + 105, my + 45), fill=(0, 0, 0, 0))
        f = ImageFont.truetype(FONTE, 80)
        d.text((cx - 330, cy - 330), "z", font=f, fill=(120, 140, 255)); d.text((cx - 270, cy - 400), "z", font=ImageFont.truetype(FONTE, 60), fill=(150, 170, 255))
    elif tipo == "lagrima":
        x, y = cx - 130, cy + 30
        d.ellipse((x - 26, y, x + 26, y + 60), fill=(90, 190, 255)); d.polygon([(x - 24, y + 22), (x + 24, y + 22), (x, y - 30)], fill=(90, 190, 255))
    elif tipo == "joinha":  # selo de "ok" (mão com polegar ficava parecendo outro gesto)
        x, y = cx + 280, cy - 250
        d.ellipse((x - 78, y - 78, x + 78, y + 78), fill=(34, 197, 94))
        f = ImageFont.truetype(FONTE, 74); w = d.textlength("OK", font=f)
        d.text((x - w / 2, y - 46), "OK", font=f, fill="white")
    elif tipo == "mao":
        x, y = cx + 280, cy - 30
        d.ellipse((x - 70, y - 40, x + 70, y + 100), fill=(255, 205, 120), outline=TINTA, width=10)
        for i in range(4):
            d.rounded_rectangle((x - 66 + i * 36, y - 120, x - 38 + i * 36, y + 10), 14, fill=(255, 205, 120), outline=TINTA, width=8)
        for k in range(3):
            arco(d, (x + 60 + k * 26, y - 140 - k * 10, x + 140 + k * 26, y - 40 - k * 10), 300, 30, 10, (0, 173, 238))
    elif tipo == "velocidade":
        for i, yy in enumerate((cy - 80, cy, cy + 80)):
            d.rounded_rectangle((cx - 420 + i * 20, yy - 10, cx - 300 + i * 20, yy + 10), 10, fill=(0, 173, 238, 200))
    elif tipo == "check":
        x, y = cx + 280, cy - 250
        d.ellipse((x - 75, y - 75, x + 75, y + 75), fill=(0, 168, 150))
        d.line((x - 38, y + 2, x - 8, y + 34, x + 42, y - 30), fill="white", width=22, joint="curve")
    elif tipo == "relogio":
        x, y = cx + 285, cy - 260
        d.ellipse((x - 72, y - 72, x + 72, y + 72), fill="white", outline=TINTA, width=12)
        d.line((x, y, x, y - 45), fill=TINTA, width=12); d.line((x, y, x + 34, y + 14), fill=TINTA, width=12)
    elif tipo == "confete":
        cores = [(255, 200, 40), (229, 72, 127), (0, 173, 238), (34, 197, 94)]
        for i in range(14):
            a = i * 2.4
            x = cx + math.cos(a) * (300 + (i % 3) * 30); y = cy - 120 + math.sin(a) * 260
            d.rounded_rectangle((x - 14, y - 6, x + 14, y + 6), 4, fill=cores[i % 4])

def contorno(img, larg):
    a = img.split()[3]
    grossa = a.filter(ImageFilter.MaxFilter(larg * 2 + 1))
    base = Image.new("RGBA", img.size, (255, 255, 255, 0))
    base.putalpha(grossa)
    sombra = Image.new("RGBA", img.size, (0, 0, 0, 0))
    s = grossa.filter(ImageFilter.GaussianBlur(14)).point(lambda v: int(v * .35))
    sombra.putalpha(s)
    fundo = Image.new("RGBA", img.size, (0, 0, 0, 0))
    fundo.alpha_composite(sombra, (0, 10))
    branco = Image.new("RGBA", img.size, (255, 255, 255, 255)); branco.putalpha(grossa)
    fundo.alpha_composite(branco)
    fundo.alpha_composite(img)
    return fundo

def figura(frase, expr, cor, tipo):
    img = Image.new("RGBA", (G, G), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = G // 2, 430
    # corpo: bolinha com degradê simples (duas elipses)
    d.ellipse((cx - 290, cy - 280, cx + 290, cy + 270), fill=CIANO_E)
    d.ellipse((cx - 285, cy - 285, cx + 280, cy + 245), fill=CIANO)
    d.ellipse((cx - 200, cy - 240, cx - 60, cy - 150), fill=(120, 220, 255))  # brilho
    # antena (ponte estilizada): dois traços + arco
    d.line((cx - 60, cy - 280, cx - 90, cy - 360), fill=CIANO_E, width=16)
    d.ellipse((cx - 112, cy - 385, cx - 68, cy - 341), fill=(255, 255, 255), outline=CIANO_E, width=10)
    olhos(d, cx, cy, expr)
    boca(d, cx, cy, expr)
    extra(d, tipo, cx, cy, None)
    # etiqueta com a frase
    tam = 118
    f = ImageFont.truetype(FONTE, tam)
    while d.textlength(frase, font=f) > 820 and tam > 60:
        tam -= 6; f = ImageFont.truetype(FONTE, tam)
    w = d.textlength(frase, font=f)
    y0 = 760
    d.rounded_rectangle((cx - w / 2 - 44, y0 - 18, cx + w / 2 + 44, y0 + tam + 34), 46, fill=cor)
    d.text((cx - w / 2, y0 - tam * .04), frase, font=f, fill="white")
    img = contorno(img, 22)
    return img.resize((512, 512), Image.LANCZOS)

pacote = {"id": "helpfloripa", "nome": "Help Floripa", "itens": []}
for arq, frase, expr, cor, tipo in LISTA:
    im = figura(frase, expr, cor, tipo)
    caminho = os.path.join(SAIDA, arq + ".webp")
    q = 88
    while True:
        im.save(caminho, "WEBP", quality=q, method=6)
        if os.path.getsize(caminho) <= 100_000 or q <= 50: break
        q -= 6
    pacote["itens"].append({"arquivo": arq + ".webp", "texto": frase})
    print(arq, os.path.getsize(caminho), "bytes")
# capa do pacote (bandeja), 96×96 PNG como no WhatsApp
Image.open(os.path.join(SAIDA, "hf-01.webp")).resize((96, 96), Image.LANCZOS).save(os.path.join(SAIDA, "capa.png"))
with open(os.path.join(SAIDA, "pacote.json"), "w", encoding="utf-8") as f:
    json.dump(pacote, f, ensure_ascii=False, indent=1)
