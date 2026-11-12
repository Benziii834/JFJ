const jobs = [
  { id: 1, title: "Paint a 2BHK flat", category: "Painting", pay: 1800, payType: "/ day", place: "Beltola", when: "Starts tomorrow", km: 1.2, spots: 2, icon: "🎨", color: "#dbe7ff", description: "Paint 2 rooms and the hall of a flat. Brushes and paint provided." },
  { id: 2, title: "Deliver packages", category: "Delivery", pay: 600, payType: "fixed", place: "Khanapara", when: "Today, 4 PM", km: 0.8, spots: 1, icon: "📦", color: "#ffe9d6", description: "Help deliver packages around the neighbourhood. Own bike preferred." },
  { id: 3, title: "Carry bricks at site", category: "Construction", pay: 700, payType: "/ day", place: "Dispur", when: "Mon, 2 Nov", km: 2.1, spots: 5, icon: "🧱", color: "#fde0e0", description: "Carry and stack building material at a small construction site." },
  { id: 4, title: "Shop helper for Diwali", category: "Retail", pay: 500, payType: "/ day", place: "Paltan Bazaar", when: "Sat, 7 Nov", km: 3.4, spots: 3, icon: "🛍️", color: "#e3f7ec", description: "Help customers and arrange stock in a busy clothes shop." },
  { id: 5, title: "Wedding setup crew", category: "Events", pay: 2400, payType: "fixed", place: "Ganeshguri", when: "Sun, 8 Nov", km: 2.7, spots: 4, icon: "🎪", color: "#f1e4ff", description: "Set up chairs, tents and decorations for a wedding function." },
];

const categories = ["All gigs", "Painting", "Delivery", "Construction", "Retail", "Events"];

const main = document.querySelector("main");
const searchBox = document.getElementById("search");
const chipsBox = document.getElementById("chips");
const countText = document.getElementById("count");
const dialog = document.getElementById("jobDialog");

let activeCategory = "All gigs";

function showChips() {
  chipsBox.innerHTML = "";
  categories.forEach(function (cat) {
    const cls = cat === activeCategory ? "chip active" : "chip";
    chipsBox.innerHTML += `<button class="${cls}" data-cat="${cat}">${cat}</button>`;
  });
}

function showJobs() {
  const text = searchBox.value.toLowerCase();

  const list = jobs
    .filter(function (job) {
      const categoryOk = activeCategory === "All gigs" || job.category === activeCategory;
      const textOk = job.title.toLowerCase().includes(text);
      return categoryOk && textOk;
    })
    .sort(function (a, b) {
      return a.km - b.km;
    });

  countText.textContent = list.length + " gigs near you";
  main.innerHTML = "";

  if (list.length === 0) {
    main.innerHTML = '<p class="empty">No gigs found 😢</p>';
    return;
  }

  list.forEach(function (job) {
    main.innerHTML += `
      <article data-id="${job.id}">
        <div class="thumb" style="background:${job.color}">${job.icon}</div>
        <div class="info">
          <p class="cat">${job.category} · ${job.km} km</p>
          <h3>${job.title}</h3>
          <p class="meta">${job.place} · ${job.when}</p>
          <div class="bottom">
            <span class="pay">₹${job.pay} ${job.payType}</span>
            <span class="spots">${job.spots} spots left</span>
          </div>
        </div>
      </article>
    `;
  });
}

searchBox.addEventListener("input", showJobs);

chipsBox.addEventListener("click", function (e) {
  const cat = e.target.dataset.cat;
  if (!cat) return;
  activeCategory = cat;
  showChips();
  showJobs();
});

main.addEventListener("click", function (e) {
  const card = e.target.closest("article");
  if (!card) return;

  const id = Number(card.dataset.id);
  const job = jobs.find(function (j) {
    return j.id === id;
  });

  document.getElementById("dTitle").textContent = job.title;
  document.getElementById("dInfo").textContent = "₹" + job.pay + " " + job.payType + " · " + job.place;
  document.getElementById("dDesc").textContent = job.description;
  dialog.showModal();
});

document.getElementById("closeBtn").addEventListener("click", function () {
  dialog.close();
});

document.getElementById("applyBtn").addEventListener("click", function () {
  alert("Applied! ✅ (fake for now, the real one comes with the backend)");
  dialog.close();
});

showChips();
showJobs();