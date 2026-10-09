#!/usr/bin/env python3
"""
DSH 每日快报生成脚本
每天抓取 DSH 生态最新动态，整理成一篇周刊文章发布到 omdsh.com
"""
import urllib.request
import urllib.parse
import json
import re
import sys
from datetime import datetime, timezone, timedelta

# ============ 配置 ============
API_BASE = "https://omdsh.com"
TOKEN = open("/home/dean/.omdsh_token").read()
TOKEN = next((line.split("=", 1)[1] for line in TOKEN.splitlines() if line.startswith("TOKEN=")), "").strip()
POST_TAG = 6  # 讨论区 tag
# ==============================

CHINA_TZ = timezone(timedelta(hours=8))

SOURCES = [
    {
        "name": "DSH 官方 GitHub",
        "url": "https://api.github.com/repos/deepseek-ai/deepseek-harness/commits?per_page=5",
        "headers": {"Accept": "application/vnd.github+json", "User-Agent": "omdsh-newsletter/1.0"},
    },
    {
        "name": "DSH 插件目录 (dsh.so Trending)",
        "url": "https://dsh.so",
        "headers": {"User-Agent": "Mozilla/5.0"},
    },
    {
        "name": "AllDSH 生态周刊",
        "url": "https://alldsh.com",
        "headers": {"User-Agent": "Mozilla/5.0"},
    },
]

def fetch(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    req.add_header("User-Agent", "omdsh-newsletter/1.0")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.read().decode("utf-8", errors="ignore")
    except Exception as e:
        return f"<!-- fetch error: {e} -->"

def api_post(path, body):
    url = f"{API_BASE}{path}"
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("User-Agent", "curl/8.1.2")
    req.add_header("Cookie", f"discussion_token={TOKEN}")
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode())

def make_post(title, content):
    today = datetime.now(CHINA_TZ).strftime("%Y-%m-%d")
    return api_post("/api/post/new", {
        "title": f"🌊 DSH 每日快报 {today}",
        "content": content,
        "tag": POST_TAG,
        "pid": "",
    })

# ---- 1. GitHub 最新 commit ----
gh_raw = fetch(
    "https://api.github.com/repos/deepseek-ai/deepseek-harness/commits?per_page=5",
    {"Accept": "application/vnd.github+json", "User-Agent": "omdsh-newsletter/1.0"}
)
gh_section = ""
try:
    commits = json.loads(gh_raw)
    if isinstance(commits, list):
        lines = ["\n## 📝 官方动态\n"]
        for c in commits[:4]:
            msg = c["commit"]["message"].split("\n")[0][:80]
            sha = c["sha"][:6]
            date = c["commit"]["author"]["date"][:10]
            url = c["html_url"]
            lines.append(f"- [`{sha}`]({url}) · {msg} · `{date}`")
        gh_section = "\n".join(lines)
except:
    gh_section = "\n## 📝 官方动态\n> 暂无数据\n"

# ---- 2. 生态动态（从 dsh.so 抓热门插件）----
dsh_raw = fetch("https://dsh.so", {"User-Agent": "Mozilla/5.0"})
dsh_section = re.sub(r'[#*`\[\]]', '', dsh_raw[:3000])[:1500]
dsh_section = f"\n## 🔥 热门插件动态\n> 数据来源：dsh.so\n\n{dsh_section[:1000]}...\n"

# ---- 3. 构建文章内容 ----
content = f"""## 📌 今日概览
> 这里是 DSH 生态每日精选，帮你快速了解今天发生了什么。
> 生成时间：{datetime.now(CHINA_TZ).strftime('%Y-%m-%d %H:%M')} (北京时间)

---

{gh_section}

---

{dsh_section}

---

## 💡 关于 DSH
[DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) 是 DeepSeek AI 开源的多模型 Agent 框架，核心理念：**Everything is a Plugin**。
- 官网：https://dsh.so
- 插件目录：https://alldsh.com
- GitHub：https://github.com/deepseek-ai/deepseek-harness

> 由 [omdsh.com](https://omdsh.com) 自动整理发布
"""

today = datetime.now(CHINA_TZ).strftime("%Y-%m-%d")
title = f"🌊 DSH 每日快报 {today}"

# ---- 发帖 ----
if "--dry-run" in sys.argv:
    print("[dry-run] 跳过实际发帖")
    sys.exit(0)

print(f"正在发帖：{title} ...")
try:
    result = api_post("/api/post/new", {
        "title": title,
        "content": content,
        "tagId": POST_TAG,
        "pid": "",
    })
    if result.get("success"):
        pid = result.get("data", {}).get("pid", "?")
        print(f"✅ 发帖成功！PID: {pid}")
    else:
        print(f"❌ 发帖失败: {result}")
except Exception as e:
    print(f"❌ 请求失败: {e}")
