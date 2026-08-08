(function () {
  const LOGIN_URL = "login.html";
  const EDIT_PROFILE_URL = "cadastrar.html";
  const SAFE_PHOTO_PROTOCOLS = ["https:", "http:"];

  let statusListenersBound = false;
  let activeStatusDot = null;

  let authReady = false;
  let currentAuthUser = null;
  let resolveAuthReady;
  const authReadyPromise = new Promise((resolve) => {
    resolveAuthReady = resolve;
  });

  function getUser() {
    return null;
  }

  function saveUser() {
    console.warn("[Perfil] Armazenamento local desativado por segurança; nada foi salvo.");
  }

  function clearUser() {
    // no-op: nada é armazenado localmente
  }

  function hasLoggedUser() {
    return Boolean(window.firebaseAuth?.currentUser);
  }

  function requireCadastro(actionText) {
    if (hasLoggedUser()) return true;
    alert(`Para ${actionText}, faça login ou se cadastre primeiro.`);
    window.location.href = "cadastre-se.html";
    return false;
  }

  function getInitials(name) {
    if (!name) return "HF";
    const parts = String(name).trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "HF";
  }

  function getSafeText(value, maxLength = 120) {
    if (!value) return "-";
    const text = String(value);
    return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
  }

  function getSafePhotoUrl(url) {
    if (!url) return "";

    try {
      const parsed = new URL(String(url), window.location.origin);
      return SAFE_PHOTO_PROTOCOLS.includes(parsed.protocol) ? parsed.href : "";
    } catch (error) {
      console.warn("[Perfil] URL de foto inválida ignorada.", error);
      return "";
    }
  }

  function injectProfileStyles() {
    if (document.getElementById("perfilUsuarioStyles")) return;

    const style = document.createElement("style");
    style.id = "perfilUsuarioStyles";
    style.textContent = `
      .profile-menu-link {
        display: flex !important;
        align-items: center;
        gap: 10px;
      }

      .profile-menu-link .profile-avatar,
      .profile-menu-link img {
        flex: 0 0 auto;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid #00adee;
        background: #111;
        color: #fff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        object-fit: cover;
        font-size: 12px;
        font-weight: 700;
        line-height: 1;
        overflow: hidden;
      }

      .profile-avatar-wrap {
        position: relative;
        display: inline-flex;
        flex: 0 0 auto;
      }

      .profile-status-dot {
        position: absolute;
        bottom: -1px;
        right: -1px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        border: 2px solid #000;
        background: #e74c3c;
        transition: background 0.3s ease;
      }

      .profile-status-dot.online {
        background: #2ecc71;
      }

      .profile-card {
        position: fixed;
        top: 72px;
        left: 20px;
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
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .profile-card h4 .status-label {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #aaa;
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }

      .profile-card h4 .status-label::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #e74c3c;
      }

      .profile-card h4 .status-label.online::before {
        background: #2ecc71;
      }

      .profile-card p { margin: 6px 0; font-size: 14px; }
      .profile-card .actions { display: flex; gap: 8px; margin-top: 12px; }
      .profile-card .actions button {
        flex: 1; border: none; border-radius: 8px; padding: 8px 10px;
        cursor: pointer; font-weight: 700;
      }
      .profile-card .actions .edit { background: #00adee; color: #000; }
      .profile-card .actions .logout { background: #252525; color: #fff; }

      @media (max-width: 1024px) {
        .profile-card {
          left: 12px;
          right: 12px;
          top: 62px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function isHomePage() {
    const file = window.location.pathname.split("/").pop();
    return !file || file === "index.html";
  }

  function ensureHeroCadastroButton() {
    if (!isHomePage()) return null;

    const button = document.getElementById("heroCadastroBtn");
    if (!button) return null;

    if (button.dataset.defaultText === undefined) {
      button.dataset.defaultText = button.textContent.trim();
      button.dataset.defaultHref = button.getAttribute("href") || "cadastre-se.html";
    }

    return button;
  }

  function ensureMenuProfileButton() {
    if (!isHomePage()) return null;

    injectProfileStyles();

    let button = document.getElementById("perfilUsuarioBtn");
    if (button) return button;

    const sidebar = document.getElementById("sidebar") || document.querySelector(".sidebar");
    if (!sidebar) return null;

    button = document.createElement("a");
    button.id = "perfilUsuarioBtn";
    button.className = "profile-menu-link";
    button.href = LOGIN_URL;

    const title = sidebar.querySelector("h2");
    if (title?.nextSibling) {
      sidebar.insertBefore(button, title.nextSibling);
    } else {
      sidebar.prepend(button);
    }

    return button;
  }

  function addTextRow(card, label, value) {
    const row = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;
    row.appendChild(strong);
    row.appendChild(document.createTextNode(getSafeText(value)));
    card.appendChild(row);
  }

  function bindCardActions(card) {
    const editBtn = card.querySelector("#perfilEditarBtn");
    const sairBtn = card.querySelector("#perfilSairBtn");

    if (editBtn) {
      editBtn.addEventListener("click", function () {
        window.location.href = EDIT_PROFILE_URL;
      });
    }

    if (sairBtn) {
      sairBtn.addEventListener("click", async function () {
        try {
          if (window.firebaseAuth) {
            const { signOut } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
            await signOut(window.firebaseAuth);
          }
        } catch (error) {
          console.warn("[Perfil] Não foi possível deslogar do Firebase.", error);
        }

        clearUser();
        window.location.reload();
      });
    }
  }

  function renderProfileCard(userData) {
    let card = document.getElementById("perfilUsuarioCard");
    if (!card) {
      card = document.createElement("div");
      card.id = "perfilUsuarioCard";
      card.className = "profile-card";
      document.body.appendChild(card);

      document.addEventListener("click", function (event) {
        const button = document.getElementById("perfilUsuarioBtn");
        if (!card.contains(event.target) && button && !button.contains(event.target)) {
          card.style.display = "none";
        }
      });
    }

    card.textContent = "";

    const title = document.createElement("h4");
    const titleText = document.createElement("span");
    titleText.textContent = "Meu perfil";

    const statusLabel = document.createElement("span");
    statusLabel.className = "status-label";
    statusLabel.id = "perfilStatusLabel";
    statusLabel.textContent = navigator.onLine ? "Online" : "Offline";
    statusLabel.classList.toggle("online", navigator.onLine);

    title.append(titleText, statusLabel);
    card.appendChild(title);

    addTextRow(card, "Nome", userData.nome);
    addTextRow(card, "Email", userData.email);
    addTextRow(card, "Cidade", userData.cidade);

    const actions = document.createElement("div");
    actions.className = "actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit";
    editButton.id = "perfilEditarBtn";
    editButton.textContent = "Editar";

    const logoutButton = document.createElement("button");
    logoutButton.type = "button";
    logoutButton.className = "logout";
    logoutButton.id = "perfilSairBtn";
    logoutButton.textContent = "Sair";

    actions.append(editButton, logoutButton);
    card.appendChild(actions);

    bindCardActions(card);
    return card;
  }

  function setLoggedOutButton(button) {
    button.textContent = "";
    button.href = LOGIN_URL;
    button.removeAttribute("aria-expanded");
    activeStatusDot = null;

    const icon = document.createElement("span");
    icon.className = "profile-avatar";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "👤";

    const label = document.createElement("span");
    label.textContent = "Login / Entrar";

    button.append(icon, label);
    button.onclick = function () {
      window.location.href = LOGIN_URL;
    };

    const card = document.getElementById("perfilUsuarioCard");
    if (card) card.style.display = "none";

    clearUser();
  }

  async function loadProfileFromFirebase(user) {
    try {
      if (!window.firebaseDb) {
        return {
          nome: user.displayName || "",
          email: user.email || "",
          cidade: "",
          fotoUrl: user.photoURL || ""
        };
      }

      const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
      const docRef = doc(window.firebaseDb, "usuarios", user.uid);
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
    } catch (error) {
      console.warn("[Perfil] Não foi possível carregar perfil no Firestore.", error);
    }

    return {
      nome: user.displayName || "",
      email: user.email || "",
      cidade: "",
      fotoUrl: user.photoURL || ""
    };
  }

  function updateStatusIndicators() {
    const online = navigator.onLine;

    if (activeStatusDot) {
      activeStatusDot.classList.toggle("online", online);
      activeStatusDot.title = online ? "Online" : "Offline";
    }

    const statusLabel = document.getElementById("perfilStatusLabel");
    if (statusLabel) {
      statusLabel.textContent = online ? "Online" : "Offline";
      statusLabel.classList.toggle("online", online);
    }
  }

  function bindStatusListenersOnce() {
    if (statusListenersBound) return;
    statusListenersBound = true;
    window.addEventListener("online", updateStatusIndicators);
    window.addEventListener("offline", updateStatusIndicators);
  }

  function setLoggedOutHeroButton(button) {
    button.textContent = button.dataset.defaultText || "Cadastre-se";
    button.href = button.dataset.defaultHref || "cadastre-se.html";
  }

  function setLoggedInHeroButton(button, profile) {
    button.textContent = profile.nome || button.dataset.defaultText || "Cadastre-se";
    button.href = EDIT_PROFILE_URL;
  }

  function setLoggedInButton(button, profile) {
    button.textContent = "";
    button.href = "#perfil";
    button.setAttribute("aria-expanded", "false");

    const avatarWrap = document.createElement("span");
    avatarWrap.className = "profile-avatar-wrap";

    const photoUrl = getSafePhotoUrl(profile.fotoUrl);
    if (photoUrl) {
      const img = document.createElement("img");
      img.src = photoUrl;
      img.alt = `Foto de perfil de ${profile.nome || "usuário"}`;
      img.referrerPolicy = "no-referrer";
      avatarWrap.appendChild(img);
    } else {
      const initials = document.createElement("span");
      initials.className = "profile-avatar";
      initials.textContent = getInitials(profile.nome);
      avatarWrap.appendChild(initials);
    }

    const statusDot = document.createElement("span");
    statusDot.className = "profile-status-dot";
    statusDot.setAttribute("aria-hidden", "true");
    avatarWrap.appendChild(statusDot);

    const label = document.createElement("span");
    label.textContent = "Meu Perfil";

    button.append(avatarWrap, label);

    activeStatusDot = statusDot;
    bindStatusListenersOnce();
    updateStatusIndicators();

    const card = renderProfileCard(profile);
    button.onclick = function (event) {
      event.preventDefault();
      const shouldOpen = card.style.display !== "block";
      card.style.display = shouldOpen ? "block" : "none";
      button.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
      if (shouldOpen) updateStatusIndicators();
    };
  }

  function setupAuthProfileButton() {
    const button = ensureMenuProfileButton();
    const heroButton = ensureHeroCadastroButton();

    if (button) setLoggedOutButton(button);
    if (heroButton) setLoggedOutHeroButton(heroButton);

    if (!window.firebaseAuth) {
      authReady = true;
      resolveAuthReady();
      return;
    }

    import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js")
      .then(({ onAuthStateChanged }) => {
        onAuthStateChanged(window.firebaseAuth, async (user) => {
          currentAuthUser = user;
          if (!authReady) {
            authReady = true;
            resolveAuthReady();
          }

          if (!user) {
            if (button) setLoggedOutButton(button);
            if (heroButton) setLoggedOutHeroButton(heroButton);
            return;
          }

          const profile = await loadProfileFromFirebase(user);
          if (button) setLoggedInButton(button, profile);
          if (heroButton) setLoggedInHeroButton(heroButton, profile);
        });
      })
      .catch((error) => {
        console.warn("[Perfil] Listener de autenticação não inicializado.", error);
        authReady = true;
        resolveAuthReady();
      });
  }

  // Páginas que exigem login/cadastro para acesso. Ajuste esta lista se novas
  // seções restritas forem criadas.
  const PROTECTED_PAGES = [
    "servicos.html",
    "delivery.html",
    "shopping.html",
    "imoveis.html"
  ];

  function getPageFileName(href) {
    try {
      const url = new URL(href, window.location.href);
      return url.pathname.split("/").pop();
    } catch (error) {
      return "";
    }
  }

  function guardProtectedLinks() {
    const links = document.querySelectorAll("a[href]");

    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (!href) return;

      const fileName = getPageFileName(href);
      if (!PROTECTED_PAGES.includes(fileName)) return;
      if (link.dataset.authGuarded === "true") return;
      link.dataset.authGuarded = "true";

      link.addEventListener("click", async function (event) {
        event.preventDefault();

        if (!authReady) {
          await authReadyPromise;
        }

        if (currentAuthUser) {
          window.location.href = href;
          return;
        }

        window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(fileName)}`;
      });
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

  window.HelpPerfil = {
    getUser,
    saveUser,
    clearUser,
    requireCadastro,
    prefillFormById,
    setupAuthProfileButton
  };

  document.addEventListener("DOMContentLoaded", function () {
    setupAuthProfileButton();
    guardProtectedLinks();
  });
})();
