// ================= API 地址 =================
const API_URL = "https://9defc7d31d73656585fca00da1d3bf19.loophole.site/api/draw/prepare";
// ================= 全局变量 =================
let winners = [];
let playbackSpeed = 1;

const startScreen = document.getElementById("start-screen");
const drawScreen = document.getElementById("draw-screen");
const bannerText = document.getElementById("banner-text");
const slotDisplay = document.getElementById("slot-display");
const winnersUl = document.getElementById("winners-ul");
const canvas = document.getElementById("confetti");
const ctx = canvas.getContext("2d");

// ================= Canvas resize =================
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ================= 预加载粒子图片 =================
const coinImgs = ["coin1.png", "coin2.png", "coin3.png"].map(src => {
  const img = new Image();
  img.src = "img/" + src;
  return img;
});
const diamondImg = new Image(); diamondImg.src = "img/diamond.png";
const goldImgs = ["gold1.png", "gold2.png", "gold3.png"].map(src => {
  const img = new Image();
  img.src = "img/" + src;
  return img;
});

// ================= 工具函数 =================
function parseParticipants(text) {
  if (!text) return [];
  return text.split(/[\n,;，；]+/).map(s => s.trim()).filter(Boolean);
}

// ================= 老虎机滚动逻辑 =================
function spinSlotForSeconds(seconds, finalId, allIds) {
  console.log("开始转动，持续秒数:", seconds, "最终ID:", finalId);
  return new Promise(resolve => {
    const interval = setInterval(() => {
      const fake = allIds[Math.floor(Math.random() * allIds.length)];
      slotDisplay.innerText = fake;
    }, 80 / playbackSpeed);

    setTimeout(() => {
      clearInterval(interval);
      slotDisplay.innerText = finalId;
      console.log("转动结束，停在:", finalId);
      resolve();
    }, seconds * 1000);
  });
}

// ================= 粒子掉落动画 =================
function launchConfetti() {
  console.log("触发粒子雨效果");
  let particles = [];
  const count = 30 + Math.floor(Math.random() * 30);

  for (let i = 0; i < count; i++) {
    let choice = Math.random();
    let img;
    if (choice < 0.3) img = coinImgs[Math.floor(Math.random() * coinImgs.length)];
    else if (choice < 0.6) img = goldImgs[Math.floor(Math.random() * goldImgs.length)];
    else img = diamondImg;

    particles.push({
      x: Math.random() * canvas.width,
      y: -50,
      speedY: 2 + Math.random() * 4,
      speedX: (Math.random() - 0.5) * 2,
      size: 32 + Math.random() * 24,
      img: img,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12
    });
  }

  function drawFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.drawImage(p.img, -p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
      p.y += p.speedY; p.x += p.speedX; p.rotation += p.rotationSpeed;
    });
    particles = particles.filter(p => p.y < canvas.height + 50);
    if (particles.length > 0) requestAnimationFrame(drawFrame);
  }
  drawFrame();
}

// ================= 抽奖动画流程 =================
async function playDraw(participants) {
  console.log("开始执行抽奖动画，中奖名单:", winners);
  winnersUl.innerHTML = "";

  for (let i = 0; i < winners.length; i++) {
    const winner = winners[i];

    await spinSlotForSeconds(3, winner, participants);

    console.log("放大中奖 ID:", winner);
    slotDisplay.classList.add("enlarged");
    await new Promise(r => setTimeout(r, 600));

    launchConfetti();

    slotDisplay.classList.remove("enlarged");
    await new Promise(r => setTimeout(r, 500));

    console.log("加入到中奖名单:", winner);
    const li = document.createElement("li");
    li.textContent = `${i + 1}. ${winner}`;
    winnersUl.appendChild(li);

    await new Promise(r => setTimeout(r, 800));
  }
  console.log("抽奖流程完成 ✅");
}

// ================= 主流程 =================
async function onStartButtonClicked() {
  console.log("点击开始抽奖按钮");
  const participants = parseParticipants(document.getElementById("participants").value || "");
  const winnersCount = Number(document.getElementById("winner-count").value || 1);
  const speedSelect = document.getElementById("speed-select");

  if (speedSelect && speedSelect.value) playbackSpeed = Number(speedSelect.value);

  if (participants.length === 0) {
    alert("请输入至少 1 个参与者。");
    return;
  }
  if (winnersCount <= 0 || winnersCount > participants.length) {
    alert("中奖人数必须在 1 到参与者数量之间。");
    return;
  }

  console.log("发送请求到后端:", API_URL);
  try {
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ participants, winners_count: winnersCount })
    });

    const result = await resp.json();
    console.log("收到后端返回:", result);

    if (!result.ok || !result.data) {
      alert("后端返回异常: " + JSON.stringify(result));
      return;
    }

    const data = result.data;
    winners = data.winners || [];

    console.log("切到抽奖界面");
    startScreen.classList.add("hidden");
    drawScreen.classList.remove("hidden");

    bannerText.innerText = data.banner || "";
    bannerText.className = "";
    if (data.font_style) bannerText.classList.add(data.font_style);

    await playDraw(participants);

    if (window.Telegram && Telegram.WebApp) {
      console.log("回传结果到 Telegram");
      Telegram.WebApp.sendData(JSON.stringify({
        action: "draw_result",
        winners,
        draw_id: data.draw_id,
        banner: data.banner,
        font_style: data.font_style
      }));
    }

  } catch (err) {
    console.error("请求失败:", err);
    alert("请求失败: " + (err.message || err));
  }
}

// ================= 按钮绑定 =================
document.getElementById("start-btn").addEventListener("click", onStartButtonClicked);

document.getElementById("speed-1").onclick = () => { playbackSpeed = 1; console.log("速度设为 1x"); };
document.getElementById("speed-2").onclick = () => { playbackSpeed = 2; console.log("速度设为 2x"); };
document.getElementById("speed-5").onclick = () => { playbackSpeed = 5; console.log("速度设为 5x"); };
document.getElementById("speed-10").onclick = () => { playbackSpeed = 10; console.log("速度设为 10x"); };

document.getElementById("copy-btn").onclick = () => {
  const text = winners.join("\n");
  navigator.clipboard.writeText(text).then(() => {
    console.log("已复制中奖名单");
    alert("已复制中奖名单 ✅");
  });
};

document.getElementById("back-btn").onclick = () => {
  console.log("返回设置界面");
  drawScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
  winnersUl.innerHTML = "";
  slotDisplay.textContent = "等待结果...";
  bannerText.innerText = "";
  bannerText.className = "";
};

// ================= Telegram WebApp 初始化 =================
if (window.Telegram && Telegram.WebApp) {
  console.log("Telegram WebApp 初始化");
  Telegram.WebApp.ready();
  Telegram.WebApp.expand();
}
