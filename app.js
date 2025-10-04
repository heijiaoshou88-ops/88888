const API_URL = "https://9defc7d31d73656585fca00da1d3bf19.loophole.site/api/draw/prepare";

let participants = [];
let winnersQueue = [];
let speedFactor = 1;
let drawId = null;

document.getElementById("prepareBtn").addEventListener("click", async () => {
  participants = document.getElementById("participantsInput").value.trim().split("\n").filter(x => x);
  const winnersCount = parseInt(document.getElementById("winnersCount").value);

  if (participants.length === 0 || !winnersCount) {
    alert("请填写完整信息！");
    return;
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        participants: participants,
        winners_count: winnersCount
      })
    });

    const data = await res.json();
    console.log("抽奖准备返回:", data);

    winnersQueue = [...data.winners];
    drawId = data.draw_id;

    // 切换页面
    document.getElementById("startPage").style.display = "none";
    document.getElementById("drawPage").style.display = "flex";

  } catch (err) {
    console.error("准备抽奖失败:", err);
    alert("后端连接失败！");
  }
});

document.getElementById("startBtn").addEventListener("click", startDrawAnimation);

document.querySelectorAll(".speedBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    speedFactor = parseInt(btn.dataset.speed);
  });
});

function startDrawAnimation() {
  if (!winnersQueue.length) {
    alert("中奖名单已全部显示！");
    return;
  }

  const winner = winnersQueue.shift();
  console.log("显示中奖ID:", winner);

  const slotList = document.getElementById("slotList");
  let listHtml = "";
  for (let i = 0; i < 10; i++) {
    listHtml += participants.map(id => `<li>${id}</li>`).join("");
  }
  slotList.innerHTML = listHtml;

  const allItems = slotList.children;
  const winnerIndex = [...allItems].findIndex(li => li.textContent === winner);
  const stopRow = winnerIndex - 2; // 中间第3行
  const targetY = -stopRow * 40;

  slotList.style.transition = `transform ${3 / speedFactor}s ease-out`;
  slotList.style.transform = `translateY(${targetY}px)`;

  setTimeout(() => {
    allItems[winnerIndex].style.color = "gold";
    allItems[winnerIndex].style.fontSize = "26px";

    // 加入 winnersBox
    const li = document.createElement("li");
    li.textContent = winner;
    document.getElementById("winnersList").appendChild(li);

    spawnFallingItems();

    if (winnersQueue.length > 0) {
      setTimeout(startDrawAnimation, 2000);
    }
  }, (3100 / speedFactor));
}

function spawnFallingItems() {
  const particles = ["coin1.png", "coin2.png", "coin3.png", "gold1.png", "gold2.png", "gold3.png", "diamond.png"];
  const count = 15 + Math.floor(Math.random() * 15);

  for (let i = 0; i < count; i++) {
    const el = document.createElement("img");
    el.src = "img/" + particles[Math.floor(Math.random() * particles.length)];
    el.className = "particle";
    el.style.left = Math.random() * window.innerWidth + "px";
    el.style.top = "-50px";
    el.style.width = "30px";
    el.style.position = "fixed";
    el.style.opacity = "1";
    el.style.transition = "transform 3s linear, opacity 3s";
    document.body.appendChild(el);

    setTimeout(() => {
      el.style.transform = `translateY(${window.innerHeight + 100}px) rotate(${Math.random() * 360}deg)`;
      el.style.opacity = "0";
    }, 50);

    setTimeout(() => el.remove(), 3100);
  }
}
