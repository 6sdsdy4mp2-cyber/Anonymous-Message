
import { db, auth } from "./firebase.js";
import {
  ref, push, set, update, onValue, serverTimestamp, query, orderByChild, limitToLast
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const form = document.querySelector("#message-form");
const textarea = document.querySelector("#message");
const counter = document.querySelector("#counter");
const button = document.querySelector("#submit-button");
const status = document.querySelector("#form-status");
const feed = document.querySelector("#public-feed");
const feedStatus = document.querySelector("#feed-status");
const count = document.querySelector("#public-count");
const wallCount = document.querySelector("#wall-count");
const radios = [...document.querySelectorAll('input[name="visibility"]')];

radios.forEach(radio => radio.addEventListener("change", syncVisibility));
syncVisibility();

function syncVisibility() {
  document.querySelector("#private-option").classList.toggle(
    "selected",
    document.querySelector('input[value="private"]').checked
  );
  document.querySelector("#public-option").classList.toggle(
    "selected",
    document.querySelector('input[value="public"]').checked
  );
}

textarea.addEventListener("input", () => {
  counter.textContent = `${textarea.value.length} / 2000`;
});

// 匿名留言提交
form.addEventListener("submit", async event => {
  event.preventDefault();

  const content = textarea.value.trim();
  const visibility = document.querySelector(
    'input[name="visibility"]:checked'
  ).value;

  if (!content) return showStatus("請先寫下一段留言。", "error");
  if (content.length > 2000) {
    return showStatus("留言不可超過 2000 個字元。", "error");
  }

  button.disabled = true;
  button.textContent = "正在送出……";
  showStatus("");

  try {
    // 等待 Firebase 登入狀態初始化
    await auth.authStateReady();

    // 訪客自動匿名登入
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    const messageRef = push(ref(db, "messages"));
    const id = messageRef.key;
    const stamp = serverTimestamp();

    const writes = {
      [`messages/${id}`]: {
        content,
        createdAt: stamp,
        visibility
      }
    };

    // 公開留言同步加入公開留言牆
    if (visibility === "public") {
      writes[`publicPosts/${id}`] = {
        content,
        createdAt: stamp
      };
    }

    await update(ref(db), writes);

    form.reset();
    syncVisibility();
    counter.textContent = "0 / 2000";

    showStatus(
      visibility === "public"
        ? "公開留言已送出！它現在會出現在下方留言牆。"
        : "私人留言已安全送出，只有管理員可以查看。",
      "success"
    );

  } catch (error) {
    console.error("Message submission failed:", error);
    showStatus(
      "送出失敗。請稍後再試；若問題持續，請確認 Firebase Rules 已更新。",
      "error"
    );
  } finally {
    button.disabled = false;
    button.innerHTML = '匿名送出 <span aria-hidden="true">↗</span>';
  }
});

// 即時讀取公開留言
onValue(
  query(
    ref(db, "publicPosts"),
    orderByChild("createdAt"),
    limitToLast(100)
  ),
  snapshot => {
    const posts = Object.entries(snapshot.val() || {})
      .map(([id, post]) => ({ id, ...post }))
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

    count.textContent = posts.length;
    wallCount.textContent = `${posts.length} 則`;

    renderFeed(posts);
  },
  error => {
    console.error(error);
    feed.innerHTML =
      '<div class="empty-state">暫時無法載入公開留言。</div>';
    feedStatus.textContent = "請稍後重新整理頁面。";
  }
);

// 建立公開留言卡片
function renderFeed(posts) {
  feed.replaceChildren();

  if (!posts.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML =
      '<span class="empty-spark">✧</span><b>還沒有公開分享</b><span>成為第一個分享心情的人吧。</span>';
    feed.append(empty);
    return;
  }

  for (const post of posts) {
    const card = document.createElement("article");
    card.className = "feed-card";

    const top = document.createElement("div");
    top.className = "feed-card-top";

    const avatar = document.createElement("div");
    avatar.className = "anonymous-avatar";
    avatar.textContent = "✳";

    const identity = document.createElement("div");
    identity.className = "feed-identity";

    const name = document.createElement("b");
    name.textContent = "匿名分享者";

    const time = document.createElement("time");
    time.textContent = formatDate(post.createdAt);

    identity.append(name, time);

    const publicTag = document.createElement("span");
    publicTag.className = "public-tag";
    publicTag.textContent = "公開";

    top.append(avatar, identity, publicTag);

    const body = document.createElement("p");
    body.className = "feed-content";
    body.textContent = String(post.content || "");

    const bottom = document.createElement("div");
    bottom.className = "feed-bottom";

    const like = document.createElement("button");
    like.type = "button";
    like.className = "like-button";

    const likes = post.likes || {};
    const likeCount = Object.keys(likes).length;

    const alreadyLiked = Boolean(
      auth.currentUser && likes[auth.currentUser.uid]
    );

    if (alreadyLiked) like.classList.add("liked");

    like.disabled = alreadyLiked;

    like.innerHTML = `
      <span class="heart">${alreadyLiked ? "♥" : "♡"}</span>
      <span>${likeCount}</span>
      <span class="like-label">${alreadyLiked ? "已讚" : "讚"}</span>
    `;

    like.addEventListener("click", () => likePost(post.id, like));

    bottom.append(like);
    card.append(top, body, bottom);
    feed.append(card);
  }
}

// 公開留言按讚
async function likePost(postId, buttonEl) {
  buttonEl.disabled = true;

  try {
    await auth.authStateReady();

    let user = auth.currentUser;

    if (!user) {
      const result = await signInAnonymously(auth);
      user = result.user;
    }

    if (!user.isAnonymous) {
      throw new Error("Like action requires anonymous auth.");
    }

    await set(
      ref(db, `publicPosts/${postId}/likes/${user.uid}`),
      true
    );

    buttonEl.classList.add("liked");
    buttonEl.querySelector(".heart").textContent = "♥";
    buttonEl.querySelector(".like-label").textContent = "已讚";

  } catch (error) {
    console.error("Like failed:", error);

    feedStatus.textContent =
      error.code === "PERMISSION_DENIED"
        ? "按讚功能尚未啟用，請管理員啟用 Firebase 匿名登入並更新資料庫規則。"
        : "按讚失敗，請稍後再試。";

  } finally {
    if (!buttonEl.classList.contains("liked")) {
      buttonEl.disabled = false;
    }
  }
}

// 日期格式
function formatDate(value) {
  const n = Number(value || 0);

  return n
    ? new Date(n).toLocaleString("zh-TW", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "剛剛";
}

// 顯示送出狀態
function showStatus(message, type = "") {
  status.textContent = message;
  status.className = `form-status ${type}`;
}
