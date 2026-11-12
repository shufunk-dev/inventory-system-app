import subprocess
import os
import zipfile
import json

EXCLUDED_PREFIXES = (
    'web/electron/',
    'web/docs/',
    'web/tests/',
    'web/scratch/',
    'web/Archive/',
)

def create_demo_zip():
    repo_root = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
    web_dir = os.path.join(repo_root, 'web')
    output_zip = os.path.join(repo_root, 'demo-siteground.zip')

    if os.path.exists(output_zip):
        os.remove(output_zip)

    # 1. Get all tracked files in 'web'
    res = subprocess.run(['git', 'ls-files', 'web'], cwd=repo_root, capture_output=True, text=True, check=True)
    all_files = [f.strip() for f in res.stdout.splitlines() if f.strip()]

    # Filter out electron, docs, tests, scratch, and archive
    tracked_files = []
    for f in all_files:
        norm_f = f.replace('\\', '/')
        if any(norm_f.startswith(prefix) for prefix in EXCLUDED_PREFIXES):
            continue
        tracked_files.append(f)

    print(f"Packaging {len(tracked_files)} files from web/ (excluded electron, docs, tests, scratch)...")

    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in tracked_files:
            full_path = os.path.join(repo_root, f)
            if not os.path.isfile(full_path):
                continue
            rel_in_web = os.path.relpath(full_path, web_dir).replace('\\', '/')

            # If package.json, strip devDependencies so SiteGround npm install doesn't pull thousands of dev inodes
            if rel_in_web == 'package.json':
                with open(full_path, 'r', encoding='utf-8') as pf:
                    pkg_data = json.load(pf)
                if 'devDependencies' in pkg_data:
                    del pkg_data['devDependencies']
                z.writestr('package.json', json.dumps(pkg_data, indent=2))
                print("Added package.json (stripped devDependencies for minimal inode footprint)")
                continue

            z.write(full_path, rel_in_web)

        # 2. Add scripts/clean-cache.js if not already tracked
        clean_cache_path = os.path.join(web_dir, 'scripts', 'clean-cache.js')
        if os.path.isfile(clean_cache_path):
            z.write(clean_cache_path, 'scripts/clean-cache.js')
            print("Added scripts/clean-cache.js")

        # 3. Add .env file if present
        env_path = os.path.join(web_dir, '.env')
        if os.path.isfile(env_path) and '.env' not in [os.path.basename(f) for f in tracked_files]:
            z.write(env_path, '.env')
            print("Added .env (DEMO_MODE=true)")

        # 4. Add pre-seeded SQLite databases
        db_files = [
            'inventory.db',
            'store_booth-101-pixel-cartridge.sqlite',
            'store_booth-102-vault-cards.sqlite',
            'store_booth-103-nostalgia-toys.sqlite'
        ]
        for db_name in db_files:
            db_full = os.path.join(web_dir, db_name)
            if os.path.isfile(db_full):
                z.write(db_full, db_name)
                print(f"Added pre-seeded DB: {db_name} ({os.path.getsize(db_full):,} bytes)")

    size_mb = os.path.getsize(output_zip) / (1024 * 1024)
    print(f"\nSuccessfully generated {output_zip} ({size_mb:.2f} MB)")

if __name__ == '__main__':
    create_demo_zip()
