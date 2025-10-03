document.addEventListener("DOMContentLoaded", () => {
  const startScreen = document.getElementById("start-screen");
  const drawScreen = document.getElementById("draw-screen");
  const startBtn = document.getElementById("start-btn");
  const slotDisplay = document.getElementById("slot-display");
  const winnersUl = document.getElementById("winners-ul");
  const confettiCanvas = document.getElementById("confetti");
  const ctx = confettiCanvas.getContext("2d");

  let animationInterval;
  let particles = [];
  let participants = [];
  let winners = [];
  let speed = 1;
  let currentRound = 0;

  // 工具函数
  function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function resizeCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  // 粒子类（金币、钻石、元宝）
  class Particle {
    constructor(x, y, img) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - 0.5) * 5;
      this.vy = Math.random() * -5 - 2;
      this.gravity = 0.2;
      this.img = img;
      this.size = 30 + Math.random() * 20;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += this.gravity;
    }
    draw() {
      ctx.drawImage(this.img, this.x, this.y, this.size, this.size);
    }
  }

  // 启动粒子掉落
  function triggerConfetti() {
    const images = ["coin1.png", "coin2.png", "coin3.png", "gold1.png", "gold2.png", "gold3.png", "diamond.png"];
    for (let i = 0; i < 30; i++) {
      const img = new Image();
      img.src = "img/" + images[Math.floor(Math.random() * images.length)];
      const p = new Particle(Math.random() * confettiCanvas.width, confettiCanvas.height, img);
      particles.push(p);
    }
  }

  function animateParticles() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    particles.forEach((p, i) => {
      p.update();
      p.draw();
      if (p.y > confettiCanvas.height) particles.splice(i, 1);
    });
    requestAnimationFrame(animateParticles);
  }
  animateParticles();

  // 老虎机转动
  function startSlotAnimation() {
    let idx = 0;
    animationInterval = setInterval(() => {
      const randomId = participants[Math.floor(Math.random() * participants.length)];
      slotDisplay.innerText = randomId;
      idx++;
    }, 100 / speed);
  }
  function stopSlotAnimation() {
    clearInterval(animationInterval);
  }

  // 抽奖流程
  async function runDrawRound(id) {
    startSlotAnimation();
    await delay(3000 / speed);
    stopSlotAnimation();

    // 显示中奖 ID
    slotDisplay.innerText = id;
    slotDisplay.classList.add("enlarged");
    triggerConfetti();

    await delay(1500);
    slotDisplay.classList.remove("enlarged");

    const li = document.createElement("li");
    li.innerText = id;
    winnersUl.appendChild(li);

    await delay(1000);
  }

  async function runDraw() {
    for (let i = 0; i < winners.length; i++) {
      await runDrawRound(winners[i]);
    }
    console.log("所有抽奖完成 ✅");
  }

  // 绑定开始按钮
  startBtn.addEventListener("click", async () => {
    const count = parseInt(document.getElementById("winner-count").value, 10);
    participants = document.getElementById("participants").value.trim().split("\n").filter(x => x);
    speed = parseFloat(document.getElementById("speed-select").value.replace("x", ""));

    if (participants.length === 0) {
      alert("请先输入参与 ID！");
      return;
    }

    // 切换到抽奖页面
    startScreen.classList.add("hidden");
    drawScreen.classList.remove("hidden");

    // 请求后端获取中奖结果
    const API_URL = "https://9defc7d31d73656585fca00da1d3bf19.loophole.site/api/draw/prepare";
    try {
      const resp = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participants,
          winners_count: count
        })
      });
      const result = await resp.json();
      winners = result.data?.winners || [];
      console.log("后端返回中奖名单：", winners);

      if (winners.length === 0) {
        alert("后端没返回中奖结果！");
        return;
      }

      await runDraw();

    } catch (err) {
      console.error("请求失败：", err);
      alert("无法连接后端 API");
    }
  });
});
