document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOM 已加载，初始化脚本...");

  // ====== DOM 元素 ======
  const startScreen = document.getElementById("start-screen");
  const drawScreen = document.getElementById("draw-screen");
  const startBtn = document.getElementById("start-btn");
  const slotDisplay = document.getElementById("slot-display");
  const winnersUl = document.getElementById("winners-ul");
  const confettiCanvas = document.getElementById("confetti");
  const ctx = confettiCanvas.getContext("2d");

  // 调整画布大小
  function resizeCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // 粒子素材
  const particleImages = [
    "img/coin1.png", "img/coin2.png", "img/coin3.png",
    "img/diamond.png", "img/gold1.png", "img/gold2.png", "img/gold3.png"
  ];

  // 粒子类
  class Particle {
    constructor(x, y, img) {
      this.x = x;
      this.y = y;
      this.size = 32 + Math.random() * 32;
      this.speedY = 2 + Math.random() * 4;
      this.speedX = -2 + Math.random() * 4;
      this.img = new Image();
      this.img.src = img;
      this.opacity = 1;
    }
    update() {
      this.y += this.speedY;
      this.x += this.speedX;
      this.opacity -= 0.01;
    }
    draw(ctx) {
      ctx.globalAlpha = this.opacity;
      ctx.drawImage(this.img, this.x, this.y, this.size, this.size);
      ctx.globalAlpha = 1;
    }
  }

  let particles = [];
  function triggerConfetti() {
    console.log("🎊 播放粒子掉落动画");
    for (let i = 0; i < 20; i++) {
      const img = particleImages[Math.floor(Math.random() * particleImages.length)];
      const x = Math.random() * confettiCanvas.width;
      particles.push(new Particle(x, -50, img));
    }
  }

  function animateConfetti() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    particles.forEach((p, index) => {
      p.update();
      p.draw(ctx);
      if (p.opacity <= 0) particles.splice(index, 1);
    });
    requestAnimationFrame(animateConfetti);
  }
  animateConfetti();

  // 延时函数
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 老虎机动画
  let animationInterval;
  function startSlotAnimation(participants) {
    let idx = 0;
    animationInterval = setInterval(() => {
      slotDisplay.textContent = participants[idx % participants.length];
      idx++;
    }, 100); // 每 100ms 切换一个
  }
  function stopSlotAnimation() {
    clearInterval(animationInterval);
  }

  // ====== 点击开始按钮 ======
  startBtn.addEventListener("click", async () => {
    console.log("🎬 点击开始抽奖按钮");

    const winnerCount = parseInt(document.getElementById("winner-count").value, 10);
    const participants = document
      .getElementById("participants")
      .value.split("\n")
      .map(x => x.trim())
      .filter(x => x);

    if (participants.length === 0) {
      alert("请输入参赛 ID！");
      return;
    }

    // 🚀 切换界面
    startScreen.classList.add("hidden");
    drawScreen.classList.remove("hidden");

    // 🚀 启动老虎机随机动画
    startSlotAnimation(participants);

    // 🚀 同时请求后端 API
    let winners = [];
    try {
      const resp = await fetch("https://9defc7d31d73656585fca00da1d3bf19.loophole.site/api/draw/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants, winners_count: winnerCount })
      });

      const result = await resp.json();
      console.log("📩 收到后端结果:", result);

      winners = result.data?.winners || [];
      if (winners.length === 0) {
        alert("没有中奖结果！");
        stopSlotAnimation();
        return;
      }
    } catch (err) {
      console.error("❌ 请求出错:", err);
      alert("请求失败: " + err.message);
      stopSlotAnimation();
      return;
    }

    // 🚀 等 3 秒后停止动画并逐个显示中奖 ID
    await delay(3000);
    stopSlotAnimation();
    await showWinners(winners);
  });

  // ====== 逐个显示中奖 ID ======
  async function showWinners(winners) {
    for (let i = 0; i < winners.length; i++) {
      const id = winners[i];

      slotDisplay.textContent = id;
      slotDisplay.classList.add("enlarged");
      triggerConfetti();

      await delay(1500);
      slotDisplay.classList.remove("enlarged");

      const li = document.createElement("li");
      li.textContent = id;
      winnersUl.appendChild(li);

      await delay(1000);
    }
    console.log("✅ 抽奖流程完成");
  }
});
