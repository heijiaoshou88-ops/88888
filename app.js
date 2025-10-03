document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOM 已加载完毕，初始化脚本...");

  const startScreen = document.getElementById("start-screen");
  const drawScreen = document.getElementById("draw-screen");
  const startBtn = document.getElementById("start-btn");
  const slotDisplay = document.getElementById("slot-display");
  const winnersUl = document.getElementById("winners-ul");

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
      const resp = await fetch("https://9de6c7a7.loophole.site/api/draw/prepare", {
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
      console.log("切换后 drawScreen.hidden? ", drawScreen.classList.contains("hidden"));

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

      slotDisplay.textContent = "转动中...";
      await delay(2000); // 模拟转动 2 秒

      slotDisplay.textContent = id;
      slotDisplay.classList.add("enlarged");
      console.log("✨ 放大中奖 ID:", id);

      triggerConfetti(); // 播放粒子效果

      await delay(1500);
      slotDisplay.classList.remove("enlarged");

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

  function triggerConfetti() {
    console.log("🎊 播放粒子特效（TODO 实现 canvas 粒子效果）");
    // TODO: 在这里实现掉落金币/元宝/钻石动画
  }
});
