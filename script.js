const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const progress=$('#progress');
addEventListener('scroll',()=>{const h=document.documentElement.scrollHeight-innerHeight;progress.style.width=(scrollY/Math.max(1,h)*100)+'%'});
const cursor=$('#cursor');addEventListener('pointermove',e=>{cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px'});
$('#menu').addEventListener('click',()=>document.querySelector('.header').classList.toggle('mobile-open'));
$$('.navlinks a').forEach(a=>a.addEventListener('click',()=>document.querySelector('.header').classList.remove('mobile-open')));
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});$$('.reveal').forEach(e=>io.observe(e));
const sections=$$('main section[id]'), navs=$$('.navlinks a');const sio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){navs.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+e.target.id))}}),{rootMargin:'-35% 0px -55%'});sections.forEach(s=>sio.observe(s));
$$('.magnetic').forEach(el=>{el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();el.style.transform=`translate(${(e.clientX-(r.left+r.width/2))*.12}px,${(e.clientY-(r.top+r.height/2))*.12}px)`});el.addEventListener('pointerleave',()=>el.style.transform='')});
// gallery slider — smooth buttons + natural touch/mouse dragging
const g=$('#gallery');
const slideBy=()=>{const card=g.querySelector('.memory');return card?card.getBoundingClientRect().width+18:Math.max(240,g.clientWidth*.72)};
$('#next').onclick=()=>g.scrollBy({left:slideBy(),behavior:'smooth'});
$('#prev').onclick=()=>g.scrollBy({left:-slideBy(),behavior:'smooth'});
let down=false,startX=0,scrollLeft=0,moved=false;
g.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse' && e.button!==0)return;
  down=true;moved=false;startX=e.clientX;scrollLeft=g.scrollLeft;
  g.classList.add('dragging');g.setPointerCapture?.(e.pointerId);
});
g.addEventListener('pointermove',e=>{
  if(!down)return;
  const dx=e.clientX-startX;
  if(Math.abs(dx)>3)moved=true;
  g.scrollLeft=scrollLeft-dx*1.05;
});
const stopDrag=()=>{down=false;g.classList.remove('dragging')};
g.addEventListener('pointerup',stopDrag);
g.addEventListener('pointercancel',stopDrag);
g.addEventListener('pointerleave',()=>{if(down && !g.hasPointerCapture?.(0))stopDrag()});
function toast(msg){let t=$('#toast');if(!t){t=document.createElement('div');t.id='toast';t.style.cssText='position:fixed;right:18px;bottom:90px;z-index:200;padding:14px 18px;border:1px solid rgba(255,255,255,.15);border-radius:14px;background:rgba(15,10,24,.95);color:#fff;box-shadow:0 15px 50px #0008;transform:translateY(20px);opacity:0;transition:.3s';document.body.appendChild(t)}t.textContent=msg;t.style.opacity=1;t.style.transform='none';clearTimeout(t._x);t._x=setTimeout(()=>{t.style.opacity=0;t.style.transform='translateY(20px)'},2600)}
const afterFiles=$('#afterFiles'), afterList=$('#afterList'), afterSectionCount=$('#afterSectionCount');
let afterVideos=[];
function renderAfterParty(){
  if(!afterVideos.length){
    afterList.innerHTML='<div class="reel-empty">After-party videos uploaded here will appear large and playable ✦</div>';
  }else{
    afterList.innerHTML=afterVideos.map((r,i)=>`<article class="reel-item">
      <video src="${r.url}" controls playsinline preload="metadata"></video>
      <div class="reel-meta">After-party ${i+1} · ${r.file.name.replace(/[<>"']/g,'')}</div>
      <div class="media-actions">
        <a class="media-download" href="${r.url}" download="${r.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}">↓ Download</a>
      </div>
    </article>`).join('');
  }
  if(afterSectionCount) animateCounter(afterSectionCount,afterVideos.length);
}
afterFiles?.addEventListener('change',()=>{
  const files=[...(afterFiles.files||[])].filter(f=>f.type.startsWith('video/'));
  files.forEach(file=>afterVideos.push({file,url:URL.createObjectURL(file)}));
  renderAfterParty();
  afterFiles.value='';
  if(files.length){
    toast(`${files.length} after-party video${files.length>1?'s':''} posted ✓`);
    requestAnimationFrame(()=>afterList.scrollTo({left:afterList.scrollWidth,behavior:'smooth'}));
  }
});
renderAfterParty();


let afterDown=false,afterStartX=0,afterScrollLeft=0;
afterList?.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse' && e.button!==0)return;
  afterDown=true;afterStartX=e.clientX;afterScrollLeft=afterList.scrollLeft;
  afterList.classList.add('dragging');afterList.setPointerCapture?.(e.pointerId);
});
afterList?.addEventListener('pointermove',e=>{
  if(!afterDown)return;
  afterList.scrollLeft=afterScrollLeft-(e.clientX-afterStartX)*1.05;
});
const stopAfterDrag=()=>{afterDown=false;afterList.classList.remove('dragging')};
afterList?.addEventListener('pointerup',stopAfterDrag);
afterList?.addEventListener('pointercancel',stopAfterDrag);

// attendee names — synced live with the server so every phone sees the same list
const nameForm=$('#nameForm'), nameInput=$('#visitorName'), phoneInput=$('#visitorPhone'), thoughtInput=$('#visitorThought'), nameList=$('#nameList'), countNamesEl=$('#countNames');

function animateCounter(el,target){
  const start=Number(el.textContent)||0, end=Number(target)||0, duration=850, t0=performance.now();
  function tick(t){const p=Math.min(1,(t-t0)/duration),e=1-Math.pow(1-p,3);el.textContent=Math.round(start+(end-start)*e);if(p<1)requestAnimationFrame(tick)}
  requestAnimationFrame(tick);
}
function cleanName(n){return String(n).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function renderNames(names){
  nameList.innerHTML=names.length?names.map(n=>`<span class="name-chip">${cleanName(n.name||n)}</span>`).join(''):'';
  if(countNamesEl) animateCounter(countNamesEl,names.length);
}
let lastNamesJSON='';
async function fetchNames(){
  try{
    const res=await fetch('/names',{cache:'no-store'})
    if(!res.ok)return;
    const names=await res.json();
    const asJSON=JSON.stringify(names);
    if(asJSON!==lastNamesJSON){lastNamesJSON=asJSON;renderNames(names);}
  }catch(e){}
}
nameForm?.addEventListener('submit',async e=>{
  e.preventDefault();
  const n=nameInput.value.trim().replace(/\s+/g,' ');
  if(!n)return;
  const submitBtn=nameForm.querySelector('.form-submit');
  if(submitBtn)submitBtn.disabled=true;
  try{
    const res=await fetch('/names',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:n,phone:phoneInput?.value.trim()||'',thought:thoughtInput?.value.trim()||''})
    });
    if(!res.ok){toast('Kuch gadbad ho gayi, dubara try karo');return;}
    const names=await res.json();
    lastNamesJSON=JSON.stringify(names);
    renderNames(names);
    nameForm.reset();
    toast('Name added ✓');
  }catch(err){
    toast('Network error, dubara try karo');
  }finally{
    if(submitBtn)submitBtn.disabled=false;
  }
});
fetchNames();
setInterval(fetchNames,4000);


// Local reel previews: every selected reel becomes a large side-by-side playable card.
const reelFiles=$('#reelFiles'), reelList=$('#reelList'), reelCounter=$('#countReels'), reelSectionCount=$('#reelSectionCount');
let localReels=[];
let reelDragDown=false,reelDragStart=0,reelDragScroll=0;
function updateReelCounters(){
  const n=localReels.length;
  if(reelCounter) animateCounter(reelCounter,n);
  if(reelSectionCount) animateCounter(reelSectionCount,n);
}
function renderReels(){
  if(!localReels.length){
    reelList.innerHTML='<div class="reel-empty">Your uploaded reels will appear here ✦</div>';
  }else{
    reelList.innerHTML=localReels.map((r,i)=>`<article class="reel-item">
      <video src="${r.url}" controls playsinline preload="metadata"></video>
      <div class="reel-meta">Reel ${i+1} · ${r.file.name.replace(/[<>"']/g,'')}</div>
      <div class="media-actions"><a class="media-download" href="${r.url}" download="${r.file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}" aria-label="Download reel ${i+1}">↓ Download</a></div>
    </article>`).join('');
  }
  updateReelCounters();
}
const reelMoreBtn=$('#reelMoreBtn');
reelMoreBtn?.addEventListener('click',()=>{
  const open=reelList.classList.toggle('all-reels');
  reelMoreBtn.classList.toggle('open',open);
  reelMoreBtn.setAttribute('aria-expanded',String(open));
  reelMoreBtn.setAttribute('aria-label',open?'Show reels as a slider':'Show all reels');
  if(open) reelList.scrollLeft=0;
});

reelFiles?.addEventListener('change',()=>{
  const files=[...(reelFiles.files||[])].filter(f=>f.type.startsWith('video/'));
  files.forEach(file=>localReels.push({file,url:URL.createObjectURL(file)}));
  renderReels();
  reelFiles.value='';
  if(files.length){
    toast(`${files.length} reel${files.length>1?'s':''} posted ✓`);
    requestAnimationFrame(()=>reelList.scrollTo({left:reelList.scrollWidth,behavior:'smooth'}));
  }
});
reelList?.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse' && e.button!==0)return;
  reelDragDown=true;reelDragStart=e.clientX;reelDragScroll=reelList.scrollLeft;
  reelList.classList.add('dragging');reelList.setPointerCapture?.(e.pointerId);
});
reelList?.addEventListener('pointermove',e=>{
  if(!reelDragDown)return;
  reelList.scrollLeft=reelDragScroll-(e.clientX-reelDragStart);
});
const stopReelDrag=()=>{reelDragDown=false;reelList?.classList.remove('dragging')};
reelList?.addEventListener('pointerup',stopReelDrag);
reelList?.addEventListener('pointercancel',stopReelDrag);
// Event countdown. Change this one value when the final event date/time is confirmed.
const EVENT_DATE='2026-10-07T18:00:00+05:30';
const cd={d:$('#cdDays'),h:$('#cdHours'),m:$('#cdMinutes'),s:$('#cdSeconds'),status:$('#countdownStatus')};
function updateCountdown(){
  const diff=new Date(EVENT_DATE).getTime()-Date.now();
  if(diff<=0){
    cd.d.textContent=cd.h.textContent=cd.m.textContent=cd.s.textContent='00';
    cd.status.textContent='It’s time. The night starts now ✦';
    return;
  }
  const days=Math.floor(diff/86400000),hours=Math.floor(diff%86400000/3600000),mins=Math.floor(diff%3600000/60000),secs=Math.floor(diff%60000/1000);
  cd.d.textContent=String(days).padStart(2,'0');
  cd.h.textContent=String(hours).padStart(2,'0');
  cd.m.textContent=String(mins).padStart(2,'0');
  cd.s.textContent=String(secs).padStart(2,'0');
  cd.status.textContent=`${days} day${days===1?'':'s'} to go · get ready ✦`;
}
updateCountdown();setInterval(updateCountdown,1000);

// Google Form link — replace this with your actual Google Form URL.
const GOOGLE_FORM_URL='https://forms.google.com/';
const formCta=$('#googleFormQr'), registerButton=$('#registerButton');
if(formCta) formCta.href=GOOGLE_FORM_URL;
if(registerButton) registerButton.href=GOOGLE_FORM_URL;
// Creator footer — replace these two values with the designer's real name/photo.
const CREATOR_NAME='YOUR NAME';
const CREATOR_PHOTO='';
const creatorNameEl=$('#creatorName'), creatorAvatarEl=$('#creatorAvatar');
if(creatorNameEl) creatorNameEl.textContent=CREATOR_NAME;
if(creatorAvatarEl && CREATOR_PHOTO){creatorAvatarEl.innerHTML=`<img src="${CREATOR_PHOTO}" alt="${CREATOR_NAME}">`;creatorAvatarEl.querySelector('img').style.display='block';}


/* Instagram live stats hook.
   Set window.INSTAGRAM_STATS_ENDPOINT to your own authenticated backend endpoint that returns:
   {"followers":1234,"following":456,"posts":78}
   Do not put an Instagram access token in this HTML file. */
const INSTAGRAM_USERNAME='abhijit_kb';
async function loadInstagramStats(){
  const endpoint=window.INSTAGRAM_STATS_ENDPOINT;
  if(!endpoint) return;
  try{
    const res=await fetch(endpoint,{cache:'no-store'});
    if(!res.ok) throw new Error('stats request failed');
    const data=await res.json();
    if(Number.isFinite(+data.followers)) $('#igFollowers').textContent=Number(data.followers).toLocaleString();
    if(Number.isFinite(+data.following)) $('#igFollowing').textContent=Number(data.following).toLocaleString();
    if(Number.isFinite(+data.posts)) $('#igPosts').textContent=Number(data.posts).toLocaleString();
    $('#igLiveNote').textContent='Updated live from the connected Instagram stats service.';
  }catch(e){}
}
loadInstagramStats();
setInterval(loadInstagramStats,30000);
