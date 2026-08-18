import subprocess
import sys
import re
import os
import json
from pathlib import Path

# ---------- Settings ----------
SCRIPT_DIR = Path.cwd()
PROJECTS_DIR = SCRIPT_DIR / "projects"
WORK_DIR = PROJECTS_DIR / "work"
DATA_FILE = SCRIPT_DIR / "data" / "projects.json"
CDN_BASE_TEMPLATE = "https://cdn.jsdelivr.net/gh/fampeh/sayfit-assets@{tag}/"
MAIN_CDN = "https://cdn.jsdelivr.net/gh/fampeh/sayfit-assets@main/"

IMG_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'}
VID_EXTS = {'.mp4', '.webm', '.mov'}

# ---------- Helpers ----------
def natural_sort_key(s):
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

def run_git(command, cwd=None):
    result = subprocess.run(command, cwd=cwd or SCRIPT_DIR, shell=True,
                            capture_output=True, text=True, encoding="utf-8")
    if result.returncode != 0:
        print(f"ERROR: Git command failed:\n  {command}\n{result.stderr}")
        sys.exit(1)
    return result.stdout.strip()

def get_next_tag():
    tags = run_git("git tag").split("\n")
    highest = (0, 0)
    for tag in tags:
        m = re.match(r"^v(\d+)\.(\d+)$", tag)
        if m:
            major, minor = int(m.group(1)), int(m.group(2))
            highest = max(highest, (major, minor))
    if highest == (0, 0):
        return "v1.0"
    return f"v{highest[0]}.{highest[1] + 1}"

def humanize(text: str) -> str:
    return text.replace('-', ' ').replace('_', ' ').title()

def normalize_project_folder(proj_dir: Path) -> list:
    images = []
    videos = []
    cover = None
    for f in proj_dir.iterdir():
        if not f.is_file():
            continue
        ext = f.suffix.lower()
        if ext in IMG_EXTS:
            if f.stem.lower() == 'cover':
                if cover is None:
                    cover = f
                else:
                    images.append(f)
            else:
                images.append(f)
        elif ext in VID_EXTS:
            videos.append(f)

    images.sort(key=lambda x: natural_sort_key(x.name))
    videos.sort(key=lambda x: natural_sort_key(x.name))

    media = []
    rel_base = f"projects/work/{proj_dir.parent.name}/{proj_dir.name}"
    if cover:
        media.append({"type": "image", "src": f"{rel_base}/{cover.name}"})
    for img in images:
        if img != cover:
            media.append({"type": "image", "src": f"{rel_base}/{img.name}"})
    for vid in videos:
        media.append({"type": "video", "src": f"{rel_base}/{vid.name}"})
    return media

def load_existing_data():
    if DATA_FILE.exists():
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"cdnBase": MAIN_CDN, "projects": {}}

def build_new_projects(existing_projects: dict) -> dict:
    if not WORK_DIR.exists():
        print("ERROR: projects/work/ folder not found.")
        sys.exit(1)
    new_projects = {}
    for cat_dir in sorted(WORK_DIR.iterdir()):
        if not cat_dir.is_dir():
            continue
        cat_name = cat_dir.name
        print(f"\nScanning category: {cat_name}")
        cat_entries = []
        for proj_dir in sorted(cat_dir.iterdir()):
            if not proj_dir.is_dir():
                continue
            proj_name = proj_dir.name
            print(f"  Processing project: {proj_name}")
            media = normalize_project_folder(proj_dir)

            old_entry = None
            old_cat = existing_projects.get(cat_name, [])
            human_title = humanize(proj_name).lower()
            for item in old_cat:
                if item.get("title", "").lower() == human_title:
                    old_entry = item
                    break

            if old_entry:
                entry = {
                    "year": old_entry.get("year", ""),
                    "title": old_entry.get("title", humanize(proj_name)),
                    "desc": old_entry.get("desc", ""),
                    "media": media
                }
                print(f"    (existing project, keeping metadata)")
            else:
                entry = {
                    "year": "",
                    "title": humanize(proj_name),
                    "desc": "",
                    "media": media
                }
                print(f"    (new project, please edit year/desc later in JSON)")
            cat_entries.append(entry)
        if cat_entries:
            new_projects[cat_name] = cat_entries
    return new_projects

# ---------- Switch CDN to @main (used in quick push) ----------
def switch_cdn_to_main():
    if not DATA_FILE.exists():
        print("data/projects.json not found, skipping CDN update.")
        return
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    if data.get("cdnBase") == MAIN_CDN:
        print("cdnBase is already @main, no change needed.")
        return
    data["cdnBase"] = MAIN_CDN
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"cdnBase updated to {MAIN_CDN}")
    run_git("git add -f data/projects.json")
    run_git('git commit -m "Switch cdnBase to @main"')

# ---------- Modes ----------
def mode_full_update():
    commit_msg = None
    args = sys.argv[1:]
    if args:
        commit_msg = " ".join(args)

    old_data = load_existing_data()
    new_projects = build_new_projects(old_data.get("projects", {}))

    next_tag = get_next_tag()
    new_base = CDN_BASE_TEMPLATE.format(tag=next_tag)
    print(f"\nNext tag: {next_tag}")
    print(f"New CDN base: {new_base}")

    final_data = {"cdnBase": new_base, "projects": new_projects}

    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(final_data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"\nUpdated {DATA_FILE} written.")

    print("\n--- Git operations ---")
    os.chdir(SCRIPT_DIR)
    run_git("git add projects/")
    run_git(f"git add -f {DATA_FILE.relative_to(SCRIPT_DIR)}")

    status = run_git("git status --porcelain")
    if not status:
        print("No changes to commit. All done.")
        return

    if commit_msg is None:
        commit_msg = input("Enter commit message: ").strip()
        if not commit_msg:
            commit_msg = "Update project data and images"

    run_git(f'git commit -m "{commit_msg}"')
    run_git("git pull origin main --rebase")
    run_git("git push origin main")
    print("Pushed to main.")

    run_git(f"git tag {next_tag}")
    run_git(f"git push origin {next_tag}")
    print(f"Tag {next_tag} created and pushed.")

    print("\n" + "="*50)
    print("Full update done. Upload data/projects.json to your server with FileZilla.")
    print("="*50)

def mode_quick_push():
    commit_msg = None
    args = sys.argv[1:]
    if args:
        commit_msg = " ".join(args)

    print("Staging changes in projects/ ...")
    run_git("git add projects/")

    status = run_git("git status --porcelain")
    if not status:
        print("No changes to commit.")
        return

    if commit_msg is None:
        commit_msg = input("Enter commit message: ").strip()
        if not commit_msg:
            commit_msg = "Quick push project updates"

    run_git(f'git commit -m "{commit_msg}"')
    print("Pulling latest changes...")
    run_git("git pull origin main --rebase")
    print("Pushing to origin main...")
    run_git("git push origin main")
    print("Push successful.")

    switch_cdn_to_main()

    print("\n" + "="*50)
    print("Quick push completed. Your edits are live on main (no version tag).")
    print("If your site reads data/projects.json locally, upload it now.")
    print("="*50)

def mode_update_json_only():
    """Just regenerate the JSON file locally, no git operations."""
    old_data = load_existing_data()
    new_projects = build_new_projects(old_data.get("projects", {}))

    # Keep the original cdnBase (or fallback to @main)
    current_base = old_data.get("cdnBase") or MAIN_CDN
    final_data = {
        "cdnBase": current_base,
        "projects": new_projects
    }

    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(final_data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"\nUpdated {DATA_FILE} written (cdnBase kept as {current_base}).")
    print("No git actions were performed.")
    print("You can now review the JSON and commit/push manually if desired.")

# ---------- Main menu ----------
def main():
    print("="*50)
    print("Select mode:")
    print("  1 - Full update (rebuild JSON, tag new version, git push)")
    print("  2 - Quick push (commit & push changes, switch to @main)")
    print("  3 - Update JSON only (rebuild JSON, NO git operations)")
    choice = input("Enter 1, 2 or 3: ").strip()

    if choice == "1":
        mode_full_update()
    elif choice == "2":
        mode_quick_push()
    elif choice == "3":
        mode_update_json_only()
    else:
        print("Invalid choice. Exiting.")
        sys.exit(1)

    input("\nPress Enter to exit...")

if __name__ == "__main__":
    main()