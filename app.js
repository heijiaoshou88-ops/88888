// —— 后端只用 prepare：一次性返回所有中奖ID，前端逐个播 —— //
const PREPARE_URL = "https://9defc7d31d73656585fca00da1d3bf19.loophole.site/api/draw/prepare";

let participants = [];
let winnersQueue = [];
let drawId = null;
let speedFactor = 1;       // 1/2/5/10
const ROW_H = 40;          // 与 CSS 行高一致
const BASE_SPIN_MS = 3000; // 基础 3s

// DOM
const startPage = document.getElementById("startPage");
const drawPage  = document.getElementById("drawPage");
const slotList  = document.getElementById("slotList");
const winnersList = document.getElementById("winnersList");

// ---------- 小工具：更稳的取值 & 兼容各种响应包裹 ----------
function getPath(obj, path) {
  // path: "data.draw_id" / "draw_id"
  return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}
function pickFirst(obj, paths, fallback=null) {
  for (const p of paths) {
    const v = getPath(obj, p);
    if (v !== undefined && v !== null) return v;
  }
  return fallback;
}
function toArray(v) {
  if (Array.isArray(v)) return v;
  if (v === undefined || v === null) return [];
  return [v];
}
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---------- 提交设置（prepare） ----------
document.getElementById("prepareBtn").addEventListener("click", async () => {
  participants = document.getElementById("participantsInput")
    .value.trim().split("\n").map(s => s.trim()).filter(Boolean);
  const winnersCount = parseInt(document.getElementById("winnersCount").value, 10);

  if (!participants.length || !Number.isFinite(winnersCount) || winnersCount <= 0) {
    alert("请填写完整信息");
    return;
  }

  try {
    const body = {
      participants,
      winners_count: winnersCount,
      banner: null,
      font_style: null
    };
    console.log("🔸 发送到后端:", body);

    const res = await fetch(PREPARE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

    const raw = await res.json();
    console.log("🔹 prepare返回原始:", raw);

    // ✅ 兼容多种结构：{draw_id,...} 或 {ok:true,data:{draw_id,...}} 或 {result:{...}} 等
    drawId = pickFirst(raw, ["draw_id", "data.draw_id", "result.draw_id", "payload.draw_id", "id"], null);
    const winnersRaw = pickFirst(raw, ["winners", "data.winners", "result.winners", "payload.winners"], []);
    winnersQueue = toArray(winnersRaw).map(String); // 统一转字符串，避免比较失败

    console.log("✅ 已解析:", { drawId, winnersQueue });

    if (!winnersQueue.length) {
      alert("后端未返回 winners，请检查响应。");
      return;
    }

    // 切换页面
    startPage.classList.add("hidden");
    setTimeout(() => drawPage.classList.remove("hidden"), 400);

  } catch (err) {
    console.error("❌ 准备失败:", err);
    alert("后端连接失败或响应不合法");
  }
});

// ---------- 倍速 ----------
document.querySelectorAll(".speed-btn").forEach(img => {
  img.addEventListener("click", () => {
    const f = parseInt(img.dataset.speed, 10);
    if (Number.isFinite(f) && f > 0) speedFactor = f;
  });
});

// ---------- 开始：一次点击播完整个 winnersQueue ----------
document.getElementById("startBtn").addEventListener("click", async () => {
  if (!drawId || !winnersQueue.length) {
    alert("请先在开始页提交并确保后端返回 winners");
    return;
  }
  const btn = document.getElementById("startBtn");
  btn.style.pointerEvents = "none";
  try {
    while (winnersQueue.length) {
      const winner = winnersQueue.shift();
      await playOne(winner);
      await wait(300); // 回合间小停顿
    }
  } finally {
    btn.style.pointerEvents = "";
  }
});

// ---------- 复制中奖名单 ----------
document.getElementById("copyBtn").addEventListener("click", () => {
  const text = [...winnersList.querySelectorAll("li")].map(li => li.textContent).join("\n");
  navigator.clipboard.writeText(text || "");
  alert("已复制中奖名单");
});

// ---------- 播放单个中奖：列表滚动→停在目标→高亮→落入名单→粒子 ----------
async function playOne(winner) {
  // 1) 填充滚动列表：把 participants 循环很多遍，保证滚动距离足够
  const cycles = 14;
  let html = "";
  for (let i = 0; i < cycles; i++) html += participants.map(id => `<li>${id}</li>`).join("");
  slotList.innerHTML = html;

  // 2) 找到目标 winner 在大列表的首次出现；如果没有，兜底追加一次
  let idx = [...slotList.children].findIndex(li => li.textContent === String(winner));
  if (idx < 0) {
    slotList.insertAdjacentHTML("beforeend", `<li>${String(winner)}</li>`);
    idx = slotList.children.length - 1;
  }

  // 3) 目标停在可见区域的“第3行”（中间偏上）
  const targetRow = 2; // 从 0 开始 → 第3行
  const stopRow = Math.max(0, idx - targetRow);
  const targetY = -stopRow * ROW_H;

  const spinMs = Math.max(300, Math.round(BASE_SPIN_MS / speedFactor));
  slotList.style.transition = `transform ${spinMs}ms cubic-bezier(.15,.85,.25,1)`;
  slotList.style.transform = `translateY(${targetY}px)`;

  await wait(spinMs + 60);

  // 4) 高亮中奖项
  const liHit = slotList.children[idx];
  if (liHit) liHit.classList.add("highlight");

  // 5) 加入 winners 框
  const li = document.createElement("li");
  li.textContent = String(winner);
  winnersList.appendChild(li);

  // 6) 粒子掉落
  spawnParticles();

  await wait(900);
}

// ---------- 粒子 ----------
function spawnParticles() {
  const hostId = "particlesHost";
  let host = document.getElementById(hostId);
  if (!host) {
    host = document.createElement("div");
    host.id = hostId;
    document.body.appendChild(host);
  }

  const imgs = ["coin1.png","coin2.png","coin3.png","gold1.png","gold2.png","gold3.png","diamond.png"];
  const count = 15 + Math.floor(Math.random() * 16); // 15~31

  for (let i = 0; i < count; i++) {
    const el = document.createElement("img");
    el.src = "img/" + imgs[Math.floor(Math.random() * imgs.length)];
    el.className = "particle";
    el.style.left = Math.random() * window.innerWidth + "px";
    el.style.transform = `translateY(-50px) rotate(${Math.random()*360}deg)`;
    host.appendChild(el);

    requestAnimationFrame(() => {
      el.style.transform = `translateY(${window.innerHeight + 80}px) rotate(${Math.random()*720}deg)`;
      el.style.opacity = "0";
    });

    setTimeout(() => el.remove(), 3200);
  }
}
