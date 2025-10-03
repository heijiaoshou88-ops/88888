// ================= API 地址 =================
const API_URL = "https://mylottery.loophole.site/api/draw/prepare";

// ================= Confetti 粒子系统 =================
const canvas = document.getElementById("confetti");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.onresize = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};

// 预加载粒子图片
const coinImg = new Image();
coinImg.src = "img/coin.png";
const diamondImg = new Image();
diamondImg.src = "img/diamond.png";
const goldImg = new Image();
goldImg.src = "img/gold.png"; // 金元宝

// ================= 全局变量 =================
let winners = [];
let speed = 1;

const startScreen = document.getElementById("start-screen");
const drawScreen = document.getElementById("draw-screen");
const bannerText = document.getElementById("banner-text");
const slotDisplay = document.getElementById("slot-display");
const winnersUl = document.getElementById("winners-ul");

// ================= 启动抽奖 =================
document.getElementById("start-btn").addEventListener("click", async () => {
  const participantsRaw = document.getElementById("participants").value;
  const participants = participantsRaw.split("\n").map(x => x.trim()).filter(x => x);
  const winnerCount = parseInt(document.getElementById("winner-count").value);

  if (participants.length < winnerCount) {
    alert("参赛人数不足！");
    return;
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ participants, winners_count: winnerCount })
  });

  const data = await res.json();
  if (!data.ok) {
    alert("错误: " + data.error);
    return;
  }

  winners = data.data.winners;
  bannerText.innerText = data.data.banner || "抽奖结果";
  speed = parseInt(document.getElementById("speed-select").value);

  startScreen.classList.add("hidden");
  drawScreen.classList.remove("hidden");

  playDraw();
});

// ================= 抽奖流程 =================
async function playDraw() {
  winnersUl.innerHTML = "";
  for (let i = 0; i < winners.length; i++) {
    await showWinner(winners[i]);
    launchConfetti();
  }
}

function showWinner(id) {
  return new Promise(resolve => {
    slotDisplay.innerText = "滚动中...";
    let counter = 0;
    const interval = setInterval(() => {
      const fake = winners[Math.floor(Math.random() * winners.length)];
      slotDisplay.innerText = fake;
      counter++;
      if (counter > 10 * speed) {
        clearInterval(interval);
        slotDisplay.innerText = id;

        const li = document.createElement("li");
        li.innerText = id;
        winnersUl.appendChild(li);

        resolve();
      }
    }, 100 / speed);
  });
}

// ================= 按钮事件 =================
document.getElementById("speed-1").onclick = () => speed = 1;
document.getElementById("speed-2").onclick = () => speed = 2;
document.getElementById("speed-5").onclick = () => speed = 5;
document.getElementById("speed-10").onclick = () => speed = 10;

document.getElementById("copy-btn").onclick = () => {
  const text = winners.join("\n");
  navigator.clipboard.writeText(text).then(() => alert("已复制中奖名单！"));
};

document.getElementById("back-btn").onclick = () => {
  drawScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
};

// ================= 粒子掉落 =================
function launchConfetti() {
  let particles = [];

  // 生成 30 个粒子
  for (let i = 0; i < 30; i++) {
    let choice = Math.random();
    let img = choice < 0.33 ? coinImg : (choice < 0.66 ? diamondImg : goldImg);

    particles.push({
      x: Math.random() * canvas.width,
      y: -50,
      speedY: 2 + Math.random() * 3,
      speedX: (Math.random() - 0.5) * 2,
      size: 24 + Math.random() * 16,
      img: img,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10
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

      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotationSpeed;
    });

    particles = particles.filter(p => p.y < canvas.height + 50);

    if (particles.length > 0) {
      requestAnimationFrame(drawFrame);
    }
  }

  drawFrame();
}
