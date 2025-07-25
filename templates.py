import json
import os
import shutil

# 1. Load your users
with open("users.json", "r") as f:
    users = json.load(f)

BASE_DIR     = "users"
TEMPLATE_DIR = "template"    # <-- should contain index.html, style.css, script.js, pictures/, fonts/, etc.

# 2. Make sure the users/ directory exists
os.makedirs(BASE_DIR, exist_ok=True)

# 3. For each user, copy the entire template directory into their folder
for u in users:
    dest = os.path.join(BASE_DIR, u["username"])
    os.makedirs(dest, exist_ok=True)
    
    # Copy every item (files + subfolders) from template/ into users/<username>/
    for item in os.listdir(TEMPLATE_DIR):
        src_path = os.path.join(TEMPLATE_DIR, item)
        dst_path = os.path.join(dest, item)
        
        if os.path.isdir(src_path):
            # merge subdirectory (Python 3.8+)
            shutil.copytree(src_path, dst_path, dirs_exist_ok=True)
        else:
            # copy a single file
            shutil.copy2(src_path, dst_path)