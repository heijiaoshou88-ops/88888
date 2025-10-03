document.addEventListener("DOMContentLoaded", () => {
  const startScreen = document.getElementById("start-screen");
  const drawScreen = document.getElementById("draw-screen");
  const slotDisplay = document.getElementById("slot-display");
  const winnersUl = document.getElementById("winners-ul");
  const participantsInput = document.getElementById("participants");
  const winnerCountSelect = document.getElementById("winner-count");
  const startBtn = document.getElementById("start-btn");

  startBtn.addEventListener("click", async () => {
    const participants = participantsInput.value.split("\n").map(x => x.trim()).filter(x => x);
    const winnerCount = parseInt(winnerCountSelect.value, 10);
    if (participants.length === 0) {
      alert("请输入参赛 ID");
      return;
    }

    // 切换界面
    startScreen.classList.add("hidden");
    drawScreen.classList.remove("hidden");

    // 开始老虎机动画
    let spinInterval = setInterval(() => {
      slotDisplay.innerText = participants[Math.floor(Math.random() * participants.length)];
    }, 100);

    // 请求后端
    let winners = [];
    try {
      const resp = await fetch("https://9defc7d31d73656585fca00da1d3bf19.loophole.site/api/draw/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participants, winners_count: winnerCount })
      });
      const res = await resp.json();
      console.log("后端返回:", res);
      winners = res.winners || res.data?.winners || [];
    } catch (err) {
      console.error("请求失败:", err);
      clearInterval(spinInterval);
      alert("网络错误");
      return;
    }

    // 3秒后停止老虎机
    await delay(3000);
    clearInterval(spinInterval);

    // 展示中奖动画
    for (const id of winners) {
      slotDisplay.innerText = id;
      slotDisplay.classList.add("enlarged");
      triggerConfetti();
      await delay(1500);
      slotDisplay.classList.remove("enlarged");

      const li = document.createElement("li");
      li.innerText = id;
      winnersUl.appendChild(li);

      await delay(800);
    }

    console.log("抽奖结束");
  });

  function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // 简易粒子效果
  function triggerConfetti() {
    const canvas = document.getElementById("confetti");
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -50,
        vy: Math.random() * 5 + 2,
        size: Math.random() * 20 + 10
      });
    }
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "gold";
      for (let p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
        ctx.fill();
      }
      update();
      if (particles.length > 0) requestAnimationFrame(draw);
    }
    function update() {
      particles.forEach((p, i) => {
        p.y += p.vy;
        if (p.y > canvas.height) {
          particles.splice(i, 1);
        }
      });
    }
    draw();
  }
});
