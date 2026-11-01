import { db, auth, googleProvider, ADMIN_EMAIL } from "./firebase.js";
import {
  ref, onValue, update, remove
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import {
  signInWithPopup, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const loginPanel = document.querySelector("#login-panel");
const dashboard = document.querySelector("#dashboard");
const loginButton = document.querySelector("#google-login");
const loginStatus = document.querySelector("#login-status");
const adminEmail = document.querySelector("#admin-email");
const logoutButton = document.querySelector("#logout-button");
const list = document.querySelector("#message-list");
const searchInput = document.querySelector("#search-input");
const filterSelect = document.querySelector("#filter-select");
const dashboardStatus = document.querySelector("#dashboard-status");

let allMessages = [];
let stopListening = null;

loginButton.addEventListener("click", async () => {
  loginButton.disabled = true;
  setStatus(loginStatus, "正在開啟 Google 登入……");
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if ((result.user.email || "").toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      await signOut(auth);
      setStatus(loginStatus, "這個 Google 帳號沒有管理權限。", "error");
    }
  } catch (error) {
    console.error("Login failed:", error);
    setStatus(loginStatus, "登入失敗，請確認已啟用 Google Authentication，並已將目前網域加入授權網域。", "error");
  } finally {
    loginButton.disabled = false;
  }
});

logoutButton.addEventListener("click", async () => {
  try { await signOut(auth); }
  catch (error) { setStatus(dashboardStatus, "登出失敗，請再試一次。", "error"); }
});

onAuthStateChanged(auth, (user) => {
  if (stopListening) {
    stopListening();
    stopListening = null;
  }
  allMessages = [];
  if (user && (user.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase() && user.emailVerified) {
    loginPanel.hidden = true;
    dashboard.hidden = false;
    adminEmail.textContent = user.email;
    stopListening = onValue(ref(db, "messages"), (snapshot) => {
      const data = snapshot.val() || {};
      allMessages = Object.entries(data).map(([id, value]) => ({ id, ...value }))
        .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      render();
    }, (error) => {
      console.error("Database read failed:", error);
      setStatus(dashboardStatus, "無法讀取留言。請檢查 Realtime Database 規則及管理者帳號。", "error");
    });
  } else {
    dashboard.hidden = true;
    loginPanel.hidden = false;
    if (user) setStatus(loginStatus, "目前登入的帳號不是已授權的管理者。", "error");
  }
});

searchInput.addEventListener("input", render);
filterSelect.addEventListener("change", render);

function render() {
  const unread = allMessages.filter(m => m.status !== "read").length;
  document.querySelector("#total-count").textContent = allMessages.length;
  document.querySelector("#unread-count").textContent = unread;
  document.querySelector("#read-count").textContent = allMessages.length - unread;

  const query = searchInput.value.trim().toLocaleLowerCase();
  const filter = filterSelect.value;
  const visible = allMessages.filter(message => {
    const isRead = message.status === "read";
    const matchesFilter = filter === "all" || (filter === "read" ? isRead : !isRead);
    return matchesFilter && String(message.content || "").toLocaleLowerCase().includes(query);
  });

  list.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = allMessages.length ? "沒有符合條件的留言。" : "目前還沒有收到留言。";
    list.append(empty);
    return;
  }

  for (const message of visible) {
    const article = document.createElement("article");
    article.className = "message-item";

    const top = document.createElement("div");
    top.className = "message-item-top";
    const date = document.createElement("time");
    date.className = "message-meta";
    const timestamp = Number(message.createdAt || 0);
    date.textContent = timestamp ? new Date(timestamp).toLocaleString("zh-TW") : "時間未知";
    const pill = document.createElement("span");
    const isRead = message.status === "read";
    pill.className = `status-pill ${isRead ? "read" : ""}`;
    pill.textContent = isRead ? "已讀" : "未讀";
    top.append(date, pill);

    const content = document.createElement("p");
    content.className = "message-content";
    content.textContent = String(message.content || "");

    const actions = document.createElement("div");
    actions.className = "message-actions";
    const readButton = document.createElement("button");
    readButton.type = "button";
    readButton.className = "button-secondary";
    readButton.textContent = isRead ? "標記未讀" : "標記已讀";
    readButton.addEventListener("click", () => changeStatus(message.id, isRead ? "unread" : "read"));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete-button";
    deleteButton.textContent = "刪除留言";
    deleteButton.addEventListener("click", () => deleteMessage(message.id));

    actions.append(readButton, deleteButton);
    article.append(top, content, actions);
    list.append(article);
  }
}

async function changeStatus(id, status) {
  try {
    await update(ref(db, `messages/${id}`), { status });
    setStatus(dashboardStatus, "留言狀態已更新。", "success");
  } catch (error) {
    console.error(error);
    setStatus(dashboardStatus, "更新失敗，請確認管理者權限。", "error");
  }
}

async function deleteMessage(id) {
  if (!window.confirm("確定要永久刪除這則留言嗎？此操作無法復原。")) return;
  try {
    await remove(ref(db, `messages/${id}`));
    setStatus(dashboardStatus, "留言已刪除。", "success");
  } catch (error) {
    console.error(error);
    setStatus(dashboardStatus, "刪除失敗，請確認管理者權限。", "error");
  }
}

function setStatus(element, message, type = "") {
  element.textContent = message;
  element.className = `form-status ${type}`;
}
