#!/usr/bin/env python3
"""
HookMaster — Master Sync & Gumroad Asset Builder
Runs both:
  1. sync_vault.py (Syncs hooks to individual Google Drive folders)
  2. generate_pdf_vault.py (Compiles updated PDF Vault for Gumroad)
"""

import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

def main():
    print("=" * 60)
    print(" 🪝 HOOKMASTER — ONE-CLICK MONETIZATION SYNC ENGINE")
    print("=" * 60)

    # 1. Sync Vault Folders
    print("\n[STEP 1/2] Syncing hook folders for Google Drive...")
    import sync_vault
    sync_vault.sync_vault(download_videos=False)

    # 2. Generate Gumroad PDF
    print("\n[STEP 2/2] Generating updated Gumroad PDF Vault...")
    import generate_pdf_vault
    generate_pdf_vault.build_pdf()

    print("\n" + "=" * 60)
    print(" ✅ ALL DONE!")
    print(f" 📂 1. Google Drive Folders: {BASE_DIR / 'google_drive_vault'}")
    print(f" 📄 2. Gumroad Master PDF:   {BASE_DIR / 'dist_gumroad' / 'HookMaster_Viral_Hooks_Vault.pdf'}")
    print("=" * 60)

if __name__ == "__main__":
    main()
