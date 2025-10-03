// ===================== 配置 =====================
const API_BASE = "https://9defc7d31d73656585fca00da1d3bf19.loophole.site/api/draw";
let drawId = null;
let winnersCount = 0;
let drawnSoFar = 0;
let spinMsBase = 3000; // 基础 3s，倍速会影响
let participantsGlobal = []; // 记录开始页输入的ID，供滚动时显示

// ===================== 元素 =====================
const goDrawBtn = document.getElementById("goDrawBtn");
const startPage = document.getElementById("startPage");
const drawPage = document.getElementById("drawPage");
const rollingId = document.getElementById("rollingId");
const winnersList = document.getElementById("winnersList");
const startBtn = document.getElementById("startBtn");
const copyBtn = document.getElementById("copyBtn");
const fallingContainer = document.getElementById("fallingContainer");

// ===================== 小工具函数 =====================
// 兼容不同后端包裹层，安全解析 JSON
async function safeJson(res) {
  try {
    return await res.json();
  } catch (_) {
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
  }
}

// 从任意层里把 draw_id 抠出来
function extractDrawId(payload) {
  if (!payload) return null;
  return (
    payload.draw_id ??
    payload?.data?.draw_id ??
    payload?.result?.draw_id ??
    payload?.payload?.draw_id ??
    payload?.id ?? // 兜底
    payload?.drawId ?? null
  );
}

// 从任意层里把 winner 抠出来
function extractWinner(payload) {
  if (!payload) return null;
  return (
    payload.winner ??
    payload?.data?.winner ??
    payload?.result?.winner ??
    payload?.payload?.winner ?? null
  );
}

// 老虎机 3s 随机闪动（使用参与者ID列表），返回一个停止的清理函数
function startSpin(frequencyMs = 100) {
  rollingId.textContent = "转动中...";
  const timer = setInterval(() => {
    if (participantsGlobal.length > 0) {
      const rand = participantsGlobal[Math.floor(Math.random() * participantsGlobal.length)];
      rollingId.textContent = rand;
    } else {
      // 没有参与者时，退化为随机数
      rollingId.textContent = Math.floor(Math.random() * 999999);
    }
  }, frequencyMs);
  return () => clearInterval(timer);
}

// 放大奖励ID → 缩小 → 放入名单框 → 播粒子
function showWinnerAnimation(winner, rankIndex) {
  rollingId.textContent = winner;
  rollingId.style.transition = "all 0.5s ease";
  rollingId.style.transform = "scale(2)";
  rollingId.style.color = "gold";

  setTimeout(() => {
    rollingId.style.transform = "scale(1)";
    rollingId.style.color = "#ffd700";

    const li = document.createElement("li");
    li.textContent = `第${rankIndex}名: ${winner}`;
    winnersList.appendChild(li);

    spawnFallingItems();
  }, 800);
}

// 掉落金币/钻石/金元宝
function spawnFallingItems() {
  const items = [
    "img/coin1.png", "img/coin2.png", "img/coin3.png",
    "img/gold1.png", "img/gold2.png", "img/gold3.png",
    "img/diamond.png"
  ];
  const count = 15 + Math.floor(Math.random() * 16); // 15~30

  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "falling";
    el.style.left = Math.random() * 100 + "vw";
    el.style.animationDuration = (2 + Math.random() * 3).toFixed(2) + "s";
    el.style.transform = `rotate(${Math.random() * 360}deg)`;
    el.style.backgroundImage = `url(${items[Math.floor(Math.random() * items.length)]})`;
    fallingContainer.appendChild(el);
    setTimeout(() => el.remove(), 5200);
  }
}

// ===================== 进入抽奖（prepare） =====================
goDrawBtn.addEventListener("click", async () => {
  const ids = document.getElementById("idsInput").value
    .trim()
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean);

  const count = parseInt(document.getElementById("winnersCount").value, 10);

  if (!ids.length || !Number.isFinite(count) || count <= 0) {
    alert("请输入ID和中奖人数！");
    return;
  }

  participantsGlobal = ids.slice(); // 记录下来供滚动显示

  try {
    const res = await fetch(`${API_BASE}/prepare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participants: ids,
        winners_count: count
      })
    });

    const data = await safeJson(res);
    console.log("prepare 返回原始数据:", data);

    drawId = extractDrawId(data);
    console.log("✅ drawId 已保存:", drawId);

    winnersCount = count;
    drawnSoFar = 0;
    winnersList.innerHTML = "";

    if (!drawId) {
      alert("后端返回没有 draw_id（或字段名不匹配），请检查后端响应结构。");
      return;
    }

    // 页面切换：开始页 → 抽奖页
    startPage.classList.add("hidden");
    setTimeout(() => drawPage.classList.remove("hidden"), 600);
  } catch (e) {
    console.error("prepare 错误:", e);
    alert("提交失败，请检查后端服务与 CORS。");
  }
});

// ===================== 单次“抽一个”的流程 =====================
async function drawOneOnce() {
  // 1) 老虎机开始滚动
  const stopSpin = startSpin(100);

  // 2) 等待 spinMsBase 毫秒后，请求后端结果
  await new Promise(r => setTimeout(r, spinMsBase));
  stopSpin();

  // 3) 请求 /next
  try {
    const res = await fetch(`${API_BASE}/next`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draw_id: drawId })
    });
    const data = await safeJson(res);
    console.log("next 返回：", data);

    const winner = extractWinner(data);
    if (!winner) {
      alert("后端没有返回 winner 字段，请检查 /next 响应。");
      return false;
    }

    // 4) 播放中奖动画
    showWinnerAnimation(winner, drawnSoFar + 1);
    drawnSoFar++;

    // 给动画一点落地时间
    await new Promise(r => setTimeout(r, 900));
    return true;
  } catch (e) {
    console.error("next 错误:", e);
    alert("抽奖失败（网络或后端异常）。");
    return false;
  }
}

// ===================== 点击开始：自动循环到抽满 =====================
startBtn.addEventListener("click", async () => {
  if (!drawId) {
    alert("请先在开始页提交设置！");
    return;
  }
  if (drawnSoFar >= winnersCount) {
    alert("抽奖已完成！");
    return;
  }

  // 一次点击，自动连抽直到抽满
  startBtn.style.pointerEvents = "none";
  try {
    while (drawnSoFar < winnersCount) {
      const ok = await drawOneOnce();
      if (!ok) break; // 出错就停
    }
  } finally {
    startBtn.style.pointerEvents = "";
  }
});

// ===================== 复制中奖名单 =====================
copyBtn.addEventListener("click", () => {
  let text = "";
  winnersList.querySelectorAll("li").forEach(li => (text += li.textContent + "\n"));
  navigator.clipboard.writeText(text.trim());
  alert("中奖名单已复制！");
});

// ===================== 倍速按钮（影响滚动时长） =====================
document.querySelectorAll(".speed-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const factor = parseInt(btn.dataset.speed, 10);
    // 1x = 3000ms, 2x = 1500ms, 5x = 600ms, 10x = 300ms
    spinMsBase = Math.max(300, Math.round(3000 / factor));
    alert(`已切换为 ${factor}x 速度（滚动 ${spinMsBase}ms）`);
  });
});
