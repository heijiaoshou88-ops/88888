import os
import sys
import uuid
import time
import json
import random
import asyncio
import logging
from typing import List, Dict, Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from aiogram import Bot, Dispatcher, types

# ================== 基础配置（保持硬编码） ==================
BOT_TOKEN = "7622197523:AAE6qkFlif0qv22ojUiXNQ4ip4aaX4cEqIQ"   # 你的
ADMINS = {5845632857}  # 允许操作的管理员 ID 集合（ADM 组）

API_DEFAULT_PORT = int(os.getenv("PORT", os.getenv("API_PORT", "24680")))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s:%(name)s:%(message)s"
)
log = logging.getLogger("bot_api")

# ================== 一次性抽奖设置（被消费后清空） ==================
settings = {
    "banner_text": None,
    "font_style": None,
    "must_win_ids": [],
    "exclude_ids": []
}

# ================== Telegram Bot ==================
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher(bot)

def is_admin(uid: int) -> bool:
    return uid in ADMINS

@dp.message_handler()
async def admin_panel(message: types.Message):
    if not is_admin(message.from_user.id):
        return

    text = (message.text or "").strip()

    if text.startswith("/start"):
        kb = types.ReplyKeyboardMarkup(resize_keyboard=True)
        kb.add("设置背景文字", "设置字体效果")
        kb.add("设置必中名单", "设置排除名单")
        kb.add("清空设置", "查看当前设置")
        await message.answer("管理员面板：", reply_markup=kb)

    elif text == "设置背景文字":
        await message.answer("请发送新的背景文字：")
        dp.register_message_handler(set_banner, content_types=types.ContentTypes.TEXT, state=None)

    elif text == "设置字体效果":
        kb = types.ReplyKeyboardMarkup(resize_keyboard=True)
        kb.add("浮雕", "发光", "描边", "霓虹", "默认")
        await message.answer("请选择字体效果：", reply_markup=kb)
        dp.register_message_handler(set_font, content_types=types.ContentTypes.TEXT, state=None)

    elif text == "设置必中名单":
        await message.answer("请发送必中奖名单（多行，每行一个ID）：")
        dp.register_message_handler(set_must_win, content_types=types.ContentTypes.TEXT, state=None)

    elif text == "设置排除名单":
        await message.answer("请发送排除名单（多行，每行一个ID）：")
        dp.register_message_handler(set_exclude, content_types=types.ContentTypes.TEXT, state=None)

    elif text == "清空设置":
        settings.update({"banner_text": None, "font_style": None, "must_win_ids": [], "exclude_ids": []})
        await message.answer("已清空，下次抽奖恢复默认")

    elif text == "查看当前设置":
        await message.answer(json.dumps(settings, ensure_ascii=False))

async def set_banner(message: types.Message):
    if not is_admin(message.from_user.id):
        return
    settings["banner_text"] = (message.text or "").strip()
    await message.answer(f"已设置背景文字：{settings['banner_text']}")
    dp.register_message_handler(admin_panel)

async def set_font(message: types.Message):
    if not is_admin(message.from_user.id):
        return
    val = (message.text or "").strip()
    settings["font_style"] = None if val in ("默认", "无", "") else val
    await message.answer(f"已设置字体效果：{settings['font_style'] or '无'}")

    dp.register_message_handler(admin_panel)

async def set_must_win(message: types.Message):
    if not is_admin(message.from_user.id):
        return
    ids = [x.strip() for x in (message.text or "").splitlines() if x.strip()]
    settings["must_win_ids"] = ids
    await message.answer(f"已设置必中名单：{ids}")
    dp.register_message_handler(admin_panel)

async def set_exclude(message: types.Message):
    if not is_admin(message.from_user.id):
        return
    ids = [x.strip() for x in (message.text or "").splitlines() if x.strip()]
    settings["exclude_ids"] = ids
    await message.answer(f"已设置排除名单：{ids}")
    dp.register_message_handler(admin_panel)

# ================== 抽奖核心 ==================
def compute_winners(participants: List[str], winners_count: int) -> Dict[str, Any]:
    # 去重
    uniq, seen = [], set()
    for p in participants:
        p = (p or "").strip()
        if p and p not in seen:
            seen.add(p); uniq.append(p)
    participants = uniq

    must = [x for x in settings["must_win_ids"] if x in participants]
    exclude = [x for x in settings["exclude_ids"] if x in participants]

    if len(must) > winners_count:
        raise ValueError("必中奖人数大于抽奖名额")

    pool = [p for p in participants if p not in must and p not in exclude]
    need = winners_count - len(must)
    if need > len(pool):
        raise ValueError("剩余可抽取人数不足")

    rng = random.Random(str(uuid.uuid4()) + str(time.time()))
    rng.shuffle(pool)
    picked = pool[:need]
    winners = must + picked

    result = {
        "draw_id": str(uuid.uuid4()),
        "winners": winners,
        "banner": settings["banner_text"],
        "font_style": settings["font_style"]
    }
    # 仅清空一次性名单；保留 banner_text / font_style 直到管理员修改
    settings.update({"must_win_ids": [], "exclude_ids": []})
    return result


# ================== FastAPI ==================
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],    # 调试期全开
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DrawRequest(BaseModel):
    participants: List[str]
    winners_count: int

@app.post("/api/draw/prepare")
def prepare_draw(req: DrawRequest):
    try:
        log.info("收到抽奖请求：participants=%s, winners_count=%s", req.participants, req.winners_count)
        data = compute_winners(req.participants, req.winners_count)
        log.info("抽奖结果：%s", data)
        return {"ok": True, "data": data}
    except Exception as e:
        log.exception("抽奖出错：%s", e)
        return {"ok": False, "error": str(e)}
@app.get("/api/draw/prepare")
def prepare_draw_get():
    return {"ok": False, "error": "Use POST with JSON body: {participants:[], winners_count:int}."}

@app.get("/")
def root():
    return {"ok": True, "msg": "API alive"}


# ================== 启动工具函数（可选模式） ==================

@dp.message_handler(content_types=types.ContentType.WEB_APP_DATA)
async def handle_webapp_data(message: types.Message):
    import json
    try:
        data = json.loads(message.web_app_data.data)
        if data.get("action") == "draw_result":
            winners = data.get("winners", [])
            draw_id = data.get("draw_id")
            banner = data.get("banner"); font_style = data.get("font_style")
            await message.answer(
                f"🎉 抽奖完成 (ID={draw_id})\n中奖名单: {', '.join(winners)}\n"
                f"背景文字: {banner or '无'}\n字体效果: {font_style or '无'}"
            )
        else:
            await message.answer(f"收到 WebApp 数据: {data}")
    except Exception as e:
        await message.answer(f"解析 WebApp 数据失败: {e}")


async def run_bot():
    log.info("RUN_MODE=bot → 启动 Telegram 轮询")
    await dp.start_polling()

async def run_api_async():
    # 用 Server/Config 方式以便能 await
    import uvicorn
    log.info("RUN_MODE=api → 启动 FastAPI：0.0.0.0:%s", API_DEFAULT_PORT)
    config = uvicorn.Config(app, host="0.0.0.0", port=API_DEFAULT_PORT, loop="asyncio", log_level="info")
    server = uvicorn.Server(config)
    await server.serve()

async def run_all():
    log.info("RUN_MODE=all → 同时启动 Bot 与 API（端口 %s）", API_DEFAULT_PORT)
    api_task = asyncio.create_task(run_api_async())
    bot_task = asyncio.create_task(run_bot())
    await asyncio.gather(api_task, bot_task)

def parse_mode() -> str:
    import argparse
    parser = argparse.ArgumentParser(description="Run modes for bot_api: api / bot / all")
    parser.add_argument("--mode", choices=["api", "bot", "all"], default=os.getenv("RUN_MODE", "all"))
    args = parser.parse_args()
    return args.mode

if __name__ == "__main__":
    mode = parse_mode()
    log.info("选择启动模式：%s（默认端口 %s）", mode, API_DEFAULT_PORT)
    if mode == "api":
        asyncio.run(run_api_async())
    elif mode == "bot":
        asyncio.run(run_bot())
    else:  # all
        asyncio.run(run_all())
