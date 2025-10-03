document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ 页面已加载，初始化中...");

  const startScreen = document.getElementById("start-screen");
  const drawScreen = document.getElementById("draw-screen");
  const startBtn = document.getElementById("start-btn");
  const participantsInput = document.getElementById("participants");
  const winnerCountSelect = document.getElementById("winner-count");
  const slotDisplay = document.getElementById("slot-display");
  const winnersUl = document.getElementById("winners-ul");

  let participants = [];

  // 点击开始按钮
  startBtn.addEventListener("click", async () => {
    console.log("🎬 点击开始抽奖按钮");

    // 读取用户输入
    participants = participantsInput.value
      .split("\n")
      .map(v => v.trim())
      .filter(v => v !== "");
    const winnerCount = parseInt(winnerCountSelect.value, 10);

    if (participants.length === 0) {
      alert("请输入至少一个参赛 ID");
      return;
    }

    // 切换到抽奖界面
    startScreen.classList.add("hidden");
    drawScreen.classList.remove("hidden");
    console.log("🔀 已切换到抽奖界面");

    try {
      const resp = await fetch("https://9defc7d31d73656585fca00da1d3bf19.loophole.site/api/draw/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participants: participants,
          winners_count: winnerCount
        })
      });

      const data = await resp.json();
      console.log("✅ 后端返回数据：", data);

      if (data.winners && data.winners.length > 0) {
        await runDrawAnimation(data.winners);
      } else {
        alert("后端没有返回中奖结果");
      }
    } catch (err) {
      console.error("❌ 请求后端失败：", err);
      alert("抽奖失败，请检查网络或后端是否启动");
    }
  });

  // 执行抽奖动画
  async function runDrawAnimation(winners) {
    for (const winner of winners) {
      console.log("🎰 开始抽取 ID:", winner);

      // 模拟老虎机随机滚动 3 秒
      let counter = 0;
      const spinInterval = setInterval(() => {
        slotDisplay.innerText = participants[Math.floor(Math.random() * participants.length)];
        counter++;
      }, 100);

      await delay(3000);
      clearInterval(spinInterval);

      // 显示中奖 ID
      slotDisplay.innerText = winner;
      slotDisplay.classList.add("enlarged");
      startConfetti();

      // 放大 1 秒
      await delay(1000);

      // 缩小并添加到中奖名单
      slotDisplay.classList.remove("enlarged");
      const li = document.createElement("li");
      li.innerText = winner;
      winnersUl.appendChild(li);

      console.log("🏆 完成一轮抽奖，中奖ID:", winner);

      await delay(800);
    }

    console.log("✅ 所有抽奖流程完成");
  }

  function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  // 粒子效果
  function startConfetti() {
    const canvas = document.getElementById("confetti");
    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20,
        r: Math.random() * 10 + 5,
        d: Math.random() * 2 + 1
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "gold";
      ctx.beginPath();
      for (let p of particles) {
        ctx.moveTo(p.x, p.y);
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2, true);
      }
      ctx.fill();
      update();
    }

    function update() {
      for (let p of particles) {
        p.y += p.d;
        if (p.y > canvas.height) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
      }
    }

    setInterval(draw, 30);
  }
});
