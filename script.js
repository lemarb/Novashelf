const firebaseConfig = {
  apiKey: "AIzaSyB8mdp6ljaXcwNJnLYIJtv_l5EO4P-ew1U",
  authDomain: "novashelf-8c7a2.firebaseapp.com",
  projectId: "novashelf-8c7a2",
  storageBucket: "novashelf-8c7a2.firebasestorage.app",
  messagingSenderId: "808747580675",
  appId: "1:808747580675:web:ac6255dc67ce519d0c3d36",
  measurementId: "G-JD1S51PDF8"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

const addNovelModal = document.getElementById('addNovelModal');
const addNovelBtn = document.getElementById('addNovelBtn');
const addNovelCancel = document.getElementById('addNovelCancel');
const saveNovel = document.getElementById('saveNovel');
const novelGrid = document.getElementById('novelGrid');
const genreFilter = document.getElementById('genreFilter');
const searchInput = document.getElementById('searchInput');

const novelModal = document.getElementById('novelModal');
const novelModalTitle = document.getElementById('novelModalTitle');
const novelModalAuthor = document.getElementById('novelModalAuthor');
const novelModalGenre = document.getElementById('novelModalGenre');
const novelModalRating = document.getElementById('novelModalRating');
const novelModalDesc = document.getElementById('novelModalDesc');
const novelModalClose = document.getElementById('novelModalClose');
const novelModalCover = document.getElementById('novelModalCover');

const dashboard = document.getElementById('dashboard');
const logoutBtn = document.getElementById('logoutBtn');
const userEmailDiv = document.getElementById('userEmail');

const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const settingsClose = document.getElementById('settingsClose');
const settingsLogout = document.getElementById('settingsLogout');
const settingsName = document.getElementById('settingsName');
const settingsAddress = document.getElementById('settingsAddress');
const settingsEmail = document.getElementById('settingsEmail');

addNovelBtn.addEventListener('click', ()=>{
  addNovelModal.style.display = 'flex';
});

addNovelCancel.addEventListener('click', ()=>{ addNovelModal.style.display='none'; });
novelModalClose.addEventListener('click', ()=>{ novelModal.style.display='none'; });

saveNovel.addEventListener('click', async ()=>{
  const title = document.getElementById('novelTitle').value.trim();
  const author = document.getElementById('novelAuthor').value.trim();
  const genre = document.getElementById('novelGenre').value;
  const desc = document.getElementById('novelDesc').value.trim();
  const coverFile = document.getElementById('novelCover').files[0];
  if(!title || !author) return alert('Please provide title and author');
  try{
    let coverBase64 = '';
    if(coverFile){
      coverBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(coverFile);
      });
    }
    const doc = {
      title, author, genre, desc, coverBase64, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('novels').add(doc);
    alert('Novel added');
    addNovelModal.style.display = 'none';
    loadNovels();
  }catch(e){alert(e.message)}
});

async function populateGenres(){
  const snap = await db.collection('novels').get();
  const genres = new Set();
  snap.forEach(d=>{const g = d.data().genre; if(g) genres.add(g)});
  genreFilter.innerHTML = '<option value="">All Genres</option>' + Array.from(genres).map(g=>`<option value="${g}">${g}</option>`).join('');
}

let currentPage = 1;
let lastVisible = null;
let firstVisible = null;
let pageStack = [];

const novelsPerPage = 9;

const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const pageIndicator = document.getElementById('pageIndicator');

async function loadNovels(direction = 'none') {
  novelGrid.innerHTML = '<div style="grid-column:1/-1;color:var(--muted)">Loading...</div>';
  try {
    let q = db.collection('novels');
    const genre = genreFilter.value;
    const search = searchInput.value.trim().toLowerCase();
    if (genre) q = q.where('genre', '==', genre);
    q = q.orderBy('createdAt', 'desc');

    if (direction === 'next' && lastVisible) {
      q = q.startAfter(lastVisible);
    } else if (direction === 'prev' && pageStack.length > 1) {
      // Go back to the previous page's first doc
      q = q.startAt(pageStack[pageStack.length - 2]);
    }

    const snap = await q.limit(novelsPerPage).get();
    const docs = [];
    snap.forEach(d => { const obj = d.data(); obj.id = d.id; docs.push(obj); });

    // Save cursors for pagination
    if (!snap.empty) {
      firstVisible = snap.docs[0];
      lastVisible = snap.docs[snap.docs.length - 1];
      if (direction === 'next') {
        pageStack.push(firstVisible);
        currentPage++;
      } else if (direction === 'prev') {
        pageStack.pop();
        currentPage--;
      } else if (direction === 'none') {
        // Reset stack on new search/filter
        pageStack = [firstVisible];
        currentPage = 1;
      }
    }

    // Client-side search filtering for title/author (optional, but keep for now)
    const filtered = docs.filter(d => {
      if (!search) return true;
      return (d.title || '').toLowerCase().includes(search) || (d.author || '').toLowerCase().includes(search);
    });

    if (!filtered.length) novelGrid.innerHTML = '<div style="grid-column:1/-1;color:var(--muted)">No novels found.</div>';
    else novelGrid.innerHTML = filtered.map(renderCard).join('');

    // Update pagination controls
    pageIndicator.textContent = `Page ${currentPage}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = snap.size < novelsPerPage;

    populateGenres();
  } catch (e) {
    novelGrid.innerHTML = '<div style="grid-column:1/-1;color:var(--muted)">Error loading novels</div>';
    console.error(e);
  }
}

// Pagination button handlers
prevPageBtn.addEventListener('click', () => loadNovels('prev'));
nextPageBtn.addEventListener('click', () => loadNovels('next'));

// Reset pagination on filter/search
genreFilter.addEventListener('change', () => loadNovels('none'));
searchInput.addEventListener('input', debounce(() => loadNovels('none'), 400));

function showNovelModal(novel) {
  if(novel.coverBase64) {
    novelModalCover.src = novel.coverBase64;
    novelModalCover.style.display = '';
  } else {
    novelModalCover.src = '';
    novelModalCover.style.display = 'none';
  }
  novelModalTitle.textContent = novel.title;
  novelModalAuthor.textContent = 'by ' + novel.author;
  novelModalGenre.textContent = 'Genre: ' + (novel.genre || '—');
  novelModalRating.textContent = '';
  novelModalDesc.textContent = novel.desc || '';
  novelModal.style.display = 'flex';
}

function renderCard(n){
  const cover = n.coverBase64 ? `<img src="${escapeHtml(n.coverBase64)}" alt="cover"/>` : `<div style="padding:20px;color:var(--muted)">No Cover</div>`;
  return `
  <article class="card">
    <div class="cover">${cover}</div>
    <div class="meta">
      <div class="title">${escapeHtml(n.title)}</div>
      <div class="author">by ${escapeHtml(n.author)} • <span style="font-size:12px">${escapeHtml(n.genre||'—')}</span></div>
      <div style="margin-top:8px;color:var(--muted);font-size:13px">${escapeHtml((n.desc||'').slice(0,140))}${(n.desc||'').length>140?'...':''}</div>
      <button class="btn" onclick='window.showNovelDetails("${n.id}")'>View Details</button>
    </div>
  </article>
  `;
}

window.showNovelDetails = async function(id) {
  try {
    const doc = await db.collection('novels').doc(id).get();
    if(doc.exists) {
      showNovelModal(doc.data());
    }
  } catch(e) {
    alert('Error loading novel details');
  }
};

function escapeHtml(str){ return String(str).replace(/[&<>"']/g, (s)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])) }

function debounce(fn, t){ let time; return (...a)=>{ clearTimeout(time); time = setTimeout(()=>fn(...a), t); } }

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    if (firebase && firebase.auth) {
      firebase.auth().signOut().then(() => {
        window.location = "login.html"; // Redirect to login page after logout
      });
    } else {
      window.location = "login.html";
    }
  });
}

// Show user email if logged in
if (firebase && firebase.auth) {
  firebase.auth().onAuthStateChanged(user => {
    if (user && userEmailDiv) {
      userEmailDiv.textContent = user.email;
    } else if (userEmailDiv) {
      userEmailDiv.textContent = '';
    }
  });
}

if (settingsBtn) {
  settingsBtn.addEventListener('click', async () => {
    // Get current user
    const user = firebase.auth().currentUser;
    if (user) {
      // Fetch user info from Firestore
      const doc = await firebase.firestore().collection('users').doc(user.uid).get();
      const data = doc.data() || {};
      settingsName.textContent = data.name || '';
      settingsAddress.textContent = data.address || '';
      settingsEmail.textContent = user.email || '';
      settingsModal.style.display = 'flex';
    }
  });
}
if (settingsClose) {
  settingsClose.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });
}
if (settingsLogout) {
  settingsLogout.addEventListener('click', () => {
    firebase.auth().signOut().then(() => {
      window.location = "login.html";
    });
  });
}

loadNovels('none');

