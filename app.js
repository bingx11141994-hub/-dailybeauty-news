const DATA_URL = "data/news.json";
const CATEGORIES = ["全部", "韓系保養", "醫美趨勢", "新品牌動態", "產業動態"];

let allItems = [];
let activeCategory = "全部";

async function init() {
  try {
    const res = await fetch(`${DATA_URL}?t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allItems = Array.isArray(data.items) ? data.items : [];
    renderMeta(data);
  } catch (err) {
    renderMeta(null);
    allItems = [];
    document.getElementById("feed").innerHTML =
      `<p class="feed__empty">資料讀取失敗，可能是 data/news.json 還沒建立，或 GitHub Pages 剛部署完還在生效中。稍後重新整理看看。</p>`;
    console.error(err);
    return;
  }

  renderFilters();
  renderFeed();
  renderRadar();
}

function renderMeta(data) {
  const updatedEl = document.getElementById("updated-at");
  const countEl = document.getElementById("item-count");

  if (!data) {
    updatedEl.textContent = "尚未取得更新時間";
    countEl.textContent = "— 則";
    return;
  }

  const updated = data.updated_at ? new Date(data.updated_at) : null;
  updatedEl.textContent = updated
    ? `最後更新：${formatAbsolute(updated)}`
    : "最後更新：未知";
  countEl.textContent = `共 ${data.count ?? allItems.length} 則`;
}

function renderFilters() {
  const wrap = document.getElementById("filters");
  wrap.innerHTML = "";

  CATEGORIES.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "filter-pill";
    btn.type = "button";
    btn.textContent = cat === "全部" ? "全部" : cat;
    btn.dataset.active = String(cat === activeCategory);
    btn.addEventListener("click", () => {
      activeCategory = cat;
      renderFilters();
      renderFeed();
    });
    wrap.appendChild(btn);
  });
}

function renderFeed() {
  const feed = document.getElementById("feed");
  const items =
    activeCategory === "全部"
      ? allItems
      : allItems.filter((i) => i.category === activeCategory);

  if (items.length === 0) {
    feed.innerHTML = `<p class="feed__empty">這個分類今天還沒有資料——可能是排程尚未執行，或今天剛好沒有命中的新聞，晚點再回來看看。</p>`;
    return;
  }

  feed.innerHTML = "";
  items.forEach((item, idx) => {
    feed.appendChild(buildRow(item, idx));
  });
}

function buildRow(item, idx) {
  const row = document.createElement("article");
  row.className = "article-row";
  row.dataset.category = item.category || "產業動態";
  row.style.animationDelay = `${Math.min(idx * 35, 400)}ms`;

  const dose = document.createElement("div");
  dose.className = "dose-meter";
  const fill = document.createElement("div");
  fill.className = "dose-meter__fill";
  fill.style.setProperty("--fill", `${recencyFill(item.published)}%`);
  dose.appendChild(fill);
  row.appendChild(dose);

  const body = document.createElement("div");

  const eyebrow = document.createElement("div");
  eyebrow.className = "article-row__eyebrow";
  eyebrow.innerHTML = `
    <span class="category-tag">${escapeHtml(item.category || "")}</span>
    <span>${escapeHtml(item.source || "未知來源")}</span>
    <span>·</span>
    <span>${relativeTime(item.published)}</span>
  `;
  body.appendChild(eyebrow);

  const title = document.createElement("a");
  title.className = "article-row__title";
  title.href = item.link || "#";
  title.target = "_blank";
  title.rel = "noopener noreferrer";
  title.textContent = item.title || "（無標題）";
  body.appendChild(title);

  if (item.summary) {
    const summary = document.createElement("p");
    summary.className = "article-row__summary";
    summary.textContent = item.summary;
    body.appendChild(summary);
  }

  row.appendChild(body);
  return row;
}

function renderRadar() {
  const catCounts = countBy(allItems, "category");
  const sourceCounts = countBy(allItems, "source");

  document.getElementById("radar-categories").innerHTML =
    `<h3 style="font-family:var(--font-mono); font-size:0.75rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--ink-soft); margin:0 0 0.4rem;">分類熱度</h3>` +
    radarRows(catCounts);

  document.getElementById("radar-sources").innerHTML =
    `<h3 style="font-family:var(--font-mono); font-size:0.75rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--ink-soft); margin:0 0 0.4rem;">今日主要來源</h3>` +
    radarRows(sourceCounts, 6);
}

function radarRows(counts, limit = 10) {
  const entries = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (entries.length === 0) {
    return `<p style="font-size:0.8rem; color:var(--ink-soft);">目前沒有資料</p>`;
  }

  const max = entries[0][1];
  return entries
    .map(
      ([label, count]) => `
      <div class="radar-row">
        <span class="radar-row__label">${escapeHtml(label || "未知")}</span>
        <span class="radar-row__count">${count}</span>
        <span class="radar-row__bar">
          <span class="radar-row__bar-fill" style="width:${Math.max(
            8,
            Math.round((count / max) * 100)
          )}%"></span>
        </span>
      </div>`
    )
    .join("");
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const k = item[key] || "未知";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

function recencyFill(publishedIso) {
  if (!publishedIso) return 15;
  const hours = (Date.now() - new Date(publishedIso).getTime()) / 36e5;
  if (hours <= 6) return 100;
  if (hours <= 24) return 75;
  if (hours <= 72) return 50;
  if (hours <= 24 * 14) return 30;
  return 15;
}

function relativeTime(publishedIso) {
  if (!publishedIso) return "時間未知";
  const diffMs = Date.now() - new Date(publishedIso).getTime();
  const hours = diffMs / 36e5;
  if (hours < 1) return "1小時內";
  if (hours < 24) return `${Math.round(hours)}小時前`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}天前`;
  return formatAbsolute(new Date(publishedIso));
}

function formatAbsolute(date) {
  return date.toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

init();
