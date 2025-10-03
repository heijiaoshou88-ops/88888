console.log("初始化完成...");

const startBtn = document.getElementById("start-btn");
const startScreen = document.getElementById("start-screen");
const drawScreen = document.getElementById("draw-screen");

const winnerCountEl = document.getElementById("winner-count");
const speedSelectEl = document.getElementById("speed-select");
const participantsEl = document.getElementById("participants");
const slotDisplay = document.getElementById("slot-display");
const winnersUl = document.getElementById("winners-ul");

const confettiCanvas = document.getElementById("confetti");
const ctx = confettiCanvas.getContext("2d");
confettiCanvas.width = window.innerWidth;
confettiCanvas.height = window.innerHeight;

let confettiParticles = [];

// 粒子生成
function spawnConfetti() {
  confettiParticles = [];
  for (let i = 0; i < 80; i++) {
    confettiParticles.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * -confettiCanvas.height,
      r: Math.random() * 6 + 2,
      c: ["gold", "yellow", "deepskyblue", "orange"][Math.floor(Math.random() * 4)],
      s: Math.random() * 3 + 2
    });
  }
}

// 粒子动画
function drawConfetti() {
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiParticles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
    ctx.fillStyle = p.c;
    ctx.fill();
    p.y += p.s;
    if (p.y > confettiCanvas.height) p.y = 0;
  });
  requestAnimationFrame(drawConfetti);
}

// 老虎机动画（假转动）
function spinAnimation(participants, duration = 3000) {
  return new Promise(resolve => {
    let i = 0;
    const interval = setInterval(() => {
      slotDisplay.textContent = participants[i % participants.length];
      i++;
    }, 100);
    setTimeout(() => {
      clearInterval(interval);
      resolve();
    }, duration);
  });
}

// 点击开始
startBtn.addEventListener("click", async () => {
  console.log("点击开始抽奖按钮");

  const winnerCount = parseInt(winnerCountEl.value);
  const participants = participantsEl.value.split("\n").map(s => s.trim()).filter(s => s);

  if (participants.length === 0) {
    alert("请输入至少一个参赛ID！");
    return;
  }

  // 切换到抽奖界面
  startScreen.classList.add("hidden");
  drawScreen.classList.remove("hidden");

  try {
    const resp = await fetch("https://9defc7d31d73656585fca00da1d3bf19.loophole.site/api/draw/prepare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participants, winners_count: winnerCount })
    });
    const data = await resp.json();
    console.log("后端返回结果：", data);

    if (!data.winners || data.winners.length === 0) {
      alert("后端没有返回中奖结果");
      return;
    }

    for (let w of data.winners) {
      console.log("开始执行抽奖动画, 中奖ID:", w);

      await spinAnimation(participants, 3000); // 转动 3 秒
      slotDisplay.textContent = w;

      // 放大
      slotDisplay.classList.add("enlarged");
      spawnConfetti();
      drawConfetti();
      await new Promise(r => setTimeout(r, 2000));

      // 恢复
      slotDisplay.classList.remove("enlarged");

      // 加入中奖名单
      const li = document.createElement("li");
      li.textContent = w;
      winnersUl.appendChild(li);
    }

    console.log("抽奖流程完成 ✅");

  } catch (e) {
    console.error("请求出错：", e);
    alert("抽奖失败，请检查后端连接");
  }
});
