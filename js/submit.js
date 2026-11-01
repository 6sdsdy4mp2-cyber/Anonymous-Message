import { db } from "./firebase.js";
import { ref, push, set, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

const form = document.querySelector("#message-form");
const textarea = document.querySelector("#message");
const counter = document.querySelector("#counter");
const button = document.querySelector("#submit-button");
const status = document.querySelector("#form-status");

textarea.addEventListener("input", () => {
  counter.textContent = `${textarea.value.length} / 2000`;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = textarea.value.trim();

  if (!content) {
    showStatus("請先寫下一段留言。", "error");
    return;
  }
  if (content.length > 2000) {
    showStatus("留言不可超過 2000 個字元。", "error");
    return;
  }

  button.disabled = true;
  button.textContent = "正在送出……";
  showStatus("");

  try {
    const newMessageRef = push(ref(db, "messages"));
    await set(newMessageRef, {
      content,
      createdAt: serverTimestamp()
    });
    form.reset();
    counter.textContent = "0 / 2000";
    showStatus("留言已匿名送出，謝謝你願意分享。", "success");
  } catch (error) {
    console.error("Message submission failed:", error);
    showStatus("送出失敗，請稍後再試。如果問題持續，請聯絡網站管理者。", "error");
  } finally {
    button.disabled = false;
    button.innerHTML = '匿名送出 <span aria-hidden="true">↗</span>';
  }
});

function showStatus(message, type = "") {
  status.textContent = message;
  status.className = `form-status ${type}`;
}
