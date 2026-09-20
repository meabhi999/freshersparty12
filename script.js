const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
/* =====================================================================
   SITE SETTINGS — change the details of the event ONLY here.
   Everything on the page (info cards, venue, payment, FAQ, contacts,
   Instagram) is filled from this block.
   ===================================================================== */
const SITE={
  eventDate:'2026-10-07T18:00:00+05:30', // date + start time (also drives the countdown)
  venueName:'Gurucharan University Auditorium',                // e.g. 'Gurucharan University Auditorium'
  venueAddress:'Gurucharan College Auditorium,Silchar,Assam',
  mapLink:'https://maps.app.goo.gl/EWMd8SoWRgmzLwbc9',                            // paste the Google Maps share link (optional)
  mapQuery:'GC University Auditorium',                           // e.g. 'Gurucharan University Silchar' -> shows a live map
  dressCode:'Party wear · dress to impress ✦', // e.g. 'Party wear / Ethnic'
  reportingTime:'TBA',                   // e.g. '5:30 PM'
  deadline:'TBA',                        // e.g. '5 October, 6:00 PM'
  entryFee:'₹200',                       // e.g. '₹100'
  upiId:'yourname@upi',                  // your UPI ID
  qrImage:'qr.png',                      // upload your QR picture with this name
  posterImage:'poster.jpg',              // upload the poster with this name
  instagram:'abhijit_kb',                // Instagram username (without @)
  followers:'—',                         // type the follower number here, e.g. 1250
  contacts:[                             // shown in the footer and FAQ
    {name:'Contact name',phone:'+91XXXXXXXXXX'}
  ]
};
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

function animateCounter(el,target){
  const start=Number(el.textContent)||0, end=Number(target)||0, duration=850, t0=performance.now();
  function tick(t){const p=Math.min(1,(t-t0)/duration),e=1-Math.pow(1-p,3);el.textContent=Math.round(start+(end-start)*e);if(p<1)requestAnimationFrame(tick)}
  requestAnimationFrame(tick);
}
function cleanName(n){return String(n).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

/* ---------- Performers: popup form + Dance / Music / Extra lists ---------- */
const ACTS=['Dance','Music','Extra'];
const countNamesEl=$('#countNames');
let performers=[];
function renderPerformers(){
  ACTS.forEach(a=>{
    const list=performers.filter(p=>p.activity===a);
    const box=$('#list'+a), cnt=$('#cnt'+a);
    if(cnt) cnt.textContent=list.length;
    if(box) box.innerHTML=list.length
      ? list.map(p=>`<span class="name-chip">${cleanName(p.name)}${p.mode==='Group'?' <em>· group</em>':''}</span>`).join('')
      : '<span class="name-empty">Be the first ✦</span>';
  });
  const uniq=new Set(performers.map(p=>p.name.toLowerCase())).size;
  if(countNamesEl) animateCounter(countNamesEl,uniq);
}
async function loadPerformers(){
  try{
    const res=await fetch('/names',{cache:'no-store'});
    if(!res.ok) throw new Error('load failed');
    const data=await res.json();
    performers=data.map(r=>({name:r.name,activity:r.activity,mode:r.mode}));
    renderPerformers();
  }catch(e){}
}
const pForm=$('#participateForm'), teamWrap=$('#teamWrap');
/* the participation form now lives directly on the page; only the
   "who's performing" line-up still opens as a popup */
const listModal=$('#participantsModal');
function openListModal(){listModal?.classList.add('open');document.body.style.overflow='hidden'}
function closeAnyModal(){$$('.modal.open').forEach(m=>m.classList.remove('open'));document.body.style.overflow=''}
$('#openParticipants')?.addEventListener('click',openListModal);
$$('[data-close-modal]').forEach(b=>b.addEventListener('click',closeAnyModal));
$$('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeAnyModal()}));
addEventListener('keydown',e=>{if(e.key==='Escape')closeAnyModal()});
$$('input[name="mode"]').forEach(r=>r.addEventListener('change',()=>{teamWrap.hidden=pForm.elements['mode'].value!=='Group'}));
pForm?.addEventListener('submit',async e=>{
  e.preventDefault();
  const f=pForm.elements;
  const data={
    name:f['fullName'].value.trim().replace(/\s+/g,' '),
    roll:f['roll'].value.trim(),
    semester:f['semester'].value,
    phone:f['phone'].value.trim(),
    mode:f['mode'].value,
    activity:f['activity'].value,
    team:f['team'].value.trim()
  };
  if(!data.name||!data.roll) return;
  if(data.phone.replace(/\D/g,'').length<10){toast('Enter a valid phone number');return}
  if(!data.activity){toast('Choose Dance, Music or Extra');return}
  if(data.mode==='Group'&&!data.team){toast('Add your team members');return}
  const btn=pForm.querySelector('button[type="submit"]');
  btn.disabled=true;
  try{
    const res=await fetch('/names',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const out=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(out.error||'Could not save. Try again.');
    if(!performers.some(p=>p.name.toLowerCase()===data.name.toLowerCase()&&p.activity===data.activity)) performers.push({name:data.name,activity:data.activity,mode:data.mode});
    renderPerformers();
    pForm.reset();teamWrap.hidden=true;
    toast(out.updated?`${data.activity} details updated ✓`:`Registered for ${data.activity} ✓`);
  }catch(err){
    toast(err.message||'Something went wrong. Try again.');
  }finally{
    btn.disabled=false;
  }
});
loadPerformers();

/* ---------- Entry pass (payment Transaction ID) ---------- */
const passForm=$('#passForm'), passDone=$('#passDone');
passForm?.addEventListener('submit',async e=>{
  e.preventDefault();
  const f=passForm.elements;
  const body={name:f['passName'].value.trim().replace(/\s+/g,' '),phone:f['passPhone'].value.trim(),txn:f['txn'].value.trim()};
  if(body.phone.replace(/\D/g,'').length<10){toast('Enter a valid phone number');return}
  if(body.txn.replace(/\s+/g,'').length<6){toast('Enter a valid Transaction ID');return}
  const btn=passForm.querySelector('button[type="submit"]');
  btn.disabled=true;
  try{
    const res=await fetch('/pass',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const out=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(out.error||'Could not save. Try again.');
    passForm.reset();
    passDone.hidden=false;
    passDone.innerHTML='✓ <b>Entry pass request received.</b><br>The organisers will verify your payment. Keep your Transaction ID safe.';
    toast('Entry pass request sent ✓');
  }catch(err){
    toast(err.message||'Something went wrong. Try again.');
  }finally{
    btn.disabled=false;
  }
});
$('#copyUpi')?.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(SITE.upiId);toast('UPI ID copied ✓')}catch(e){toast(SITE.upiId)}
});


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
const EVENT_DATE=SITE.eventDate;
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

// Creator footer — replace these two values with the designer's real name/photo.
const CREATOR_NAME='YOUR NAME';
const CREATOR_PHOTO='';
const creatorNameEl=$('#creatorName'), creatorAvatarEl=$('#creatorAvatar');
if(creatorNameEl) creatorNameEl.textContent=CREATOR_NAME;
if(creatorAvatarEl && CREATOR_PHOTO){creatorAvatarEl.innerHTML=`<img src="${CREATOR_PHOTO}" alt="${CREATOR_NAME}">`;creatorAvatarEl.querySelector('img').style.display='block';}


/* ---------- Fill the page from SITE settings ---------- */
(function fillSite(){
  const d=new Date(SITE.eventDate), tz='Asia/Kolkata';
  if(!isNaN(d)){
    SITE.dateText=d.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:tz});
    SITE.dateShort=d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',timeZone:tz});
    SITE.startText=d.toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit',hour12:true,timeZone:tz}).toUpperCase();
  }
  $$('[data-cfg]').forEach(el=>{const v=SITE[el.dataset.cfg];if(v!==undefined)el.textContent=v});

  // contacts (footer + FAQ)
  const tel=p=>String(p).replace(/[^\d+]/g,'');
  const contactLinks=SITE.contacts.map(c=>`<a href="tel:${tel(c.phone)}">${cleanName(c.name)} · ${cleanName(c.phone)}</a>`);
  const fc=$('#footerContacts'); if(fc) fc.innerHTML=contactLinks.join('');
  const fq=$('#faqContacts'); if(fq) fq.innerHTML='Call: '+SITE.contacts.map(c=>`${cleanName(c.name)} — <a href="tel:${tel(c.phone)}">${cleanName(c.phone)}</a>`).join(' · ');

  // venue: Google Maps button + optional live map
  const mapBtn=$('#mapBtn');
  if(mapBtn) mapBtn.href=SITE.mapLink||('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(SITE.venueName+' '+SITE.venueAddress));
  const vm=$('#venueMap');
  if(vm&&SITE.mapQuery){
    vm.innerHTML=`<iframe title="Venue map" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent(SITE.mapQuery)}&output=embed"></iframe>`;
  }

  // poster: shows poster.jpg if it exists
  const pf=$('.poster-frame');
  if(pf){const im=new Image();im.alt="Freshers' Night official poster";im.style.cssText='display:block;width:100%;height:auto;border-radius:inherit';
    im.onload=()=>{const ph=pf.querySelector('.poster-placeholder');if(ph)ph.remove();pf.appendChild(im);const n=$('.poster-note');if(n)n.remove()};im.src=SITE.posterImage}

  // Instagram: username, follower number (typed by you) and profile button
  const igF=$('#igFollowers'); if(igF) igF.textContent=Number.isFinite(+SITE.followers)?Number(SITE.followers).toLocaleString('en-IN'):SITE.followers;
  const igB=$('#igFollow'); if(igB){igB.href='https://www.instagram.com/'+SITE.instagram+'/';igB.textContent='Follow @'+SITE.instagram+' ↗'}
})();

/* ---------- Big "Register on Google Form" button -> semester popup ---------- */
// Paste your real Google Form links here. "senior" is used for both 3rd and 5th semester.
const GOOGLE_FORMS={
  first:'',   // 1st semester Google Form link
  senior:''   // 3rd & 5th semester Google Form link
};
const semPopup=$('#semPopup');
$('#bigRegisterBtn')?.addEventListener('click',()=>{semPopup?.classList.add('open');document.body.style.overflow='hidden'});
$('#semClose')?.addEventListener('click',()=>{semPopup?.classList.remove('open');document.body.style.overflow=''});
semPopup?.addEventListener('click',e=>{if(e.target===semPopup){semPopup.classList.remove('open');document.body.style.overflow=''}});
$$('.sem-options button').forEach(b=>b.addEventListener('click',()=>{
  const link=GOOGLE_FORMS[b.dataset.sem];
  semPopup.classList.remove('open');document.body.style.overflow='';
  if(link) window.open(link,'_blank','noopener');
  else toast('Add your Google Form link in script.js → GOOGLE_FORMS');
}));
