import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

(function () {

  function getInitials(name) {
    if (!name) return "HF";
    const parts = String(name).trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "HF";
  }

  function injectProfileStyles() {
    if (document.getElementById("perfilUsuarioStyles")) return;

    const style = document.createElement("style");
    style.id = "perfilUsuarioStyles";
    style.textContent = `
      .profile-fab {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 9999;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        border: 2px solid #00adee;
        overflow: hidden;
        cursor: pointer;
        background: #111;
        color: #fff;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
      }

      .profile-card {
        position: fixed;
        top: 76px;
        right: 16px;
        z-index: 9999;
        width: min(320px, calc(100vw - 32px));
        background: #0f0f0f;
        color: #f1f1f1;
        border: 1px solid #00adee66;
        border-radius: 14px;
        padding: 14px;
        box-shadow: 0 14px 38px rgba(0, 0, 0, 0.45);
        display: none;
      }

      .profile-card h4 {
        margin: 0 0 10px;
        color: #00adee;
      }

      .profile-card p {
        margin: 6px 0;
        font-size: 14px;
      }

      .profile-card .actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }

      .profile-card .actions button {
        flex: 1;
        border: none;
        border-radius: 8px;
        padding: 8px 10px;
        cursor: pointer;
        font-weight: 700;
      }

      .profile-card .actions .edit {
        background: #00adee;
        color: #000;
      }

      .profile-card .actions .logout {
        background: #252525;
        color: #fff;
      }
    `;
    document.head.appendChild(style);
  }

  async function buildProfile(user) {
    if (!user) return;
    if (document.getElementById("perfilUsuarioBtn")) return;

    injectProfileStyles();

    const docRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return;

    const dados = docSnap.data();

    const fab = document.createElement("button");
    fab.id = "perfilUsuarioBtn";
    fab.className = "profile-fab";
    fab.type = "button";
    fab.title = "Perfil";

    const initials = document.createElement("span");
    initials.textContent = getInitials(dados.nome);
    fab.appendChild(initials);

    const card = document.createElement("div");
    card.id = "perfilUsuarioCard";
    card.className = "profile-card";
    card.innerHTML = `
      <h4>Meu perfil</h4>
      <p><strong>Nome:</strong> ${dados.nome || "-"}</p>
      <p><strong>Email:</strong> ${dados.email || "-"}</p>
      <p><strong>Cidade:</strong> ${dados.cidade || "-"}</p>
      <div class="actions">
        <button type="button" class="edit" id="perfilEditarBtn">Editar</button>
        <button type="button" class="logout" id="perfilSairBtn">Sair</button>
      </div>
    `;

    fab.addEventListener("click", function () {
      card.style.display = card.style.display === "block" ? "none" : "block";
    });

    document.addEventListener("click", function (event) {
      if (!card.contains(event.target) && !fab.contains(event.target)) {
        card.style.display = "none";
      }
    });

    document.body.appendChild(fab);
    document.body.appendChild(card);

    document.getElementById("perfilEditarBtn").addEventListener("click", function () {
      window.location.href = "cadastrar.html";
    });

    document.getElementById("perfilSairBtn").addEventListener("click", async function () {
      await signOut(auth);
      window.location.reload();
    });
  }

  // 🔥 VERIFICA LOGIN REAL
  onAuthStateChanged(auth, (user) => {
    if (user) {
      buildProfile(user);
    }
  });

})();
