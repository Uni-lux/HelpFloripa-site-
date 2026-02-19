import { auth, db } from "./firebase.js";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

(function () {
  const STORAGE_KEY = "helpFloripaUser";

  function getUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("[Perfil] Falha ao ler usuário", error);
      return null;
    }
  }

  function saveUser(user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  function clearUser() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function requireCadastro(actionText) {
    if (auth.currentUser || getUser()) return true;
    alert(`Para ${actionText}, se cadastra primeiro.`);
    window.location.href = "cadastre-se.html";
    return false;
  }

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

      .profile-fab img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .profile-fab span {
        font-size: 14px;
        letter-spacing: 0.5px;
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

      .profile-card h4 { margin: 0 0 10px; color: #00adee; }
      .profile-card p { margin: 6px 0; font-size: 14px; }
      .profile-card .actions { display: flex; gap: 8px; margin-top: 12px; }
      .profile-card .actions button {
        flex: 1; border: none; border-radius: 8px; padding: 8px 10px;
        cursor: pointer; font-weight: 700;
      }
      .profile-card .actions .edit { background: #00adee; color: #000; }
      .profile-card .actions .logout { background: #252525; color: #fff; }
    `;
    document.head.appendChild(style);
  }

  function isHomePage() {
    const file = window.location.pathname.split("/").pop();
    return !file || file === "index.html";
  }

  function ensureFloatingButton() {
    if (!isHomePage()) return null;
    if (document.getElementById("perfilUsuarioBtn")) return document.getElementById("perfilUsuarioBtn");

    injectProfileStyles();

    const fab = document.createElement("button");
    fab.id = "perfilUsuarioBtn";
    fab.className = "profile-fab";
    fab.type = "button";
    fab.title = "Entrar / Perfil";
    fab.innerHTML = "<span>ENT</span>";

    document.body.appendChild(fab);
    return fab;
  }

  function bindCardActions(userData, card) {
    const editBtn = card.querySelector("#perfilEditarBtn");
    const sairBtn = card.querySelector("#perfilSairBtn");

    if (editBtn) {
      editBtn.addEventListener("click", function () {
        window.location.href = "cadastrar.html";
      });
    }

    if (sairBtn) {
      sairBtn.addEventListener("click", async function () {
        await signOut(auth);
        clearUser();
        window.location.reload();
      });
    }

    saveUser(userData);
  }

  function renderProfileCard(userData) {
    let card = document.getElementById("perfilUsuarioCard");
    if (!card) {
      card = document.createElement("div");
      card.id = "perfilUsuarioCard";
      card.className = "profile-card";
      document.body.appendChild(card);

      document.addEventListener("click", function (event) {
        const fab = document.getElementById("perfilUsuarioBtn");
        if (!card.contains(event.target) && fab && !fab.contains(event.target)) {
          card.style.display = "none";
        }
      });
    }

    card.innerHTML = `
      <h4>Meu perfil</h4>
      <p><strong>Nome:</strong> ${userData.nome || "-"}</p>
      <p><strong>Email:</strong> ${userData.email || "-"}</p>
      <p><strong>Cidade:</strong> ${userData.cidade || "-"}</p>
      <div class="actions">
        <button type="button" class="edit" id="perfilEditarBtn">Editar</button>
        <button type="button" class="logout" id="perfilSairBtn">Sair</button>
      </div>
    `;

    bindCardActions(userData, card);
    return card;
  }

  async function loadProfileFromFirebase(user) {
    const docRef = doc(db, "usuarios", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const dados = docSnap.data();
      return {
        nome: dados.nome || user.displayName || "",
        email: dados.email || user.email || "",
        cidade: dados.cidade || "",
        fotoUrl: dados.fotoUrl || user.photoURL || ""
      };
    }

    return {
      nome: user.displayName || "",
      email: user.email || "",
      cidade: "",
      fotoUrl: user.photoURL || ""
    };
  }

  function updateButtonForLoggedOut(fab) {
    fab.innerHTML = "<span>ENT</span>";
    fab.onclick = async function () {
      try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      } catch (error) {
        console.error("[Perfil] Erro ao entrar:", error);
        alert("Não foi possível entrar agora. Tente novamente.");
      }
    };

    const card = document.getElementById("perfilUsuarioCard");
    if (card) card.style.display = "none";
  }

  function updateButtonForLoggedIn(fab, profile) {
    fab.innerHTML = "";

    if (profile.fotoUrl) {
      const img = document.createElement("img");
      img.src = profile.fotoUrl;
      img.alt = `Foto de perfil de ${profile.nome || "usuário"}`;
      fab.appendChild(img);
    } else {
      const initials = document.createElement("span");
      initials.textContent = getInitials(profile.nome);
      fab.appendChild(initials);
    }

    const card = renderProfileCard(profile);
    fab.onclick = function () {
      card.style.display = card.style.display === "block" ? "none" : "block";
    };
  }

  function setupAuthProfileButton() {
    const fab = ensureFloatingButton();
    if (!fab) return;

    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        updateButtonForLoggedOut(fab);
        return;
      }

      const profile = await loadProfileFromFirebase(user);
      updateButtonForLoggedIn(fab, profile);
    });
  }

  function prefillFormById(formId) {
    const user = getUser();
    if (!user) return;
    const form = document.getElementById(formId);
    if (!form) return;

    Object.keys(user).forEach((key) => {
      const field = form.querySelector(`[name="${key}"], #${key}`);
      if (field && !field.value) {
        field.value = user[key];
      }
    });
  }

  const HelpPerfil = {
    getUser,
    saveUser,
    clearUser,
    requireCadastro,
    prefillFormById,
    setupAuthProfileButton
  };

  window.HelpPerfil = HelpPerfil;

  document.addEventListener("DOMContentLoaded", function () {
    setupAuthProfileButton();
  });
})();
        
