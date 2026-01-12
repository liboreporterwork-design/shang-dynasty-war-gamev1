// 微信小游戏环境检测与适配
let canvas;
let ctx;

// 微信小游戏环境
if (typeof wx !== 'undefined') {
    canvas = wx.createCanvas();
    ctx = canvas.getContext('2d');
    // 微信小游戏适配
    const sys = wx.getSystemInfoSync();
    canvas.width = sys.screenWidth;
    canvas.height = sys.screenHeight;
    
    // 触摸事件适配
    wx.onTouchStart((e) => {
        if (game) {
            game.handleTouch(e.touches[0].x, e.touches[0].y);
        }
    });
    
    wx.onTouchMove((e) => {
        if (game) {
            game.handleTouchMove(e.touches[0].x, e.touches[0].y);
        }
    });
    
    wx.onTouchEnd((e) => {
        if (game) {
            game.handleTouchEnd(e.changedTouches[0].x, e.changedTouches[0].y);
        }
    });
} 
// 浏览器环境
else {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // 鼠标事件适配
    canvas.addEventListener('mousedown', (e) => {
        if (game) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            game.handleTouch(x, y);
        }
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (game) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            game.handleTouchMove(x, y);
        }
    });
    
    canvas.addEventListener('mouseup', (e) => {
        if (game) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            game.handleTouchEnd(x, y);
        }
    });
}

// 游戏对象
let game;

// 加载游戏核心类
function loadGame() {
    // 模拟动态加载game.js（实际项目中可通过模块化方式引入）
    const script = document.createElement('script');
    script.src = 'game.js';
    script.onload = () => {
        // 初始化游戏
        game = new Game(canvas, ctx);
        game.init();
        
        // 启动游戏循环
        function gameLoop() {
            if (game) {
                game.update();
                game.render();
            }
            requestAnimationFrame(gameLoop);
        }
        gameLoop();
    };
    
    if (typeof document !== 'undefined') {
        document.body.appendChild(script);
    } else {
        // 微信小游戏环境下，假设game.js已通过其他方式加载
        game = new Game(canvas, ctx);
        game.init();
        
        function gameLoop() {
            if (game) {
                game.update();
                game.render();
            }
            requestAnimationFrame(gameLoop);
        }
        gameLoop();
    }
}

// 启动加载
loadGame();