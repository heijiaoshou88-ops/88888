// 你的后端 Loophole 地址（不要写 /prepare 或 /next，直接写到 /draw）
const API_BASE = "https://9defc7d31d73656585fca00da1d3bf19.loophole.site/api/draw";

let drawId = null;
let winnersCount = 0;
let drawnSoFar = 0;

// 元素
const prepareBtn = document.getElementById("prepareBtn");
const startBtn = document.getElementById("startBtn");
const rollingId = document.getElementById("rollingId");
const winnersList = document.getElementById("winnersList");
const bannerEl = document.getElementById("banner");
const fallingContainer = document.getElementById("fallingContainer");

// 准备设置
prepareBtn.addEventListener("click", async () => {
  const ids = document.getElementById("idsInput").value.trim().split("\n").map(x => x.trim()).filter(Boolean);
  const count = parseInt(document.getElementById("winnersCount").value, 10);
  const banner = document.getElementById("bannerText").value.trim();
  const fontStyle = document.getElementById("fontStyle").value;

  if (!ids.length || count <= 0) {
    alert("请输入ID和中奖人数！");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/prepare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: ids,
        winners_count: count,
        banner_text: banner,
        font_style: fontStyle
      })
    });
    const data = await res.json();
    drawId = data.draw_id;
    winnersCount = count;
    drawnSoFar = 0;
    winnersList.innerHTML = "";
    bannerEl.textContent = data.banner || banner || "抽奖机";
    bannerEl.className = "banner " + (data.font_style || fontStyle);
    alert("设置完成，可以开始抽奖！");
  } catch (e) {
    console.error(e);
    alert("提交失败，请检查后端服务。");
  }
});

// 点击抽奖
startBtn.addEventListener("click", async () => {
  if (!drawId) {
    alert("请先提交设置！");
    return;
  }
  if (drawnSoFar >= winnersCount) {
    alert("抽奖结束！");
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
      const winner = data.winner;
      showWinner(winner);
      drawnSoFar++;
    } catch (e) {
      console.error(e);
      alert("抽奖失败！");
    }
  }, 3000);
});

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
