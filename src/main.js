import * as PIXI from 'pixi.js';

// 游戏状态和分数
let isPaused = false;
let score = 0;
let gameTime = 0;

// 添加关卡和倒计时配置
const LEVEL_DURATION = 30; // 每关持续30秒
let currentLevel = 1;
let levelTimeLeft = LEVEL_DURATION;

// 修改这些常量为可变变量
// 游戏配置常量
let ENEMY_SPEED = 2;
let ENEMY_BULLET_SPEED = 5;
let PLAYER_ATTACK_DAMAGE = 1;
let SHOOT_INTERVAL = 1000; // 修改为1000毫秒
let lastPlayerShot = 0;  // 添加这个变量

// 保持这些作为常量
const ENEMY_SIZE = 20;
const BULLET_SIZE = 8;
const PLAYER_MAX_HEALTH = 10;
const ENEMY_SPAWN_INTERVAL = 1000;
const TOTAL_LEVELS = 10;
const PLAYER_BULLET_SPEED = 10;  // 添加这个常量

// 添加奖励配置
const REWARDS = [
    {
        title: "攻速提升",
        description: "攻击间隔减少20%",
        effect: () => {
            SHOOT_INTERVAL *= 0.8;
        }
    },
    {
        title: "攻击力提升",
        description: "攻击力提升50%",
        effect: () => {
            PLAYER_ATTACK_DAMAGE *= 1.5;
        }
    },
    {
        title: "生命提升",
        description: "最大生命值提升2点",
        effect: () => {
            player.maxHealth += 2;
            player.health = player.maxHealth;
            player.updateHealthBar();
        }
    },
    {
        title: "移动速度提升",
        description: "移动速度提升20%",
        effect: () => {
            player.speed *= 1.2;
        }
    },
    {
        title: "双倍得分",
        description: "击杀敌人获得双倍分数",
        effect: () => {
            // 在击杀敌人时检查这个标志
            player.doubleScoringEnabled = true;
        }
    },
    {
        title: "生命恢复",
        description: "立即恢复所有生命值",
        effect: () => {
            player.health = player.maxHealth;
            player.updateHealthBar();
        }
    }
];

// 创建应用
const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x1099bb,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
});

// 将画布添加到DOM
document.getElementById('app').appendChild(app.view);

// 响应窗口大小变化
window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    // 当窗口大小改变时，重新定位玩家到屏幕中央
    player.x = app.screen.width / 2;
    player.y = app.screen.height / 2;
});

// 创建容器
const enemies = new PIXI.Container();
const playerBullets = new PIXI.Container();
const enemyBullets = new PIXI.Container();
app.stage.addChild(enemies);
app.stage.addChild(playerBullets);
app.stage.addChild(enemyBullets);

// 修改玩家为Container类型
class Player extends PIXI.Container {
    constructor() {
        super();
        
        // 玩家基础属性
        this.maxHealth = PLAYER_MAX_HEALTH;
        this.health = this.maxHealth;
        this.speed = 5;
        this.attackDamage = PLAYER_ATTACK_DAMAGE; // 添加攻击力属性
        
        // 创建玩家精灵
        this.sprite = PIXI.Sprite.from('https://pixijs.io/examples/examples/assets/bunny.png');
        this.sprite.anchor.set(0.5);
        
        // 创建血条背景（黑色）
        this.healthBarBg = new PIXI.Graphics();
        this.healthBarBg.beginFill(0x000000);
        this.healthBarBg.drawRect(-25, -30, 50, 5);
        this.healthBarBg.endFill();
        
        // 创建血条（红色）
        this.healthBar = new PIXI.Graphics();
        this.updateHealthBar();
        
        // 添加到容器
        this.addChild(this.sprite);
        this.addChild(this.healthBarBg);
        this.addChild(this.healthBar);
    }

    // 更新血条显示
    updateHealthBar() {
        this.healthBar.clear();
        this.healthBar.beginFill(0xFF0000);
        const healthWidth = (this.health / this.maxHealth) * 50;
        this.healthBar.drawRect(-25, -30, healthWidth, 5);
        this.healthBar.endFill();
    }

    // 受伤方法
    takeDamage(damage) {
        this.health -= damage;
        this.updateHealthBar();
        
        if (this.health <= 0) {
            gameOver();
            return true;
        }
        return false;
    }

    // 添加更新属性的方法
    updateAttributes(newHealth, newAttack) {
        // 攻击力：简单赋值
        if (newAttack > 0) {
            this.attackDamage = newAttack;
        }
        
        // 生命值：简化处理
        if (newHealth > 0) {
            this.maxHealth = newHealth;
            this.health = newHealth; // 直接设置为满血
            this.updateHealthBar(); // 只需要更新一次血条显示
        }
    }
}

// 替换原来的玩家创建代码
const player = new Player();
player.x = app.screen.width / 2;
player.y = app.screen.height / 2;
app.stage.addChild(player);

// 添加游戏信息文本
const gameInfoText = new PIXI.Text('', {
    fontFamily: 'Arial',
    fontSize: 24,
    fill: 0xFFFFFF
});
gameInfoText.x = 10;
gameInfoText.y = 10;
app.stage.addChild(gameInfoText);

// 创建一个对象来存储按键状态
const keys = {
    w: false,
    a: false,
    s: false,
    d: false
};

// 监听键盘按下事件
window.addEventListener('keydown', (e) => {
    switch (e.key.toLowerCase()) {
        case 'w':
            keys.w = true;
            break;
        case 'a':
            keys.a = true;
            break;
        case 's':
            keys.s = true;
            break;
        case 'd':
            keys.d = true;
            break;
    }
});

// 监听键盘释放事件
window.addEventListener('keyup', (e) => {
    switch (e.key.toLowerCase()) {
        case 'w':
            keys.w = false;
            break;
        case 'a':
            keys.a = false;
            break;
        case 's':
            keys.s = false;
            break;
        case 'd':
            keys.d = false;
            break;
    }
});

// 菜单相关元素
const menuButton = document.getElementById('menu-button');
const menuOverlay = document.getElementById('menu-overlay');
const continueButton = document.getElementById('continue');
const settingsButton = document.getElementById('settings');
const exitButton = document.getElementById('exit');

// 获取新添加的元素
const gameOverText = document.getElementById('game-over-text');
const restartButton = document.getElementById('restart-button');

// 添加战绩相关元素
const scoresButton = document.getElementById('scores-button');
const scoresList = document.getElementById('scores-list');

// 获取奖励相关元素
const rewardOverlay = document.getElementById('reward-overlay');
const cards = document.querySelectorAll('.reward-card');

// 从本地存储加载历史战绩
let highScores = JSON.parse(localStorage.getItem('highScores')) || [];

// 添加修改器相关元素
const attackModifier = document.getElementById('attack-modifier');
const intervalModifier = document.getElementById('interval-modifier');
const healthModifier = document.getElementById('health-modifier');
const modifierStatus = document.querySelector('.modifier-status');

// 添加确认按钮元素
const applyModifierButton = document.getElementById('apply-modifier');

// 修改应用修改器的值函数
function applyModifiers() {
    const newAttack = Number(attackModifier.value);
    const newInterval = Number(intervalModifier.value);
    const newHealth = Number(healthModifier.value);

    console.log('Before modifications:', {
        currentAttack: player.attackDamage,
        currentInterval: SHOOT_INTERVAL,
        currentHealth: player.maxHealth
    });

    // 更新玩家属性
    player.updateAttributes(newHealth, newAttack);
    
    // 更新射击间隔，最小值改为10毫秒
    if (newInterval >= 10) {
        SHOOT_INTERVAL = newInterval;
        lastPlayerShot = Date.now() - newInterval;
        console.log('New shoot interval:', SHOOT_INTERVAL);
    }

    console.log('After modifications:', {
        newAttack: player.attackDamage,
        newInterval: SHOOT_INTERVAL,
        newHealth: player.maxHealth
    });
}

// 修改自动射击函数
function autoShoot() {
    if (isPaused) return;
    
    const now = Date.now();
    const timeSinceLastShot = now - lastPlayerShot;
    
    // 添加调试日志
    console.log('Shooting check:', {
        interval: SHOOT_INTERVAL,
        timeSince: timeSinceLastShot,
        canShoot: timeSinceLastShot >= SHOOT_INTERVAL
    });
    
    if (timeSinceLastShot < SHOOT_INTERVAL) {
        return;
    }

    const nearestEnemy = getNearestEnemy();
    if (!nearestEnemy) return;

    const bullet = new Bullet(player.x, player.y, true);
    
    const dx = nearestEnemy.x - player.x;
    const dy = nearestEnemy.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    bullet.direction.x = dx / distance;
    bullet.direction.y = dy / distance;
    
    playerBullets.addChild(bullet);
    lastPlayerShot = now;
}

// 修改初始化修改器值函数
function initModifiers() {
    console.log('Initializing modifiers with:', {
        attack: player.attackDamage,
        interval: SHOOT_INTERVAL,
        health: player.maxHealth
    });
    
    attackModifier.value = player.attackDamage;
    intervalModifier.value = SHOOT_INTERVAL;
    healthModifier.value = player.maxHealth;
}

// 修改监听器逻辑
[attackModifier, intervalModifier, healthModifier].forEach(input => {
    input.addEventListener('change', () => {
        modifierStatus.textContent = '修改待确认';
        modifierStatus.style.background = '#e0e0e0';
        modifierStatus.style.color = '#666';
    });
});

// 添加确认按钮事件监听
applyModifierButton.addEventListener('click', () => {
    applyModifiers();
    modifierStatus.textContent = '修改已生效';
    modifierStatus.style.background = '#4CAF50';
    modifierStatus.style.color = 'white';
});

// 修改隐藏菜单函数
function hideMenu() {
    menuOverlay.style.display = 'none';
    gameOverText.style.display = 'none';
    isPaused = false;
}

// 修改显示菜单函数
function showMenu(isGameOver = false) {
    menuOverlay.style.display = 'block';
    gameOverText.style.display = isGameOver ? 'block' : 'none';
    continueButton.style.display = isGameOver ? 'none' : 'block';
    restartButton.style.display = isGameOver ? 'block' : 'none';
    
    // 初始化修改器值
    initModifiers();
    modifierStatus.textContent = '修改待确认';
    modifierStatus.style.background = '#e0e0e0';
    modifierStatus.style.color = '#666';
    
    isPaused = true;
}

// 菜单按钮点击事件
menuButton.addEventListener('click', showMenu);

// ESC 键打开菜单
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (menuOverlay.style.display === 'block') {
            hideMenu();
        } else {
            showMenu();
        }
    }
});

// 创建子弹类
class Bullet extends PIXI.Sprite {
    constructor(x, y, isPlayerBullet = true) {
        const graphics = new PIXI.Graphics();
        graphics.beginFill(isPlayerBullet ? 0x00ff00 : 0xff6600);
        graphics.drawCircle(0, 0, BULLET_SIZE/2);
        graphics.endFill();
        const texture = app.renderer.generateTexture(graphics);
        
        super(texture);
        
        this.anchor.set(0.5);
        this.x = x;
        this.y = y;
        this.speed = isPlayerBullet ? PLAYER_BULLET_SPEED : ENEMY_BULLET_SPEED;
        this.isPlayerBullet = isPlayerBullet;
        this.direction = { x: 0, y: 0 };
    }

    update() {
        this.x += this.direction.x * this.speed;
        this.y += this.direction.y * this.speed;

        // 如果子弹超出屏幕范围，将其移除
        if (this.x < 0 || this.x > app.screen.width ||
            this.y < 0 || this.y > app.screen.height) {
            this.destroy();
        }
    }
}

// 修改敌人类
class Enemy extends PIXI.Container { // 改为Container以便添加多个显示对象
    constructor(x, y) {
        super();
        
        // 敌人基础属性
        this.maxHealth = 5;
        this.health = this.maxHealth;
        
        // 创建敌人精灵
        const graphics = new PIXI.Graphics();
        graphics.beginFill(0xFF0000);
        graphics.drawCircle(0, 0, ENEMY_SIZE/2);
        graphics.endFill();
        const texture = app.renderer.generateTexture(graphics);
        this.sprite = new PIXI.Sprite(texture);
        this.sprite.anchor.set(0.5);
        
        // 创建血条背景（黑色）
        this.healthBarBg = new PIXI.Graphics();
        this.healthBarBg.beginFill(0x000000);
        this.healthBarBg.drawRect(-20, -ENEMY_SIZE - 10, 40, 5);
        this.healthBarBg.endFill();
        
        // 创建血条（红色）
        this.healthBar = new PIXI.Graphics();
        this.updateHealthBar();
        
        // 添加到容器
        this.addChild(this.sprite);
        this.addChild(this.healthBarBg);
        this.addChild(this.healthBar);
        
        // 设置位置
        this.x = x;
        this.y = y;
        
        this.speed = ENEMY_SPEED;
        this.lastShot = 0;
        this.shootInterval = 2000 + Math.random() * 2000;
    }

    // 添加更新血条的方法
    updateHealthBar() {
        this.healthBar.clear();
        this.healthBar.beginFill(0xFF0000);
        const healthWidth = (this.health / this.maxHealth) * 40;
        this.healthBar.drawRect(-20, -ENEMY_SIZE - 10, healthWidth, 5);
        this.healthBar.endFill();
    }

    // 修改受伤方法
    takeDamage(damage) {
        this.health -= damage;
        this.updateHealthBar();
        
        if (this.health <= 0) {
            // 不直接调用 destroy，而是从父容器中移除
            if (this.parent) {
                this.parent.removeChild(this);
            }
            return true; // 返回true表示敌人被消灭
        }
        return false;
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShot > this.shootInterval) {
            const bullet = new Bullet(this.x, this.y, false);
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            bullet.direction.x = dx / distance;
            bullet.direction.y = dy / distance;
            enemyBullets.addChild(bullet);
            this.lastShot = now;
        }
    }

    update() {
        // 获取到玩家的方向
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 更新敌人位置
        if (distance > 0) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }

        // 检测与玩家的碰撞
        if (distance < (ENEMY_SIZE + player.sprite.width) / 2) {
            player.takeDamage(1);
        }

        this.shoot();
    }
}

// 随机生成敌人的位置（在屏幕边缘）
function getRandomSpawnPosition() {
    const side = Math.floor(Math.random() * 4); // 0: 上, 1: 右, 2: 下, 3: 左
    let x, y;
    
    switch(side) {
        case 0: // 上边
            x = Math.random() * app.screen.width;
            y = -ENEMY_SIZE;
            break;
        case 1: // 右边
            x = app.screen.width + ENEMY_SIZE;
            y = Math.random() * app.screen.height;
            break;
        case 2: // 下边
            x = Math.random() * app.screen.width;
            y = app.screen.height + ENEMY_SIZE;
            break;
        case 3: // 左边
            x = -ENEMY_SIZE;
            y = Math.random() * app.screen.height;
            break;
    }
    
    return { x, y };
}

// 生成敌人
function spawnEnemy() {
    if (isPaused) return;
    
    const pos = getRandomSpawnPosition();
    const enemy = new Enemy(pos.x, pos.y);
    enemies.addChild(enemy);
}

// 存储敌人生成定时器
let enemySpawnInterval = setInterval(spawnEnemy, ENEMY_SPAWN_INTERVAL);

// 获取最近的敌人
function getNearestEnemy() {
    let nearestEnemy = null;
    let minDistance = Infinity;

    enemies.children.forEach(enemy => {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance) {
            minDistance = distance;
            nearestEnemy = enemy;
        }
    });

    return nearestEnemy;
}

// 修改子弹碰撞检测函数
function checkBulletCollisions() {
    // 检查玩家子弹是否击中敌人
    for (let i = playerBullets.children.length - 1; i >= 0; i--) {
        const bullet = playerBullets.children[i];
        for (let j = enemies.children.length - 1; j >= 0; j--) {
            const enemy = enemies.children[j];
            const dx = bullet.x - enemy.x;
            const dy = bullet.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < (BULLET_SIZE + ENEMY_SIZE) / 2) {
                if (bullet.parent) {
                    bullet.parent.removeChild(bullet);
                }
                // 使用玩家的攻击力
                if (enemy.takeDamage(player.attackDamage)) {
                    score += player.doubleScoringEnabled ? 20 : 10;
                }
                break;
            }
        }
    }

    // 检查敌人子弹是否击中玩家
    for (let i = enemyBullets.children.length - 1; i >= 0; i--) {
        const bullet = enemyBullets.children[i];
        const dx = bullet.x - player.x;
        const dy = bullet.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < (BULLET_SIZE + player.sprite.width) / 2) {
            if (bullet.parent) {
                bullet.parent.removeChild(bullet);
            }
            player.takeDamage(1);
        }
    }
}

// 更新游戏信息显示
function updateGameInfo() {
    gameInfoText.text = `关卡: ${currentLevel}/${TOTAL_LEVELS}    时间: ${Math.ceil(levelTimeLeft)}    分数: ${score}    生命: ${Math.ceil(player.health)}`;
}

// 显示奖励选择界面
function showRewards() {
    isPaused = true;
    
    // 随机选择三个不同的奖励
    const selectedRewards = getRandomRewards(3);
    
    // 设置卡片内容
    cards.forEach((card, index) => {
        const reward = selectedRewards[index];
        card.querySelector('.card-title').textContent = reward.title;
        card.querySelector('.card-description').textContent = reward.description;
        
        // 添加点击事件
        card.onclick = () => {
            reward.effect();
            hideRewards();
            continueGame();
        };
    });
    
    rewardOverlay.style.display = 'flex';
}

// 隐藏奖励选择界面
function hideRewards() {
    rewardOverlay.style.display = 'none';
    isPaused = false;
}

// 随机获取指定数量的不同奖励
function getRandomRewards(count) {
    const shuffled = REWARDS.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// 继续游戏
function continueGame() {
    if (currentLevel >= TOTAL_LEVELS) {
        // 通关游戏
        gameVictory();
        return;
    }

    levelTimeLeft = LEVEL_DURATION;
    currentLevel++;
    
    // 清除现有敌人和子弹
    enemies.removeChildren();
    enemyBullets.removeChildren();
    playerBullets.removeChildren();
    
    // 重置玩家位置
    player.x = app.screen.width / 2;
    player.y = app.screen.height / 2;
}

// 添加游戏胜利函数
function gameVictory() {
    isPaused = true;
    saveScore(); // 保存战绩
    
    // 修改游戏结束文本
    gameOverText.style.color = '#4CAF50';
    gameOverText.textContent = '恭喜通关！';
    showMenu(true);
}

// 修改重置游戏函数
function resetGame() {
    score = 0;
    gameTime = 0;
    currentLevel = 1;
    levelTimeLeft = LEVEL_DURATION;
    ENEMY_SPEED = 2; // 重置敌人速度
    ENEMY_BULLET_SPEED = 5; // 重置敌人子弹速度
    
    // 重置敌人生成间隔
    clearInterval(enemySpawnInterval);
    enemySpawnInterval = setInterval(spawnEnemy, ENEMY_SPAWN_INTERVAL);
    
    enemies.removeChildren();
    playerBullets.removeChildren();
    enemyBullets.removeChildren();
    player.x = app.screen.width / 2;
    player.y = app.screen.height / 2;
    
    // 重置玩家生命值
    player.health = player.maxHealth;
    player.updateHealthBar();
    
    // 重置游戏结束文本
    gameOverText.style.color = '#ff0000';
    gameOverText.textContent = '游戏结束！';
    
    // 更新战绩显示
    updateScoresList();
    
    hideMenu();
}

// 修改保存战绩函数，添加是否通关信息
function saveScore() {
    const newScore = {
        score: score,
        level: currentLevel,
        completed: currentLevel >= TOTAL_LEVELS,
        date: new Date().getTime()
    };
    
    highScores.push(newScore);
    
    // 按分数排序并只保留前20个最高分
    highScores.sort((a, b) => b.score - a.score);
    highScores = highScores.slice(0, 20);
    
    // 保存到本地存储
    localStorage.setItem('highScores', JSON.stringify(highScores));
    
    // 更新显示
    updateScoresList();
}

// 修改战绩显示函数，添加通关标记
function updateScoresList() {
    scoresList.innerHTML = '';
    
    if (highScores.length === 0) {
        scoresList.innerHTML = '<div class="no-scores">暂无战绩</div>';
        return;
    }

    // 按分数排序
    highScores.sort((a, b) => b.score - a.score);
    
    // 只显示前10个最高分
    highScores.slice(0, 10).forEach((score, index) => {
        const scoreElement = document.createElement('div');
        scoreElement.className = 'score-item';
        const completedText = score.completed ? '(已通关)' : '';
        scoreElement.textContent = `${index + 1}. 分数: ${score.score} - 关卡: ${score.level}${completedText} - ${new Date(score.date).toLocaleString()}`;
        scoresList.appendChild(scoreElement);
    });
}

// 显示/隐藏战绩列表
scoresButton.addEventListener('click', () => {
    const isVisible = scoresList.style.display === 'block';
    scoresList.style.display = isVisible ? 'none' : 'block';
    updateScoresList(); // 更新战绩显示
});

// 添加重新开始按钮事件监听
restartButton.addEventListener('click', resetGame);

// 修改继续游戏按钮逻辑
continueButton.addEventListener('click', hideMenu);

// 玩家设置
settingsButton.addEventListener('click', () => {
    // 这里添加设置逻辑
    alert('设置功能开发中...');
});

// 退出游戏
exitButton.addEventListener('click', () => {
    if (confirm('确定要退出游戏吗？')) {
        window.close(); // 注意：这可能不会在所有浏览器中生效
        // 可以重定向到其他页面
        // window.location.href = 'exit.html';
    }
});

// 初始化时加载战绩
updateScoresList();

// 修改游戏主循环
app.ticker.add(() => {
    if (isPaused) return;

    // 更新倒计时
    levelTimeLeft -= app.ticker.deltaMS / 1000;
    
    // 检查关卡是否完成
    if (levelTimeLeft <= 0) {
        handleLevelComplete();
    }

    // 更新玩家位置
    if (keys.w && player.y > player.height/2) {
        player.y -= player.speed;
    }
    if (keys.s && player.y < app.screen.height - player.height/2) {
        player.y += player.speed;
    }
    if (keys.a && player.x > player.width/2) {
        player.x -= player.speed;
        player.scale.x = -1;
    }
    if (keys.d && player.x < app.screen.width - player.width/2) {
        player.x += player.speed;
        player.scale.x = 1;
    }

    // 自动射击检查
    autoShoot(); // 直接调用 autoShoot，让它自己处理时间间隔

    // 更新所有子弹
    playerBullets.children.forEach(bullet => bullet.update());
    enemyBullets.children.forEach(bullet => bullet.update());
    
    // 更新所有敌人
    enemies.children.forEach(enemy => enemy.update());

    // 检查碰撞
    checkBulletCollisions();

    // 更新游戏时间和分数
    gameTime += app.ticker.deltaMS;
    
    // 更新游戏信息显示
    updateGameInfo();
});

// 添加关卡完成处理函数（之前被删除了）
function handleLevelComplete() {
    // 显示奖励选择界面
    showRewards();
    
    // 增加游戏难度
    ENEMY_SPEED += 0.2;
    ENEMY_BULLET_SPEED += 0.2;
    
    // 减少敌人生成间隔
    clearInterval(enemySpawnInterval);
    const newSpawnInterval = Math.max(ENEMY_SPAWN_INTERVAL - currentLevel * 100, 300);
    enemySpawnInterval = setInterval(spawnEnemy, newSpawnInterval);
}

// 修改游戏结束函数（之前被删除了）
function gameOver() {
    isPaused = true;
    saveScore(); // 保存战绩
    showMenu(true);
}

// 这里可以添加你的游戏逻辑 