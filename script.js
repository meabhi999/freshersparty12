const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
/* =====================================================================
   SITE SETTINGS — change the details of the event ONLY here.
   Everything on the page (info cards, venue, payment, FAQ, contacts,
   Instagram) is filled from this block.
   ===================================================================== */
const SITE={
  eventDate:'2026-10-07T18:00:00+05:30', // date + start time (also drives the countdown)
  venueName:'Gurucharan University auditorium',                // e.g. 'Gurucharan University Auditorium'
  venueAddress:'Gurucharan University,Silchar,Assam 788004',
  mapLink:'https://maps.app.goo.gl/UFzKdN4YdFJgcXBd8',                            // paste the Google Maps share link (optional)
  mapQuery:'Gurucharan University,Silchar',                           // e.g. 'Gurucharan University Silchar' -> shows a live map
  dressCode:'TBA',                       // e.g. 'Party wear / Ethnic'
  reportingTime:'TBA',                   // e.g. '5:30 PM'
  deadline:'TBA',                        // e.g. '5 October, 6:00 PM'
  entryFee:'₹200',                       // entry fee shown on the page
  formFirstSem:'',                       // Google Form link for 1st semester students (paste between the quotes)
  formThirdFifthSem:'',                  // Google Form link for 3rd and 5th semester students
  posterImage:'poster.jpg',              // upload the poster with this name
  instagram:'abhijit_kb',                // Instagram username (without @)
  followers:'1300+',                         // type the follower number here, e.g. 1250
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


function animateCounter(el,target){
  const start=Number(el.textContent)||0, end=Number(target)||0, duration=850, t0=performance.now();
  function tick(t){const p=Math.min(1,(t-t0)/duration),e=1-Math.pow(1-p,3);el.textContent=Math.round(start+(end-start)*e);if(p<1)requestAnimationFrame(tick)}
  requestAnimationFrame(tick);
}
function cleanName(n){return String(n).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

/* ---------- Modals ---------- */
function openModal(m){if(!m)return;m.classList.add('open');document.body.style.overflow='hidden'}
function closeModals(){
  $$('.modal.open').forEach(m=>m.classList.remove('open'));
  document.body.style.overflow='';
  const lb=$('#lbBody'); if(lb) lb.innerHTML='';
}
$$('[data-close-modal]').forEach(b=>b.addEventListener('click',closeModals));
$$('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModals()}));
addEventListener('keydown',e=>{if(e.key==='Escape')closeModals()});

/* ---------- Performers: inline form + "Participants" popup ---------- */
const ACTS=['Dance','Music','Extra'];
const countNamesEl=$('#countNames'), partCountEl=$('#partCount');
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
  if(partCountEl) partCountEl.textContent=uniq;
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
$('#openParticipants')?.addEventListener('click',()=>{loadPerformers();openModal($('#participantsModal'))});
const pForm=$('#participateForm'), teamWrap=$('#teamWrap');
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
loadPerformers();/* ---------- Entry pass: Register -> choose semester -> Google Form ---------- */
$('#openRegister')?.addEventListener('click',()=>openModal($('#semModal')));
$$('.sem-btn').forEach(b=>b.addEventListener('click',()=>{
  const link=b.dataset.sem==='first'?SITE.formFirstSem:SITE.formThirdFifthSem;
  closeModals();
  if(!link){toast('Registration form link coming soon');return}
  window.open(link,'_blank','noopener');
}));

/* ---------- Photos, reels & shared drive (stored in Cloudflare R2) ---------- */
const IMG_MAX=12e6, VID_MAX=60e6;
const EXT_TYPE={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',mp4:'video/mp4',mov:'video/quicktime',webm:'video/webm'};
const OK_TYPES=Object.values(EXT_TYPE);
const reelList=$('#reelList'), driveGrid=$('#driveGrid'), reelStatus=$('#reelStatus'), driveStatus=$('#driveStatus');
const reelNameEl=$('#reelName'), driveNameEl=$('#driveName');
let mediaItems=[];
const mUrl=k=>'/media/'+String(k).split('/').map(encodeURIComponent).join('/');
const niceSize=n=>n>=1e6?(n/1e6).toFixed(1)+' MB':Math.max(1,Math.round(n/1e3))+' KB';
const typeOf=f=>f.type||EXT_TYPE[(f.name.split('.').pop()||'').toLowerCase()]||'';
try{const saved=localStorage.getItem('fn_uploader');if(saved){if(reelNameEl)reelNameEl.value=saved;if(driveNameEl)driveNameEl.value=saved}}catch(e){}
function uploaderName(el){
  const v=(el&&el.value||'').trim();
  try{if(v)localStorage.setItem('fn_uploader',v)}catch(e){}
  return v;
}
function renderMedia(){
  const reels=mediaItems.filter(m=>m.section==='reel'), drive=mediaItems.filter(m=>m.section==='drive');
  if(reelList) reelList.innerHTML=reels.length
    ? reels.map(m=>`<article class="reel-item">
        ${m.kind==='video'?`<video src="${mUrl(m.key)}" controls playsinline preload="metadata"></video>`:`<img src="${mUrl(m.key)}" alt="Photo by ${cleanName(m.by||'a student')}" loading="lazy">`}
        <div class="reel-meta">${m.kind==='video'?'Reel':'Photo'} · ${cleanName(m.by||'Anonymous')}</div>
      </article>`).join('')
    : '<div class="reel-empty">Reels and photos uploaded here will appear for everyone ✦</div>';
  if(driveGrid) driveGrid.innerHTML=drive.map(m=>`<button class="d-item" type="button" data-key="${cleanName(m.key)}">
      ${m.kind==='video'?`<video src="${mUrl(m.key)}#t=0.1" muted playsinline preload="metadata"></video><span class="tag">▶ VIDEO</span>`:`<img src="${mUrl(m.key)}" alt="" loading="lazy">`}
      <span class="by">${cleanName(m.by||'Anonymous')}</span></button>`).join('');
  const setN=(el,n)=>{if(el)animateCounter(el,n)};
  setN($('#reelSectionCount'),reels.length); setN($('#countReels'),reels.length); setN($('#driveCount'),drive.length);
}
async function loadMedia(){
  try{
    const res=await fetch('/media',{cache:'no-store'});
    if(!res.ok) throw new Error('load failed');
    const d=await res.json();
    mediaItems=d.items||[];
    renderMedia();
  }catch(e){}
}
// photos bigger than ~1 MB are shrunk in the browser first (saves storage, uploads faster)
async function shrinkImage(file,type){
  if(type==='image/gif'||file.size<1.2e6) return file;
  try{
    const bmp=await createImageBitmap(file,{imageOrientation:'from-image'});
    const k=Math.min(1,2200/Math.max(bmp.width,bmp.height));
    const c=document.createElement('canvas');c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);
    const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(bmp,0,0,c.width,c.height);
    const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.85));
    if(blob&&blob.size<file.size) return new File([blob],(file.name.replace(/\.\w+$/,'')||'photo')+'.jpg',{type:'image/jpeg'});
  }catch(e){}
  return file;
}
function uploadOne(file,type,section,name,onProgress){
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();
    xhr.open('POST',`/upload?section=${section}&name=${encodeURIComponent(name)}&filename=${encodeURIComponent(file.name)}`);
    xhr.setRequestHeader('Content-Type',type);
    xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(e.loaded/e.total)};
    xhr.onload=()=>{let d={};try{d=JSON.parse(xhr.responseText)}catch(e){}xhr.status>=200&&xhr.status<300?resolve(d):reject(new Error(d.error||'Upload failed. Try again.'))};
    xhr.onerror=()=>reject(new Error('Network problem. Please try again.'));
    xhr.send(file);
  });
}
async function handleFiles(fileList,section,statusEl,nameEl){
  const files=[...fileList];
  if(!files.length||!statusEl) return;
  const name=uploaderName(nameEl);
  let ok=0;
  for(const original of files){
    const row=document.createElement('div');row.className='up-row';
    const label=document.createElement('span');const bar=document.createElement('div');bar.className='bar';const fill=document.createElement('i');bar.appendChild(fill);
    row.append(label,bar);statusEl.appendChild(row);
    label.textContent=original.name;
    const fail=msg=>{row.classList.add('err');label.textContent=`${original.name} — ${msg}`;bar.remove()};
    let type=typeOf(original);
    if(!OK_TYPES.includes(type)){fail('not a supported photo or video');continue}
    let file=original;
    if(type.startsWith('image/')){file=await shrinkImage(original,type);type=typeOf(file)||type}
    const max=type.startsWith('video/')?VID_MAX:IMG_MAX;
    if(file.size>max){fail(`too big (max ${Math.round(max/1e6)} MB)`);continue}
    label.textContent=`${file.name} · ${niceSize(file.size)}`;
    try{
      await uploadOne(file,type,section,name,p=>{fill.style.width=Math.round(p*100)+'%'});
      fill.style.width='100%';row.classList.add('done');ok++;
    }catch(err){fail(err.message)}
  }
  if(ok){
    toast(`${ok} file${ok>1?'s':''} uploaded ✓`);
    await loadMedia();
    if(section==='reel'&&reelList) requestAnimationFrame(()=>reelList.scrollTo({left:0,behavior:'smooth'}));
  }
  setTimeout(()=>statusEl.querySelectorAll('.up-row.done').forEach(r=>r.remove()),4000);
}
$('#reelFiles')?.addEventListener('change',e=>{handleFiles(e.target.files,'reel',reelStatus,reelNameEl);e.target.value=''});
$('#driveFiles')?.addEventListener('change',e=>{handleFiles(e.target.files,'drive',driveStatus,driveNameEl);e.target.value=''});
const dz=$('#dropzone');
if(dz){
  ['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag')}));
  ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('drag')}));
  dz.addEventListener('drop',e=>{if(e.dataTransfer&&e.dataTransfer.files.length)handleFiles(e.dataTransfer.files,'drive',driveStatus,driveNameEl)});
}
// tap a drive photo -> big view with download
driveGrid?.addEventListener('click',e=>{
  const b=e.target.closest('.d-item');if(!b)return;
  const m=mediaItems.find(x=>x.key===b.dataset.key);if(!m)return;
  $('#lbBody').innerHTML=m.kind==='video'?`<video src="${mUrl(m.key)}" controls autoplay playsinline></video>`:`<img src="${mUrl(m.key)}" alt="">`;
  $('#lbBy').textContent=`${m.kind==='video'?'Video':'Photo'} by ${m.by||'Anonymous'}`;
  $('#lbDownload').href=mUrl(m.key)+'?download=1';
  openModal($('#lightbox'));
});
loadMedia();/* reels: slider / show-all + drag to scroll */
let reelDragDown=false,reelDragStart=0,reelDragScroll=0;
const reelMoreBtn=$('#reelMoreBtn');
reelMoreBtn?.addEventListener('click',()=>{
  const open=reelList.classList.toggle('all-reels');
  reelMoreBtn.classList.toggle('open',open);
  reelMoreBtn.setAttribute('aria-expanded',String(open));
  reelMoreBtn.setAttribute('aria-label',open?'Show reels as a slider':'Show all reels');
  if(open) reelList.scrollLeft=0;
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
  const hc={d:$('#hcD'),h:$('#hcH'),m:$('#hcM'),s:$('#hcS')};
  if(hc.d){hc.d.textContent=String(days).padStart(2,'0');hc.h.textContent=String(hours).padStart(2,'0');hc.m.textContent=String(mins).padStart(2,'0');hc.s.textContent=String(secs).padStart(2,'0')}
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
