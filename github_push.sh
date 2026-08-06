#!/usr/bin/env bash
# ============================================================
# 命运织机 GitHub 一键开源脚本
# 用法: bash github_push.sh <你的GitHub Personal Access Token>
# 需要: token 具有 repo 权限 (Fine-grained: Contents read/write)
# ============================================================
set -e

TOKEN="$1"
if [ -z "$TOKEN" ]; then
  echo "❌ 请提供 GitHub Personal Access Token: bash github_push.sh <TOKEN>"
  exit 1
fi

REPO="fate-loom"
OWNER=""   # ← 在这里填你的 GitHub 用户名，或留空自动获取
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# 自动获取用户名（如未填写）
if [ -z "$OWNER" ]; then
  OWNER=$(curl -s -H "Authorization: Bearer $TOKEN" https://api.github.com/user | python3 -c "import sys,json;print(json.load(sys.stdin).get('login',''))")
fi
echo "👤 GitHub 用户: $OWNER"

# 创建仓库（已存在则忽略错误）
echo "📦 创建仓库 $OWNER/$REPO ..."
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"$REPO\",\"description\":\"🧵 命运织机 - 沉浸式AI故事聊天客户端 (Android, 自定义OpenAI兼容API)\",\"homepage\":\"\",\"private\":false,\"has_issues\":true,\"has_wiki\":true}" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print('✅ 仓库创建成功' if d.get('full_name') else 'ℹ️ 可能已存在: '+str(d.get('message','')))"

# 初始化 git 并推送
echo "🚀 初始化 git 仓库..."
git init -q 2>/dev/null || true
git checkout -q -b main 2>/dev/null || git branch -q -M main
git add -A
git commit -q -m "v1.2.0: 升级 - 会话搜索/文件导入导出/停止生成/Markdown增强/连接测试" 2>/dev/null || echo "ℹ️ 无新提交"

git remote remove origin 2>/dev/null || true
git remote add origin "https://$OWNER:$TOKEN@github.com/$OWNER/$REPO.git"
echo "📤 推送代码..."
git push -q -u origin main --force 2>&1 | grep -v "warning:" || true

echo ""
echo "=========================================="
echo "✅ 开源完成！"
echo "   仓库地址: https://github.com/$OWNER/$REPO"
echo "=========================================="