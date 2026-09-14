const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
let currentType="", timer;

function toast(msg){
  const t=$("#toast");t.textContent=msg;t.classList.add("show");
  clearTimeout(timer);timer=setTimeout(()=>t.classList.remove("show"),2800);
}
function esc(s=""){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
async function api(url,opts={}){
  const r=await fetch(url,{headers:{"Content-Type":"application/json",...(opts.headers||{})},...opts});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error||"Something went wrong");
  return data;
}
function coverStyle(w){
  const maps={"cover-coast":"linear-gradient(145deg,#b85d2f,#f2b65b)","cover-ghosts":"linear-gradient(145deg,#25285e,#d75a55)","cover-archive":"linear-gradient(145deg,#195f59,#9bc56a)"};
  return maps[w.cover]||`linear-gradient(145deg,${w.accent},#333)`;
}
function renderWorks(works){
  const box=$("#works");
  if(!works.length){box.innerHTML=`<div style="grid-column:1/-1;padding:60px;text-align:center;color:#777">No worlds found. Try another search.</div>`;return;}
  box.innerHTML=works.map(w=>`
  <article class="work-card">
    <div class="cover" style="background:${coverStyle(w)}"><span class="cover-label">GEN / ${w.type.toUpperCase()}</span><strong class="cover-title">${esc(w.title)}</strong></div>
    <div class="work-info"><div class="work-meta"><span>${esc(w.author)}</span><span>${w.price?`₹${w.price}`:"FREE"}</span></div>
    <h3>${esc(w.title)}</h3><p>${esc(w.description)}</p>
    <div class="tags">${w.tags.slice(0,3).map(x=>`<span class="tag">${esc(x)}</span>`).join("")}</div>
    <div class="card-actions"><button class="small-btn primary" onclick="openWork('${esc(w.slug)}')">Open</button><button class="small-btn" onclick="favorite(${w.id})">♡ Save</button></div></div>
  </article>`).join("");
}
async function loadWorks(){
  const q=$("#search").value.trim();
  try{const d=await api(`/api/works?q=${encodeURIComponent(q)}&type=${encodeURIComponent(currentType)}`);renderWorks(d.works);}
  catch(e){toast(e.message)}
}
async function openWork(slug){
  try{
    const {work:w}=await api(`/api/works/${encodeURIComponent(slug)}`);
    openModal(`<p class="eyebrow">GEN / ${w.type.toUpperCase()}</p><h2>${esc(w.title)}</h2><p><b>By ${esc(w.author)}</b></p><p style="color:#6f7582">${esc(w.description)}</p>
    <div class="tags">${w.tags.map(x=>`<span class="tag">${esc(x)}</span>`).join("")}</div>
    <div class="modal-note" style="margin:22px 0">This preview is connected to the Gen/Visual reader. Paid works can be wired to a real payment provider before production.</div>
    <button class="btn btn-dark" onclick="startReader('${esc(w.slug)}')">Start reading →</button>`);
  }catch(e){toast(e.message)}
}
async function favorite(id){
  try{const d=await api(`/api/favorites/${id}`,{method:"POST"});toast(d.favorite?"Saved to your shelf":"Removed from your shelf");}
  catch(e){if(e.message==="Sign in required") openAuth("login"); else toast(e.message)}
}
function openModal(html){$("#modalContent").innerHTML=html;$("#modal").classList.remove("hidden")}
function closeModal(){$("#modal").classList.add("hidden")}
$("#closeModal").onclick=closeModal;$("#modal").onclick=e=>{if(e.target.id==="modal")closeModal()};
function openAuth(mode="login"){
 openModal(`<p class="eyebrow">YOUR SHELF</p><h2>${mode==="login"?"Welcome back.":"Make a home for stories."}</h2>
 <form class="form" id="authForm"><label>Email</label><input name="email" type="email" required placeholder="you@example.com">
 ${mode==="register"?'<label>Name</label><input name="name" required placeholder="Your name">':''}
 <label>Password</label><input name="password" type="password" minlength="8" required placeholder="At least 8 characters">
 <button class="btn btn-dark" type="submit">${mode==="login"?"Sign in":"Create account"}</button>
 <div class="modal-note">${mode==="login"?'Demo: demo@genvisual.local / Demo123!':'Your password is securely hashed on the server.'}</div>
 <button type="button" class="text-link" id="switchAuth">${mode==="login"?"Create a new account":"I already have an account"}</button></form>`);
 $("#switchAuth").onclick=()=>openAuth(mode==="login"?"register":"login");
 $("#authForm").onsubmit=async e=>{
   e.preventDefault();const body=Object.fromEntries(new FormData(e.target).entries());
   try{await api(`/api/auth/${mode==="login"?"login":"register"}`,{method:"POST",body:JSON.stringify(body)});closeModal();updateAccount();toast("Welcome to your shelf.");}
   catch(err){toast(err.message)}
 };
}
async function updateAccount(){
 try{const d=await api("/api/auth/me");$("#accountBtn").textContent=d.user?d.user.name.split(" ")[0]:"Sign in";$("#accountBtn").onclick=()=>d.user?accountPanel(d.user):openAuth("login");}
 catch{openAuth("login")}
}
function accountPanel(user){
 openModal(`<p class="eyebrow">MY SHELF</p><h2>${esc(user.name)}</h2><p>${esc(user.email)}</p><div class="card-actions"><button class="btn btn-dark" id="favShelf">Saved stories</button><button class="small-btn" id="logout">Sign out</button></div>`);
 $("#logout").onclick=async()=>{await api("/api/auth/logout",{method:"POST"});closeModal();updateAccount();toast("Signed out.")};
$("#favShelf").onclick=async()=>{try{const d=await api("/api/favorites");const list=d.works.length?d.works.map(w=>`<p><b>${esc(w.title)}</b> — ${esc(w.author)} <button class="text-link shelf-read" data-slug="${esc(w.slug)}">Read →</button></p>`).join(""):"<p>Your shelf is waiting.</p>";openModal(`<p class="eyebrow">MY SHELF</p><h2>Saved stories</h2>${list}`);$$(".shelf-read").forEach(b=>b.onclick=()=>startReader(b.dataset.slug))}catch(e){toast(e.message)}};
}
function startReader(slug){window.location.href=`/reader/?work=${encodeURIComponent(slug)}`}
function creatorStudio(){
 openModal(`<p class="eyebrow">CREATOR STUDIO</p><h2>Build your shelf.</h2><p>Publishing is available for creator accounts. This starter includes the workflow and database API; enable creator role for your account when you are ready.</p>
 <form class="form" id="creatorForm"><div class="split"><div><label>Title</label><input name="title" required></div><div><label>Type</label><select name="type"><option>novel</option><option>comic</option></select></div></div>
 <label>Description</label><textarea name="description"></textarea><div class="split"><div><label>Price (₹)</label><input name="price" type="number" min="0" value="0"></div><div><label>Tags</label><input name="tags" placeholder="mystery, fantasy"></div></div>
 <button class="btn btn-dark">Save draft</button></form>`);
 $("#creatorForm").onsubmit=async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.target).entries());b.tags=b.tags.split(",").map(x=>x.trim()).filter(Boolean);try{await api("/api/creator/works",{method:"POST",body:JSON.stringify(b)});toast("Draft saved.");closeModal()}catch(err){toast(err.message)}}
}
$("#accountBtn").onclick=()=>openAuth("login");$("#creatorBtn").onclick=creatorStudio;
$("#search").oninput=()=>{clearTimeout(timer);timer=setTimeout(loadWorks,250)};
$$(".filter").forEach(b=>b.onclick=()=>{$$(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");currentType=b.dataset.type;loadWorks()});
$("#menuBtn").onclick=()=>{const nav=$(".desktop-nav");nav.style.display=nav.style.display==="flex"?"none":"flex";nav.style.position="absolute";nav.style.top="82px";nav.style.left="0";nav.style.right="0";nav.style.padding="20px 5vw";nav.style.background="var(--bg)";nav.style.flexDirection="column"};
window.openWork=openWork;window.favorite=favorite;window.startReader=startReader;
loadWorks();updateAccount();
