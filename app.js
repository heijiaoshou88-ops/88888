// app.js - 互动抽奖版（对齐 index.html 的元素 & Telegram.WebApp 回传）

// ⚠️ 换成你后端实际地址（保持 /api/draw/prepare）
const API_URL = "https://9defc7d31d73656585fca00da1d3bf19.loophole.site/api/draw/prepare";

/* ========== 小工具 ========== */
function $(id) { return document.getElementById(id); }

function showMessage(msg, type = "info") {
  // 优先 resultBox；没有就落到 slot-display；再不行就 console
  const box = $("resultBox");
  if (box) {
    const p = document.createElement("div");
    p.className = `msg msg-${type}`;
    p.textContent = msg;
    box.prepend(p);
    setTimeout(() => p.remove(), 8000);
    return;
  }
  const slot = $("slot-display");
  if (slot) slot.textContent = msg;
  console[type === "error" ? "error" : "log"](msg);
}

function parseParticipants(text) {
  if (!text) return [];
  return text.split(/[\n,;，；]+/).map(s => s.trim()).filter(Boolean);
}

/* ========== 抽奖请求 ========== */
async function prepareDrawRequest(participants, winners_count = 1, timeoutMs = 15000) {
  const body = { participants, winners_count: Number(winners_count) || 1 };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      let errText = `HTTP ${resp.status}`;
      try { errText = JSON.stringify(await resp.json()); } catch {}
      throw new Error("Server error: " + errText);
    }
    return await resp.json();
  } catch (err) {
    if (err.name === "AbortError") throw new Error(`请求超时（${timeoutMs}ms）`);
    throw err;
  }
}

/* ========== 画面切换 & UI ========== */
function switchScreen(to) {
  const start = $("start-screen");
  const draw = $("draw-screen");
  if (!start || !draw) return;
  if (to === "draw") {
    start.classList.add("hidden");
    draw.classList.remove("hidden");
  } else {
    draw.classList.add("hidden");
    start.classList.remove("hidden");
  }
}

function setBanner(text, fontStyle) {
  const el = $("banner-text");
  if (!el) return;
  el.className = "";              // 清空旧 class
  el.textContent = text || "";    // 文案
  // 应用字体效果（CSS 已提供 .浮雕/.发光/.描边/.霓虹）:contentReference[oaicite:5]{index=5}
  if (fontStyle && ["浮雕","发光","描边","霓虹"].includes(fontStyle)) {
    el.classList.add(fontStyle);
  }
}

function renderWinnersList(winners) {
  const ul = $("winners-ul");
  if (!ul) return;
  ul.innerHTML = "";
  winners.forEach((w, idx) => {
    const li = document.createElement("li");
    li.textContent = `${idx + 1}. ${w}`;
    ul.appendChild(li);
  });
}

function copyWinnersToClipboard() {
  const ul = $("winners-ul");
  if (!ul) return;
  const text = Array.from(ul.querySelectorAll("li")).map(li => li.textContent).join("\n");
  navigator.clipboard.writeText(text).then(
    () => showMessage("已复制中奖名单到剪贴板 ✅", "success"),
    () => showMessage("复制失败，请手动选择复制。", "error")
  );
}

/* ========== 简单槽动画 ========== */
let playbackSpeed = 1;  // 1 / 2 / 5 / 10
function setSpeed(x) {
  playbackSpeed = Number(x) || 1;
  showMessage(`播放速度：${playbackSpeed}x`);
}

function burstConfetti() {
  const canvas = $("confetti");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  setTimeout(() => ctx.clearRect(0, 0, canvas.width, canvas.height), 500);
}

async function playSlotAnimation(finalText) {
  const slot = $("slot-display");
  if (!slot) return;
  const frames = ["▦▦▦", "▧▧▧", "▨▨▨", "▩▩▩", "▥▥▥", "▤▤▤"];
  const tick = Math.max(35 / playbackSpeed, 8); // 速度越快 tick 越小
  let t = 0, loopMs = 800 / playbackSpeed;
  const start = performance.now();

  return new Promise(resolve => {
    const id = setInterval(() => {
      slot.textContent = frames[t++ % frames.length];
      if (performance.now() - start >= loopMs) {
        clearInterval(id);
        slot.textContent = String(finalText);
        resolve();
      }
    }, tick);
  });
}

/* ========== 主流程 ========== */
async function onStartButtonClicked() {
  const participantsEl = $("participants");
  const winnersEl = $("winner-count");
  const speedSelect = $("speed-select");   // 启动页里的速度选择（可选）:contentReference[oaicite:6]{index=6}

  const participants = parseParticipants(participantsEl?.value || "");
  const winners_count = Number(winnersEl?.value || 1);
  if (speedSelect && speedSelect.value) setSpeed(speedSelect.value);

  if (participants.length === 0)  return showMessage("请输入至少 1 个参与者。", "error");
  if (winners_count <= 0 || winners_count > participants.length) {
    return showMessage("中奖人数必须在 1 到 参与者数量 之间。", "error");
  }

  showMessage("正在请求后端生成抽奖结果，请稍候...", "info");
  try {
    const result = await prepareDrawRequest(participants, winners_count);
    if (!result?.ok || !result.data) {
      renderFullResult(result);
      return showMessage("后端返回异常: " + JSON.stringify(result), "error");
    }

    const data = result.data;
    const winners = data.winners || [];

    // 切到抽奖画面 & 设置 Banner
    switchScreen("draw");
    setBanner(data.banner, data.font_style);  // 后端返回 banner/font_style:contentReference[oaicite:7]{index=7}

    // 播放动画：逐个停在中奖 ID
    renderWinnersList([]); // 先清空
    for (let i = 0; i < winners.length; i++) {
      await playSlotAnimation(winners[i]);
      // 追加到名单
      const ul = $("winners-ul");
      if (ul) {
        const li = document.createElement("li");
        li.textContent = `${i + 1}. ${winners[i]}`;
        ul.appendChild(li);
      }
    }

    burstConfetti();
    showMessage("抽奖成功：" + winners.join(", "), "success");
    renderFullResult(data);

    // 回传 Telegram（仅在 WebApp 环境）
    if (window.Telegram && Telegram.WebApp) {
      Telegram.WebApp.sendData(JSON.stringify({
        action: "draw_result",
        winners,
        draw_id: data.draw_id,
        banner: data.banner,
        font_style: data.font_style
      }));
    }
  } catch (err) {
    console.error(err);
    showMessage("请求失败: " + (err.message || err), "error");
  }
}

/* ========== 调试结果面板（可选） ========== */
function renderFullResult(data) {
  const box = $("resultBox");
  if (!box) { console.log("Result:", data); return; }
  box.innerHTML = "";
  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(data, null, 2);
  pre.className = "result-json";
  pre.style.whiteSpace = "pre-wrap";
  pre.style.wordBreak = "break-word";
  box.appendChild(pre);
}

/* ========== 初始化绑定 ========== */
function init() {
  // 主按钮
  const startBtn = $("start-btn");
  if (startBtn) startBtn.addEventListener("click", onStartButtonClicked);

  // 抽奖页按钮
  const s1 = $("speed-1"), s2 = $("speed-2"), s5 = $("speed-5"), s10 = $("speed-10");
  if (s1) s1.onclick = () => setSpeed(1);
  if (s2) s2.onclick = () => setSpeed(2);
  if (s5) s5.onclick = () => setSpeed(5);
  if (s10) s10.onclick = () => setSpeed(10);

  const copyBtn = $("copy-btn");
  if (copyBtn) copyBtn.onclick = copyWinnersToClipboard;

  const backBtn = $("back-btn");
  if (backBtn) backBtn.onclick = () => {
    // 清场
    setBanner("", null);
    const ul = $("winners-ul");
    if (ul) ul.innerHTML = "";
    const slot = $("slot-display");
    if (slot) slot.textContent = "等待结果...";
    switchScreen("start");
  };

  // 让 canvas 自适应窗口
  const canvas = $("confetti");
  if (canvas) {
    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
  }

  // Telegram WebApp 初始化
  if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// 控制台快捷
window.prepareDrawRequest = prepareDrawRequest;
window.parseParticipants = parseParticipants;
