# Gera JPEGs "de foto de celular" (com textura, não cor lisa) nos tamanhos que o site grava,
# para o carga-fotos.mjs. Uso: python3 gerar-fotos.py
import os, random
from PIL import Image, ImageFilter
random.seed(7)
saida = os.path.join(os.path.dirname(os.path.abspath(__file__)), "saida", "fotos-carga")
os.makedirs(saida, exist_ok=True)
def foto(w, h, q, nome):
    img = Image.effect_noise((w, h), 60).convert("RGB")
    base = Image.linear_gradient("L").resize((w, h)).convert("RGB")
    img = Image.blend(base, img, 0.45).filter(ImageFilter.GaussianBlur(1.2))
    img.save(os.path.join(saida, nome), "JPEG", quality=q)
    print(nome, w, "x", h, round(os.path.getsize(os.path.join(saida, nome)) / 1024), "KB")
foto(1080, 1350, 80, "post.jpg")    # publicação do Diário (4:5, qualidade 0,8)
foto(480, 480, 86, "avatar.jpg")    # foto de perfil
foto(480, 480, 86, "logo.jpg")      # foto/logo do negócio
foto(1080, 810, 72, "foto.jpg")     # fotos do negócio / do imóvel (4:3, qualidade 0,72)
