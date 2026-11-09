// =====================================================
// Emojis do chat (09/11/2026, pedido do dono): lista por categoria, recentes no aparelho e busca em português.
// Sem dependências. Os desenhos são os do próprio celular (Android = Noto, iPhone = Apple): os mais atuais do aparelho.
// EMOJI_CATS: [id, nome, ícone, "emojis separados por espaço"]
// =====================================================
export const EMOJI_CATS = [
  ["pessoas", "Smileys e pessoas", "😀",
    "😀 😃 😄 😁 😆 🥹 😅 😂 🤣 🥲 ☺️ 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 🙂‍↕️ 😏 😒 🙂‍↔️ 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😮‍💨 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🫣 🤗 🫡 🤔 🫢 🤭 🤫 🤥 😶 😶‍🌫️ 😐 😑 😬 🫨 🫠 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 😵‍💫 🫥 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 👹 👺 🤡 💩 👻 💀 ☠️ 👽 👾 🤖 🎃 😺 😸 😹 😻 😼 😽 🙀 😿 😾 👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 🫵 🫱 🫲 🫸 🫷 🫳 🫴 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🫶 🙌 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦵 🦶 👂 🦻 👃 🧠 🫀 🫁 🦷 🦴 👀 👁️ 👅 👄 🫦 👶 🧒 👦 👧 🧑 👱 👨 🧔 👩 🧓 👴 👵 🙍 🙎 🙅 🙆 💁 🙋 🧏 🙇 🤦 🤷 🧑‍⚕️ 🧑‍🎓 🧑‍🏫 🧑‍⚖️ 🧑‍🌾 🧑‍🍳 🧑‍🔧 🧑‍🏭 🧑‍💼 🧑‍🔬 🧑‍💻 🧑‍🎤 🧑‍🎨 🧑‍✈️ 🧑‍🚀 🧑‍🚒 👮 🕵️ 💂 🥷 👷 🫅 🤴 👸 👳 👲 🧕 🤵 👰 🤰 🫃 🤱 👼 🎅 🤶 🦸 🦹 🧙 🧚 🧛 🧜 🧝 🧞 🧟 💆 💇 🚶 🧍 🧎 🏃 💃 🕺 👯 🧖 🧗 🤺 🏇 ⛷️ 🏂 🏌️ 🏄 🚣 🏊 ⛹️ 🏋️ 🚴 🚵 🤸 🤼 🤽 🤾 🤹 🧘 🛀 🛌 👭 👫 👬 💏 💑 👪 🗣️ 👤 👥 🫂 👣"],
  ["natureza", "Animais e natureza", "🐶",
    "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐽 🐸 🐵 🙈 🙉 🙊 🐒 🐔 🐧 🐦 🐦‍⬛ 🐤 🐣 🐥 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🪱 🐛 🦋 🐌 🐞 🐜 🪰 🪲 🪳 🦟 🦗 🕷️ 🕸️ 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦞 🦀 🪼 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🦭 🐊 🐅 🐆 🦓 🦍 🦧 🦣 🐘 🦛 🦏 🐪 🐫 🦒 🦘 🦬 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🦙 🐐 🦌 🫎 🐕 🐩 🦮 🐕‍🦺 🐈 🐈‍⬛ 🪶 🪽 🐓 🦃 🦤 🦚 🦜 🦢 🪿 🦩 🕊️ 🐇 🦝 🦨 🦡 🦫 🦦 🦥 🐁 🐀 🐿️ 🦔 🐾 🐉 🐲 🌵 🎄 🌲 🌳 🌴 🪵 🌱 🌿 ☘️ 🍀 🎍 🪴 🎋 🍃 🍂 🍁 🪺 🪹 🍄 🐚 🪸 🪨 🌾 💐 🌷 🌹 🥀 🪻 🌺 🌸 🌼 🌻 🌞 🌝 🌛 🌜 🌚 🌕 🌖 🌗 🌘 🌑 🌒 🌓 🌔 🌙 🌎 🌍 🌏 🪐 💫 ⭐ 🌟 ✨ ⚡ ☄️ 💥 🔥 🌪️ 🌈 ☀️ 🌤️ ⛅ 🌥️ ☁️ 🌦️ 🌧️ ⛈️ 🌩️ 🌨️ ❄️ ☃️ ⛄ 🌬️ 💨 💧 💦 🫧 ☔ ☂️ 🌊 🌫️"],
  ["comida", "Comidas e bebidas", "🍔",
    "🍏 🍎 🍐 🍊 🍋 🍋‍🟩 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🫛 🥬 🥒 🌶️ 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🫚 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🦴 🌭 🍔 🍟 🍕 🫓 🥪 🥙 🧆 🌮 🌯 🫔 🥗 🥘 🫕 🥫 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🦪 🍤 🍙 🍚 🍘 🍥 🥠 🥮 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🥜 🫘 🍯 🥛 🍼 🫖 ☕ 🍵 🧃 🥤 🧋 🍶 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🧉 🍾 🧊 🥄 🍴 🍽️ 🥣 🥡 🥢 🧂"],
  ["atividades", "Atividades", "⚽",
    "⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 🏆 🥇 🥈 🥉 🏅 🎖️ 🏵️ 🎗️ 🎫 🎟️ 🎪 🎭 🩰 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🪘 🎷 🎺 🪗 🎸 🪕 🎻 🪈 🎲 ♟️ 🎯 🎳 🎮 🎰 🧩 🎉 🎊 🎈 🎁 🎀 🪅 🪩"],
  ["viagem", "Viagens e lugares", "🚗",
    "🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🦯 🦽 🦼 🛴 🚲 🛵 🏍️ 🛺 🚨 🚔 🚍 🚘 🚖 🚡 🚠 🚟 🚃 🚋 🚞 🚝 🚄 🚅 🚈 🚂 🚆 🚇 🚊 🚉 ✈️ 🛫 🛬 🛩️ 💺 🛰️ 🚀 🛸 🚁 🛶 ⛵ 🚤 🛥️ 🛳️ ⛴️ 🚢 ⚓ 🛟 🪝 ⛽ 🚧 🚦 🚥 🚏 🗺️ 🗿 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛲ ⛱️ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏔️ 🗻 🏕️ ⛺ 🛖 🏠 🏡 🏘️ 🏚️ 🏗️ 🏭 🏢 🏬 🏣 🏤 🏥 🏦 🏨 🏪 🏫 🏩 💒 🏛️ ⛪ 🕌 🕍 🛕 🕋 ⛩️ 🛤️ 🛣️ 🗾 🎑 🏞️ 🌅 🌄 🌠 🎇 🎆 🌇 🌆 🏙️ 🌃 🌌 🌉 🌁"],
  ["objetos", "Objetos", "💡",
    "⌚ 📱 📲 💻 ⌨️ 🖥️ 🖨️ 🖱️ 🖲️ 🕹️ 🗜️ 💽 💾 💿 📀 📼 📷 📸 📹 🎥 📽️ 🎞️ 📞 ☎️ 📟 📠 📺 📻 🎙️ 🎚️ 🎛️ 🧭 ⏱️ ⏲️ ⏰ 🕰️ ⌛ ⏳ 📡 🔋 🪫 🔌 💡 🔦 🕯️ 🪔 🧯 🛢️ 💸 💵 💴 💶 💷 🪙 💰 💳 🪪 💎 ⚖️ 🪜 🧰 🪛 🔧 🔨 ⚒️ 🛠️ ⛏️ 🪚 🔩 ⚙️ 🪤 🧱 ⛓️ 🧲 🔫 💣 🧨 🪓 🔪 🗡️ ⚔️ 🛡️ 🚬 ⚰️ 🪦 ⚱️ 🏺 🔮 📿 🧿 🪬 💈 ⚗️ 🔭 🔬 🕳️ 🩹 🩺 🩻 🩼 💊 💉 🩸 🧬 🦠 🧫 🧪 🌡️ 🧹 🪠 🧺 🧻 🚽 🚰 🚿 🛁 🛀 🧼 🪥 🪒 🪮 🧽 🪣 🧴 🛎️ 🔑 🗝️ 🚪 🪑 🛋️ 🛏️ 🛌 🧸 🪆 🖼️ 🪞 🪟 🛍️ 🛒 🎁 🎈 🎏 🎀 🪄 🪅 🎊 🎉 🎎 🪭 🏮 🎐 🪩 🧧 ✉️ 📩 📨 📧 💌 📥 📤 📦 🏷️ 🪧 📪 📫 📬 📭 📮 📯 📜 📃 📄 📑 🧾 📊 📈 📉 🗒️ 🗓️ 📆 📅 🗑️ 📇 🗃️ 🗳️ 🗄️ 📋 📁 📂 🗂️ 🗞️ 📰 📓 📔 📒 📕 📗 📘 📙 📚 📖 🔖 🧷 🔗 📎 🖇️ 📐 📏 🧮 📌 📍 ✂️ 🖊️ 🖋️ ✒️ 🖌️ 🖍️ 📝 ✏️ 🔍 🔎 🔏 🔐 🔒 🔓"],
  ["simbolos", "Símbolos", "❤️",
    "❤️ 🩷 🧡 💛 💚 💙 🩵 💜 🖤 🩶 🤍 🤎 💔 ❤️‍🔥 ❤️‍🩹 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ☮️ ✝️ ☪️ 🕉️ ☸️ ✡️ 🔯 🕎 ☯️ ☦️ 🛐 ⛎ ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ 🆔 ⚛️ 🉑 ☢️ ☣️ 📴 📳 🈶 🈚 🈸 🈺 🈷️ ✴️ 🆚 💮 🉐 ㊙️ ㊗️ 🈴 🈵 🈹 🈲 🅰️ 🅱️ 🆎 🆑 🅾️ 🆘 ❌ ⭕ 🛑 ⛔ 📛 🚫 💯 💢 ♨️ 🚷 🚯 🚳 🚱 🔞 📵 🚭 ❗ ❕ ❓ ❔ ‼️ ⁉️ 🔅 🔆 〽️ ⚠️ 🚸 🔱 ⚜️ 🔰 ♻️ ✅ 🈯 💹 ❇️ ✳️ ❎ 🌐 💠 Ⓜ️ 🌀 💤 🏧 🚾 ♿ 🅿️ 🛗 🈳 🈂️ 🛂 🛃 🛄 🛅 🚹 🚺 🚼 ⚧️ 🚻 🚮 🎦 🛜 📶 🈁 🔣 ℹ️ 🔤 🔡 🔠 🆖 🆗 🆙 🆒 🆕 🆓 0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟 🔢 #️⃣ *️⃣ ⏏️ ▶️ ⏸️ ⏯️ ⏹️ ⏺️ ⏭️ ⏮️ ⏩ ⏪ ⏫ ⏬ ◀️ 🔼 🔽 ➡️ ⬅️ ⬆️ ⬇️ ↗️ ↘️ ↙️ ↖️ ↕️ ↔️ ↪️ ↩️ ⤴️ ⤵️ 🔀 🔁 🔂 🔄 🔃 🎵 🎶 ➕ ➖ ➗ ✖️ 🟰 ♾️ 💲 💱 ™️ ©️ ®️ 〰️ ➰ ➿ 🔚 🔙 🔛 🔝 🔜 ✔️ ☑️ 🔘 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟤 🔺 🔻 🔸 🔹 🔶 🔷 🔳 🔲 ▪️ ▫️ ◾ ◽ ◼️ ◻️ 🟥 🟧 🟨 🟩 🟦 🟪 ⬛ ⬜ 🟫 🔈 🔇 🔉 🔊 🔔 🔕 📣 📢 💬 💭 🗯️ ♠️ ♣️ ♥️ ♦️ 🃏 🎴 🀄 🕐 🕑 🕒 🕓 🕔 🕕 🕖 🕗 🕘 🕙 🕚 🕛"],
  ["bandeiras", "Bandeiras", "🏳️",
    "🇧🇷 🏳️ 🏴 🏁 🚩 🏳️‍🌈 🏳️‍⚧️ 🏴‍☠️ 🇦🇷 🇺🇾 🇵🇾 🇨🇱 🇧🇴 🇵🇪 🇨🇴 🇻🇪 🇪🇨 🇲🇽 🇺🇸 🇨🇦 🇵🇹 🇪🇸 🇫🇷 🇮🇹 🇩🇪 🇬🇧 🇮🇪 🇳🇱 🇧🇪 🇨🇭 🇦🇹 🇸🇪 🇳🇴 🇩🇰 🇫🇮 🇵🇱 🇺🇦 🇷🇺 🇬🇷 🇹🇷 🇮🇱 🇪🇬 🇿🇦 🇳🇬 🇦🇴 🇲🇿 🇨🇻 🇯🇵 🇨🇳 🇰🇷 🇮🇳 🇦🇺 🇳🇿 🇭🇹 🇨🇺 🇯🇲 🇺🇳 🇪🇺"]
];

// Palavras de busca (português, sem acento). Cada linha: "palavras|emojis".
const PALAVRAS = `
feliz alegre sorriso rindo|😀 😃 😄 😁 😊 🙂 ☺️
risada rir kkk haha engracado chorar de rir|😂 🤣 😆 😹
amor apaixonado coracao amei lindo|😍 🥰 😘 ❤️ 💕 💖 💗 💘 💞 🩷 💙 💜 💚 💛 🧡 🤍 🖤 😻 🫶
beijo|😘 😗 😚 😙 💋
triste chorar choro mal|😢 😭 😞 😔 🥺 😿 💔
bravo raiva irritado|😠 😡 🤬 😤 👿
medo susto assustado|😱 😨 😰 🫣
surpreso chocado uau nossa|😮 😲 😯 🤯 😳
pensando duvida hmm|🤔 🧐 🤨
legal maneiro estiloso|😎 🤩 🆒
festa comemorar parabens aniversario|🥳 🎉 🎊 🎂 🎁 🎈 🍾 🥂
ok certo joia beleza positivo|👍 👌 ✅ ✔️ 🆗
nao negativo ruim|👎 ❌ 🚫 🙅
obrigado gratidao por favor reza|🙏 🫶 🤝
palmas parabens aplauso|👏 🙌
oi tchau ola acenar|👋 🤚
forca forte academia|💪 🏋️
dinheiro pix pagamento grana|💸 💰 💵 🪙 💳 🤑
casa imovel aluguel|🏠 🏡 🏘️ 🔑 🏢
carro uber transporte|🚗 🚕 🚙 🛻 🚚 🏍️ 🛵
comida fome lanche|🍔 🍕 🌭 🍟 🌮 🍝 🍣 🥗 🍗
cafe|☕ 🫖 🥐
cerveja bebida drinque|🍺 🍻 🥂 🍷 🍹 🍸 🥃
agua|💧 🥤 🧊
sol calor verao praia|☀️ 🌞 🏖️ 🌴 🥵 🌊
frio inverno|🥶 ❄️ ☃️
chuva|🌧️ ☔ ⛈️
noite dormir sono cansado|😴 🌙 💤 🥱 🛌
fogo top incrivel|🔥 💯 ⚡
estrela brilho|⭐ 🌟 ✨ 💫
cachorro dog|🐶 🐕 🦮 🐩
gato|🐱 🐈 🐈‍⬛ 😺
flor|🌹 🌷 🌸 🌺 🌻 💐
futebol bola gol|⚽ 🥅 🏆
trabalho servico ferramenta obra reforma|🛠️ 🔧 🔨 🧰 🪛 👷 🏗️
limpeza faxina|🧹 🧽 🧼 🧺 🪣
saude medico remedio hospital|🩺 💊 💉 🏥 🧑‍⚕️
telefone ligar celular|📞 📱 ☎️
mensagem conversa chat|💬 💭 ✉️ 📩
relogio hora tempo atrasado|⏰ ⌚ ⏳ 🕐
localizacao endereco mapa|📍 🗺️ 🧭
brasil|🇧🇷
olho olhar ver|👀 👁️
caveira morri|💀 ☠️
segredo silencio|🤫 🤐
vergonha|😳 🫣 🙈
doente|🤒 🤧 😷 🤢
`.trim().split("\n").map((l) => { const [p, e] = l.split("|"); return [p, e.split(" ")]; });

export const semAcento = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
export function buscarEmojis(termo) {
  const t = semAcento(termo);
  if (!t) return [];
  const saida = [];
  for (const [p, lista] of PALAVRAS) if (p.split(" ").some((w) => w.startsWith(t)) || (t.length > 3 && p.includes(t))) lista.forEach((e) => saida.includes(e) || saida.push(e));
  return saida.slice(0, 64);
}
export const listaDa = (cat) => (EMOJI_CATS.find((c) => c[0] === cat)?.[3] || "").split(" ").filter(Boolean);

// Recentes (no aparelho, por conta): mais usados e mais novos primeiro.
const chave = (uid) => `hf-emojis-${uid || "x"}`;
export function emojisRecentes(uid) {
  try { const o = JSON.parse(localStorage.getItem(chave(uid)) || "{}"); return Object.entries(o).sort((a, b) => b[1] - a[1]).map((x) => x[0]).slice(0, 32); }
  catch { return []; }
}
export function usarEmoji(uid, e) {
  try {
    const o = JSON.parse(localStorage.getItem(chave(uid)) || "{}");
    // pontuação: cada uso vale mais que o anterior (os usados agora sobem)
    o[e] = Math.max(Number(o[e]) || 0, ...Object.values(o).map(Number), 0) + 1;
    const lista = Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 40);
    localStorage.setItem(chave(uid), JSON.stringify(Object.fromEntries(lista)));
  } catch {}
}
// Um texto só com emojis (até 3) aparece grande no chat, como no WhatsApp.
export function soEmojis(texto) {
  const t = String(texto || "").trim();
  if (!t || t.length > 40) return 0;
  if (!/^(?:\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|‍|️|⃣|[#*0-9]|\s)+$/u.test(t)) return 0;
  if (/[#*0-9]/.test(t) && !/⃣/.test(t)) return 0;
  const seg = typeof Intl !== "undefined" && Intl.Segmenter ? [...new Intl.Segmenter("pt", { granularity: "grapheme" }).segment(t.replace(/\s+/g, ""))].length : t.length;
  return seg <= 3 ? seg : 0;
}
