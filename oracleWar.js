// 甲骨文战棋：商周纪元 - 核心游戏类
class OracleWarGame {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.width = canvas.width;
        this.height = canvas.height;
        
        // 游戏状态
        this.gameState = 'menu'; // menu: 菜单, load: 加载, battle: 战斗, end: 结束
        
        // 游戏数据
        this.gameData = null;
        this.units = {}; // 兵种库
        this.buffs = {}; // 增益状态库
        this.formations = {}; // 阵法库
        
        // 战场数据
        this.map = []; // 战场地图
        this.playerUnits = []; // 玩家单位
        this.enemyUnits = []; // 敌方单位
        
        // 战棋系统
        this.currentPlayer = 'player'; // 当前回合玩家
        this.turnPhase = 'move'; // 回合阶段: move(移动), attack(攻击), special(特殊)
        this.selectedUnit = null; // 选中的单位
        
        // 敌方AI相关
        this.enemyActionStarted = false; // 敌方行动是否已开始
        this.enemyActionIndex = 0; // 当前执行行动的敌方单位索引
        this.enemyActionTimer = 0; // 敌方行动计时器
        
        // 阵法系统相关
        this.selectedFormation = null; // 当前选中的阵法
        this.formationCooldowns = {}; // 阵法冷却时间
        
        // 触摸事件
        this.touchX = 0;
        this.touchY = 0;
        this.isTouching = false;
        
        // 网格系统
        this.gridSize = 60;
        this.cols = Math.floor(this.width / this.gridSize);
        this.rows = Math.floor(this.height / this.gridSize);
        
        // 动画系统
        this.animations = []; // 动画列表
    }
    
    // 初始化游戏
    init() {
        // 加载游戏数据
        this.loadGameData('oracleWarData.json');
        
        // 初始化地图
        this.initMap();
    }
    
    // 加载游戏数据
    loadGameData(filePath) {
        // 微信小游戏环境
        if (typeof wx !== 'undefined') {
            const fs = wx.getFileSystemManager();
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                this.gameData = JSON.parse(content);
                this.processGameData();
                console.log('从微信小游戏文件系统加载战棋数据成功');
            } catch (error) {
                console.error('加载战棋数据失败:', error);
            }
        }
        // 浏览器环境
        else if (typeof fetch !== 'undefined') {
            fetch(filePath)
                .then(response => response.json())
                .then(data => {
                    this.gameData = data;
                    this.processGameData();
                    console.log('从浏览器加载战棋数据成功');
                })
                .catch(error => {
                    console.error('加载战棋数据失败:', error);
                });
        }
    }
    
    // 处理游戏数据
    processGameData() {
        if (!this.gameData) return;
        
        // 处理兵种数据
        this.gameData.units.forEach(unitData => {
            this.units[unitData.id] = new Unit(unitData);
        });
        
        // 处理增益状态数据
        this.gameData.buffs.forEach(buffData => {
            this.buffs[buffData.id] = new Buff(buffData);
        });
        
        // 处理阵法数据
        this.gameData.formations.forEach(formationData => {
            this.formations[formationData.id] = new Formation(formationData);
        });
        
        console.log('游戏数据处理完成:', {
            units: Object.keys(this.units).length,
            buffs: Object.keys(this.buffs).length,
            formations: Object.keys(this.formations).length
        });
        
        // 初始化测试战场
        this.initTestBattlefield();
    }
    
    // 初始化地图
    initMap() {
        this.map = [];
        for (let row = 0; row < this.rows; row++) {
            this.map[row] = [];
            for (let col = 0; col < this.cols; col++) {
                this.map[row][col] = {
                    type: 'plain', // 地形类型: plain(平原), mountain(山地), water(水域)
                    unit: null, // 当前格单位
                    isPassable: true, // 是否可通行
                    movementCost: 1 // 移动消耗
                };
            }
        }
    }
    
    // 初始化测试战场
    initTestBattlefield() {
        // 创建玩家单位
        const playerMilitia = this.createUnit('unit_militia', this.cols - 5, this.rows - 3, 'player');
        const playerInfantry = this.createUnit('unit_infantry', this.cols - 5, this.rows - 4, 'player');
        const playerArcher = this.createUnit('unit_archer', this.cols - 4, this.rows - 3, 'player');
        
        this.playerUnits.push(playerMilitia, playerInfantry, playerArcher);
        
        // 创建敌方单位
        const enemyCavalry = this.createUnit('unit_cavalry', 5, 3, 'enemy');
        const enemyInfantry = this.createUnit('unit_infantry', 6, 3, 'enemy');
        const enemyElite = this.createUnit('unit_elite_fa', 5, 4, 'enemy');
        
        this.enemyUnits.push(enemyCavalry, enemyInfantry, enemyElite);
        
        // 将单位放置到地图上
        this.playerUnits.forEach(unit => {
            if (this.isValidPosition(unit.row, unit.col)) {
                this.map[unit.row][unit.col].unit = unit;
            }
        });
        
        this.enemyUnits.forEach(unit => {
            if (this.isValidPosition(unit.row, unit.col)) {
                this.map[unit.row][unit.col].unit = unit;
            }
        });
        
        // 开始战斗
        this.gameState = 'battle';
    }
    
    // 创建单位
    createUnit(unitId, col, row, owner) {
        const unitData = this.units[unitId];
        if (!unitData) return null;
        
        const unit = new Unit(unitData.data);
        unit.owner = owner;
        unit.col = col;
        unit.row = row;
        unit.x = col * this.gridSize + this.gridSize / 2;
        unit.y = row * this.gridSize + this.gridSize / 2;
        unit.hasMoved = false;
        unit.hasAttacked = false;
        
        return unit;
    }
    
    // 检查位置是否有效
    isValidPosition(row, col) {
        return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
    }
    
    // 检查单位是否可以移动到指定位置
    canMoveTo(unit, targetRow, targetCol) {
        if (!this.isValidPosition(targetRow, targetCol)) return false;
        if (!this.map[targetRow][targetCol].isPassable) return false;
        if (this.map[targetRow][targetCol].unit !== null) return false;
        
        // 检查移动范围
        const distance = Math.abs(unit.row - targetRow) + Math.abs(unit.col - targetCol);
        return distance <= unit.move_range;
    }
    
    // 移动单位
    moveUnit(unit, targetRow, targetCol) {
        if (!this.canMoveTo(unit, targetRow, targetCol)) return false;
        
        // 清除原位置
        this.map[unit.row][unit.col].unit = null;
        
        // 更新单位位置
        unit.row = targetRow;
        unit.col = targetCol;
        unit.x = targetCol * this.gridSize + this.gridSize / 2;
        unit.y = targetRow * this.gridSize + this.gridSize / 2;
        unit.hasMoved = true;
        
        // 设置新位置
        this.map[targetRow][targetCol].unit = unit;
        
        return true;
    }
    
    // 检查单位是否可以攻击指定位置
    canAttack(unit, targetRow, targetCol) {
        if (!this.isValidPosition(targetRow, targetCol)) return false;
        
        const targetUnit = this.map[targetRow][targetCol].unit;
        if (!targetUnit || targetUnit.owner === unit.owner) return false;
        
        // 检查攻击范围
        const distance = Math.abs(unit.row - targetRow) + Math.abs(unit.col - targetCol);
        return distance <= unit.attack_range;
    }
    
    // 单位攻击
    attackUnit(attacker, defender) {
        if (!attacker || !defender || attacker.owner === defender.owner) return;
        
        // 计算伤害
        let damage = attacker.attack;
        
        // 应用特性
        this.applyTraits(attacker, defender, 'attack');
        
        // 检查首次攻击强化
        if (attacker.hasFirstAttackBoost && !attacker.hasAttacked) {
            damage = Math.round(damage * attacker.firstAttackMultiplier);
            // 消耗首次攻击强化效果
            attacker.hasFirstAttackBoost = false;
            delete attacker.firstAttackMultiplier;
        }
        
        // 暴击计算
        const critical = Math.random() < attacker.critical_chance;
        if (critical) {
            damage = Math.round(damage * 1.5);
        }
        
        // 应用伤害减免
        if (defender.damageReduction) {
            const reducedDamage = Math.round(damage * (1 - defender.damageReduction));
            damage = Math.max(1, reducedDamage); // 至少造成1点伤害
        }
        
        // 扣减生命值
        defender.health -= damage;
        
        // 检查单位是否死亡
        if (defender.health <= 0) {
            defender.health = 0;
            this.removeUnit(defender);
        }
        
        attacker.hasAttacked = true;
        
        return { damage, critical };
    }
    
    // 应用特性
    applyTraits(attacker, defender, phase) {
        if (phase === 'attack') {
            // 检查攻击者特性
            attacker.traits.forEach(trait => {
                switch (trait) {
                    case '奔袭':
                        // 奔袭：若移动超过3格后攻击，暴击率提升
                        if (attacker.moveDistance > 3) {
                            attacker.critical_chance += 0.3;
                            // 对弓弩额外增加暴击率
                            if (defender.type === '弓弩') {
                                attacker.critical_chance += 0.15;
                            }
                        }
                        break;
                    case '精准':
                        // 精准：攻击兵卒时无视20%防御
                        if (defender.type === '兵卒') {
                            attacker.attack += Math.round(attacker.attack * 0.2);
                        }
                        break;
                    // 其他特性...
                }
            });
            
            // 检查防御者特性
            defender.traits.forEach(trait => {
                switch (trait) {
                    case '坚守':
                        // 坚守：受到骑乘攻击时伤害减免30%
                        if (attacker.type === '骑乘') {
                            attacker.attack = Math.round(attacker.attack * 0.7);
                        }
                        break;
                    case '脆弱':
                        // 脆弱：被近身攻击时暴击率增加30%
                        if (attacker.attack_range <= 1) {
                            attacker.critical_chance += 0.3;
                        }
                        break;
                    // 其他特性...
                }
            });
        }
    }
    
    // 应用增益状态（已废弃，使用Unit类的addBuff方法替代）
    applyBuffs(unit, phase) {
        console.warn('applyBuffs方法已废弃，请使用Unit类的addBuff方法');
    }
    
    // 移除单位
    removeUnit(unit) {
        // 从地图移除
        if (this.isValidPosition(unit.row, unit.col)) {
            this.map[unit.row][unit.col].unit = null;
        }
        
        // 从单位列表移除
        if (unit.owner === 'player') {
            const index = this.playerUnits.indexOf(unit);
            if (index > -1) this.playerUnits.splice(index, 1);
        } else {
            const index = this.enemyUnits.indexOf(unit);
            if (index > -1) this.enemyUnits.splice(index, 1);
        }
    }
    
    // 添加动画
    addAnimation(animation) {
        this.animations.push(animation);
    }
    
    // 更新动画
    updateAnimations() {
        for (let i = this.animations.length - 1; i >= 0; i--) {
            const animation = this.animations[i];
            animation.update();
            
            if (animation.isCompleted) {
                this.animations.splice(i, 1);
            }
        }
    }
    
    // 渲染动画
    renderAnimations() {
        this.animations.forEach(animation => {
            animation.render(this.ctx);
        });
    }
    
    // 更新游戏
    update() {
        // 更新动画
        this.updateAnimations();
        
        // 根据游戏状态执行不同逻辑
        switch (this.gameState) {
            case 'battle':
                this.updateBattle();
                break;
            // 其他游戏状态...
        }
    }
    
    // 更新战斗
    updateBattle() {
        // 更新单位
        this.playerUnits.forEach(unit => unit.update());
        this.enemyUnits.forEach(unit => unit.update());
        
        // 检查游戏是否结束
        if (this.playerUnits.length === 0 || this.enemyUnits.length === 0) {
            this.gameState = 'end';
            return;
        }
        
        // 根据当前玩家执行不同逻辑
        if (this.currentPlayer === 'player') {
            this.updatePlayerTurn();
        } else {
            this.updateEnemyTurn();
        }
    }
    
    // 更新玩家回合
    updatePlayerTurn() {
        // 玩家回合逻辑已通过触摸事件处理
        // 这里可以添加一些自动触发的玩家回合逻辑
    }
    
    // 更新敌方回合
    updateEnemyTurn() {
        // 检查是否已经开始敌方行动
        if (!this.enemyActionStarted) {
            this.enemyActionStarted = true;
            this.enemyActionIndex = 0;
            this.enemyActionTimer = 0;
        }
        
        // 定时执行敌方行动
        this.enemyActionTimer += 16; // 60fps
        
        if (this.enemyActionTimer >= 500) { // 每500毫秒执行一个行动
            this.enemyActionTimer = 0;
            
            // 执行敌方单位的行动
            if (this.enemyActionIndex < this.enemyUnits.length) {
                const enemyUnit = this.enemyUnits[this.enemyActionIndex];
                this.executeEnemyAction(enemyUnit);
                this.enemyActionIndex++;
            } else {
                // 敌方回合结束
                this.endEnemyTurn();
            }
        }
    }
    
    // 执行敌方单位行动
    executeEnemyAction(enemyUnit) {
        if (!enemyUnit || enemyUnit.health <= 0) return;
        
        // 重置单位状态
        enemyUnit.hasMoved = false;
        enemyUnit.hasAttacked = false;
        
        // 尝试攻击玩家单位
        const targetUnit = this.findNearestPlayerUnit(enemyUnit);
        
        if (targetUnit) {
            const distance = Math.abs(enemyUnit.row - targetUnit.row) + Math.abs(enemyUnit.col - targetUnit.col);
            
            // 如果在攻击范围内，直接攻击
            if (distance <= enemyUnit.attack_range) {
                this.attackUnit(enemyUnit, targetUnit);
                enemyUnit.hasAttacked = true;
            } 
            // 否则尝试移动
            else if (!enemyUnit.hasMoved) {
                this.moveEnemyUnitTowardsTarget(enemyUnit, targetUnit);
                
                // 移动后检查是否可以攻击
                const newDistance = Math.abs(enemyUnit.row - targetUnit.row) + Math.abs(enemyUnit.col - targetUnit.col);
                if (newDistance <= enemyUnit.attack_range && !enemyUnit.hasAttacked) {
                    this.attackUnit(enemyUnit, targetUnit);
                    enemyUnit.hasAttacked = true;
                }
            }
        }
    }
    
    // 寻找最近的玩家单位
    findNearestPlayerUnit(enemyUnit) {
        let nearestUnit = null;
        let minDistance = Infinity;
        
        this.playerUnits.forEach(unit => {
            const distance = Math.abs(enemyUnit.row - unit.row) + Math.abs(enemyUnit.col - unit.col);
            if (distance < minDistance) {
                minDistance = distance;
                nearestUnit = unit;
            }
        });
        
        return nearestUnit;
    }
    
    // 移动敌方单位向目标
    moveEnemyUnitTowardsTarget(enemyUnit, target) {
        // 简单的寻路：向目标方向移动一格
        let bestRow = enemyUnit.row;
        let bestCol = enemyUnit.col;
        let bestDistance = Math.abs(enemyUnit.row - target.row) + Math.abs(enemyUnit.col - target.col);
        
        // 检查四个方向
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1]
        ];
        
        for (const [dr, dc] of directions) {
            const newRow = enemyUnit.row + dr;
            const newCol = enemyUnit.col + dc;
            
            if (this.canMoveTo(enemyUnit, newRow, newCol)) {
                const newDistance = Math.abs(newRow - target.row) + Math.abs(newCol - target.col);
                if (newDistance < bestDistance) {
                    bestDistance = newDistance;
                    bestRow = newRow;
                    bestCol = newCol;
                }
            }
        }
        
        // 执行移动
        if (bestRow !== enemyUnit.row || bestCol !== enemyUnit.col) {
            this.moveUnit(enemyUnit, bestRow, bestCol);
            enemyUnit.hasMoved = true;
        }
    }
    
    // 结束敌方回合
    endEnemyTurn() {
        this.enemyActionStarted = false;
        this.currentPlayer = 'player';
        
        // 重置玩家单位状态
        this.playerUnits.forEach(unit => {
            unit.hasMoved = false;
            unit.hasAttacked = false;
        });
        
        // 更新阵法冷却时间
        this.updateFormationCooldowns();
        
        console.log('切换到玩家回合');
    }
    
    // 渲染游戏
    render() {
        // 清空画布
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // 根据游戏状态渲染不同内容
        switch (this.gameState) {
            case 'battle':
                this.renderBattle();
                // 渲染战斗动画
                this.renderAnimations();
                break;
            case 'menu':
                this.renderMenu();
                break;
            case 'end':
                this.renderEnd();
                break;
        }
    }
    
    // 渲染战斗界面
    renderBattle() {
        // 绘制地图
        this.renderMap();
        
        // 绘制单位
        this.renderUnits();
        
        // 绘制UI
        this.renderBattleUI();
    }
    
    // 渲染地图
    renderMap() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const tile = this.map[row][col];
                
                // 根据地形类型绘制不同颜色
                switch (tile.type) {
                    case 'plain':
                        this.ctx.fillStyle = '#2d5016';
                        break;
                    case 'mountain':
                        this.ctx.fillStyle = '#5c4033';
                        break;
                    case 'water':
                        this.ctx.fillStyle = '#1e3a8a';
                        break;
                    default:
                        this.ctx.fillStyle = '#2d5016';
                }
                
                // 绘制格子
                this.ctx.fillRect(col * this.gridSize, row * this.gridSize, this.gridSize, this.gridSize);
                
                // 绘制可移动范围
                if (this.selectedUnit && !this.selectedUnit.hasMoved) {
                    const distance = Math.abs(row - this.selectedUnit.row) + Math.abs(col - this.selectedUnit.col);
                    if (distance <= this.selectedUnit.move_range && !this.map[row][col].unit && this.map[row][col].isPassable) {
                        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
                        this.ctx.fillRect(col * this.gridSize, row * this.gridSize, this.gridSize, this.gridSize);
                    }
                }
                
                // 绘制可攻击范围
                if (this.selectedUnit && !this.selectedUnit.hasAttacked) {
                    const distance = Math.abs(row - this.selectedUnit.row) + Math.abs(col - this.selectedUnit.col);
                    if (distance <= this.selectedUnit.attack_range && this.map[row][col].unit && this.map[row][col].unit.owner !== this.selectedUnit.owner) {
                        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
                        this.ctx.fillRect(col * this.gridSize, row * this.gridSize, this.gridSize, this.gridSize);
                    }
                }
                
                // 绘制格子边框
                this.ctx.strokeStyle = '#1a1a2e';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(col * this.gridSize, row * this.gridSize, this.gridSize, this.gridSize);
                
                // 绘制选中效果
                if (this.selectedUnit && row === this.selectedUnit.row && col === this.selectedUnit.col) {
                    this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
                    this.ctx.fillRect(col * this.gridSize, row * this.gridSize, this.gridSize, this.gridSize);
                }
            }
        }
    }
    
    // 渲染单位
    renderUnits() {
        // 渲染所有单位
        const allUnits = [...this.playerUnits, ...this.enemyUnits];
        allUnits.forEach(unit => unit.render(this.ctx, this.gridSize));
    }
    
    // 渲染战斗UI
    renderBattleUI() {
        // 绘制回合信息
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = '20px 微软雅黑';
        this.ctx.fillText(`当前回合: ${this.currentPlayer === 'player' ? '玩家' : '敌方'}`, 10, 30);
        this.ctx.fillText(`回合阶段: ${this.getPhaseName()}`, 10, 60);
        
        // 绘制选中单位信息
        if (this.selectedUnit) {
            this.renderUnitInfo(this.selectedUnit);
        }
        
        // 绘制阵法选择界面
        if (this.currentPlayer === 'player' && this.gameState === 'battle') {
            this.renderFormationUI();
        }
    }
    
    // 渲染阵法UI
    renderFormationUI() {
        const formationCount = Object.keys(this.formations).length;
        const formationWidth = 120;
        const formationHeight = 60;
        const startX = this.width / 2 - (formationCount * formationWidth + (formationCount - 1) * 10) / 2;
        const y = this.height - 80;
        
        // 遍历所有阵法
        let index = 0;
        for (const [id, formation] of Object.entries(this.formations)) {
            const x = startX + index * (formationWidth + 10);
            
            // 检查阵法冷却
            const isOnCooldown = this.formationCooldowns[id] > 0;
            
            // 检查是否悬停
            const isHovering = this.isTouching && this.touchX >= x && this.touchX <= x + formationWidth && 
                               this.touchY >= y && this.touchY <= y + formationHeight;
            
            // 绘制阵法背景
            let bgColor = isOnCooldown ? 'rgba(100, 100, 100, 0.5)' : 'rgba(30, 58, 138, 0.8)';
            
            if (this.selectedFormation === id) {
                bgColor = 'rgba(255, 215, 0, 0.5)';
            } else if (!isOnCooldown && isHovering) {
                bgColor = 'rgba(65, 105, 225, 0.9)';
            }
            
            this.ctx.fillStyle = bgColor;
            this.ctx.fillRect(x, y, formationWidth, formationHeight);
            
            // 绘制边框
            let borderColor = '#ffd700';
            let borderWidth = 2;
            
            if (this.selectedFormation === id) {
                borderColor = '#ff4500';
                borderWidth = 3;
            } else if (isHovering && !isOnCooldown) {
                borderColor = '#ffd700';
                borderWidth = 3;
            }
            
            this.ctx.strokeStyle = borderColor;
            this.ctx.lineWidth = borderWidth;
            this.ctx.strokeRect(x, y, formationWidth, formationHeight);
            
            // 绘制甲骨文符号
            if (formation.oracle_word) {
                this.ctx.fillStyle = '#ffd700';
                this.ctx.font = '20px 微软雅黑';
                this.ctx.textAlign = 'left';
                this.ctx.textBaseline = 'top';
                this.ctx.fillText(formation.oracle_word, x + 5, y + 5);
            }
            
            // 绘制阵法名称
            this.ctx.fillStyle = isOnCooldown ? '#cccccc' : '#ffffff';
            this.ctx.font = '14px 微软雅黑';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(formation.name, x + 30, y + 5);
            
            // 绘制冷却时间
            if (isOnCooldown) {
                // 绘制冷却遮罩
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                this.ctx.fillRect(x, y, formationWidth, formationHeight);
                
                this.ctx.fillStyle = '#ff4757';
                this.ctx.font = 'bold 24px 微软雅黑';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(`${this.formationCooldowns[id]}`, x + formationWidth / 2, y + formationHeight / 2);
            }
            
            index++;
        }
        
        // 绘制选中阵法的详细信息
        if (this.selectedFormation) {
            this.renderFormationInfo(this.formations[this.selectedFormation]);
        }
        
        this.ctx.textAlign = 'left';
    }
    
    // 获取阶段名称
    getPhaseName() {
        switch (this.turnPhase) {
            case 'move': return '移动阶段';
            case 'attack': return '攻击阶段';
            case 'special': return '特殊阶段';
            default: return '未知阶段';
        }
    }
    
    // 渲染阵法详细信息
    renderFormationInfo(formation) {
        const infoWidth = 300;
        const infoHeight = 120;
        const x = this.width - infoWidth - 10;
        const y = this.height - infoHeight - 100;
        
        // 信息框背景
        this.ctx.fillStyle = 'rgba(22, 33, 62, 0.95)';
        this.ctx.strokeStyle = '#ffd700';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(x, y, infoWidth, infoHeight);
        this.ctx.strokeRect(x, y, infoWidth, infoHeight);
        
        // 阵法名称和甲骨文符号
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = '18px 微软雅黑';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(`${formation.oracle_word} ${formation.name}`, x + 10, y + 10);
        
        // 阵法描述
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px 微软雅黑';
        this.ctx.fillText(`描述: ${formation.description}`, x + 10, y + 40);
        
        // 阵法效果
        this.ctx.fillStyle = '#2ed573';
        this.ctx.fillText(`效果: ${formation.effect}`, x + 10, y + 60);
        
        // 历史背景
        this.ctx.fillStyle = '#ffa502';
        this.ctx.fillText(`历史: ${formation.historical_note.substring(0, 50)}...`, x + 10, y + 80);
    }
    
    // 渲染单位信息
    renderUnitInfo(unit) {
        const infoWidth = 200;
        const infoHeight = 150;
        const x = this.width - infoWidth - 10;
        const y = 10;
        
        // 信息框背景
        this.ctx.fillStyle = 'rgba(22, 33, 62, 0.9)';
        this.ctx.strokeStyle = '#ffd700';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(x, y, infoWidth, infoHeight);
        this.ctx.strokeRect(x, y, infoWidth, infoHeight);
        
        // 单位名称
        this.ctx.fillStyle = unit.owner === 'player' ? '#2ed573' : '#ff4757';
        this.ctx.font = '16px 微软雅黑';
        this.ctx.fillText(unit.name, x + 10, y + 30);
        
        // 单位属性
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px 微软雅黑';
        this.ctx.fillText(`生命值: ${unit.health}`, x + 10, y + 60);
        this.ctx.fillText(`攻击力: ${unit.attack}`, x + 10, y + 80);
        this.ctx.fillText(`移动范围: ${unit.move_range}`, x + 10, y + 100);
        this.ctx.fillText(`攻击范围: ${unit.attack_range}`, x + 10, y + 120);
        
        // 特性信息
        if (unit.traits && unit.traits.length > 0) {
            this.ctx.fillStyle = '#ffd700';
            this.ctx.font = '12px 微软雅黑';
            this.ctx.fillText(`特性: ${unit.traits.join(', ')}`, x + 10, y + 140);
        }
    }
    
    // 渲染菜单
    renderMenu() {
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = '36px 微软雅黑';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('甲骨文战棋：商周纪元', this.width / 2, this.height / 2 - 50);
        
        this.ctx.font = '24px 微软雅黑';
        this.ctx.fillText('点击开始游戏', this.width / 2, this.height / 2 + 50);
        
        this.ctx.textAlign = 'left';
    }
    
    // 渲染结束界面
    renderEnd() {
        // 检查胜负
        const playerWon = this.enemyUnits.length === 0;
        
        // 根据胜负显示不同的历史典故
        const result = {
            title: playerWon ? '胜利！' : '失败！',
            message: playerWon ? '牧野之战告捷，殷商覆灭' : '鹿台自焚，商朝灭亡',
            historicalNote: playerWon ? 
                '公元前1046年，周武王率诸侯联军在牧野击败商纣王，商朝灭亡。此役是中国古代史上著名的以少胜多的战役。' :
                '商纣王在牧野之战失败后，登上鹿台自焚而死，商朝600年统治结束。这一历史事件标志着中国古代历史进入西周时期。'
        };
        
        // 绘制背景
        this.ctx.fillStyle = 'rgba(26, 26, 46, 0.95)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // 绘制甲骨文风格边框
        this.ctx.strokeStyle = '#ffd700';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(50, 200, this.width - 100, this.height - 400);
        
        // 绘制标题
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = '64px 微软雅黑';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(result.title, this.width / 2, this.height / 2 - 120);
        
        // 绘制战役结果
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '36px 微软雅黑';
        this.ctx.fillText(result.message, this.width / 2, this.height / 2 - 50);
        
        // 绘制历史典故
        this.ctx.fillStyle = '#d4af37';
        this.ctx.font = '20px 微软雅黑';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        
        // 文本换行
        this.drawWrappedText(result.historicalNote, 100, this.height / 2, this.width - 200, 30);
        
        // 绘制重新开始提示
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = '24px 微软雅黑';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('点击屏幕重新开始', this.width / 2, this.height - 150);
        
        this.ctx.textAlign = 'left';
    }
    
    // 绘制换行文本
    drawWrappedText(text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = this.ctx.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > maxWidth && i > 0) {
                this.ctx.fillText(line, x, y);
                line = words[i] + ' ';
                y += lineHeight;
            } else {
                line = testLine;
            }
        }
        
        this.ctx.fillText(line, x, y);
    }
    
    // 触摸事件处理
    handleTouch(x, y) {
        this.isTouching = true;
        this.touchX = x;
        this.touchY = y;
        
        // 处理菜单状态
        if (this.gameState === 'menu') {
            this.initTestBattlefield();
            return;
        }
        
        // 处理结束状态 - 重新开始游戏
        if (this.gameState === 'end') {
            this.restartGame();
            return;
        }
        
        // 处理战斗状态
        if (this.gameState === 'battle') {
            // 检查是否点击了阵法UI
            if (this.currentPlayer === 'player' && this.handleFormationTouch(x, y)) {
                return;
            }
            
            // 转换为网格坐标
            const col = Math.floor(x / this.gridSize);
            const row = Math.floor(y / this.gridSize);
            
            if (!this.isValidPosition(row, col)) return;
            
            const targetTile = this.map[row][col];
            
            if (this.currentPlayer === 'player') {
                this.handlePlayerAction(targetTile, row, col);
                
                // 检查玩家是否所有单位都已行动
                const hasMovableUnit = this.playerUnits.some(unit => 
                    !unit.hasMoved || !unit.hasAttacked
                );
                
                if (!hasMovableUnit) {
                    // 玩家回合结束，切换到敌方回合
                    this.endPlayerTurn();
                }
            }
        }
    }
    
    // 结束玩家回合
    endPlayerTurn() {
        this.currentPlayer = 'enemy';
        this.enemyActionStarted = false;
        
        // 清除选中的阵法
        this.selectedFormation = null;
        
        // 更新阵法冷却时间
        this.updateFormationCooldowns();
        
        console.log('切换到敌方回合');
    }
    
    // 处理阵法触摸事件
    handleFormationTouch(x, y) {
        const formationCount = Object.keys(this.formations).length;
        const formationWidth = 120;
        const formationHeight = 60;
        const startX = this.width / 2 - (formationCount * formationWidth + (formationCount - 1) * 10) / 2;
        const yThreshold = this.height - 80;
        
        // 检查触摸位置是否在阵法UI区域
        if (y < yThreshold || y > yThreshold + formationHeight) {
            // 点击了阵法UI外，取消选中
            if (this.selectedFormation) {
                this.selectedFormation = null;
                return true;
            }
            return false;
        }
        
        // 遍历所有阵法
        let index = 0;
        for (const [id, formation] of Object.entries(this.formations)) {
            const formationX = startX + index * (formationWidth + 10);
            
            // 检查是否点击了当前阵法
            if (x >= formationX && x <= formationX + formationWidth) {
                // 检查阵法冷却
                const isOnCooldown = this.formationCooldowns[id] > 0;
                
                if (this.selectedFormation === id) {
                    // 已经选中，尝试激活
                    if (!isOnCooldown) {
                        // 激活阵法
                        if (formation.activate(this)) {
                            // 设置冷却时间
                            this.formationCooldowns[id] = 3; // 冷却3回合
                            this.selectedFormation = null; // 激活后取消选中
                            console.log(`激活阵法: ${formation.name}`);
                        }
                    }
                } else {
                    // 选中新的阵法
                    this.selectedFormation = id;
                }
                
                return true;
            }
            
            index++;
        }
        
        return false;
    }
    
    // 更新阵法冷却时间
    updateFormationCooldowns() {
        // 遍历所有阵法，减少冷却时间
        for (const id in this.formationCooldowns) {
            if (this.formationCooldowns[id] > 0) {
                this.formationCooldowns[id]--;
            }
        }
    }
    
    // 重新开始游戏
    restartGame() {
        // 重置游戏状态
        this.gameState = 'menu';
        this.currentPlayer = 'player';
        this.selectedUnit = null;
        
        // 清空单位和地图
        this.playerUnits = [];
        this.enemyUnits = [];
        this.map = [];
        
        // 初始化地图
        this.initMap();
        
        // 重置敌方AI状态
        this.enemyActionStarted = false;
        this.enemyActionIndex = 0;
        this.enemyActionTimer = 0;
        
        // 重置阵法冷却
        this.formationCooldowns = {};
    }
    
    // 处理玩家行动
    handlePlayerAction(targetTile, row, col) {
        if (targetTile.unit) {
            // 点击到单位
            if (targetTile.unit.owner === 'player') {
                // 选择自己的单位
                this.selectedUnit = targetTile.unit;
            } else if (this.selectedUnit && this.canAttack(this.selectedUnit, row, col)) {
                // 攻击敌方单位
                this.attackUnit(this.selectedUnit, targetTile.unit);
            }
        } else if (this.selectedUnit && this.canMoveTo(this.selectedUnit, row, col)) {
            // 移动到空位
            this.moveUnit(this.selectedUnit, row, col);
        }
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
}

// 兵种类
class Unit {
    constructor(data) {
        this.data = data;
        this.id = data.id;
        this.name = data.name;
        this.type = data.type;
        this.description = data.description;
        this.health = data.health;
        this.maxHealth = data.health;
        this.attack = data.attack;
        this.attack_range = data.attack_range;
        this.move_range = data.move_range;
        this.attack_speed = data.attack_speed;
        this.critical_chance = data.critical_chance;
        this.traits = data.traits || [];
        this.trait_desc = data.trait_desc || '';
        this.summon_cost = data.summon_cost || [];
        this.summon_by_fusion = data.summon_by_fusion || [];
        
        // 单位状态
        this.owner = 'player';
        this.col = 0;
        this.row = 0;
        this.x = 0;
        this.y = 0;
        this.hasMoved = false;
        this.hasAttacked = false;
        this.buffs = [];
        
        // 移动距离（用于特性计算）
        this.moveDistance = 0;
        
        // 动画状态
        this.scale = 1;
        this.rotation = 0;
    }
    
    // 更新单位
    update() {
        // 更新增益状态
        this.updateBuffs();
    }
    
    // 更新增益状态
    updateBuffs() {
        if (!this.buffs) return;
        
        // 更新所有增益状态并移除过期的
        for (let i = this.buffs.length - 1; i >= 0; i--) {
            const buff = this.buffs[i];
            buff.update();
            
            if (buff.isExpired) {
                // 移除过期增益的效果
                buff.remove(this);
                this.buffs.splice(i, 1);
            }
        }
    }
    
    // 添加增益状态
    addBuff(buff) {
        if (!this.buffs) this.buffs = [];
        
        // 检查是否已存在相同类型的增益
        const existingBuffIndex = this.buffs.findIndex(b => b.id === buff.id);
        
        if (existingBuffIndex > -1) {
            // 堆叠增益
            this.buffs[existingBuffIndex].stack();
        } else {
            // 添加新增益并应用效果
            this.buffs.push(buff);
            buff.apply(this);
        }
    }
    
    // 移除增益状态
    removeBuff(buffId) {
        if (!this.buffs) return;
        
        const buffIndex = this.buffs.findIndex(b => b.id === buffId);
        if (buffIndex > -1) {
            const buff = this.buffs[buffIndex];
            buff.remove(this);
            this.buffs.splice(buffIndex, 1);
        }
    }
    
    // 渲染单位
    render(ctx, gridSize) {
        ctx.save();
        
        // 移动到单位位置
        ctx.translate(this.x, this.y);
        
        // 应用缩放和旋转
        ctx.scale(this.scale, this.scale);
        ctx.rotate(this.rotation);
        
        // 绘制单位基础形状
        const color = this.owner === 'player' ? '#2ed573' : '#ff4757';
        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        
        // 根据单位类型绘制不同形状
        switch (this.type) {
            case '兵卒':
                // 绘制方形代表兵卒
                ctx.fillRect(-gridSize / 3, -gridSize / 3, gridSize / 1.5, gridSize / 1.5);
                break;
            case '骑乘':
                // 绘制圆形代表骑乘
                ctx.beginPath();
                ctx.arc(0, 0, gridSize / 3, 0, Math.PI * 2);
                ctx.fill();
                break;
            case '弓弩':
                // 绘制三角形代表弓弩
                ctx.beginPath();
                ctx.moveTo(0, -gridSize / 3);
                ctx.lineTo(-gridSize / 3, gridSize / 3);
                ctx.lineTo(gridSize / 3, gridSize / 3);
                ctx.closePath();
                ctx.fill();
                break;
            default:
                // 默认绘制方形
                ctx.fillRect(-gridSize / 3, -gridSize / 3, gridSize / 1.5, gridSize / 1.5);
        }
        
        ctx.stroke();
        
        // 绘制单位名称
        ctx.fillStyle = '#ffffff';
        ctx.font = `${gridSize / 6}px 微软雅黑`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(this.name, 0, gridSize / 4);
        
        // 绘制生命值
        ctx.fillStyle = '#ff4757';
        ctx.font = `${gridSize / 7}px 微软雅黑`;
        ctx.fillText(`HP: ${this.health}/${this.maxHealth}`, 0, -gridSize / 2 + 10);
        
        // 绘制移动和攻击状态
        if (this.hasMoved) {
            ctx.fillStyle = '#ffa502';
            ctx.beginPath();
            ctx.arc(-gridSize / 3, -gridSize / 3, gridSize / 8, 0, Math.PI * 2);
            ctx.fill();
        }
        
        if (this.hasAttacked) {
            ctx.fillStyle = '#ff4757';
            ctx.beginPath();
            ctx.arc(gridSize / 3, -gridSize / 3, gridSize / 8, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// 增益状态类
class Buff {
    constructor(data) {
        this.data = data;
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.effect_type = data.effect_type;
        this.effect_target = data.effect_target;
        this.effect_details = data.effect_details;
        this.source_character = data.source_character;
        this.source_element = data.source_element;
        this.source_fusion = data.source_fusion;
        this.related_character = data.related_character;
        
        // 状态
        this.isExpired = false;
        this.duration = 3; // 默认持续3回合
        this.currentDuration = this.duration;
        this.stacks = 1; // 堆叠层数
        this.max_stacks = data.effect_details?.max_stacks || 1; // 最大堆叠层数
        
        // 效果数据
        this.originalValues = {}; // 保存原始属性值，用于移除增益时恢复
    }
    
    // 更新增益状态
    update() {
        this.currentDuration--;
        if (this.currentDuration <= 0) {
            this.isExpired = true;
        }
    }
    
    // 应用增益效果
    apply(unit) {
        if (this.isExpired) return;
        
        // 根据增益类型应用不同效果
        switch (this.effect_type) {
            case '团队增益':
                this.applyTeamBuff(unit);
                break;
            case '伤害减免':
                this.applyDamageReduction(unit);
                break;
            case '首次攻击强化':
                this.applyFirstAttackBoost(unit);
                break;
            default:
                console.log(`未处理的增益类型: ${this.effect_type}`);
        }
    }
    
    // 应用团队增益
    applyTeamBuff(unit) {
        // 攻击速度提升
        if (this.effect_details.attack_speed_bonus) {
            this.originalValues.attack_speed = unit.attack_speed;
            unit.attack_speed *= (1 + this.effect_details.attack_speed_bonus);
        }
    }
    
    // 应用伤害减免
    applyDamageReduction(unit) {
        // 添加伤害减免属性
        if (!unit.damageReduction) unit.damageReduction = 0;
        unit.damageReduction += this.effect_details.damage_reduction * this.stacks;
        
        // 限制最大减免
        unit.damageReduction = Math.min(unit.damageReduction, 0.9); // 最多减免90%
    }
    
    // 应用首次攻击强化
    applyFirstAttackBoost(unit) {
        // 添加首次攻击倍数属性
        unit.firstAttackMultiplier = this.effect_details.first_attack_multiplier;
        unit.hasFirstAttackBoost = true;
    }
    
    // 移除增益效果
    remove(unit) {
        // 根据增益类型移除不同效果
        switch (this.effect_type) {
            case '团队增益':
                this.removeTeamBuff(unit);
                break;
            case '伤害减免':
                this.removeDamageReduction(unit);
                break;
            case '首次攻击强化':
                this.removeFirstAttackBoost(unit);
                break;
        }
    }
    
    // 移除团队增益
    removeTeamBuff(unit) {
        // 恢复攻击速度
        if (this.originalValues.attack_speed) {
            unit.attack_speed = this.originalValues.attack_speed;
        }
    }
    
    // 移除伤害减免
    removeDamageReduction(unit) {
        if (unit.damageReduction) {
            unit.damageReduction -= this.effect_details.damage_reduction * this.stacks;
            // 确保不小于0
            unit.damageReduction = Math.max(unit.damageReduction, 0);
        }
    }
    
    // 移除首次攻击强化
    removeFirstAttackBoost(unit) {
        delete unit.firstAttackMultiplier;
        delete unit.hasFirstAttackBoost;
    }
    
    // 增加堆叠层数
    stack() {
        if (this.stacks < this.max_stacks) {
            this.stacks++;
            // 重置持续时间
            this.currentDuration = this.duration;
        }
    }
}

// 基础动画类
class Animation {
    constructor(x, y, duration = 30) {
        this.x = x;
        this.y = y;
        this.duration = duration;
        this.currentTime = 0;
        this.isCompleted = false;
    }
    
    update() {
        this.currentTime++;
        this.isCompleted = this.currentTime >= this.duration;
    }
    
    render(ctx) {
        // 子类实现具体渲染逻辑
    }
}

// 阵法激活动画
class FormationActivateAnimation extends Animation {
    constructor(x, y, formation) {
        super(x, y, 60);
        this.formation = formation;
        this.scale = 0;
        this.alpha = 1;
    }
    
    update() {
        super.update();
        
        // 计算缩放和透明度
        const progress = this.currentTime / this.duration;
        
        if (progress < 0.3) {
            // 快速放大
            this.scale = progress * 4;
        } else {
            // 缓慢缩小
            this.scale = 1.2 - (progress - 0.3) * 0.8;
            this.alpha = 1 - (progress - 0.3) / 0.7;
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.globalAlpha = this.alpha;
        
        // 绘制阵法符号
        ctx.fillStyle = '#ffd700';
        ctx.font = `${40 * this.scale}px 微软雅黑`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.formation.oracle_word, 0, 0);
        
        // 绘制光晕效果
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 100 * this.scale);
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 100 * this.scale, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// 单位召唤动画
class UnitSummonAnimation extends Animation {
    constructor(x, y, unit) {
        super(x, y, 45);
        this.unit = unit;
        this.scale = 0;
        this.alpha = 1;
        this.rotation = 0;
    }
    
    update() {
        super.update();
        
        const progress = this.currentTime / this.duration;
        this.scale = progress;
        this.alpha = 1 - progress * 0.3;
        this.rotation = progress * Math.PI * 4;
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.alpha;
        
        // 绘制召唤效果
        ctx.fillStyle = '#2ed573';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        
        // 绘制星形
        const starSize = 40;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
            const x = Math.cos(angle) * starSize;
            const y = Math.sin(angle) * starSize;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            
            const innerAngle = angle + Math.PI / 5;
            const innerX = Math.cos(innerAngle) * (starSize / 2);
            const innerY = Math.sin(innerAngle) * (starSize / 2);
            ctx.lineTo(innerX, innerY);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    }
}

// 单位转换动画
class UnitConvertAnimation extends Animation {
    constructor(x, y) {
        super(x, y, 90);
        this.scale = 1;
        this.alpha = 1;
    }
    
    update() {
        super.update();
        
        const progress = this.currentTime / this.duration;
        
        // 脉动效果
        this.scale = 1 + Math.sin(progress * Math.PI * 10) * 0.3;
        
        if (progress > 0.7) {
            this.alpha = 1 - (progress - 0.7) / 0.3;
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        ctx.globalAlpha = this.alpha;
        
        // 绘制转换光环
        const gradient = ctx.createConicGradient(0, 0, 0);
        gradient.addColorStop(0, '#ff4500');
        gradient.addColorStop(0.25, '#ffd700');
        gradient.addColorStop(0.5, '#2ed573');
        gradient.addColorStop(0.75, '#1e90ff');
        gradient.addColorStop(1, '#ff4500');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(0, 0, 50, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
}

// 阵法类
class Formation {
    constructor(data) {
        this.data = data;
        this.id = data.id;
        this.name = data.name;
        this.oracle_word = data.oracle_word;
        this.composition = data.composition;
        this.description = data.description;
        this.type = data.type;
        this.effect = data.effect;
        this.historical_note = data.historical_note;
        this.is_historical_event = data.is_historical_event || false;
        
        // 阵法状态
        this.isActivated = false;
        this.cooldown = 0;
        this.currentCooldown = 0;
    }
    
    // 激活阵法
    activate(game) {
        if (this.currentCooldown > 0) return false;
        
        this.isActivated = true;
        this.currentCooldown = this.cooldown;
        
        // 创建阵法激活动画
        const centerX = game.width / 2;
        const centerY = game.height / 2;
        game.addAnimation(new FormationActivateAnimation(centerX, centerY, this));
        
        // 执行阵法效果
        this.executeEffect(game);
        
        return true;
    }
    
    // 执行阵法效果
    executeEffect(game) {
        console.log(`激活阵法: ${this.name}`);
        console.log(`效果: ${this.effect}`);
        
        // 根据阵法类型执行不同效果
        switch (this.type) {
            case '召唤强化':
                this.executeSummonReinforcement(game);
                break;
            case '精锐召唤':
                this.executeEliteSummon(game);
                break;
            case '机动强化':
                this.executeMobilityBoost(game);
                break;
            case '特殊事件':
                this.executeSpecialEvent(game);
                break;
        }
    }
    
    // 执行召唤强化效果（众）
    executeSummonReinforcement(game) {
        console.log('执行召唤强化效果：召唤3个民兵');
        
        // 在玩家附近寻找空位召唤民兵
        let summonedCount = 0;
        const startRow = game.rows - 4;
        const startCol = game.cols - 6;
        
        // 尝试在不同位置召唤3个民兵
        for (let row = startRow; row < startRow + 3; row++) {
            for (let col = startCol; col < startCol + 3; col++) {
                if (summonedCount >= 3) break;
                
                if (game.isValidPosition(row, col) && !game.map[row][col].unit) {
                    const militia = game.createUnit('unit_militia', col, row, 'player');
                    game.playerUnits.push(militia);
                    game.map[row][col].unit = militia;
                    summonedCount++;
                    
                    // 添加召唤动画
                    const x = col * game.gridSize + game.gridSize / 2;
                    const y = row * game.gridSize + game.gridSize / 2;
                    game.addAnimation(new UnitSummonAnimation(x, y, militia));
                }
            }
        }
        
        // 如果民兵彼此相邻，生命值额外增加3点
        game.playerUnits.forEach(unit => {
            if (unit.id === 'unit_militia') {
                let hasAdjacentMilitia = false;
                
                // 检查周围8个方向
                const directions = [
                    [-1, 0], [1, 0], [0, -1], [0, 1],
                    [-1, -1], [-1, 1], [1, -1], [1, 1]
                ];
                
                for (const [dr, dc] of directions) {
                    const newRow = unit.row + dr;
                    const newCol = unit.col + dc;
                    
                    if (game.isValidPosition(newRow, newCol) && game.map[newRow][newCol].unit) {
                        const adjacentUnit = game.map[newRow][newCol].unit;
                        if (adjacentUnit.id === 'unit_militia') {
                            hasAdjacentMilitia = true;
                            break;
                        }
                    }
                }
                
                if (hasAdjacentMilitia) {
                    unit.health += 3;
                    unit.maxHealth += 3;
                }
            }
        });
    }
    
    // 执行精锐召唤效果（伐）
    executeEliteSummon(game) {
        console.log('执行精锐召唤效果：召唤精锐伐卒');
        
        // 在玩家附近寻找空位召唤精锐伐卒
        const startRow = game.rows - 4;
        const startCol = game.cols - 5;
        
        for (let row = startRow; row < startRow + 2; row++) {
            for (let col = startCol; col < startCol + 2; col++) {
                if (game.isValidPosition(row, col) && !game.map[row][col].unit) {
                    const elite = game.createUnit('unit_elite_fa', col, row, 'player');
                    
                    // 应用士气效果
                    elite.attack += 2;
                    
                    game.playerUnits.push(elite);
                    game.map[row][col].unit = elite;
                    
                    // 添加召唤动画
                    const x = col * game.gridSize + game.gridSize / 2;
                    const y = row * game.gridSize + game.gridSize / 2;
                    game.addAnimation(new UnitSummonAnimation(x, y, elite));
                    
                    return;
                }
            }
        }
    }
    
    // 执行机动强化效果（驭）
    executeMobilityBoost(game) {
        console.log('执行机动强化效果：晋升骑乘单位为驭手战车');
        
        // 查找玩家的骑乘单位
        const cavalryUnit = game.playerUnits.find(unit => unit.type === '骑乘');
        
        if (cavalryUnit) {
            // 晋升为驭手战车
            cavalryUnit.name = '驭手战车';
            cavalryUnit.attack += 2;
            cavalryUnit.move_range += 1;
            cavalryUnit.hasChicheng = true; // 驰骋技能：击杀后可再次移动
            
            console.log('骑乘单位已晋升为驭手战车，获得驰骋技能');
        } else {
            console.log('没有找到可晋升的骑乘单位');
        }
    }
    
    // 执行特殊事件效果（化）
    executeSpecialEvent(game) {
        console.log('执行特殊事件效果：触发奴隶倒戈');
        
        // 查找敌方的民兵或兵卒单位
        const targetUnits = game.enemyUnits.filter(unit => 
            unit.id === 'unit_militia' || unit.id === 'unit_infantry'
        );
        
        if (targetUnits.length > 0) {
            // 最多转化2个单位
            const unitsToConvert = targetUnits.slice(0, 2);
            
            unitsToConvert.forEach(unit => {
                // 添加转换动画
                const x = unit.x;
                const y = unit.y;
                game.addAnimation(new UnitConvertAnimation(x, y));
                
                // 转换为我方单位
                unit.owner = 'player';
                
                // 从敌方单位列表移除
                const enemyIndex = game.enemyUnits.indexOf(unit);
                if (enemyIndex > -1) {
                    game.enemyUnits.splice(enemyIndex, 1);
                }
                
                // 添加到玩家单位列表
                game.playerUnits.push(unit);
                
                console.log(`${unit.name} 已倒戈加入我方`);
            });
        } else {
            console.log('没有找到可倒戈的敌方单位');
        }
    }
    
    // 更新阵法
    update() {
        if (this.currentCooldown > 0) {
            this.currentCooldown--;
        }
        
        if (this.isActivated) {
            // 持续效果更新
        }
    }
}