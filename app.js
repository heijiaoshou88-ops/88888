// app.js

// ========== 配置 ==========
const API_URL = "https://9defc7d31d73656585fca00da1d3bf19.loophole.site/api/draw/prepare";

// 初始化
document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ DOM 已加载，初始化完成");
    document.getElementById("start-btn").addEventListener("click", startDraw);
});

// ========== 抽奖流程 ==========
async function startDraw() {
    console.log("🎯 点击开始抽奖按钮");

    const winnerCount = parseInt(document.getElementById("winner-count").value);
    const speed = document.getElementById("speed-select").value;
    const participants = document.getElementById("participants").value
        .split("\n").map(s => s.trim()).filter(s => s);

    if (participants.length === 0) {
        alert("请输入至少一个ID！");
        return;
    }

    // 切换界面：隐藏输入界面，显示抽奖机界面
    document.getElementById("start-screen").classList.add("hidden");
    document.getElementById("draw-screen").classList.remove("hidden");

    try {
        console.log("📡 发送请求到后端:", API_URL);
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                participants: participants,
                winners_count: winnerCount
            })
        });

        const data = await response.json();
        console.log("📦 后端响应:", data);

        if (!data || !data.winners || data.winners.length === 0) {
            alert("后端没有返回中奖结果");
            return;
        }

        // 执行动画
        await runSlotAnimation(data.winners, speed);

        console.log("🎉 抽奖流程完成");
    } catch (err) {
        console.error("❌ 请求出错:", err);
        alert("后端没有返回中奖结果");
    }
}

// ========== 老虎机动画 ==========
function runSlotAnimation(winners, speed) {
    return new Promise(resolve => {
        const slotDisplay = document.getElementById("slot-display");
        const winnersUl = document.getElementById("winners-ul");

        let i = 0;
        function next() {
            if (i >= winners.length) {
                resolve();
                return;
            }

            const winner = winners[i];
            console.log(`🎰 执行第 ${i + 1} 次动画，中奖ID:`, winner);

            // 显示“转动中...”
            slotDisplay.textContent = "转动中...";
            slotDisplay.classList.remove("enlarged");

            // 模拟转动时间
            setTimeout(() => {
                // 放大中奖ID
                slotDisplay.textContent = winner;
                slotDisplay.classList.add("enlarged");

                // 掉落粒子（金元宝、金币、钻石）
                launchConfetti();

                // 2秒后缩小并加入名单
                setTimeout(() => {
                    slotDisplay.classList.remove("enlarged");

                    const li = document.createElement("li");
                    li.textContent = winner;
                    winnersUl.appendChild(li);

                    i++;
                    next();
                }, 2000);

            }, 3000 / parseInt(speed)); // 转动速度
        }
        next();
    });
}

// ========== 粒子效果 ==========
function launchConfetti() {
    console.log("✨ 粒子掉落触发");
    const confettiContainer = document.getElementById("confetti");
    confettiContainer.innerHTML = "";

    const images = ["img/gold1.png", "img/gold2.png", "img/gold3.png", "img/coin1.png", "img/coin2.png", "img/coin3.png", "img/diamond.png"];
    const count = 20 + Math.floor(Math.random() * 20); // 20~40个粒子

    for (let i = 0; i < count; i++) {
        const img = document.createElement("img");
        img.src = images[Math.floor(Math.random() * images.length)];
        img.style.position = "absolute";
        img.style.width = "40px";
        img.style.height = "40px";
        img.style.left = Math.random() * 100 + "vw";
        img.style.top = "-50px";
        img.style.transition = `top 2s linear, transform 2s ease`;
        confettiContainer.appendChild(img);

        setTimeout(() => {
            img.style.top = "100vh";
            img.style.transform = `rotate(${Math.random() * 360}deg)`;
        }, 50);

        setTimeout(() => img.remove(), 2500);
    }
}
