const $=s=>document.querySelector(s);
const slug=new URLSearchParams(location.search).get("work");
let work,idx=0;
async function api(url,opts={}){const r=await fetch(url,{headers:{"Content-Type":"application/json"},...opts});const d=await r.json();if(!r.ok)throw Error(d.error||"Error");return d}
async function init(){
 if(!slug){location.href="/";return}
 try{
  work=(await api("/api/works/"+encodeURIComponent(slug))).work;
  $("#title").textContent=work.title;$("#author").textContent="by "+work.author;$("#readerTitle").textContent=work.type.toUpperCase()+" / "+work.title;
  const p=await fetch("/api/auth/me").then(r=>r.json());
  if(p.user){const pr=await api("/api/progress/"+work.id);idx=Math.max(0,(pr.progress.chapter||1)-1)}
  renderChapters();render();
 }catch(e){$("#content").textContent=e.message}
}
function renderChapters(){$("#chapters").innerHTML=work.chapters.map((c,i)=>`<button class="chapter ${i===idx?"active":""}" onclick="go(${i})">${String(i+1).padStart(2,"0")} — ${escapeHtml(c.title)}</button>`).join("")}
function escapeHtml(s=""){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
async function render(){
 const c=work.chapters[idx];$("#chapterLabel").textContent=`CHAPTER ${String(idx+1).padStart(2,"0")} / ${c.title}`;
 $("#progressLabel").textContent=Math.round(((idx+1)/work.chapters.length)*100)+"%";
 $("#content").innerHTML=`<h2>${escapeHtml(c.title)}</h2><div>${escapeHtml(c.text||"This comic chapter is ready for page assets. Add your page images in the creator storage layer before production.")}</div>`;
 $("#prev").disabled=idx===0;$("#next").disabled=idx===work.chapters.length-1;
 try{const me=await fetch("/api/auth/me").then(r=>r.json());if(me.user)await api("/api/progress/"+work.id,{method:"POST",body:JSON.stringify({chapter:idx+1,position:1})})}catch{}
}
function go(i){idx=i;renderChapters();render();scrollTo({top:0,behavior:"smooth"})}
$("#prev").onclick=()=>{if(idx>0)go(idx-1)};$("#next").onclick=()=>{if(idx<work.chapters.length-1)go(idx+1)};$("#account").onclick=()=>location.href="/#library";
document.addEventListener("keydown",e=>{if(e.key==="ArrowRight"&&idx<work.chapters.length-1)go(idx+1);if(e.key==="ArrowLeft"&&idx>0)go(idx-1)});
window.go=go;init();
