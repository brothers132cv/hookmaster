#!/usr/bin/env python3
"""
HookMaster — Google Drive Vault Synchronizer
Syncs hooks from data/hooks.json into individual hook folders on your computer.
Each folder contains:
  1. Open-On-HookMaster.html (Direct clickable link & auto-redirect to hookmaster.guru)
  2. README-GUIDE.txt (Offline instructions, script steps & hashtags)
  3. video_1080p.mp4 (High quality vertical 9:16 footage)
  4. Viral_Instagram_Example.url (Windows internet shortcut)

Ready to zip or upload straight into your Google Drive for Gumroad customers.
"""

import os
import re
import json
import urllib.request
import argparse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "data" / "hooks.json"
VAULT_DIR = BASE_DIR / "google_drive_vault"

def sanitize_filename(name: str) -> str:
    cleaned = re.sub(r'[\\/*?:"<>|]', "", name).strip()
    return cleaned[:60].strip()

def create_redirect_html(hook: dict) -> str:
    hook_id = hook.get("id", 1)
    title = hook.get("hook", "Viral Hook")
    niche = hook.get("niche", "general").capitalize()
    cat = hook.get("category", "Viral B-Roll")
    duration = hook.get("duration", "4s")
    views = hook.get("views", "1M")
    url = f"https://hookmaster.guru/hook.html?id={hook_id}"
    ig_url = hook.get("exampleInstagram") or hook.get("exampleUrl") or ""

    howto_text = hook.get("howTo") or (
        "1. Hook the viewer in the first 2-3 seconds with this exact video and text opener.\n"
        "2. Cut immediately to your talking head or behind-the-scenes product demo.\n"
        "3. Deliver high value in 3 bullet points, then finish with a direct call to comment or follow."
    )
    caption = hook.get("suggestedCaption") or "#reels #contentcreator #growth #viraltips #shortform"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="3; url={url}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>"{title}" — HookMaster Vault</title>
  <style>
    :root {{
      --primary: #7440E4;
      --pink: #EC4899;
      --cyan: #22D3EE;
      --dark: #0B0B14;
      --card: #151522;
      --border: rgba(255, 255, 255, 0.1);
      --text: #F7F5F0;
      --muted: #94A3B8;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--dark);
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px 16px;
    }}
    .card {{
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 36px 32px;
      max-width: 580px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 60px rgba(0,0,0,0.7), 0 0 40px rgba(116,64,228,0.2);
    }}
    .logo {{
      font-size: 1.4rem;
      font-weight: 900;
      letter-spacing: -0.5px;
      margin-bottom: 24px;
      display: inline-block;
    }}
    .logo span {{
      background: linear-gradient(135deg, #7440E4, #EC4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }}
    .badge-row {{
      display: flex;
      gap: 8px;
      justify-content: center;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }}
    .badge {{
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 9999px;
      background: rgba(116, 64, 228, 0.2);
      border: 1px solid rgba(116, 64, 228, 0.4);
      color: #D8B4FE;
    }}
    h1 {{
      font-size: 1.5rem;
      font-weight: 800;
      line-height: 1.3;
      margin-bottom: 16px;
      color: #fff;
    }}
    .timer {{
      font-size: 0.85rem;
      color: var(--muted);
      margin-bottom: 24px;
    }}
    .btn {{
      display: inline-block;
      width: 100%;
      padding: 14px 24px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 1rem;
      text-decoration: none;
      background: linear-gradient(135deg, #7440E4, #EC4899);
      color: #fff;
      box-shadow: 0 10px 25px rgba(236,72,153,0.35);
      transition: transform 0.2s;
    }}
    .btn:hover {{
      transform: translateY(-2px);
    }}
    .btn-ig {{
      background: rgba(255,255,255,0.06);
      border: 1px solid var(--border);
      color: #fff;
      box-shadow: none;
      margin-top: 10px;
    }}
    .summary-box {{
      text-align: left;
      background: rgba(0,0,0,0.3);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      margin-top: 24px;
      font-size: 0.88rem;
    }}
    .summary-box h3 {{
      font-size: 0.85rem;
      color: var(--muted);
      text-transform: uppercase;
      margin-bottom: 8px;
    }}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Hook<span>Master</span> Vault</div>
    <div class="badge-row">
      <span class="badge">#{hook_id}</span>
      <span class="badge">{niche}</span>
      <span class="badge">{cat}</span>
      <span class="badge">{duration}</span>
      <span class="badge">🔥 {views} Views</span>
    </div>
    <h1>"{title}"</h1>
    <p class="timer">Redirecting to your full live interactive guide in 3 seconds...</p>
    
    <a href="{url}" class="btn">🚀 Open Full Hook Guide on HookMaster.guru</a>
    {f'<a href="{ig_url}" target="_blank" class="btn btn-ig">🔥 View Real Viral Example on Instagram ↗</a>' if ig_url else ''}

    <div class="summary-box">
      <h3>Quick Step-by-Step Guide:</h3>
      <p style="white-space: pre-wrap; color: var(--text); line-height: 1.45;">{howto_text}</p>
    </div>
  </div>
</body>
</html>
"""
    return html

def create_readme_txt(hook: dict) -> str:
    hook_id = hook.get("id", 1)
    title = hook.get("hook", "Viral Hook")
    niche = hook.get("niche", "general").capitalize()
    cat = hook.get("category", "General")
    duration = hook.get("duration", "4s")
    views = hook.get("views", "1M")
    url = f"https://hookmaster.guru/hook.html?id={hook_id}"
    ig_url = hook.get("exampleInstagram") or hook.get("exampleUrl") or "https://www.instagram.com/explore/tags/reels/"
    howto = hook.get("howTo") or (
        "1. Hook the viewer in the first 2-3 seconds with this exact video and text opener.\n"
        "2. Cut immediately to your talking head or behind-the-scenes product demo.\n"
        "3. Deliver high value in 3 bullet points, then finish with a direct call to comment or follow."
    )
    caption = hook.get("suggestedCaption") or "#reels #contentcreator #growth #viraltips #shortform"

    return f"""=====================================================
HOOKMASTER 4K HOOKS VAULT — HOOK #{hook_id}
=====================================================

HEADLINE:
"{title}"

METADATA:
- Niche: {niche}
- Aesthetic / Category: {cat}
- Duration: {duration}
- Benchmark Views: {views}
- Format: 9:16 Vertical MP4 (1080x1920 / 4K)

-----------------------------------------------------
LIVE INTERACTIVE LINKS:
-----------------------------------------------------
1. Online Hook Guide: {url}
2. Viral Instagram Example: {ig_url}
(Tip: Open the file 'Open-On-HookMaster.html' to launch directly in your browser)

-----------------------------------------------------
STEP-BY-STEP HOW TO USE THIS HOOK:
-----------------------------------------------------
{howto}

-----------------------------------------------------
SUGGESTED CAPTION & HASHTAGS:
-----------------------------------------------------
{caption}

=====================================================
(c) HookMaster (hookmaster.guru) — All Rights Reserved.
Commercial use allowed for your own posts and client content.
=====================================================
"""

def create_internet_shortcut(url: str) -> str:
    return f"""[InternetShortcut]
URL={url}
"""

def download_video_if_needed(url: str, dest_path: Path):
    if dest_path.exists() and dest_path.stat().st_size > 1024:
        return
    print(f"  Downloading video: {dest_path.name}...")
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        )
        with urllib.request.urlopen(req, timeout=25) as response, open(dest_path, "wb") as out_file:
            out_file.write(response.read())
    except Exception as e:
        print(f"  ⚠️ Could not download {url}: {e}. Creating placeholder text.")
        if not dest_path.exists():
            dest_path.with_suffix(".txt").write_text(f"Video Source URL:\n{url}\n", encoding="utf-8")

def sync_vault(download_videos=False):
    if not DATA_FILE.exists():
        print(f"❌ Error: {DATA_FILE} not found!")
        return

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        hooks = json.load(f)

    VAULT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"📂 Syncing {len(hooks)} hooks to local vault: {VAULT_DIR}")

    synced_count = 0
    for hook in hooks:
        hook_id = hook.get("id", 1)
        headline = hook.get("hook", f"Hook {hook_id}")
        slug = sanitize_filename(headline)
        folder_name = f"Hook-{hook_id:02d} - {slug}"
        hook_folder = VAULT_DIR / folder_name
        hook_folder.mkdir(parents=True, exist_ok=True)

        # 1. Open-On-HookMaster.html
        html_content = create_redirect_html(hook)
        (hook_folder / "Open-On-HookMaster.html").write_text(html_content, encoding="utf-8")

        # 2. README-GUIDE.txt
        readme_content = create_readme_txt(hook)
        (hook_folder / "README-GUIDE.txt").write_text(readme_content, encoding="utf-8")

        # 3. Instagram shortcut if link provided
        ig_url = hook.get("exampleInstagram") or hook.get("exampleUrl")
        if ig_url:
            (hook_folder / "Viral_Instagram_Example.url").write_text(create_internet_shortcut(ig_url), encoding="utf-8")

        # 4. Video file
        video_sample = hook.get("videoSample")
        video_dest = hook_folder / "video_1080p.mp4"
        if download_videos and video_sample and video_sample.startswith("http"):
            download_video_if_needed(video_sample, video_dest)

        synced_count += 1
        print(f"  ✅ Synced: {folder_name}")

    print(f"\n🎉 Successfully synced {synced_count} hook folders to:\n👉 {VAULT_DIR}")
    print("💡 You can now upload this entire folder to your Google Drive and paste the share link into Gumroad!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sync HookMaster hooks into Google Drive folders.")
    parser.add_argument("--download-videos", action="store_true", help="Download MP4 video clips into each hook folder")
    args = parser.parse_args()
    sync_vault(download_videos=args.download_videos)
