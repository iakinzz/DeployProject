/** Trevo SPA — código organizado e preparado para API REST. */

const CONFIG = {
  apiMode: "mock", // Mude para "api" ao conectar o servidor.
  apiBaseUrl: window.TREVO_API_URL || "http://localhost:3000/api/v1",
  storagePrefix: "trevo-",
};

const seed = {
  user: null,
  albums: [{ id: 1, name: "Boas-vindas", description: "Seu primeiro álbum no Trevo", emoji: "🌿" }],
  categories: [{ id: 1, name: "Momentos especiais", emoji: "📸" }],
  trash: [],
  comments: [
    { id: 1, author: "Maria", text: "Que lembrança linda! 💚" },
    { id: 2, author: "João", text: "Adorei essa foto." },
  ],
};

// Storage ---------------------------------------------------------------------
const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(`${CONFIG.storagePrefix}${key}`);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(`${CONFIG.storagePrefix}${key}`, JSON.stringify(value)); },
  remove(key) { localStorage.removeItem(`${CONFIG.storagePrefix}${key}`); },
};

const state = {
  user: storage.get("user", seed.user),
  albums: storage.get("albums", seed.albums),
  categories: storage.get("categories", seed.categories),
  trash: storage.get("trash", seed.trash),
  comments: storage.get("comments", seed.comments),
  theme: localStorage.getItem("trevo-theme") || "light",
};

function save() {
  ["user", "albums", "categories", "trash", "comments"].forEach((key) => storage.set(key, state[key]));
}

// API -------------------------------------------------------------------------
// Centralize aqui todas as chamadas HTTP; a lista completa está em BACKEND.md.
const api = {
  enabled: CONFIG.apiMode === "api",
  async request(path, { method = "GET", body, headers = {} } = {}) {
    const token = storage.get("token", null);
    const response = await fetch(`${CONFIG.apiBaseUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }), ...headers },
      ...(body && { body: JSON.stringify(body) }),
    });
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || "Não foi possível concluir a solicitação.");
    return data;
  },
  auth: {
    login: (login, password) => api.request("/auth/login", { method: "POST", body: { login, password } }),
    register: (name, email, password) => api.request("/auth/register", { method: "POST", body: { name, email, password } }),
    forgot: (contact) => api.request("/auth/forgot-password", { method: "POST", body: { contact } }),
    reset: (token, password) => api.request("/auth/reset-password", { method: "POST", body: { token, password } }),
  },
  albums: {
    list: () => api.request("/albums"),
    create: (body) => api.request("/albums", { method: "POST", body }),
    update: (id, body) => api.request(`/albums/${id}`, { method: "PATCH", body }),
    remove: (id) => api.request(`/albums/${id}`, { method: "DELETE" }),
  },
  categories: {
    list: (albumId) => api.request(`/albums/${albumId}/categories`),
    create: (albumId, body) => api.request(`/albums/${albumId}/categories`, { method: "POST", body }),
    update: (id, body) => api.request(`/categories/${id}`, { method: "PATCH", body }),
    remove: (id) => api.request(`/categories/${id}`, { method: "DELETE" }),
  },
  comments: {
    list: (categoryId) => api.request(`/categories/${categoryId}/comments`),
    create: (categoryId, text) => api.request(`/categories/${categoryId}/comments`, { method: "POST", body: { text } }),
    remove: (id) => api.request(`/comments/${id}`, { method: "DELETE" }),
  },
  profile: { get: () => api.request("/me"), update: (body) => api.request("/me", { method: "PATCH", body }) },
};

// UI helpers ------------------------------------------------------------------
const app = document.querySelector("#app");
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const route = () => location.hash.slice(1) || "/login";
const go = (path) => { location.hash = path; };
const closeModal = () => document.querySelector("#modal-backdrop")?.remove();

function toast(message) {
  const element = document.querySelector("#toast");
  element.textContent = message;
  element.classList.add("show");
  setTimeout(() => element.classList.remove("show"), 2600);
}

function clover(className = "") {
  const asset = state.theme === "dark" ? "assets/trevo-escuro-transparente.png" : "assets/trevo-claro-transparente.png";
  return `<img class="clover-icon ${className}" src="${asset}" alt="" aria-hidden="true">`;
}

function shell(content) {
  app.innerHTML = `<nav class="topbar">
    <button class="icon-btn back-btn" aria-label="Voltar" onclick="back()">←</button>
    <a class="brand" href="#/home">${clover("brand-clover")} Trevo</a>
    <input class="search" placeholder="Pesquisar álbuns, fotos ou categorias" aria-label="Pesquisar">
    <div class="nav-actions"><button class="icon-btn" onclick="go('/trash')">🗑</button><button class="icon-btn" onclick="go('/profile')">♙</button><button class="icon-btn" onclick="toggleTheme()">${state.theme === "dark" ? "☀" : "☾"}</button></div>
  </nav>${content}`;
}

function authLayout(title, fields, action, footer, art = '<img class="auth-clover" src="assets/logo-trevo-transparente.png" alt="Símbolo do Trevo">') {
  app.innerHTML = `<section class="auth-page"><div class="auth-box"><div class="auth-art">${art}</div><form class="auth-form" id="auth-form"><h1>${title}</h1>${fields}<p id="form-error" class="error" hidden></p><button class="btn" type="submit">${action}</button><p class="auth-links">${footer}</p></form></div></section>`;
}

function showFormError(message) {
  const error = document.querySelector("#form-error");
  error.textContent = message;
  error.hidden = false;
}

// Auth pages ------------------------------------------------------------------
function login() {
  authLayout("Bem-vindo ao Trevo", '<label class="field">E-mail, telefone ou usuário<input required name="login" placeholder="Digite seu acesso"></label><label class="field">Senha<input required name="password" type="password" placeholder="Digite sua senha"></label><a href="#/forgot">Esqueceu a senha?</a>', "Entrar", 'Não possui conta? <a href="#/signup">Cadastre-se gratuitamente</a>', '<img class="login-logo" src="assets/logo-login-transparente.png" alt="Logo do Trevo">');
  document.querySelector("#auth-form").onsubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      const result = api.enabled ? await api.auth.login(form.login.value, form.password.value) : { user: { name: "Visitante", email: form.login.value } };
      if (result.token) storage.set("token", result.token);
      state.user = result.user || result;
      save(); go("/home");
    } catch (error) { showFormError(error.message); }
  };
}

function signup() {
  authLayout("Crie sua conta", '<label class="field">Nome<input required name="name" placeholder="Seu nome"></label><label class="field">E-mail<input required name="email" type="email" placeholder="voce@email.com"></label><label class="field">Senha<input required minlength="6" name="password" type="password" placeholder="Mínimo de 6 caracteres"></label><label class="field">Confirmar senha<input required name="confirm" type="password" placeholder="Repita a senha"></label>', "Cadastrar", 'Já tem conta? <a href="#/login">Entrar</a>');
  document.querySelector("#auth-form").onsubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.password.value !== form.confirm.value) return showFormError("As senhas precisam ser iguais.");
    try {
      const result = api.enabled ? await api.auth.register(form.name.value, form.email.value, form.password.value) : { user: { name: form.name.value, email: form.email.value } };
      if (result.token) storage.set("token", result.token);
      state.user = result.user || result;
      save(); toast("Conta criada com sucesso!"); go("/home");
    } catch (error) { showFormError(error.message); }
  };
}

function forgot() {
  authLayout("Recuperar senha", '<label class="field">E-mail ou telefone<input required name="contact" placeholder="voce@email.com ou (00) 00000-0000"></label><p>Enviaremos um código para confirmar sua identidade.</p>', "Enviar código", '<a href="#/login">Voltar ao login</a>');
  document.querySelector("#auth-form").onsubmit = (event) => { event.preventDefault(); toast("Código enviado!"); go("/reset"); };
}

function reset() {
  authLayout("Criar nova senha", '<label class="field">Nova senha<input required minlength="6" name="password" type="password"></label><label class="field">Confirmar senha<input required name="confirm" type="password"></label>', "Alterar senha", "");
  document.querySelector("#auth-form").onsubmit = (event) => { event.preventDefault(); if (event.currentTarget.password.value !== event.currentTarget.confirm.value) return showFormError("As senhas precisam ser iguais."); toast("Senha alterada com sucesso!"); go("/login"); };
}

// Application pages -----------------------------------------------------------
function cover(item) {
  return item.photo ? `<img src="${escapeHtml(item.photo)}" alt="Capa do álbum ${escapeHtml(item.name)}">` : state.theme === "light" ? '<img class="album-clover" src="assets/trevo-home-claro.png" alt="Trevo de quatro folhas">' : clover("album-clover");
}

function albumCard(item) {
  return `<article class="card"><div class="cover">${cover(item)}</div><div class="card-body"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description || "Sem descrição")}</p><div class="card-footer"><button class="btn secondary" onclick="go('/album/${item.id}')">Abrir</button><button class="menu-btn" onclick="openAlbumMenu(${item.id})" aria-label="Opções do álbum">•••</button></div></div></article>`;
}

function home() {
  const art = state.theme === "light" ? '<img class="home-light-clover" src="assets/trevo-home-claro.png" alt="Trevo de quatro folhas">' : clover("hero-clover");
  shell(`<section class="page"><div class="page-head"><div><h1>Página inicial</h1><p>Organize suas memórias no seu próprio Trevo.</p></div><button class="btn" onclick="openModal('album')">＋ Criar álbum</button></div><div class="grid">${state.albums.map(albumCard).join("")}</div><section class="hero"><div class="welcome"><h1>Suas histórias começam aqui.</h1><p>Crie álbuns, adicione fotos, convide colaboradores e compartilhe os momentos que importam.</p></div><div class="clover-art">${art}</div></section></section>`);
}

function album() {
  const selected = state.albums.find((item) => item.id === Number(route().split("/").pop())) || state.albums[0];
  shell(`<section class="page"><div class="page-head"><div><h1>${escapeHtml(selected.name)}</h1><p>${escapeHtml(selected.description || "")}</p></div><button class="btn" onclick="openModal('category')">＋ Categoria</button></div><div class="grid">${state.categories.map((item) => `<article class="card"><div class="cover">${cover(item)}</div><div class="card-body"><h3>${escapeHtml(item.name)}</h3><div class="card-footer"><button class="btn secondary" onclick="go('/comments/${item.id}')">Abrir</button><button class="menu-btn" onclick="openCategoryMenu(${item.id})">•••</button></div></div></article>`).join("")}</div></section>`);
}

function comments() {
  shell(`<section class="page"><div class="page-head"><h1>Momentos especiais</h1><button class="btn" onclick="openModal('photo')">＋ Adicionar fotos e vídeos</button></div><div class="comment-layout"><div class="content-preview"><div class="cover">📷</div><h2>Foto da categoria</h2><p>Compartilhe seus registros com quem você convidar.</p></div><aside class="comments"><h2>Comentários</h2><div>${state.comments.length ? state.comments.map((item) => `<div class="comment"><div><b>${escapeHtml(item.author)}</b>${escapeHtml(item.text)}</div><button class="delete-comment" onclick="deleteComment(${item.id})">×</button></div>`).join("") : '<p class="no-comments">Ainda não há comentários.</p>'}</div><form class="comment-form" id="comment-form"><input required placeholder="Escreva um comentário..."><button class="btn">Enviar</button></form></aside></div></section>`);
  document.querySelector("#comment-form").onsubmit = (event) => { event.preventDefault(); state.comments.push({ id: Date.now(), author: state.user?.name || "Você", text: event.currentTarget.querySelector("input").value }); save(); router(); };
}

function profile() {
  const user = state.user || { name: "Visitante", email: "visitante@trevo.com" };
  shell(`<section class="page"><div class="page-head"><h1>Perfil</h1></div><form class="profile" id="profile-form"><div class="profile-main"><div class="stats"><div>${state.albums.length}<br><small>Álbuns</small></div><div>${state.categories.length}<br><small>Categorias</small></div><div>0<br><small>Fotos</small></div></div><label class="field">Apelido<input name="name" value="${escapeHtml(user.name)}"></label><label class="field">Biografia<textarea name="bio" placeholder="Conte um pouco sobre você">${escapeHtml(user.bio || "")}</textarea></label><button class="btn">Salvar alterações</button> <button type="button" class="btn danger" onclick="deleteAccount()">Excluir conta</button></div><div class="profile-photo"><div class="avatar"><img src="assets/logo-trevo-transparente.png" alt="Símbolo do Trevo"></div><h2>${escapeHtml(user.name)}</h2></div></form></section>`);
  document.querySelector("#profile-form").onsubmit = (event) => { event.preventDefault(); state.user = { ...user, name: event.currentTarget.name.value, bio: event.currentTarget.bio.value }; save(); toast("Perfil atualizado!"); };
}

function trash() {
  const cards = state.trash.map((item) => `<article class="card"><div class="cover">${cover(item)}</div><div class="card-body"><h3>${escapeHtml(item.name)}</h3><p>Item excluído</p><div class="trash-actions"><button class="btn secondary" onclick="restoreItem(${item.id})">↶ Restaurar</button><button class="menu-btn" onclick="permanentlyDelete(${item.id})">🗑</button></div></div></article>`).join("");
  shell(`<section class="page"><div class="page-head"><div><h1>Lixeira</h1><p>Itens excluídos podem ser restaurados.</p></div>${state.trash.length ? '<button class="btn danger" onclick="emptyTrash()">Esvaziar lixeira</button>' : ""}</div>${cards ? `<div class="grid">${cards}</div>` : `<div class="empty"><div class="empty-icon">${clover("empty-clover")}</div><h2>Não há itens na lixeira</h2><p>Álbuns, categorias e fotos excluídos aparecerão aqui.</p></div>`}</section>`);
}

// Mutations and modal ---------------------------------------------------------
function openModal(kind, id) {
  const list = kind === "album" ? state.albums : state.categories;
  const item = list.find?.((entry) => entry.id === id);
  const isPhoto = kind === "photo";
  const label = kind === "album" ? "álbum" : kind === "category" ? "categoria" : "foto";
  const body = `<form id="modal-form"><label class="field">${label[0].toUpperCase() + label.slice(1)}<input name="name" required value="${escapeHtml(item?.name || "")}" placeholder="Nome do ${label}"></label>${isPhoto ? '<label class="field">Escolher arquivo<input name="file" type="file" accept="image/*,video/*" required></label>' : ""}${kind === "album" ? `<label class="field">Descrição<textarea name="description">${escapeHtml(item?.description || "")}</textarea></label>` : ""}<label class="field">Ícone<input name="emoji" value="${item?.emoji || "🌿"}" maxlength="2"></label><div class="modal-actions"><button type="button" class="btn outline" onclick="closeModal()">Cancelar</button><button class="btn">Salvar</button></div></form>`;
  document.body.insertAdjacentHTML("beforeend", `<div class="modal-backdrop" id="modal-backdrop"><section class="modal" role="dialog" aria-modal="true"><header><strong>${item ? "Editar" : "Criar"}</strong><button class="icon-btn" onclick="closeModal()">×</button></header>${body}</section></div>`);
  document.querySelector("#modal-backdrop").onclick = (event) => { if (event.target.id === "modal-backdrop") closeModal(); };
  document.querySelector("#modal-form").onsubmit = (event) => { event.preventDefault(); if (isPhoto) { toast("Upload: POST /categories/:categoryId/media"); return closeModal(); } const data = Object.fromEntries(new FormData(event.currentTarget)); if (item) Object.assign(item, data); else list.push({ id: Date.now(), ...data }); save(); closeModal(); toast(`${label[0].toUpperCase() + label.slice(1)} salvo com sucesso!`); router(); };
}

function openDeleteMenu(type, id) {
  const list = type === "album" ? state.albums : state.categories;
  const item = list.find((entry) => entry.id === id);
  if (!item) return;
  document.body.insertAdjacentHTML("beforeend", `<div class="modal-backdrop" id="modal-backdrop"><section class="modal action-menu"><header><strong>Opções do ${type}</strong><button class="icon-btn" onclick="closeModal()">×</button></header><div class="modal-content"><h2>${escapeHtml(item.name)}</h2><button class="menu-action danger-action" onclick="moveToTrash('${type}', ${id})">🗑 Excluir ${type}</button></div></section></div>`);
}

function moveToTrash(type, id) {
  const list = type === "album" ? state.albums : state.categories;
  const item = list.find((entry) => entry.id === id);
  if (!item) return;
  state.trash.push({ ...item, type });
  list.splice(list.indexOf(item), 1);
  save(); closeModal(); toast(`${type === "album" ? "Álbum" : "Categoria"} movido para a lixeira.`); go("/home");
}

function restoreItem(id) { const item = state.trash.find((entry) => entry.id === id); if (!item) return; (item.type === "album" ? state.albums : state.categories).push(item); state.trash = state.trash.filter((entry) => entry.id !== id); save(); router(); }
function permanentlyDelete(id) { if (confirm("Excluir este item permanentemente?")) { state.trash = state.trash.filter((entry) => entry.id !== id); save(); router(); } }
function emptyTrash() { if (confirm("Deseja esvaziar a lixeira?")) { state.trash = []; save(); router(); } }
function deleteComment(id) { if (confirm("Excluir este comentário?")) { state.comments = state.comments.filter((entry) => entry.id !== id); save(); router(); } }
function deleteAccount() { if (confirm("Deseja realmente excluir sua conta?")) { state.user = null; storage.remove("token"); save(); go("/login"); } }
function openAlbumMenu(id) { openDeleteMenu("album", id); }
function openCategoryMenu(id) { openDeleteMenu("categoria", id); }
function back() { route() === "/home" ? go("/login") : history.back(); }
function toggleTheme() { state.theme = state.theme === "dark" ? "light" : "dark"; localStorage.setItem("trevo-theme", state.theme); document.body.classList.toggle("dark", state.theme === "dark"); router(); }

function router() {
  const pages = { "/login": login, "/signup": signup, "/forgot": forgot, "/reset": reset, "/home": home, "/profile": profile, "/trash": trash };
  if (route().startsWith("/album/")) return album();
  if (route().startsWith("/comments/")) return comments();
  (pages[route()] || (() => go(state.user ? "/home" : "/login")))();
}

Object.assign(window, { back, closeModal, deleteAccount, deleteComment, emptyTrash, go, moveToTrash, openAlbumMenu, openCategoryMenu, openModal, permanentlyDelete, restoreItem, toggleTheme });
document.body.classList.toggle("dark", state.theme === "dark");
window.addEventListener("hashchange", router);
router();
