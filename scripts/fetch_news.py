"""
每天由 GitHub Actions 執行一次：
從多個 RSS 來源抓取「韓系保養」「醫美趨勢」「新品牌動態」「產業動態」相關新聞，
整理成 data/news.json 給前端網頁讀取。

不需要任何 API key。新增/移除追蹤主題，只要編輯下面的 FEEDS 清單即可。
"""

import datetime
import hashlib
import html
import os
import re

import feedparser

# ---------------------------------------------------------------------------
# 可自由增減的追蹤主題。query 只是給你自己看的標籤，真正決定抓什麼的是 url。
# 用 Google News RSS 搜尋語法：https://news.google.com/rss/search?q=關鍵字
# ---------------------------------------------------------------------------
FEEDS = [
    {
        "query": "K-beauty 保養",
        "category": "韓系保養",
        "url": "https://news.google.com/rss/search?q=%22K-beauty%22%20OR%20%E9%9F%93%E5%A6%9D&hl=zh-TW&gl=TW&ceid=TW:zh-Hant",
    },
    {
        "query": "PDRN / exosome skincare",
        "category": "韓系保養",
        "url": "https://news.google.com/rss/search?q=(PDRN+OR+exosome)+skincare+Korea&hl=en-US&gl=US&ceid=US:en",
    },
    {
        "query": "韓國醫美",
        "category": "醫美趨勢",
        "url": "https://news.google.com/rss/search?q=%E9%9F%93%E5%9C%8B%E9%86%AB%E7%BE%8E%20OR%20%E6%95%B4%E5%BD%A2&hl=zh-TW&gl=TW&ceid=TW:zh-Hant",
    },
    {
        "query": "Korea medical aesthetics",
        "category": "醫美趨勢",
        "url": "https://news.google.com/rss/search?q=Korea+medical+aesthetics+OR+%22skin+booster%22&hl=en-US&gl=US&ceid=US:en",
    },
    {
        "query": "viral beauty brand launch",
        "category": "新品牌動態",
        "url": "https://news.google.com/rss/search?q=viral+beauty+brand+OR+%22indie+beauty%22+launch&hl=en-US&gl=US&ceid=US:en",
    },
    {
        "query": "global beauty industry news",
        "category": "產業動態",
        "url": "https://news.google.com/rss/search?q=beauty+industry+news&hl=en-US&gl=US&ceid=US:en",
    },
]

MAX_PER_FEED = 8       # 每個主題最多留幾則
MAX_TOTAL = 60         # 最終輸出最多留幾則
SUMMARY_MAX_CHARS = 130


def clean_title(title: str) -> str:
    """Google News 標題常常是「標題 - 來源」，把來源部分拿掉。"""
    return re.sub(r"\s+-\s+[^-]{2,40}$", "", title).strip()


def guess_source(title: str, entry) -> str:
    src = entry.get("source")
    if src and hasattr(src, "title") and src.title:
        return src.title
    if " - " in title:
        return title.rsplit(" - ", 1)[-1].strip()
    return ""


def strip_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text or "")
    return html.unescape(text).strip()


def make_summary(entry) -> str:
    raw = entry.get("summary", "") or entry.get("description", "")
    text = strip_html(raw)
    text = re.sub(r"\s+", " ", text)
    if len(text) > SUMMARY_MAX_CHARS:
        text = text[:SUMMARY_MAX_CHARS].rstrip() + "…"
    return text


def make_id(link: str) -> str:
    return hashlib.sha1(link.encode("utf-8")).hexdigest()[:12]


def fetch_all():
    items = []
    seen_ids = set()

    for feed in FEEDS:
        try:
            parsed = feedparser.parse(feed["url"])
        except Exception as exc:  # noqa: BLE001 - 單一來源失敗不能讓整個流程掛掉
            print(f"[skip] {feed['query']} 抓取失敗：{exc}")
            continue

        for entry in parsed.entries[:MAX_PER_FEED]:
            link = (entry.get("link") or "").strip()
            if not link:
                continue
            item_id = make_id(link)
            if item_id in seen_ids:
                continue
            seen_ids.add(item_id)

            title_raw = (entry.get("title") or "").strip()
            published_parsed = entry.get("published_parsed")
            published_iso = (
                datetime.datetime(*published_parsed[:6]).isoformat() + "Z"
                if published_parsed
                else ""
            )

            items.append(
                {
                    "id": item_id,
                    "title": clean_title(title_raw),
                    "link": link,
                    "source": guess_source(title_raw, entry),
                    "published": published_iso,
                    "category": feed["category"],
                    "summary": make_summary(entry),
                }
            )

    # 新的排前面；沒有日期的排最後
    items.sort(key=lambda x: x["published"], reverse=True)
    return items[:MAX_TOTAL]


def main():
    out_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "news.json")

    items = fetch_all()

    import json

    updated_at = (
        datetime.datetime.now(datetime.timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )
    payload = {
        "updated_at": updated_at,
        "count": len(items),
        "items": items,
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"寫入 {len(items)} 則新聞到 {out_path}")


if __name__ == "__main__":
    main()
