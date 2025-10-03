// app.js - 完整版本
// 注意：把下面的 API_URL 换成你当前正在运行的 Loophole / 后端 地址（包含 /api/draw/prepare）
// 例: const API_URL = "https://2563d9d6c71b939966806cba1369dcc5.loophole.site/api/draw/prepare";
const API_URL = "https://ce1a5851038ac3cf95280221d7a66ae1.loophole.site/api/draw/prepare";

/* ============ DOM 元素 id 要对应你的 index.html ============
建议在 HTML 中准备这些 id：
- <textarea id="participantsInput">  或 <input>
- <input id="winnersCount" type="number" />
- <button id="startBtn">开始抽奖</button>
- <div id="resultBox"></div>   （显示结果）
- <canvas id="confetti"></canvas>  （如果要做粒子效果）
如果页面没有这些元素，脚本会尽量降级处理（console.log）。
============================================================= */

/* ---- 帮助函数：显示通知 / 结果 ---- */
function showMessage(msg, type = "info") {
  // type 可以是 "info" | "success" | "error"
  const box = document.getElementById("resultBox");
  if (!box) {
    console[type === "error" ? "error" : "log"](msg);
    return;
  }
  const p = document.createElement("div");
  p.className = `msg msg-${type}`;
  p.textContent = msg;
  // 清旧消息
  box.prepend(p);
  // 可选：几秒后自动移除
  setTimeout(() => {
    p.remove();
  }, 8000);
}

/* ---- 简单的 confetti 占位（可以替换为更复杂的粒子库） ---- */
function burstConfetti() {
  const canvas = document.getElementById("confetti");
  if (!canvas) return;
  // 简单闪白框作为示意（你可以替换为真正的粒子）
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  let alpha = 1.0;
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // 0.5秒后清屏
  setTimeout(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, 500);
}

/* ---- 将字符串形式的 participants（逗号/换行分隔）解析为数组 ---- */
function parseParticipants(text) {
  if (!text) return [];
  // 按换行或逗号或分号分隔，去除空项，trim each
  const arr = text
    .split(/[\n,;，；]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return arr;
}

/* ---- 调用后端 /api/draw/prepare 的主函数 ---- */
async function prepareDrawRequest(participants, winners_count = 1, timeoutMs = 12000) {
  if (!Array.isArray(participants) || participants.length === 0) {
    throw new Error("participants 不能为空。");
  }
  // 后端期望的 JSON 结构：根据你的后端实现，这里是一个示例
  const body = {
    participants,
    winners_count: Number(winners_count) || 1,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(API_URL, {
      method: "POST", // 关键：POST
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // HTTP 422 / 400 等：读取后端返回的 JSON 错误消息
    if (!resp.ok) {
      let errText = `HTTP ${resp.status} ${resp.statusText}`;
      try {
        const ejson = await resp.json();
        // 常见结构 { detail: ... } 或 { ok:false, error:... }
        errText = JSON.stringify(ejson);
      } catch (e) {
        // 非 JSON 响应，尝试读取文本
        try {
          const txt = await resp.text();
          errText = txt || errText;
        } catch {
          // ignore
        }
      }
      const err = new Error("Server error: " + errText);
      err.status = resp.status;
      throw err;
    }

    // 成功则解析 JSON
    const data = await resp.json();
    return data;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("请求超时（" + timeoutMs + "ms）");
    }
    throw err;
  }
}

/* ---- 事件处理：从页面读取输入，调用后端并显示结果 ---- */
async function onStartButtonClicked() {
  const participantsEl = document.getElementById("participantsInput");
  const winnersEl = document.getElementById("winnersCount");
  const startBtn = document.getElementById("startBtn");

  const rawText = participantsEl ? participantsEl.value : "";
  const winners_count = winnersEl ? Number(winnersEl.value || 1) : 1;
  const participants = parseParticipants(rawText);

  if (participants.length === 0) {
    showMessage("请输入至少1个参与者（逗号或换行分隔）。", "error");
    return;
  }
  if (winners_count <= 0 || winners_count > participants.length) {
    showMessage("中奖人数必须在 1 到 参与者数量 之间。", "error");
    return;
  }

  // 禁用按钮，防止重复点击
  if (startBtn) startBtn.disabled = true;
  showMessage("正在请求后端生成抽奖结果，请稍候...", "info");

  try {
    const result = await prepareDrawRequest(participants, winners_count, 15000);
    // 后端返回结构示例：{ ok:true, data: { draw_id: "...", winners: [...], ... } }
    if (result && result.ok && result.data) {
      const data = result.data;
      const winners = data.winners || [];
      showMessage("抽奖成功： " + winners.join(", "), "success");

      // 如果页面需要展示 banner / 文本样式，这里把全部 data 上屏
      renderFullResult(data);

      // 触发 confetti（如果需要）
      burstConfetti();
    } else {
      // 兼容没有 ok 字段的 API
      showMessage("后端返回（非标准结构）: " + JSON.stringify(result), "info");
      renderFullResult(result);
    }
  } catch (err) {
    console.error("抽奖请求错误：", err);
    showMessage("请求失败: " + (err.message || err), "error");
  } finally {
    if (startBtn) startBtn.disabled = false;
  }
}

/* ---- 渲染完整结果到页面（可根据你的 HTML 自定义） ---- */
function renderFullResult(data) {
  const box = document.getElementById("resultBox");
  if (!box) {
    console.log("Result:", data);
    return;
  }
  // 清空（也可以追加）
  box.innerHTML = "";

  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(data, null, 2);
  pre.style.whiteSpace = "pre-wrap";
  pre.style.wordBreak = "break-word";
  pre.className = "result-json";
  box.appendChild(pre);
}

/* ---- 绑定页面事件（DOMContentLoaded） ---- */
function init() {
  // 尝试绑定元素
  const startBtn = document.getElementById("startBtn");
  if (startBtn) {
    startBtn.addEventListener("click", onStartButtonClicked);
  } else {
    // 如果没有 startBtn，尝试自动从页面寻找输入并自动发送（仅用于调试）
    console.warn("没有找到 #startBtn，脚本已加载但不会自动触发抽奖。");
  }

  // 让 canvas 自适应窗口
  const canvas = document.getElementById("confetti");
  if (canvas) {
    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
  }

  // 如果你想在加载时自动测试一次（开发用），解除下面注释：
  // setTimeout(() => { prepareDrawRequest(['A','B','C'],1).then(d=>console.log(d)).catch(e=>console.error(e)); }, 500);
}

// 页面加载完再走 init
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

/* ---- 可导出的快捷函数（供浏览器控制台调用） ----
在控制台你可以直接执行：
  prepareDrawRequest(['A','B','C'], 1).then(console.log).catch(console.error)
*/
window.prepareDrawRequest = prepareDrawRequest;
window.parseParticipants = parseParticipants;
window.burstConfetti = burstConfetti;
