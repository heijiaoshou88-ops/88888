const API_BASE = "https://9defc7d31d73656585fca00da1d3bf19.loophole.site/api/draw";

let drawId = null;
let winnersCount = 0;
let drawnSoFar = 0;
let speed = 3000; // 默认转动 3s

// 元素
const goDrawBtn = document.getElementById("goDrawBtn");
const startPage = document.getElementById("startPage");
const drawPage = document.getElementById("drawPage");
const rollingId = document.getElementById("rollingId");
const winnersList = document.getElementById("winnersList");
const startBtn = document.getElementById("startBtn");
const copyBtn = document.getElementById("copyBtn");
const fallingContainer = document.getElementById("fallingContainer");

// 进入抽奖页面
goDrawBtn.addEventListener("click", async () => {
  const ids = document.getElementById("idsInput").value.trim().split("\n").map(x => x.trim()).filter(Boolean);
  const count = parseInt(document.getElementById("winnersCount").value, 10);

  if (!ids.length || count <= 0) {
    alert("请输入ID和中奖人数！");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/prepare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participants: ids,
        winners_count: count
      })
    });
    const data = await res.json();
    drawId = data.draw_id;
    winnersCount = count;
    drawnSoFar = 0;
    winnersList.innerHTML = "";

    console.log("✅ drawId 已保存:", drawId);

    // 切换页面
    startPage.classList.add("hidden");
    setTimeout(() => {
      drawPage.classList.remove("hidden");
    }, 1000);
  } catch (e) {
    console.error("prepare 错误:", e);
    alert("提交失败，请检查后端服务。");
  }
});

// 点击开始抽奖
startBtn.addEventListener("click", async () => {
  if (!drawId) {
    alert("请先提交设置！");
    return;
  }
  if (drawnSoFar >= winnersCount) {
    alert("抽奖已完成！");
    return;
  }

  rollingId.textContent = "转动中...";
  let rollTimer = setInterval(() => {
    rollingId.textContent = Math.floor(Math.random() * 9999);
  }, 100);

  setTimeout(async () => {
    clearInterval(rollTimer);
    try {
      const res = await fetch(`${API_BASE}/next`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draw_id: drawId })
      });
      const data = await res.json();
      console.log("next 返回：", data);

      if (!data.winner) {
        alert("⚠️ 后端没有返回 winner！");
        return;
      }

      const winner = data.winner;
      showWinner(winner);
      drawnSoFar++;
    } catch (e) {
      console.error("next 错误:", e);
      alert("抽奖失败！");
    }
  }, speed);
});

// 显示中奖动画
function showWinner(winner) {
  rollingId.textContent = winner;
  rollingId.style.transform = "scale(2)";
  rollingId.style.color = "gold";

  setTimeout(() => {
    rollingId.style.transform = "scale(1)";
    rollingId.style.color = "#ffd700";

    const li = document.createElement("li");
    li.textContent = winner;
    winnersList.appendChild(li);

    spawnFallingItems();
  }, 1000);
}

// 粒子掉落
function spawnFallingItems() {
  const items = [
    "img/coin1.png", "img/coin2.png", "img/coin3.png",
    "img/gold1.png", "img/gold2.png", "img/gold3.png",
    "img/diamond.png"
  ];
  const count = 15 + Math.floor(Math.random() * 20);
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "falling";
    el.style.left = Math.random() * 100 + "vw";
    el.style.animationDuration = 2 + Math.random() * 3 + "s";
    el.style.backgroundImage = `url(${items[Math.floor(Math.random() * items.length)]})`;
    fallingContainer.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }
}

// 复制中奖名单
copyBtn.addEventListener("click", () => {
  let text = "";
  winnersList.querySelectorAll("li").forEach(li => {
    text += li.textContent + "\n";
  });
  navigator.clipboard.writeText(text.trim());
  alert("中奖名单已复制！");
});

// 倍速按钮
document.querySelectorAll(".speed-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const factor = parseInt(btn.dataset.speed, 10);
    speed = 3000 / factor; // 倍速控制
    alert(`已切换为 ${factor}x 速度`);
  });
});
