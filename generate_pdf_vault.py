#!/usr/bin/env python3
"""
HookMaster — Automated PDF Vault Generator for Gumroad
Compiles all hooks from data/hooks.json into a stunning, commercial-ready
PDF Playbook using ReportLab.

Output: dist_gumroad/HookMaster_Viral_Hooks_Vault.pdf
Ready to sell on Gumroad for $29 (Vault) / $49 (All Access Bundle).
"""

import os
import json
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

BASE_DIR = Path(__file__).resolve().parent
DATA_FILE = BASE_DIR / "data" / "hooks.json"
DIST_DIR = BASE_DIR / "dist_gumroad"
PDF_OUTPUT = DIST_DIR / "HookMaster_Viral_Hooks_Vault.pdf"

# Brand Colors
C_DARK = colors.HexColor("#0B0B14")
C_DARK_CARD = colors.HexColor("#141424")
C_DARK_BOX = colors.HexColor("#0E0E1A")
C_PURPLE = colors.HexColor("#7440E4")
C_PURPLE_LIGHT = colors.HexColor("#A855F7")
C_PINK = colors.HexColor("#EC4899")
C_CYAN = colors.HexColor("#22D3EE")
C_CREAM = colors.HexColor("#F7F5F0")
C_MUTED = colors.HexColor("#94A3B8")
C_BORDER = colors.HexColor("#2A2A40")

class DarkThemeCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.pages = []

    def showPage(self):
        self.pages.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self.pages)
        for page in self.pages:
            self.__dict__.update(page)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages):
        w, h = A4
        # Solid dark background on every page
        self.saveState()
        self.setFillColor(C_DARK)
        self.rect(0, 0, w, h, stroke=0, fill=1)

        # Omit headers & footers on Cover Page (Page 1)
        if self._pageNumber > 1:
            # Top header bar
            self.setStrokeColor(C_BORDER)
            self.setLineWidth(0.8)
            self.line(36, h - 32, w - 36, h - 32)

            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(C_PURPLE_LIGHT)
            self.drawString(36, h - 26, "HOOKMASTER™")
            self.setFont("Helvetica", 8)
            self.setFillColor(C_MUTED)
            self.drawString(108, h - 26, "·  4K Viral Hooks Vault & Creator Playbook")

            self.drawRightString(w - 36, h - 26, "hookmaster.guru")

            # Bottom footer bar
            self.line(36, 32, w - 36, 32)
            self.setFont("Helvetica", 8)
            self.setFillColor(C_MUTED)
            self.drawString(36, 22, "© 2026 HookMaster · Commercial License Included")
            self.drawRightString(w - 36, 22, f"Page {self._pageNumber} of {total_pages}")

        self.restoreState()

def build_pdf():
    DIST_DIR.mkdir(parents=True, exist_ok=True)

    if not DATA_FILE.exists():
        print(f"❌ Error: {DATA_FILE} not found!")
        return

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        hooks = json.load(f)

    print(f"📖 Compiling PDF Playbook for {len(hooks)} hooks...")

    doc = SimpleDocTemplate(
        str(PDF_OUTPUT),
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=46,
        bottomMargin=46
    )

    styles = getSampleStyleSheet()

    # Custom typography styles
    style_cover_brand = ParagraphStyle(
        "CoverBrand",
        fontName="Helvetica-Bold",
        fontSize=26,
        textColor=C_CREAM,
        alignment=1,
        spaceAfter=10
    )
    style_cover_kicker = ParagraphStyle(
        "CoverKicker",
        fontName="Helvetica-Bold",
        fontSize=10,
        textColor=C_CYAN,
        alignment=1,
        spaceAfter=15
    )
    style_cover_title = ParagraphStyle(
        "CoverTitle",
        fontName="Helvetica-Bold",
        fontSize=30,
        leading=34,
        textColor=C_CREAM,
        alignment=1,
        spaceAfter=16
    )
    style_cover_sub = ParagraphStyle(
        "CoverSub",
        fontName="Helvetica",
        fontSize=11,
        leading=16,
        textColor=C_MUTED,
        alignment=1,
        spaceAfter=30
    )
    style_h1 = ParagraphStyle(
        "SectionH1",
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=C_CREAM,
        spaceAfter=10
    )
    style_sub = ParagraphStyle(
        "SectionSub",
        fontName="Helvetica",
        fontSize=9.5,
        leading=14,
        textColor=C_MUTED,
        spaceAfter=18
    )
    style_hook_title = ParagraphStyle(
        "HookTitle",
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=C_CREAM,
        spaceAfter=6
    )
    style_hook_meta = ParagraphStyle(
        "HookMeta",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=C_CYAN
    )
    style_body = ParagraphStyle(
        "BodyText",
        fontName="Helvetica",
        fontSize=8.5,
        leading=12.5,
        textColor=C_CREAM
    )
    style_step = ParagraphStyle(
        "StepText",
        fontName="Helvetica",
        fontSize=8,
        leading=11.5,
        textColor=C_CREAM
    )
    style_caption = ParagraphStyle(
        "CaptionText",
        fontName="Helvetica",
        fontSize=8,
        leading=11.5,
        textColor=C_MUTED
    )
    style_prompt = ParagraphStyle(
        "PromptText",
        fontName="Courier",
        fontSize=7.5,
        leading=10,
        textColor=C_CYAN
    )
    style_link = ParagraphStyle(
        "ActionLink",
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=12,
        textColor=C_PINK
    )

    story = []

    # ========================================================
    # PAGE 1: COVER PAGE
    # ========================================================
    story.append(Spacer(1, 40))
    story.append(Paragraph("HOOK<font color='#EC4899'>MASTER</font>", style_cover_brand))
    story.append(Paragraph("OFFICIAL GUMROAD CREATOR EDITION · 2026", style_cover_kicker))
    story.append(Spacer(1, 20))
    story.append(Paragraph("THE 4K VIRAL HOOKS VAULT<br/>&amp; CREATOR PLAYBOOK", style_cover_title))
    story.append(Paragraph(
        "Scroll-stopping 9:16 openers, algorithm retention blueprints, caption templates, "
        "and AI b-roll prompts engineered for Reels, TikTok &amp; YouTube Shorts creators.",
        style_cover_sub
    ))

    # Feature Grid Box
    feature_table_data = [
        [
            Paragraph("<b>🎥 4K Vertical Video Clips</b><br/><font color='#94A3B8'>1080x1920 / 4K MP4 uncompressed files</font>", style_body),
            Paragraph("<b>🔥 Tested Retention Scripts</b><br/><font color='#94A3B8'>Proven 3-second algorithm openers</font>", style_body),
        ],
        [
            Paragraph("<b>🤖 1,000+ AI Video Prompts</b><br/><font color='#94A3B8'>For Midjourney, Kling, Runway &amp; Luma</font>", style_body),
            Paragraph("<b>📱 Ready for CapCut &amp; Reels</b><br/><font color='#94A3B8'>Commercial license for own &amp; client posts</font>", style_body),
        ]
    ]
    feat_table = Table(feature_table_data, colWidths=[240, 240])
    feat_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_DARK_CARD),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 12),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ('LEFTPADDING', (0,0), (-1,-1), 14),
        ('RIGHTPADDING', (0,0), (-1,-1), 14),
    ]))
    story.append(feat_table)

    story.append(Spacer(1, 60))
    story.append(Paragraph("<font color='#A855F7'><b>Website:</b></font> <a href='https://hookmaster.guru'><u>https://hookmaster.guru</u></a>", style_cover_sub))
    story.append(PageBreak())

    # ========================================================
    # PAGE 2: THE 3-SECOND RETENTION BLUEPRINT & TOC
    # ========================================================
    story.append(Paragraph("The 3-Second Viral Algorithm Blueprint", style_h1))
    story.append(Paragraph(
        "Why 80% of short-form videos fail before second 4, and how to engineer scroll-stopping retention.",
        style_sub
    ))

    blueprint_data = [
        [
            Paragraph("<b>1. Visual Pattern Interrupt (0.0s - 0.5s)</b><br/><font color='#94A3B8'>High-contrast movement, unique camera angles, or unexpected text stops subconscious thumb scroll immediately.</font>", style_body)
        ],
        [
            Paragraph("<b>2. The Curiosity Gap / Bold Claim (0.5s - 2.5s)</b><br/><font color='#94A3B8'>Deliver an intriguing hook sentence that makes skipping feel like missing crucial insider information.</font>", style_body)
        ],
        [
            Paragraph("<b>3. The Fast Cut (Second 2 - 3)</b><br/><font color='#94A3B8'>Cut instantly from the hook visual into your talking head or behind-the-scenes proof. Never let the opener drag past 4s.</font>", style_body)
        ],
        [
            Paragraph("<b>4. The 3-Bullet Value Drop &amp; Micro-CTA</b><br/><font color='#94A3B8'>Deliver high-density value in 3 crisp points. Close with 'Comment GUIDE for link' to skyrocket algorithm comment signals.</font>", style_body)
        ]
    ]
    bp_table = Table(blueprint_data, colWidths=[490])
    bp_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_DARK_CARD),
        ('BOX', (0,0), (-1,-1), 1, C_BORDER),
        ('LINEBELOW', (0,0), (-1,-2), 0.5, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    story.append(bp_table)
    story.append(Spacer(1, 14))

    # Niche Summary Table
    niches = {}
    for h in hooks:
        n = h.get("niche", "general").capitalize()
        niches[n] = niches.get(n, 0) + 1

    story.append(Paragraph("<b>Vault Directory by Content Niche:</b>", style_hook_title))
    niche_summary_data = [
        [Paragraph(f"<b>💼 {n}</b>", style_body), Paragraph(f"<font color='#EC4899'><b>{cnt} Hooks</b></font>", style_body)]
        for n, cnt in niches.items()
    ]
    # Split into 2 columns if multiple niches
    niche_table = Table(niche_summary_data, colWidths=[245, 245])
    niche_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), C_DARK_BOX),
        ('BOX', (0,0), (-1,-1), 0.5, C_BORDER),
        ('INNERGRID', (0,0), (-1,-1), 0.5, C_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(niche_table)
    story.append(PageBreak())

    # ========================================================
    # PAGES 3+: HOOK CATALOG CARDS (2 hooks per page)
    # ========================================================
    for idx, h in enumerate(hooks):
        hook_id = h.get("id", idx + 1)
        headline = h.get("hook", "Viral Hook")
        niche = h.get("niche", "general").capitalize()
        cat = h.get("category", "Viral B-Roll")
        dur = h.get("duration", "4s")
        views = h.get("views", "1.5M")
        live_url = f"https://hookmaster.guru/hook.html?id={hook_id}"
        ig_url = h.get("exampleInstagram") or h.get("exampleUrl") or ""

        howto = h.get("howTo") or (
            "1. Hook the viewer in first 2-3s with this exact opener.\n"
            "2. Cut immediately to your talking head or behind-the-scenes footage.\n"
            "3. Deliver 3 bullet points, then call to comment or save."
        )
        steps_clean = [s.strip() for s in howto.split("\n") if s.strip()]
        caption = h.get("suggestedCaption") or "#reels #contentcreator #growth #viraltips #shortform"
        prompt = f"9:16 vertical video, {cat.lower()} aesthetic, cinematic lighting, 4k realistic, shot on Arri Alexa, clean viral short-form b-roll --ar 9:16 --v 6.1"

        meta_line = f"<b>HOOK #{hook_id:02d}</b> · <font color='#EC4899'>{niche.upper()}</font> · {cat} · ⏱ {dur} · 🔥 {views} Benchmark"
        links_line = f"<a href='{live_url}'><u>▶ Watch 9:16 Video Online</u></a>"
        if ig_url:
            links_line += f" &nbsp;|&nbsp; <a href='{ig_url}'><u>🔥 View Viral Instagram Example ↗</u></a>"

        card_content = [
            [Paragraph(meta_line, style_hook_meta)],
            [Paragraph(f'"{headline}"', style_hook_title)],
            [Paragraph(links_line, style_link)],
            [Paragraph("<b>Execution Steps:</b>", style_hook_meta)],
            [Paragraph("<br/>".join(f"• {s.lstrip('0123456789.) ')}" for s in steps_clean), style_step)],
            [Paragraph(f"<b>Suggested Caption &amp; Tags:</b> {caption}", style_caption)],
            [Paragraph(f"<b>AI Prompt:</b> {prompt}", style_prompt)]
        ]

        card_table = Table(card_content, colWidths=[485])
        card_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), C_DARK_CARD),
            ('BOX', (0,0), (-1,-1), 1, C_BORDER),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 12),
            ('RIGHTPADDING', (0,0), (-1,-1), 12),
            ('LINEBELOW', (0,2), (0,2), 0.5, C_BORDER),
        ]))

        story.append(card_table)
        story.append(Spacer(1, 10))

        # Page break after every 2 hooks for a clean, spacious layout
        if (idx + 1) % 2 == 0 and (idx + 1) < len(hooks):
            story.append(PageBreak())

    # Build the document
    doc.build(story, canvasmaker=DarkThemeCanvas)
    size_kb = round(PDF_OUTPUT.stat().st_size / 1024, 1)
    print(f"\n🎉 SUCCESS! Generated Gumroad PDF Vault ({size_kb} KB):")
    print(f"👉 {PDF_OUTPUT}")
    print("💡 Attach this PDF file directly to your Gumroad product download!")

if __name__ == "__main__":
    build_pdf()
