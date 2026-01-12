# shang-dynasty-war-gamev1
it's card battle game based on shang-history,including rpg and rouge elements 
# 甲骨文战棋：商周纪元

一款基于Canvas 2D的青铜器风格自走棋游戏，支持移动端适配。

## 🎮 游戏特色
- **青铜器视觉风格**：采用商周时期青铜器色调和纹理
- **自走棋核心玩法**：单位移动、攻击、阵法系统
- **阵法系统**：4种特色阵法（众、伐、驭、化）
- **动画效果**：阵法激活、单位召唤、转换等动画
- **移动端适配**：支持触摸操作和响应式布局

## 🚀 运行方法

### 方法1：使用GitHub Pages
1. 将项目推送到GitHub仓库
2. 在仓库设置中启用GitHub Pages
3. 使用提供的GitHub Pages URL访问游戏

### 方法2：本地运行
```bash
# 使用Python 3启动本地服务器
python -m http.server 8080

# 或使用Node.js的http-server
npx http-server -p 8080

# 或使用PHP
php -S localhost:8080
```
然后在浏览器访问：`http://localhost:8080/index.html`

### 方法3：直接打开（简单但可能有跨域问题）
在文件资源管理器中找到`index.html`，右键使用浏览器打开

## 🎯 游戏操作
- **开始游戏**：点击空白处进入战斗
- **选择单位**：点击己方单位显示移动/攻击范围
- **移动单位**：点击高亮的可移动格子
- **攻击敌人**：点击范围内的敌方单位
- **使用阵法**：点击底部阵法按钮，再次点击激活

## 📄 文件说明
- `index.html` - 游戏主页面（青铜器风格UI）
- `oracleWar.js` - 核心游戏逻辑
- `oracleWarData.json` - 游戏数据配置

## 🛠️ 技术栈
- **HTML5 Canvas** - 游戏渲染
- **原生JavaScript** - 游戏逻辑
- **CSS3** - 青铜器风格样式
- **JSON** - 游戏数据格式

## 📱 兼容性
- 现代浏览器（Chrome、Firefox、Edge）
- 移动设备（iOS Safari、Android Chrome）
- 支持触摸和鼠标操作
