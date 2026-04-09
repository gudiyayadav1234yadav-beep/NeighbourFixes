const API = "";  // empty = same origin; change to "https://your-app.vercel.app" if needed

let allProviders = [];
let categories = ["All"];
let activeCat = "All";
let selectedProvider = null;

// ── Boot ──────────────────────────────────────────────────
async function init() {
  await Promise.all([loadStats(), loadCategories(), loadProviders()]);
}

// ── Stats ─────────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await fetch(`${API}/api/stats`);
    const { providers, categories, bookings } = await res.json();
    document.getElementById("s-providers").textContent = providers;
    document.getElementById("s-categories").textContent = categories;
    document.getElementById("s-bookings").textContent = bookings;
  } catch (e) {
    console.error("Stats error", e);
  }
}

// ── Categories ────────────────────────────────────────────
async function loadCategories() {
  try {
    const res = await fetch(`${API}/api/categories`);
    const { categories: cats } = await res.json();
    categories = cats;
    renderCats();
  } catch (e) {
    categories = ["All"];
    renderCats();
  }
}

function renderCats() {
  document.getElementById("cats").innerHTML = categories
    .map(c => `<button class="cat${c === activeCat ? " active" : ""}" onclick="setCat('${c}')">${c}</button>`)
    .join("");
}

function setCat(c) {
  activeCat = c;
  renderCats();
  filterServices();
}

// ── Providers ─────────────────────────────────────────────
async function loadProviders() {
  try {
    const res = await fetch(`${API}/api/providers`);
    const { providers } = await res.json();
    allProviders = providers;
    renderGrid(providers);
  } catch (e) {
    document.getElementById("grid").innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div>Could not load services. Please try again.</div>`;
  }
}

function filterServices() {
  const q = document.getElementById("search").value.toLowerCase().trim();
  const filtered = allProviders.filter(p => {
    const matchCat = activeCat === "All" || p.category === activeCat;
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.area.toLowerCase().includes(q);
    return matchCat && matchQ;
  });
  renderGrid(filtered);
}

function renderGrid(providers) {
  const grid = document.getElementById("grid");
  if (!providers.length) {
    grid.innerHTML = `<div class="empty"><div class="empty-icon">🔍</div>No services found. Try a different search.</div>`;
    return;
  }
  grid.innerHTML = providers.map(p => `
    <div class="card">
      <div class="card-top">
        <div class="avatar">${p.emoji || "🛠️"}</div>
        <div>
          <div class="card-name">${p.name}</div>
          <div class="card-cat">${p.category} · ${p.area}</div>
          <span class="badge">Verified</span>
        </div>
      </div>
      <div class="rating">
        <span class="stars">${"★".repeat(Math.round(p.rating))}${"☆".repeat(5 - Math.round(p.rating))}</span>
        <span class="rating-val">${p.rating} (${p.reviews} reviews)</span>
      </div>
      <div class="card-meta">
        <div class="meta-item">Experience<br><strong>${p.experience}</strong></div>
        <div class="meta-item">Price<br><strong>${p.price}</strong></div>
        <div class="meta-item">Available<br><strong>${p.availability}</strong></div>
        <div class="meta-item">Phone<br><strong>${p.phone}</strong></div>
      </div>
      <div class="card-actions">
        <button class="btn-call" onclick="callProvider('${p.phone}', '${p.name}')">📞 Call</button>
        <button class="btn-book" onclick="openBooking(${p.id})">Book Now</button>
      </div>
    </div>
  `).join("");
}

function callProvider(phone, name) {
  showToast(`Calling ${name} at ${phone}...`, "success");
  setTimeout(() => { window.location.href = `tel:${phone}`; }, 400);
}

// ── Booking ───────────────────────────────────────────────
function openBooking(id) {
  selectedProvider = allProviders.find(p => p.id === id);
  document.getElementById("modal-title").textContent = `Book — ${selectedProvider.name}`;
  document.getElementById("modal-subtitle").textContent = `${selectedProvider.category} · ${selectedProvider.price}`;
  document.getElementById("b-date").min = new Date().toISOString().split("T")[0];
  document.getElementById("b-name").value = "";
  document.getElementById("b-phone").value = "";
  document.getElementById("b-email").value = "";
  document.getElementById("b-date").value = "";
  document.getElementById("b-time").value = "";
  document.getElementById("b-note").value = "";
  document.getElementById("confirm-btn").disabled = false;
  document.getElementById("confirm-btn").textContent = "Confirm Booking";
  document.getElementById("modal-overlay").classList.add("show");
}

function closeBookingModal() {
  document.getElementById("modal-overlay").classList.remove("show");
}

function closeModal(e) {
  if (e.target === document.getElementById("modal-overlay")) closeBookingModal();
}

async function confirmBooking() {
  const name  = document.getElementById("b-name").value.trim();
  const phone = document.getElementById("b-phone").value.trim();
  const email = document.getElementById("b-email").value.trim();
  const date  = document.getElementById("b-date").value;
  const time  = document.getElementById("b-time").value;
  const note  = document.getElementById("b-note").value.trim();

  if (!name || !phone || !date || !time) {
    showToast("Please fill all required fields", "error");
    return;
  }
  if (!/^\d{10}$/.test(phone)) {
    showToast("Enter a valid 10-digit phone number", "error");
    return;
  }

  const btn = document.getElementById("confirm-btn");
  btn.disabled = true;
  btn.textContent = "Booking...";

  try {
    const res = await fetch(`${API}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider_id: selectedProvider.id,
        customer_name: name,
        customer_phone: phone,
        customer_email: email || null,
        booking_date: date,
        time_slot: time,
        problem_desc: note || null,
      }),
    });
    const data = await res.json();
    if (data.success) {
      closeBookingModal();
      showToast(`Booking confirmed! ID #${data.booking_id}${email ? " — check your email" : ""}`, "success");
      await loadStats();
      // refresh reviews count in UI
      await loadProviders();
    } else {
      throw new Error(data.error || "Unknown error");
    }
  } catch (e) {
    showToast("Booking failed: " + e.message, "error");
    btn.disabled = false;
    btn.textContent = "Confirm Booking";
  }
}

// ── Provider register modal ───────────────────────────────
function openProviderModal() {
  document.getElementById("provider-overlay").classList.add("show");
}
function closeProviderModal(e) {
  if (!e || e.target === document.getElementById("provider-overlay")) {
    document.getElementById("provider-overlay").classList.remove("show");
  }
}

// ── Toast ─────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 4000);
}

// ── Start ─────────────────────────────────────────────────
init();
