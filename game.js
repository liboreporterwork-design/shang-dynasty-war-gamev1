// 游戏核心类
class Game {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.width = canvas.width;
        this.height = canvas.height;
        
        // 游戏状态
        this.gameState = 'draw'; // draw: 抽卡阶段, deploy: 部署阶段, battle: 战斗阶段, end: 结束阶段
        
        // 资源
        this.coins = 100;
        
        // 卡牌系统
        this.cardLibrary = []; // 卡牌库
        this.handCards = []; // 手牌（抽卡区3张）
        this.board = []; // 棋盘 3x3
        this.enemyBoard = []; // 敌方棋盘 3x3
        
        // 战斗相关
        this.battleRound = 0;
        this.isBattleActive = false;
        
        // 特效系统
        this.effects = [];
        
        // 触摸事件
        this.touchX = 0;
        this.touchY = 0;
        this.isTouching = false;
        
        // 按钮区域
        this.buttons = {
            divination: { x: this.width / 2 - 80, y: this.height - 120, width: 160, height: 50, text: '占卜' },
            battle: { x: this.width / 2 - 80, y: this.height - 120, width: 160, height: 50, text: '开战' }
        };
        
        // 初始化棋盘
        this.initBoard();
        this.initEnemyBoard();
    }
    
    // 初始化游戏
    init() {
        // 加载卡牌数据（这里使用示例数据，实际项目中替换为真实JSON数据）
        this.loadCardData();
        
        // 初始抽卡
        this.drawCards();
    }
    
    // 初始化棋盘
    initBoard() {
        this.board = [];
        for (let i = 0; i < 3; i++) {
            this.board[i] = [];
            for (let j = 0; j < 3; j++) {
                this.board[i][j] = null;
            }
        }
    }
    
    // 初始化敌方棋盘
    initEnemyBoard() {
        this.enemyBoard = [];
        for (let i = 0; i < 3; i++) {
            this.enemyBoard[i] = [];
            for (let j = 0; j < 3; j++) {
                this.enemyBoard[i][j] = null;
            }
        }
    }
    
    // 加载卡牌数据
    loadCardData() {
        // 方式1：直接使用内置数据（推荐用于快速测试）
        const cardData = [
            {
                "id": 1,
                "name": "商纣王",
                "skill": "酒池肉林",
                "attack": 100,
                "health": 300,
                "camp": "殷",
                "attackSpeed": 1500,
                "skillEffect": "敌方全体攻击力下降20%"
            },
            {
                "id": 2,
                "name": "周武王",
                "skill": "网开一面",
                "attack": 80,
                "health": 250,
                "camp": "周",
                "attackSpeed": 1200,
                "skillEffect": "敌方本回合停止攻击"
            },
            {
                "id": 3,
                "name": "姜子牙",
                "skill": "太公钓鱼",
                "attack": 120,
                "health": 200,
                "camp": "周",
                "attackSpeed": 2000,
                "skillEffect": "随机控制敌方一张卡牌1回合"
            },
            {
                "id": 4,
                "name": "妲己",
                "skill": "倾国倾城",
                "attack": 90,
                "health": 220,
                "camp": "殷",
                "attackSpeed": 1800,
                "skillEffect": "敌方男性卡牌攻击力下降30%"
            },
            {
                "id": 5,
                "name": "比干",
                "skill": "剖心忠谏",
                "attack": 70,
                "health": 350,
                "camp": "殷",
                "attackSpeed": 1000,
                "skillEffect": "牺牲自己，使友方全体攻击力提升50%"
            }
        ];
        
        // 方式2：从外部JSON文件加载数据（推荐用于实际项目）
        // 请根据您的环境选择合适的加载方式
        this.loadCardDataFromFile('cardData.json');
        
        // 先使用内置数据初始化，后续会被外部数据覆盖（如果加载成功）
        this.cardLibrary = cardData.map(data => new Card(data));
    }
    
    // 从外部JSON文件加载数据
    loadCardDataFromFile(filePath) {
        // 微信小游戏环境
        if (typeof wx !== 'undefined') {
            const fs = wx.getFileSystemManager();
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const cardData = JSON.parse(content);
                this.cardLibrary = cardData.map(data => new Card(data));
                console.log('从微信小游戏文件系统加载卡牌数据成功');
            } catch (error) {
                console.error('加载卡牌数据失败:', error);
            }
        }
        // 浏览器环境
        else if (typeof fetch !== 'undefined') {
            fetch(filePath)
                .then(response => response.json())
                .then(cardData => {
                    this.cardLibrary = cardData.map(data => new Card(data));
                    console.log('从浏览器加载卡牌数据成功');
                })
                .catch(error => {
                    console.error('加载卡牌数据失败:', error);
                });
        }
    }
    
    // 抽卡
    drawCards() {
        const cost = 10;
        if (this.coins < cost) {
            console.log('贝币不足');
            return;
        }
        
        this.coins -= cost;
        this.handCards = [];
        
        // 随机抽取3张卡
        for (let i = 0; i < 3; i++) {
            const randomIndex = Math.floor(Math.random() * this.cardLibrary.length);
            const card = new Card(this.cardLibrary[randomIndex].data);
            
            // 设置手牌位置
            card.x = this.width / 2 - 150 + i * 120;
            card.y = this.height - 200;
            card.targetX = card.x;
            card.targetY = card.y;
            
            // 添加抽卡特效
            card.drawEffect = true;
            card.drawEffectTime = 0;
            
            this.handCards.push(card);
        }
    }
    
    // 部署卡牌到棋盘
    deployCard(card, row, col) {
        if (this.board[row][col] === null) {
            this.board[row][col] = card;
            
            // 设置棋盘位置
            const boardX = this.width / 2 - 180;
            const boardY = this.height / 2 - 180;
            card.x = boardX + col * 120 + 60;
            card.y = boardY + row * 120 + 60;
            card.isDeployed = true;
            
            // 从手牌中移除
            const index = this.handCards.indexOf(card);
            if (index > -1) {
                this.handCards.splice(index, 1);
            }
        }
    }
    
    // 开始战斗
    startBattle() {
        if (this.gameState !== 'deploy') return;
        
        this.gameState = 'battle';
        this.isBattleActive = true;
        this.battleRound = 0;
        
        // 初始化敌方棋盘（示例：随机部署3张敌方卡牌）
        this.initEnemyBoard();
        for (let i = 0; i < 3; i++) {
            const randomIndex = Math.floor(Math.random() * this.cardLibrary.length);
            const card = new Card(this.cardLibrary[randomIndex].data);
            card.camp = 'enemy'; // 设置为敌方
            
            const row = Math.floor(Math.random() * 3);
            const col = Math.floor(Math.random() * 3);
            if (this.enemyBoard[row][col] === null) {
                this.enemyBoard[row][col] = card;
                
                // 设置敌方棋盘位置
                const boardX = this.width / 2 - 180;
                const boardY = 100;
                card.x = boardX + col * 120 + 60;
                card.y = boardY + row * 120 + 60;
                card.isDeployed = true;
            }
        }
        
        // 启动战斗循环
        this.battleLoop();
    }
    
    // 战斗循环
    battleLoop() {
        if (!this.isBattleActive) return;
        
        this.battleRound++;
        
        // 检查胜负
        const playerAlive = this.board.some(row => row.some(card => card && card.health > 0));
        const enemyAlive = this.enemyBoard.some(row => row.some(card => card && card.health > 0));
        
        if (!playerAlive || !enemyAlive) {
            this.endBattle(playerAlive ? 'win' : 'lose');
            return;
        }
        
        // 玩家卡牌攻击
        this.board.forEach(row => {
            row.forEach(card => {
                if (card && card.health > 0) {
                    this.cardAttack(card, this.enemyBoard);
                }
            });
        });
        
        // 敌方卡牌攻击
        this.enemyBoard.forEach(row => {
            row.forEach(card => {
                if (card && card.health > 0) {
                    this.cardAttack(card, this.board);
                }
            });
        });
        
        // 下一回合
        setTimeout(() => this.battleLoop(), 1000);
    }
    
    // 卡牌攻击
    cardAttack(attacker, targetBoard) {
        // 寻找目标
        let target = null;
        targetBoard.forEach(row => {
            row.forEach(card => {
                if (card && card.health > 0 && !target) {
                    target = card;
                }
            });
        });
        
        if (!target) return;
        
        // 计算伤害
        let damage = attacker.attack;
        
        // 触发技能
        if (Math.random() < 0.3) { // 30%概率触发技能
            attacker.triggerSkill(targetBoard);
            this.addEffect(new SkillEffect(attacker.skill));
        }
        
        // 扣减生命值
        target.health -= damage;
        
        // 检查目标是否死亡
        if (target.health <= 0) {
            target.health = 0;
        }
    }
    
    // 结束战斗
    endBattle(result) {
        this.isBattleActive = false;
        this.gameState = 'end';
        
        // 显示结算信息
        const message = result === 'win' ? '牧野之战告捷，殷鉴不远' : '鹿台自焚，商朝灭亡';
        this.addEffect(new EndEffect(message));
    }
    
    // 添加特效
    addEffect(effect) {
        this.effects.push(effect);
    }
    
    // 更新游戏
    update() {
        // 更新卡牌
        this.handCards.forEach(card => card.update());
        this.board.forEach(row => row.forEach(card => card && card.update()));
        this.enemyBoard.forEach(row => row.forEach(card => card && card.update()));
        
        // 更新特效
        this.effects.forEach((effect, index) => {
            effect.update();
            if (effect.isExpired) {
                this.effects.splice(index, 1);
            }
        });
    }
    
    // 渲染游戏
    render() {
        // 清空画布
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // 绘制背景
        this.drawBackground();
        
        // 绘制资源
        this.drawResources();
        
        // 绘制棋盘
        this.drawBoard();
        this.drawEnemyBoard();
        
        // 绘制手牌
        this.handCards.forEach(card => card.render(this.ctx));
        
        // 绘制按钮
        this.drawButtons();
        
        // 绘制特效
        this.effects.forEach(effect => effect.render(this.ctx, this.width, this.height));
    }
    
    // 绘制背景
    drawBackground() {
        // 简单的背景图案
        this.ctx.fillStyle = '#16213e';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // 绘制甲骨纹理
        this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.1)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 20; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(Math.random() * this.width, Math.random() * this.height);
            this.ctx.lineTo(Math.random() * this.width, Math.random() * this.height);
            this.ctx.stroke();
        }
    }
    
    // 绘制资源
    drawResources() {
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = '24px 微软雅黑';
        this.ctx.fillText(`贝币: ${this.coins}`, 20, 40);
    }
    
    // 绘制棋盘
    drawBoard() {
        const boardX = this.width / 2 - 180;
        const boardY = this.height / 2 - 180;
        const cellSize = 120;
        
        // 绘制棋盘格子
        this.ctx.strokeStyle = '#ffd700';
        this.ctx.lineWidth = 2;
        for (let i = 0; i <= 3; i++) {
            // 横线
            this.ctx.beginPath();
            this.ctx.moveTo(boardX, boardY + i * cellSize);
            this.ctx.lineTo(boardX + 3 * cellSize, boardY + i * cellSize);
            this.ctx.stroke();
            
            // 竖线
            this.ctx.beginPath();
            this.ctx.moveTo(boardX + i * cellSize, boardY);
            this.ctx.lineTo(boardX + i * cellSize, boardY + 3 * cellSize);
            this.ctx.stroke();
        }
        
        // 绘制棋盘上的卡牌
        this.board.forEach((row, rowIndex) => {
            row.forEach((card, colIndex) => {
                if (card) {
                    card.render(this.ctx);
                }
            });
        });
    }
    
    // 绘制敌方棋盘
    drawEnemyBoard() {
        const boardX = this.width / 2 - 180;
        const boardY = 100;
        const cellSize = 120;
        
        // 绘制棋盘格子
        this.ctx.strokeStyle = '#ff4757';
        this.ctx.lineWidth = 2;
        for (let i = 0; i <= 3; i++) {
            // 横线
            this.ctx.beginPath();
            this.ctx.moveTo(boardX, boardY + i * cellSize);
            this.ctx.lineTo(boardX + 3 * cellSize, boardY + i * cellSize);
            this.ctx.stroke();
            
            // 竖线
            this.ctx.beginPath();
            this.ctx.moveTo(boardX + i * cellSize, boardY);
            this.ctx.lineTo(boardX + i * cellSize, boardY + 3 * cellSize);
            this.ctx.stroke();
        }
        
        // 绘制棋盘上的卡牌
        this.enemyBoard.forEach((row, rowIndex) => {
            row.forEach((card, colIndex) => {
                if (card) {
                    card.render(this.ctx);
                }
            });
        });
    }
    
    // 绘制按钮
    drawButtons() {
        if (this.gameState === 'draw') {
            this.drawButton(this.buttons.divination);
        } else if (this.gameState === 'deploy') {
            this.drawButton(this.buttons.battle);
        }
    }
    
    // 绘制按钮
    drawButton(button) {
        // 按钮背景
        this.ctx.fillStyle = '#16213e';
        this.ctx.strokeStyle = '#ffd700';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(button.x, button.y, button.width, button.height);
        this.ctx.strokeRect(button.x, button.y, button.width, button.height);
        
        // 按钮文字
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = '20px 微软雅黑';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(button.text, button.x + button.width / 2, button.y + button.height / 2);
        this.ctx.textAlign = 'left';
    }
    
    // 触摸事件处理
    handleTouch(x, y) {
        this.isTouching = true;
        this.touchX = x;
        this.touchY = y;
        
        // 检查按钮点击
        if (this.gameState === 'draw') {
            if (this.isPointInRect(x, y, this.buttons.divination)) {
                this.drawCards();
                this.gameState = 'deploy'; // 抽卡后进入部署阶段
                return;
            }
        } else if (this.gameState === 'deploy') {
            if (this.isPointInRect(x, y, this.buttons.battle)) {
                this.startBattle();
                return;
            }
        }
        
        // 检查手牌点击
        this.handCards.forEach((card, index) => {
            if (card.isPointInCard(x, y)) {
                // 尝试部署到棋盘
                for (let row = 0; row < 3; row++) {
                    for (let col = 0; col < 3; col++) {
                        if (this.board[row][col] === null) {
                            this.deployCard(card, row, col);
                            return;
                        }
                    }
                }
            }
        });
    }
    
    // 触摸移动
    handleTouchMove(x, y) {
        if (!this.isTouching) return;
        this.touchX = x;
        this.touchY = y;
    }
    
    // 触摸结束
    handleTouchEnd(x, y) {
        this.isTouching = false;
    }
    
    // 检查点是否在矩形内
    isPointInRect(x, y, rect) {
        return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
    }
}

// 卡牌类
class Card {
    constructor(data) {
        this.data = data;
        this.id = data.id;
        this.name = data.name;
        this.skill = data.skill;
        this.attack = data.attack;
        this.health = data.health;
        this.maxHealth = data.health;
        this.camp = data.camp;
        this.attackSpeed = data.attackSpeed;
        this.skillEffect = data.skillEffect;
        
        // 位置和状态
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.width = 100;
        this.height = 140;
        this.isDeployed = false;
        
        // 特效相关
        this.drawEffect = false;
        this.drawEffectTime = 0;
        this.scale = 1;
        this.rotation = 0;
    }
    
    // 触发技能
    triggerSkill(targetBoard) {
        console.log(`${this.name} 触发技能: ${this.skill}`);
        // 根据技能效果执行不同逻辑
        switch (this.skill) {
            case '网开一面':
                // 敌方本回合停止攻击
                targetBoard.forEach(row => {
                    row.forEach(card => {
                        if (card) {
                            card.isStunned = true;
                            setTimeout(() => {
                                card.isStunned = false;
                            }, 1000);
                        }
                    });
                });
                break;
            case '酒池肉林':
                // 敌方全体攻击力下降20%
                targetBoard.forEach(row => {
                    row.forEach(card => {
                        if (card) {
                            card.attack *= 0.8;
                        }
                    });
                });
                break;
            // 其他技能效果...
        }
    }
    
    // 更新卡牌
    update() {
        // 更新抽卡特效
        if (this.drawEffect) {
            this.drawEffectTime += 16; // 60fps
            const duration = 1000;
            
            if (this.drawEffectTime < duration) {
                const progress = this.drawEffectTime / duration;
                this.scale = 1 + 0.5 * Math.sin(progress * Math.PI);
                this.rotation = Math.sin(progress * Math.PI * 2) * 0.2;
            } else {
                this.drawEffect = false;
                this.scale = 1;
                this.rotation = 0;
            }
        }
        
        // 移动到目标位置
        if (this.x !== this.targetX || this.y !== this.targetY) {
            const speed = 0.1;
            this.x += (this.targetX - this.x) * speed;
            this.y += (this.targetY - this.y) * speed;
            
            // 防止抖动
            if (Math.abs(this.x - this.targetX) < 1) this.x = this.targetX;
            if (Math.abs(this.y - this.targetY) < 1) this.y = this.targetY;
        }
    }
    
    // 渲染卡牌
    render(ctx) {
        ctx.save();
        
        // 移动到卡牌中心
        ctx.translate(this.x, this.y);
        
        // 应用缩放和旋转（抽卡特效）
        ctx.scale(this.scale, this.scale);
        ctx.rotate(this.rotation);
        
        // 卡牌背景
        const color = this.camp === 'enemy' ? '#c70039' : (this.camp === '殷' ? '#900c3f' : '#16697a');
        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        ctx.strokeRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // 卡牌名称
        ctx.fillStyle = '#fff';
        ctx.font = '16px 微软雅黑';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(this.name, 0, -this.height/2 + 10);
        
        // 技能名称
        ctx.fillStyle = '#ffd700';
        ctx.font = '14px 微软雅黑';
        ctx.fillText(this.skill, 0, -this.height/2 + 35);
        
        // 攻击力和生命值
        ctx.fillStyle = '#ff4757';
        ctx.font = '14px 微软雅黑';
        ctx.textAlign = 'left';
        ctx.fillText(`攻: ${this.attack}`, -this.width/2 + 10, this.height/2 - 30);
        
        ctx.fillStyle = '#2ed573';
        ctx.fillText(`血: ${this.health}`, -this.width/2 + 10, this.height/2 - 10);
        
        // 生命值条
        ctx.fillStyle = '#555';
        ctx.fillRect(-this.width/2 + 10, this.height/2 - 45, 80, 8);
        ctx.fillStyle = '#2ed573';
        const healthPercent = this.health / this.maxHealth;
        ctx.fillRect(-this.width/2 + 10, this.height/2 - 45, 80 * healthPercent, 8);
        
        ctx.restore();
    }
    
    // 检查点是否在卡牌内
    isPointInCard(x, y) {
        return x >= this.x - this.width/2 && x <= this.x + this.width/2 &&
               y >= this.y - this.height/2 && y <= this.y + this.height/2;
    }
}

// 技能特效类
class SkillEffect {
    constructor(skillName) {
        this.skillName = skillName;
        this.time = 0;
        this.duration = 1500;
        this.isExpired = false;
        this.scale = 1;
        this.alpha = 1;
    }
    
    update() {
        this.time += 16;
        if (this.time >= this.duration) {
            this.isExpired = true;
            return;
        }
        
        // 更新缩放和透明度
        const progress = this.time / this.duration;
        this.scale = 1 + progress * 2;
        this.alpha = 1 - progress;
    }
    
    render(ctx, width, height) {
        ctx.save();
        
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = '#ffd700';
        ctx.font = `${36 * this.scale}px 微软雅黑`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.skillName, width / 2, height / 2);
        
        ctx.restore();
    }
}

// 结束特效类
class EndEffect {
    constructor(message) {
        this.message = message;
        this.time = 0;
        this.duration = 3000;
        this.isExpired = false;
        this.scale = 0;
        this.alpha = 1;
    }
    
    update() {
        this.time += 16;
        if (this.time >= this.duration) {
            this.isExpired = true;
            return;
        }
        
        // 更新缩放
        const progress = this.time / this.duration;
        if (progress < 0.2) {
            this.scale = progress * 5;
        } else {
            this.scale = 1;
        }
        
        // 更新透明度
        if (progress > 0.8) {
            this.alpha = 1 - (progress - 0.8) * 5;
        }
    }
    
    render(ctx, width, height) {
        ctx.save();
        
        // 弹窗背景
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = 'rgba(22, 33, 62, 0.9)';
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 4;
        ctx.fillRect(width/2 - 200, height/2 - 100, 400, 200);
        ctx.strokeRect(width/2 - 200, height/2 - 100, 400, 200);
        
        // 文字
        ctx.fillStyle = '#ffd700';
        ctx.font = `${24 * this.scale}px 微软雅黑`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.message, width / 2, height / 2);
        
        ctx.restore();
    }
}