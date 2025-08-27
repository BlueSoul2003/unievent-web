// ====== Firestore & Auth 句柄（来自 index.html 注入）======
const {
  auth, db, provider, signInWithPopup, onAuthStateChanged, signOut,
  collection, collectionGroup, doc, addDoc, setDoc, getDoc, getDocs,
  onSnapshot, query, where, orderBy, serverTimestamp
} = window.__fb || {};

// ====== DOM ======
const loginOverlay   = document.getElementById('loginOverlay');
const googleSignIn   = document.getElementById('googleSignIn');
const loginStatus    = document.getElementById('loginStatus');

const whoamiEl       = document.getElementById('whoami');
const signoutBtn     = document.getElementById('signoutBtn');
const studentBtn     = document.getElementById('studentBtn');
const organizerBtn   = document.getElementById('organizerBtn');

const studentView    = document.getElementById('studentView');
const organizerView  = document.getElementById('organizerView');

const tagRow         = document.getElementById('tagRow');
const searchBox      = document.getElementById('searchBox');
const eventsGrid     = document.getElementById('eventsGrid');
const emptyHint      = document.getElementById('emptyHint');
const myTicketsBtn   = document.getElementById('myTicketsBtn');
const ticketsPanel   = document.getElementById('ticketsPanel');
const ticketsList    = document.getElementById('ticketsList');
const backToDiscover = document.getElementById('backToDiscover');

const evtTitle = document.getElementById('evtTitle');
const evtVenue = document.getElementById('evtVenue');
const evtDate  = document.getElementById('evtDate');
const evtTime  = document.getElementById('evtTime');
const evtTags  = document.getElementById('evtTags');
const evtCap   = document.getElementById('evtCap');
const evtDesc  = document.getElementById('evtDesc');
const postBtn  = document.getElementById('postBtn');
const myEventsList = document.getElementById('myEventsList');

// ====== 状态 ======
const ALL_TAGS = ['tech','entrepreneurship','art','volunteering','sports','science','community','innovation'];
let INTERESTS = ['tech','innovation']; // 初始偏好，可随用户点击修改

let currentUser = null;
let isOrganizer = false;

let EVENTS = [];                     // 云端 events 的快照
let registeredEventIds = new Set();  // 我已报名的 eventId 集
let stopEventsWatch = null;          // 取消监听

// ====== 登录 & 角色 ======
googleSignIn?.addEventListener('click', async () => {
  try {
    loginStatus.textContent = '正在打开登录…';
    await signInWithPopup(auth, provider);
  } catch (e) {
    console.error(e);
    loginStatus.textContent = '登录失败，请重试';
  }
});

signoutBtn?.addEventListener('click', async () => {
  await signOut(auth);
  location.reload();
});

onAuthStateChanged?.(auth, async (user) => {
  currentUser = user || null;
  if (!currentUser) return setSignedOutUI();

  setSignedInUI(currentUser);
  await resolveRole();
  await preloadMyRegistrations(); // 先拉取我报名过哪些活动
  watchEvents();                  // 实时监听活动
  setMode('student');             // 默认进学生视图
});

function setSignedInUI(u) {
  loginOverlay.style.display = 'none';
  whoamiEl.textContent = `已登录：${u.displayName || u.email || 'User'}`;
}
function setSignedOutUI() {
  loginOverlay.style.display = '';
  whoamiEl.textContent = '';
  studentView.style.display = 'none';
  organizerView.style.display = 'none';
}
async function resolveRole() {
  try {
    const snap = await getDoc(doc(db, 'roles', currentUser.uid));
    isOrganizer = snap.exists() && ['organizer','admin'].includes(snap.data().role);
  } catch (e) {
    console.warn('读取角色失败，默认 student', e);
    isOrganizer = false;
  }
}

// ====== 事件监听（云端实时）======
function watchEvents() {
  if (stopEventsWatch) stopEventsWatch();
  const qEv = query(collection(db, 'events'), orderBy('dateISO'), orderBy('time'));
  stopEventsWatch = onSnapshot(qEv, (snap) => {
    EVENTS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderEvents();
    renderMyEvents();
  });
}

// 预拉取“我报名过的 eventId”集合，用于禁用按钮/显示“已报名”
async function preloadMyRegistrations() {
  registeredEventIds.clear();
  try {
    const qAtt = query(collectionGroup(db, 'attendees'), where('uid', '==', currentUser.uid));
    const rs = await getDocs(qAtt);
    rs.forEach(d => {
      const evRef = d.ref.parent.parent;
      if (evRef) registeredEventIds.add(evRef.id);
    });
  } catch (e) {
    console.warn('预拉取报名失败：', e);
  }
}

// ====== 视图切换守卫 ======
function setMode(mode) {
  if (mode === 'organizer' && !isOrganizer) {
    alert('仅 Organizer 可访问');
    mode = 'student';
  }
  studentView.style.display   = (mode === 'student')   ? '' : 'none';
  organizerView.style.display = (mode === 'organizer') ? '' : 'none';
  studentBtn.classList.toggle('active', mode==='student');
  organizerBtn.classList.toggle('active', mode==='organizer');
}
studentBtn?.addEventListener('click', () => setMode('student'));
organizerBtn?.addEventListener('click', () => setMode('organizer'));

// ====== 学生视图：标签、搜索、列表 ======
function renderTags(){
  tagRow.innerHTML = '';
  ALL_TAGS.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag' + (INTERESTS.includes(tag) ? ' active' : '');
    btn.textContent = tag;
    btn.onclick = () => {
      if (INTERESTS.includes(tag)) INTERESTS = INTERESTS.filter(t => t!==tag);
      else INTERESTS = [...INTERESTS, tag];
      renderEvents();
    };
    tagRow.appendChild(btn);
  });
}
renderTags();
searchBox?.addEventListener('input', renderEvents);

function renderEvents(){
  const q = (searchBox.value||'').toLowerCase();
  const items = EVENTS
    .slice()
    .sort((a,b)=> (a.dateISO + (a.time||'00:00')).localeCompare(b.dateISO + (b.time||'00:00')))
    .filter(e => {
      const byTag = INTERESTS.length===0 || (e.tags||[]).some(t => INTERESTS.includes(t));
      const byText = q==='' || (e.title + ' ' + (e.description||'') + ' ' + e.venue).toLowerCase().includes(q);
      const future = new Date(`${e.dateISO}T${e.time||'00:00'}:00`).getTime() >= Date.now() - 86400000;
      return byTag && byText && future;
    });

  eventsGrid.innerHTML = '';
  items.forEach(e => eventsGrid.appendChild(eventCard(e)));
  emptyHint.style.display = items.length ? 'none' : '';
}

function eventCard(e){
  const wrap  = document.createElement('div'); wrap.className='event';
  const title = document.createElement('div'); title.style.fontWeight='600'; title.textContent = e.title;
  const meta  = document.createElement('div'); meta.className='meta'; meta.textContent = `${e.dateISO} ${e.time||''} | ${e.venue}`;
  const desc  = document.createElement('div'); desc.className='muted'; desc.textContent = e.description || '';
  const tags  = document.createElement('div'); (e.tags||[]).forEach(t=>{ const b=document.createElement('span'); b.className='badge'; b.textContent=t; tags.appendChild(b); });

  const btn = document.createElement('button');
  const already = registeredEventIds.has(e.id);
  btn.className = 'pill';
  btn.disabled = already;
  btn.textContent = already ? '已报名' : '报名';
  btn.onclick = async () => {
    if (!currentUser) return alert('请先登录');
    try {
      await setDoc(doc(db,'events',e.id,'attendees',currentUser.uid), {
        uid: currentUser.uid,
        name: currentUser.displayName || 'Anonymous',
        email: currentUser.email || '',
        registeredAt: serverTimestamp()
      }, { merge:true });
      registeredEventIds.add(e.id);
      renderEvents();
      alert('报名成功！');
    } catch (err) {
      console.error(err); alert('报名失败，请稍后再试');
    }
  };

  wrap.append(title, meta, desc, tags, btn);
  return wrap;
}

// 票券
myTicketsBtn?.addEventListener('click', () => {
  ticketsPanel.style.display = '';
  document.querySelector('#studentView .card').style.display = 'none';
  renderTickets();
});
backToDiscover?.addEventListener('click', () => {
  ticketsPanel.style.display = 'none';
  document.querySelector('#studentView .card').style.display = '';
});
async function renderTickets(){
  ticketsList.innerHTML = '';
  if (!currentUser) return ticketsList.append(Object.assign(document.createElement('p'), {className:'muted', textContent:'请先登录'}));

  const qAtt = query(collectionGroup(db,'attendees'), where('uid','==', currentUser.uid));
  const attSnap = await getDocs(qAtt);
  if (attSnap.empty) return ticketsList.append(Object.assign(document.createElement('p'), {className:'muted', textContent:'暂无票券'}));

  for (const d of attSnap.docs) {
    const eventRef = d.ref.parent.parent;
    const evDoc = eventRef ? await getDoc(eventRef) : null;
    if (!evDoc?.exists()) continue;
    const e = { id: evDoc.id, ...evDoc.data() };

    const c = document.createElement('div'); c.className='event';
    const t = document.createElement('div'); t.style.fontWeight='600'; t.textContent = e.title;
    const m = document.createElement('div'); m.className='meta'; m.textContent = `${e.dateISO} ${e.time||''} | ${e.venue}`;
    const k = document.createElement('div'); k.className='muted'; k.textContent = `Ticket Code: ${e.id}-${currentUser.uid}`;
    c.append(t,m,k); ticketsList.appendChild(c);
  }
}

// ====== 组织者视图：发活动、我的活动、导出 ======
postBtn?.addEventListener('click', async () => {
  if (!currentUser) return alert('请先登录');
  if (!isOrganizer) return alert('仅 Organizer 可发布');

  const t = (v) => (v||'').trim();
  if (!t(evtTitle.value) || !evtDate.value || !evtTime.value || !t(evtVenue.value)) {
    return alert('请填写 标题/日期/时间/地点');
  }

  await addDoc(collection(db,'events'), {
    title: t(evtTitle.value),
    description: t(evtDesc.value),
    dateISO: evtDate.value,
    time: evtTime.value,
    venue: t(evtVenue.value),
    tags: t(evtTags.value).split(',').map(s=>s.trim()).filter(Boolean),
    capacity: evtCap.value ? Number(evtCap.value) : 0,
    createdBy: currentUser.uid,
    createdAt: serverTimestamp()
  });

  evtTitle.value = evtVenue.value = evtTags.value = evtDesc.value = '';
  evtCap.value=''; evtDate.value=''; evtTime.value='';
  alert('发布成功！');
});

// 直接用 EVENTS 里过滤我发布的活动，避免额外索引
function renderMyEvents(){
  myEventsList.innerHTML = '';
  if (!currentUser) return;

  const mine = EVENTS.filter(e => e.createdBy === currentUser.uid)
    .sort((a,b)=> (a.dateISO + (a.time||'00:00')).localeCompare(b.dateISO + (b.time||'00:00')));

  if (mine.length === 0) {
    const p = document.createElement('p'); p.className='muted'; p.textContent='暂无活动';
    return myEventsList.append(p);
  }

  mine.forEach(e => {
    const row = document.createElement('div'); row.className='event';
    row.innerHTML = `
      <div style="font-weight:600;">${e.title}</div>
      <div class="meta">${e.dateISO} ${e.time||''} | ${e.venue} • ${e.capacity?`容量 ${e.capacity}`:''}</div>
      <div class="muted">${(e.tags||[]).join(', ')}</div>
      <div class="stack" style="flex-direction:row; gap:8px;">
        <button class="pill outline" data-export="${e.id}">导出 CSV</button>
        <button class="pill outline" data-del="${e.id}">删除</button>
      </div>
    `;
    row.querySelector('[data-export]')?.addEventListener('click', () => exportAttendeesCSV(e.id, e.title));
    row.querySelector('[data-del]')?.addEventListener('click', async () => {
      if (!confirm('确认删除该活动？')) return;
      try {
        const { deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        await deleteDoc(doc(db,'events', e.id));
        alert('已删除');
      } catch (err) {
        console.error(err); alert('删除失败');
      }
    });
    myEventsList.appendChild(row);
  });
}

async function exportAttendeesCSV(eventId, title){
  const snap = await getDocs(collection(db,'events',eventId,'attendees'));
  const rows = [['Name','Email','UID','Registered At']];
  snap.forEach(d => {
    const a = d.data();
    rows.push([a.name||'', a.email||'', a.uid||'', (a.registeredAt?.toDate?.() || '').toString()]);
  });
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${(title||'attendees').replace(/[^a-z0-9]+/gi,'_')}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ====== 首次渲染静态部分 ======
(function boot(){
  renderTags();
  // 其余渲染在 watchEvents/onAuthStateChanged 后触发
})();
