import json
import os
import shutil

with open("users.json", "r") as f:
    users = json.load(f)

BASE_DIR     = "users"
TEMPLATE_DIR = "template"

os.makedirs(BASE_DIR, exist_ok=True)

for u in users:
    dest = os.path.join(BASE_DIR, u["username"])
    os.makedirs(dest, exist_ok=True)
    
    for item in os.listdir(TEMPLATE_DIR):
        src_path = os.path.join(TEMPLATE_DIR, item)
        dst_path = os.path.join(dest, item)
        
        if os.path.isdir(src_path):
            shutil.copytree(src_path, dst_path, dirs_exist_ok=True)
        else:
            shutil.copy2(src_path, dst_path)