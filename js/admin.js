import { db, auth, googleProvider, ADMIN_EMAIL } from "./firebase.js";
import { ref, onValue, update, remove } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import { signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const $ = selector => document.querySelector(selector);
const loginPanel=$("#login-panel"), dashboard=$("#dashboard"), loginButton=$("#google-login");
const loginStatus=$("#login-status"), adminEmail=$("#admin-email"), logoutButton=$("#logout-button");
const list=$("#message-list"), searchInput=$("#search-input"), filterSelect=$("#filter-select"), dashboardStatus=$("#dashboard-status");
let allMessages=[], stopListening=null;

loginButton.addEventListener("click", async()=>{
  loginButton.disabled=true; setStatus(loginStatus,"正在開啟 Google 登入……");
  try {
    const result=await signInWithPopup(auth,googleProvider);
    if((result.user.email||"").toLowerCase()!==ADMIN_EMAIL.toLowerCase()){await signOut(auth);setStatus(loginStatus,"這個 Google 帳號沒有管理權限。","error");}
  } catch(error){console.error(error);setStatus(loginStatus,"登入失敗，請確認 Google 登入及 GitHub Pages 授權網域。","error");}
  finally{loginButton.disabled=false;}
});
logoutButton.addEventListener("click",async()=>{try{await signOut(auth);}catch(e){setStatus(dashboardStatus,"登出失敗。","error");}});
onAuthStateChanged(auth,user=>{
  if(stopListening){stopListening();stopListening=null;} allMessages=[];
  if(user&&(user.email||"").toLowerCase()===ADMIN_EMAIL.toLowerCase()&&user.emailVerified){
    loginPanel.hidden=true;dashboard.hidden=false;adminEmail.textContent=user.email;
    stopListening=onValue(ref(db,"messages"),snap=>{
      allMessages=Object.entries(snap.val()||{}).map(([id,value])=>({id,...value})).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));render();
    },err=>{console.error(err);setStatus(dashboardStatus,"無法讀取留言，請檢查資料庫安全規則。","error");});
  }else{dashboard.hidden=true;loginPanel.hidden=false;if(user)setStatus(loginStatus,"目前帳號不是已授權的管理者。","error");}
});
searchInput.addEventListener("input",render);filterSelect.addEventListener("change",render);

function render(){
  const unread=allMessages.filter(m=>m.status!=="read").length;
  $("#total-count").textContent=allMessages.length;
  $("#public-count").textContent=allMessages.filter(m=>m.visibility==="public").length;
  $("#private-count").textContent=allMessages.filter(m=>m.visibility!=="public").length;
  $("#unread-count").textContent=unread;
  const q=searchInput.value.trim().toLocaleLowerCase(), f=filterSelect.value;
  const visible=allMessages.filter(m=>{
    const isRead=m.status==="read", isPublic=m.visibility==="public";
    const match=f==="all"||(f==="public"&&isPublic)||(f==="private"&&!isPublic)||(f==="read"&&isRead)||(f==="unread"&&!isRead);
    return match&&String(m.content||"").toLocaleLowerCase().includes(q);
  });
  list.replaceChildren();
  if(!visible.length){const e=document.createElement("div");e.className="empty-state";e.textContent=allMessages.length?"沒有符合條件的留言。":"目前還沒有收到留言。";list.append(e);return;}
  for(const m of visible){
    const article=document.createElement("article");article.className="message-item";
    const top=document.createElement("div");top.className="message-item-top";
    const date=document.createElement("time");date.className="message-meta";date.textContent=m.createdAt?new Date(Number(m.createdAt)).toLocaleString("zh-TW"):"時間未知";
    const tags=document.createElement("div");tags.className="admin-tags";
    const visibility=document.createElement("span");visibility.className=`status-pill ${m.visibility==="public"?"published":""}`;visibility.textContent=m.visibility==="public"?"公開":"私人";
    const read=document.createElement("span");read.className=`status-pill ${m.status==="read"?"read":""}`;read.textContent=m.status==="read"?"已讀":"未讀";
    tags.append(visibility,read);top.append(date,tags);
    const content=document.createElement("p");content.className="message-content";content.textContent=String(m.content||"");
    const actions=document.createElement("div");actions.className="message-actions";
    const readBtn=document.createElement("button");readBtn.type="button";readBtn.className="button-secondary";readBtn.textContent=m.status==="read"?"標記未讀":"標記已讀";readBtn.addEventListener("click",()=>changeStatus(m.id,m.status==="read"?"unread":"read"));
    const publishBtn=document.createElement("button");publishBtn.type="button";publishBtn.className="button-secondary";publishBtn.textContent=m.visibility==="public"?"改為私人":"發布到留言牆";publishBtn.addEventListener("click",()=>changeVisibility(m,m.visibility==="public"?"private":"public"));
    const del=document.createElement("button");del.type="button";del.className="delete-button";del.textContent="刪除";del.addEventListener("click",()=>deleteMessage(m.id));
    actions.append(readBtn,publishBtn,del);article.append(top,content,actions);list.append(article);
  }
}
async function changeStatus(id,status){try{await update(ref(db,`messages/${id}`),{status});setStatus(dashboardStatus,"留言狀態已更新。","success");}catch(e){console.error(e);setStatus(dashboardStatus,"更新失敗，請檢查管理者權限。","error");}}
async function changeVisibility(m,visibility){
  try{
    const updates={[`messages/${m.id}/visibility`]:visibility};
    updates[`publicPosts/${m.id}`]=visibility==="public"?{content:m.content,createdAt:m.createdAt||Date.now()}:null;
    await update(ref(db),updates);setStatus(dashboardStatus,visibility==="public"?"已發布到公開留言牆。":"已從公開留言牆移除，改為私人。","success");
  }catch(e){console.error(e);setStatus(dashboardStatus,"修改公開狀態失敗，請檢查資料庫安全規則。","error");}
}
async function deleteMessage(id){if(!confirm("確定永久刪除這則留言？"))return;try{const updates={[`messages/${id}`]:null,[`publicPosts/${id}`]:null};await update(ref(db),updates);setStatus(dashboardStatus,"留言已刪除。","success");}catch(e){console.error(e);setStatus(dashboardStatus,"刪除失敗。","error");}}
function setStatus(el,msg,type=""){el.textContent=msg;el.className=`form-status ${type}`;}