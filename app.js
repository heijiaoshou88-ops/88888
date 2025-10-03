document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOM 已加载，初始化脚本...");

  // DOM 元素
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

  if (!startScreen || !drawScreen) {
    console.error("❌ 无法找到 start-screen 或 draw-screen");
    return;
  }

  // 点击开始按钮
  startBtn.addEventListener("click", async () => {
    console.log("🎬 点击开始抽奖按钮");

    const winnerCount = parseInt(document.getElementById("winner-count").value, 10);
    const participants = document
      .getElementById("participants")
      .value.split("\n")
      .map(x => x.trim())
      .filter(x => x);

    console.log("👉 抽奖参数：", { winnerCount, participants });

    if (participants.length === 0) {
      alert("请输入参赛 ID！");
      return;
    }

    try {
      // 请求后端 API
      const resp = await fetch("https://9defc7d31d73656585fca00da1d3bf19.loophole.site/api/draw/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participants,
          winners_count: winnerCount
        })
      });

      const data = await resp.json();
      console.log("📩 收到后端结果：", data);

      if (!data.winners || data.winners.length === 0) {
        alert("没有中奖结果！");
        return;
      }

      // 切换界面
      console.log("🔀 切换界面：隐藏 start，显示 draw");
      startScreen.classList.add("hidden");
      drawScreen.classList.remove("hidden");
      console.log("切换后 drawScreen.hidden?", drawScreen.classList.contains("hidden"));

      // 播放抽奖动画
      await playDraw(data.winners);

    } catch (err) {
      console.error("❌ 请求出错：", err);
      alert("请求失败: " + err.message);
    }
  });

  // 抽奖动画
  async function playDraw(winners) {
    console.log("🎡 开始执行抽奖动画，中奖名单：", winners);

    for (let i = 0; i < winners.length; i++) {
      const id = winners[i];
      console.log(`➡️ 抽奖第 ${i + 1} 次，目标 ID: ${id}`);

      // 模拟老虎机转动
      slotDisplay.textContent = "转动中...";
      await delay(2000); // 模拟转动 2 秒

      // 显示中奖 ID
      slotDisplay.textContent = id;
      slotDisplay.classList.add("enlarged");
      console.log("✨ 放大中奖 ID:", id);

      // 播放粒子效果
      triggerConfetti();

      await delay(1500);
      slotDisplay.classList.remove("enlarged");

      // 添加到中奖名单
      const li = document.createElement("li");
      li.textContent = id;
      winnersUl.appendChild(li);
      console.log("📝 加入中奖名单:", id);

      await delay(1000);
    }

    console.log("✅ 抽奖流程完成");
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 粒子系统（金币、钻石、元宝）
  const particleImages = [
    "img/coin1.png", "img/coin2.png", "img/coin3.png",
    "img/diamond.png", "img/gold1.png", "img/gold2.png", "img/gold3.png"
  ];

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
});
