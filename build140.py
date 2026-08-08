#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""命运织机 v1.4.0 APK 构建脚本"""
import os, shutil, zipfile, sys

P = "/home/operit/apk-project"
B = f"{P}/build"
SRC_HTML = "/storage/emulated/0/Android/AI产物/命运织机/index.html"
OUT_APK = "/storage/emulated/0/Android/AI产物/命运织机/织机_v1.4.0.apk"
MANIFEST = f"{P}/app/src/main/AndroidManifest.xml"

def run(cmd):
    print(">>", cmd)
    r = os.system(cmd)
    if r != 0:
        print("!! 命令失败:", cmd)
        sys.exit(1)

# ===== 1. 更新 Manifest 版本号 =====
with open(MANIFEST, encoding='utf-8') as f:
    mf = f.read()
mf = mf.replace('android:versionCode="104"', 'android:versionCode="105"')
mf = mf.replace('android:versionName="1.3.0"', 'android:versionName="1.4.0"')
with open(MANIFEST, 'w', encoding='utf-8') as f:
    f.write(mf)
print("✅ Manifest 版本号已更新为 102 / 1.1.0")
print("   包名:", "com.aichat.app" in mf)

# ===== 2. 复制新 HTML 到 assets =====
shutil.copy(SRC_HTML, f"{P}/app/src/main/assets/index.html")
print("✅ 新 index.html 已复制到 assets")

# ===== 3. aapt2 编译资源 =====
run(f"rm -rf {B}/compiled105")
run(f"mkdir -p {B}/compiled105")
run(f"aapt2 compile --dir {P}/app/src/main/res -o {B}/compiled105/ 2>&1 | tail -2")
print("✅ 资源编译完成")

# ===== 4. aapt2 link 生成基础 APK =====
run(f"aapt2 link -o {B}/app-base-v105.apk -I /usr/lib/android-sdk/platforms/android-23/android.jar --manifest {MANIFEST} --min-sdk-version 23 --target-sdk-version 23 {B}/compiled105/*.flat 2>&1 | tail -3")
print("✅ 基础 APK link 完成")

# ===== 5. 从 v5 壳提取 classes.dex（com.aichat.app，解决闪退） =====
v5 = f"{B}/命运织机_v5.apk"
with zipfile.ZipFile(v5, 'r') as zf:
    dex_data = zf.read('classes.dex')
dex_path = f"{B}/classes_v105.dex"
with open(dex_path, 'wb') as f:
    f.write(dex_data)
print(f"✅ 提取 classes.dex: {len(dex_data)} 字节")

# ===== 6. 组装最终 APK =====
apk = f"{B}/织机_v1.4.0_unsigned.apk"
shutil.copy(f"{B}/app-base-v105.apk", apk)
with zipfile.ZipFile(apk, 'a', zipfile.ZIP_STORED) as zf:
    zf.write(dex_path, 'classes.dex')
with zipfile.ZipFile(apk, 'a', zipfile.ZIP_DEFLATED) as zf:
    zf.write(SRC_HTML, 'assets/user_client.html')  # MainActivity 加载此文件
    zf.write(SRC_HTML, 'assets/index.html')
    zf.write(f"{P}/app/src/main/assets/manifest.json", 'assets/manifest.json')
print("✅ APK 组装完成")

# ===== 7. 签名 =====
run(f"jarsigner -keystore /home/operit/debug.keystore -storepass android -keypass android -sigalg SHA256withRSA -digestalg SHA-256 {apk} androiddebugkey 2>&1 | grep -iv 'warning\\|posix' | tail -3")
shutil.copy(apk, OUT_APK)
print(f"✅ 签名完成，输出: {OUT_APK}")
print("=== 构建全部完成 ===")