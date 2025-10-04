// 只用 prepare：一次性返回所有中奖ID，前端逐个播
const PREPARE_URL = "https://9defc7d31d73656585fca00da1d3bf19.loophole.site/api/draw/prepare";

let participants = [];
let winnersQueue = [];
let drawId = null;
let speedFactor = 1;       // 1 / 2 / 5 / 10
const ROW_H = 40;          // 与 CSS 行高一致
const BASE_SPIN_MS = 3000; // 基础 3s

// DOM
const startPage   = document.getElementById("startPage");
const drawPage    = document.getElementById("drawPage");
const slotList    = document.getElementById("slotList");
const winnersList = document.getElementById("winnersList");

// 工具
function getPath(obj, path) {
  return path.split(".").reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
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
const wait = (ms) => new Promise(r => setTimeout(r, ms));

// 1) 提交设置（prepare）
document.getElementById("prepareBtn").addEventListener("click", async () => {
  participants = document.getElementById("participantsInput").value
    .trim().split("\n").map(s => s.trim()).filter(Boolean);
  const winnersCount = parseInt(document.getElementById("winnersCount").value, 10);

  if (!participants.length || !Number.isFinite(winnersCount) || winnersCount <= 0) {
    alert("请填写完整信息");
    return;
  }

  try {
    const body = { participants, winners_count: winnersCount, banner: null, font_style: null };
    console.log("🔸 发送到后端:", body);

    const res = await fetch(PREPARE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

    const raw = await res.json();
    console.log("🔹 prepare返回原始:", raw);

    drawId = pickFirst(raw, ["draw_id","data.draw_id","result.draw_id","payload.draw_id","id"], null);
    const winnersRaw = pickFirst(raw, ["winners","data.winners","result.winners","payload.winners"], []);
    winnersQueue = toArray(winnersRaw).map(String);

    console.log("✅ 已解析:", { drawId, winnersQueue });

    if (!winnersQueue.length) {
      alert("后端未返回 winners，请检查响应。");
      return;
    }

    // 切换到抽奖页
    startPage.classList.add("hidden");
    setTimeout(() => drawPage.classList.remove("hidden"), 400);

  } catch (err) {
    console.error("❌ 准备失败:", err);
    alert("后端连接失败或响应不合法");
  }
});

// 2) 倍速
document.querySelectorAll(".speed-btn").forEach(img => {
  img.addEventListener("click", () => {
    const f = parseInt(img.dataset.speed, 10);
    if (Number.isFinite(f) && f > 0) speedFactor = f;
  });
});

// 3) 开始：一次点击自动播完整个 winnersQueue
document.getElementById("startBtn").addEventListener("click", async () => {
  if (!drawId || !winnersQueue.length) {
    alert("请先在开始页提交并确保后端返回 winners");
    return;
  }
  const btn = document.getElementById("startBtn");
  btn.style.pointerEvents = "none";
  try {
    // 每次点击从头到尾播完
    while (winnersQueue.length) {
      const winner = winnersQueue.shift();
      await playOne(winner);
      await wait(300); // 回合间停顿
    }
  } finally {
    btn.style.pointerEvents = "";
  }
});

// 4) 复制中奖名单
document.getElementById("copyBtn").addEventListener("click", () => {
  const text = [...winnersList.querySelectorAll("li")].map(li => li.textContent).join("\n");
  navigator.clipboard.writeText(text || "");
  alert("已复制中奖名单");
});

// 5) 播放单个中奖：列表滚动→停在目标→高亮→入框→粒子
async function playOne(winner) {
  // —— 重置上一次动画的 transform，避免“卡住不动”的错觉
  slotList.style.transition = "none";
  slotList.style.transform  = "translateY(0)";
  // 强制刷新样式（reflow）
  void slotList.offsetHeight;

  // —— 组装滚动列表：把 participants 多轮展开，保证滚动距离
  const cycles = Math.max(12, Math.ceil(3000 / Math.max(1, participants.length))); // 自适应滚动长度
  let html = "";
  for (let i = 0; i < cycles; i++) html += participants.map(id => `<li>${id}</li>`).join("");
  slotList.innerHTML = html;

  const items = [...slotList.children];
  let idx = items.findIndex(li => li.textContent === String(winner));

  if (idx < 0) {
    // 兜底：如果 winner 不在 participants 里，就追加一条
    slotList.insertAdjacentHTML("beforeend", `<li>${String(winner)}</li>`);
    idx = slotList.children.length - 1;
  }

  // 让 winner 停在可见区域第3行（中间偏上）
  const targetRow = 2;                 // 0,1,2,3,4 → 第3行
  const stopRow   = Math.max(0, idx - targetRow);
  const targetY   = -stopRow * ROW_H;
  const spinMs    = Math.max(300, Math.round(BASE_SPIN_MS / speedFactor));

  console.log("🎬 播放一轮:", { winner, totalItems: slotList.children.length, idx, stopRow, targetY, spinMs });

  // —— 开始滚动
  // 这里才设置 transition，避免初始重置时也产生动画
  slotList.style.transition = `transform ${spinMs}ms cubic-bezier(.15,.85,.25,1)`;
  slotList.style.transform  = `translateY(${targetY}px)`;

  await wait(spinMs + 60);

  // —— 高亮中奖项
  const liHit = slotList.children[idx];
  if (liHit) liHit.classList.add("highlight");

  // —— 放入 winners 框
  const li = document.createElement("li");
  li.textContent = String(winner);
  winnersList.appendChild(li);

  // —— 粒子
  spawnParticles();

  await wait(900);
}

// 6) 粒子
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
