// 游戏核心变量
const game = {
    canvas: document.getElementById('gameCanvas'),
    ctx: null,
    width: 800,
    height: 600,
    isRunning: false,
    isPaused: false,
    score: 0,
    bestScore: localStorage.getItem('planeGameBestScore') || 0,
    // 玩家属性 - 放大飞机尺寸（80x80）
    player: {
        x: 0,
        y: 0,
        width: 120,  // 我方飞机放大为80x80
        height: 120,
        speed: 5,
        hp: 150,
        maxHp: 200,
        fireRate: 150, // 射击间隔（ms）
        lastFire: 0,
        img: null,
        invulnerable: false, // 无敌状态
        invulnerableTime: 0,
        // 触屏移动相关
        touchX: null,
        touchY: null,
        isTouching: false
    },
    // 敌机图片资源（新增）
    enemyImgs: {
        normal: null,  // 普通敌机图片
        elite: null    // 精英敌机图片
    },
    // 游戏实体
    bullets: [],
    enemies: [],
    props: [],
    particles: [],
    // 技能相关
    skillCD: 10000, // 必杀技冷却（ms）
    lastSkillUse: 0,
    // 难度控制
    enemySpawnRate: 1500, // 敌机生成间隔（ms）
    lastEnemySpawn: 0,
    difficultyTimer: 0,
    // 键盘控制
    keys: {
        w: false,
        a: false,
        s: false,
        d: false,
        space: false,
        shift: false
    }
};

// 初始化游戏
function initGame() {
    // 适配移动端Canvas尺寸
    adaptCanvasSize();
    
    game.ctx = game.canvas.getContext('2d');
    
    // 加载玩家飞机图片（透明背景）
    game.player.img = new Image();
    game.player.img.src = 'assets/player.png';
    // 图片加载失败时用纯色矩形替代
    game.player.img.onerror = () => {
        console.log('玩家飞机图片加载失败，使用默认矩形');
        game.player.img = null;
    };

    // 加载敌机图片（新增：普通+精英敌机，支持透明背景）
    loadEnemyImages();

    // 初始化玩家位置（放大后仍居中）
    game.player.x = game.width / 2 - game.player.width / 2;
    game.player.y = game.height - game.player.height - 20;

    // 绑定事件（触屏+键盘）
    bindEvents();

    // 初始化UI
    document.getElementById('bestScore').textContent = game.bestScore;
    
    // 适配移动端显示控制按钮
    adaptTouchControls();
}

// 加载敌机图片（新增）
function loadEnemyImages() {
    // 普通敌机图片
    game.enemyImgs.normal = new Image();
    game.enemyImgs.normal.src = 'assets/enemy1.png';
    game.enemyImgs.normal.onerror = () => {
        console.log('普通敌机图片加载失败，使用默认方块');
        game.enemyImgs.normal = null;
    };

    // 精英敌机图片
    game.enemyImgs.elite = new Image();
    game.enemyImgs.elite.src = 'assets/enemy2.png';
    game.enemyImgs.elite.onerror = () => {
        console.log('精英敌机图片加载失败，使用默认方块');
        game.enemyImgs.elite = null;
    };
}

// 适配Canvas尺寸（移动端/PC端）
function adaptCanvasSize() {
    const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(navigator.userAgent);
    if (isMobile) {
        game.width = window.innerWidth;
        game.height = window.innerHeight;
    } else {
        game.width = 800;
        game.height = 600;
    }
    game.canvas.width = game.width;
    game.canvas.height = game.height;
}

// 适配触屏控制按钮显示
function adaptTouchControls() {
    const touchControls = document.getElementById('touchControls');
    const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(navigator.userAgent);
    touchControls.style.display = isMobile ? 'flex' : 'none';
}

// 事件绑定
function bindEvents() {
    // 键盘控制
    window.addEventListener('keydown', (e) => {
        switch(e.key.toLowerCase()) {
            case 'w': game.keys.w = true; break;
            case 'a': game.keys.a = true; break;
            case 's': game.keys.s = true; break;
            case 'd': game.keys.d = true; break;
            case ' ': game.keys.space = true; break;
            case 'shift': game.keys.shift = true; break;
            case 'p': togglePause(); break; // P键暂停
        }
    });

    window.addEventListener('keyup', (e) => {
        switch(e.key.toLowerCase()) {
            case 'w': game.keys.w = false; break;
            case 'a': game.keys.a = false; break;
            case 's': game.keys.s = false; break;
            case 'd': game.keys.d = false; break;
            case ' ': game.keys.space = false; break;
            case 'shift': game.keys.shift = false; break;
        }
    });

    // 触屏控制 - 滑动移动战机
    game.canvas.addEventListener('touchstart', (e) => {
        e.preventDefault(); // 阻止默认滚动
        if (!game.isRunning || game.isPaused) return;
        const touch = e.touches[0];
        const rect = game.canvas.getBoundingClientRect();
        game.player.isTouching = true;
        game.player.touchX = touch.clientX - rect.left;
        game.player.touchY = touch.clientY - rect.top;
    });

    game.canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!game.isRunning || game.isPaused || !game.player.isTouching) return;
        const touch = e.touches[0];
        const rect = game.canvas.getBoundingClientRect();
        // 计算触摸偏移量
        const newX = touch.clientX - rect.left - game.player.width / 2;
        const newY = touch.clientY - rect.top - game.player.height / 2;
        // 限制移动范围
        game.player.x = Math.max(0, Math.min(game.width - game.player.width, newX));
        game.player.y = Math.max(0, Math.min(game.height - game.player.height, newY));
    });

    game.canvas.addEventListener('touchend', () => {
        game.player.isTouching = false;
    });

    // 触屏按钮 - 射击
    document.getElementById('fireBtn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!game.isRunning || game.isPaused) return;
        game.keys.space = true;
    });
    document.getElementById('fireBtn').addEventListener('touchend', () => {
        game.keys.space = false;
    });

    // 触屏按钮 - 必杀技
    document.getElementById('skillTouchBtn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!game.isRunning || game.isPaused) return;
        useSkill();
    });

    // 按钮事件
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', restartGame);
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    document.getElementById('skillBtn').addEventListener('click', useSkill);

    // 窗口大小变化适配
    window.addEventListener('resize', () => {
        adaptCanvasSize();
        // 重置玩家位置
        game.player.x = game.width / 2 - game.player.width / 2;
        game.player.y = game.height - game.player.height - 20;
    });
}

// 开始游戏
function startGame() {
    game.isRunning = true;
    game.isPaused = false;
    game.score = 0;
    game.player.hp = game.player.maxHp;
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    // 清空实体
    game.bullets = [];
    game.enemies = [];
    game.props = [];
    game.particles = [];
    // 开始游戏循环
    requestAnimationFrame(gameLoop);
}

// 重新开始游戏
function restartGame() {
    startGame();
}

// 暂停/继续游戏
function togglePause() {
    if (!game.isRunning) return;
    game.isPaused = !game.isPaused;
    document.getElementById('pauseBtn').textContent = game.isPaused ? '继续' : '暂停';
    if (!game.isPaused) {
        gameLoop();
    }
}

// 游戏主循环
function gameLoop(timestamp) {
    if (!game.isRunning || game.isPaused) return;

    // 清空画布
    game.ctx.clearRect(0, 0, game.width, game.height);

    // 更新游戏状态
    updateGame(timestamp);

    // 渲染游戏
    renderGame();

    // 继续循环
    requestAnimationFrame(gameLoop);
}

// 更新游戏逻辑
function updateGame(timestamp) {
    // 更新玩家位置（键盘+触屏）
    updatePlayer();

    // 玩家射击
    if (game.keys.space && timestamp - game.player.lastFire > game.player.fireRate) {
        fireBullet();
        game.player.lastFire = timestamp;
    }

    // 释放必杀技
    if (game.keys.shift && timestamp - game.lastSkillUse > game.skillCD) {
        useSkill();
        game.lastSkillUse = timestamp;
    }

    // 更新技能冷却UI
    updateSkillCD(timestamp);

    // 生成敌机（飞机样式）
    if (timestamp - game.lastEnemySpawn > game.enemySpawnRate) {
        spawnEnemy();
        game.lastEnemySpawn = timestamp;
    }

    // 更新子弹
    updateBullets();

    // 更新敌机
    updateEnemies();

    // 更新粒子特效
    updateParticles();

    // 碰撞检测
    checkCollisions();

    // 更新难度
    updateDifficulty(timestamp);

    // 更新UI
    updateUI();

    // 检查游戏结束
    if (game.player.hp <= 0) {
        gameOver();
    }
}

// 更新玩家位置
function updatePlayer() {
    // 键盘控制
    if (game.keys.w && game.player.y > 0) {
        game.player.y -= game.player.speed;
    }
    if (game.keys.s && game.player.y < game.height - game.player.height) {
        game.player.y += game.player.speed;
    }
    if (game.keys.a && game.player.x > 0) {
        game.player.x -= game.player.speed;
    }
    if (game.keys.d && game.player.x < game.width - game.player.width) {
        game.player.x += game.player.speed;
    }

    // 无敌状态计时
    if (game.player.invulnerable) {
        game.player.invulnerableTime -= 16; // 约60fps，每帧减16ms
        if (game.player.invulnerableTime <= 0) {
            game.player.invulnerable = false;
        }
    }
}

// 发射子弹
function fireBullet() {
    // 创建子弹（居中发射，适配放大后的飞机）
    const bullet = {
        x: game.player.x + game.player.width / 2 - 5,
        y: game.player.y - 10,
        width: 10,
        height: 20,
        speed: 8,
        damage: 10
    };
    game.bullets.push(bullet);

    // 粒子特效（炮口闪光）
    createParticle(game.player.x + game.player.width / 2, game.player.y, '#ff6bff', 5);
}

// 使用必杀技
function useSkill() {
    if (Date.now() - game.lastSkillUse < game.skillCD) return;
    
    // 清屏所有敌机
    game.enemies.forEach(enemy => {
        createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
        game.score += 50;
    });
    game.enemies = [];

    // 技能特效
    createScreenEffect();

    // 更新冷却时间
    game.lastSkillUse = Date.now();
    document.getElementById('skillBtn').disabled = true;
}

// 更新技能冷却UI
function updateSkillCD(timestamp) {
    const skillBtn = document.getElementById('skillBtn');
    const cdLeft = game.skillCD - (timestamp - game.lastSkillUse);
    if (cdLeft > 0) {
        skillBtn.textContent = `必杀技（${Math.ceil(cdLeft/1000)}s）`;
        skillBtn.disabled = true;
    } else {
        skillBtn.textContent = '必杀技（就绪）';
        skillBtn.disabled = false;
    }
}

// 生成敌机（飞机尺寸适配）
function spawnEnemy() {
    // 随机敌机类型（普通/精英飞机）
    const isElite = Math.random() < 0.1;
    // 敌机尺寸适配图片（普通60x60，精英80x80）
    const enemyWidth = isElite ? 80 : 60;  
    const enemyHeight = isElite ? 80 : 60; 
    
    const enemy = {
        x: Math.random() * (game.width - enemyWidth),
        y: -enemyHeight,
        width: enemyWidth,
        height: enemyHeight,
        speed: isElite ? 2 : 3,
        hp: isElite ? 50 : 20,
        maxHp: isElite ? 50 : 20,
        isElite: isElite,
        score: isElite ? 100 : 20,
        fireRate: isElite ? 2000 : 3000,
        lastFire: Date.now()
    };

    game.enemies.push(enemy);
}

// 更新子弹
function updateBullets() {
    for (let i = game.bullets.length - 1; i >= 0; i--) {
        const bullet = game.bullets[i];
        bullet.y -= bullet.speed;

        // 超出屏幕则移除
        if (bullet.y < -bullet.height) {
            game.bullets.splice(i, 1);
        }
    }
}

// 更新敌机
function updateEnemies() {
    for (let i = game.enemies.length - 1; i >= 0; i--) {
        const enemy = game.enemies[i];
        enemy.y += enemy.speed;

        // 敌机射击（精英飞机）
        if (enemy.isElite && Date.now() - enemy.lastFire > enemy.fireRate) {
            fireEnemyBullet(enemy);
            enemy.lastFire = Date.now();
        }

        // 超出屏幕则移除
        if (enemy.y > game.height) {
            game.enemies.splice(i, 1);
            // 敌机逃脱扣血
            game.player.hp -= 10;
            game.player.hp = Math.max(0, game.player.hp);
        }
    }
}

// 敌机发射子弹
function fireEnemyBullet(enemy) {
    const bullet = {
        x: enemy.x + enemy.width / 2 - 5,
        y: enemy.y + enemy.height,
        width: 10,
        height: 20,
        speed: 6,
        damage: 10,
        isEnemy: true
    };
    game.bullets.push(bullet);
}

// 更新粒子特效
function updateParticles() {
    for (let i = game.particles.length - 1; i >= 0; i--) {
        const particle = game.particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.alpha -= 0.02;
        particle.size *= 0.95;

        if (particle.alpha <= 0) {
            game.particles.splice(i, 1);
        }
    }
}

// 碰撞检测
function checkCollisions() {
    // 子弹击中敌机
    for (let i = game.bullets.length - 1; i >= 0; i--) {
        const bullet = game.bullets[i];
        if (bullet.isEnemy) continue; // 跳过敌机子弹

        for (let j = game.enemies.length - 1; j >= 0; j--) {
            const enemy = game.enemies[j];
            if (isCollide(bullet, enemy)) {
                // 扣血
                enemy.hp -= bullet.damage;
                // 子弹消失
                game.bullets.splice(i, 1);

                // 击中特效
                createParticle(bullet.x + bullet.width/2, bullet.y + bullet.height/2, '#ff4757', 3);

                // 敌机血量为0则销毁
                if (enemy.hp <= 0) {
                    createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                    game.score += enemy.score;
                    game.enemies.splice(j, 1);
                    break;
                }
            }
        }
    }

    // 敌机子弹击中玩家
    if (!game.player.invulnerable) {
        for (let i = game.bullets.length - 1; i >= 0; i--) {
            const bullet = game.bullets[i];
            if (!bullet.isEnemy) continue;

            if (isCollide(bullet, game.player)) {
                game.bullets.splice(i, 1);
                game.player.hp -= bullet.damage;
                game.player.hp = Math.max(0, game.player.hp);
                // 玩家受伤无敌
                game.player.invulnerable = true;
                game.player.invulnerableTime = 1000; // 1秒无敌
                createExplosion(game.player.x + game.player.width/2, game.player.y + game.player.height/2);
                break;
            }
        }
    }

    // 玩家碰撞敌机
    if (!game.player.invulnerable) {
        for (let i = game.enemies.length - 1; i >= 0; i--) {
            const enemy = game.enemies[i];
            if (isCollide(game.player, enemy)) {
                game.player.hp -= 50;
                game.player.hp = Math.max(0, game.player.hp);
                game.player.invulnerable = true;
                game.player.invulnerableTime = 1000;
                createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                game.enemies.splice(i, 1);
                break;
            }
        }
    }
}

// 碰撞检测工具函数
function isCollide(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}

// 更新难度
function updateDifficulty(timestamp) {
    game.difficultyTimer += 16;
    // 每10秒提升难度
    if (game.difficultyTimer >= 10000) {
        game.enemySpawnRate = Math.max(800, game.enemySpawnRate - 100); // 最小生成间隔800ms
        game.difficultyTimer = 0;
    }
}

// 更新UI
function updateUI() {
    document.getElementById('score').textContent = game.score;
    document.getElementById('hpProgress').style.width = `${(game.player.hp / game.player.maxHp) * 100}%`;
}

// 游戏结束
function gameOver() {
    game.isRunning = false;
    // 更新最高分
    if (game.score > game.bestScore) {
        game.bestScore = game.score;
        localStorage.setItem('planeGameBestScore', game.bestScore);
        document.getElementById('bestScore').textContent = game.bestScore;
    }
    // 显示结束界面
    document.getElementById('finalScore').textContent = game.score;
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

// 渲染游戏
function renderGame() {
    // 绘制背景（星空效果）
    drawBackground();

    // 绘制玩家（放大后的飞机）
    drawPlayer();

    // 绘制子弹
    drawBullets();

    // 绘制敌机（飞机样式，替代方块）
    drawEnemies();

    // 绘制粒子特效
    drawParticles();

    // 绘制屏幕特效
    drawScreenEffect();
}

// 绘制背景（简易星空）
function drawBackground() {
    game.ctx.fillStyle = '#0f0f23';
    game.ctx.fillRect(0, 0, game.width, game.height);

    // 绘制星星
    game.ctx.fillStyle = '#fff';
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * game.width;
        const y = Math.random() * game.height;
        const size = Math.random() * 2;
        game.ctx.beginPath();
        game.ctx.arc(x, y, size, 0, Math.PI * 2);
        game.ctx.fill();
    }
}

// 绘制玩家（放大后的飞机，支持透明图片）
function drawPlayer() {
    const ctx = game.ctx;

    // 无敌状态闪烁
    if (game.player.invulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
        return;
    }

    if (game.player.img) {
        // 绘制透明图片（放大后尺寸80x80）
        ctx.drawImage(
            game.player.img,
            game.player.x,
            game.player.y,
            game.player.width,
            game.player.height
        );
    } else {
        // 图片加载失败则绘制渐变矩形（放大版）
        const gradient = ctx.createLinearGradient(
            game.player.x, game.player.y,
            game.player.x + game.player.width, game.player.y + game.player.height
        );
        gradient.addColorStop(0, '#3e92cc');
        gradient.addColorStop(1, '#5f27cd');
        ctx.fillStyle = gradient;
        ctx.fillRect(
            game.player.x,
            game.player.y,
            game.player.width,
            game.player.height
        );
        // 绘制轮廓
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            game.player.x,
            game.player.y,
            game.player.width,
            game.player.height
        );
    }
}

// 绘制子弹
function drawBullets() {
    const ctx = game.ctx;
    for (const bullet of game.bullets) {
        if (bullet.isEnemy) {
            // 敌机子弹（红色）
            ctx.fillStyle = '#ff4757';
        } else {
            // 玩家子弹（蓝色）
            ctx.fillStyle = '#3e92cc';
        }
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        // 子弹辉光
        ctx.shadowColor = bullet.isEnemy ? '#ff4757' : '#3e92cc';
        ctx.shadowBlur = 5;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        ctx.shadowBlur = 0;
    }
}

// 绘制敌机（核心修改：显示飞机图片，透明背景）
function drawEnemies() {
    const ctx = game.ctx;
    for (const enemy of game.enemies) {
        // 优先绘制飞机图片（透明背景）
        if (enemy.isElite) {
            // 精英敌机
            if (game.enemyImgs.elite) {
                // 绘制精英敌机图片（透明背景）
                ctx.drawImage(
                    game.enemyImgs.elite,
                    enemy.x,
                    enemy.y,
                    enemy.width,
                    enemy.height
                );
            } else {
                // 图片加载失败，绘制兜底方块
                const gradient = ctx.createLinearGradient(
                    enemy.x, enemy.y,
                    enemy.x + enemy.width, enemy.y + enemy.height
                );
                gradient.addColorStop(0, '#6c5ce7');
                gradient.addColorStop(1, '#a29bfe');
                ctx.fillStyle = gradient;
                ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
                // 双层轮廓
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 3;
                ctx.strokeRect(enemy.x - 2, enemy.y - 2, enemy.width + 4, enemy.height + 4);
                ctx.strokeStyle = '#ff6bff';
                ctx.lineWidth = 1;
                ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height);
            }
        } else {
            // 普通敌机
            if (game.enemyImgs.normal) {
                // 绘制普通敌机图片（透明背景）
                ctx.drawImage(
                    game.enemyImgs.normal,
                    enemy.x,
                    enemy.y,
                    enemy.width,
                    enemy.height
                );
            } else {
                // 图片加载失败，绘制兜底方块
                const gradient = ctx.createLinearGradient(
                    enemy.x, enemy.y,
                    enemy.x + enemy.width, enemy.y + enemy.height
                );
                gradient.addColorStop(0, '#636e72');
                gradient.addColorStop(1, '#b2bec3');
                ctx.fillStyle = gradient;
                ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
                // 单层轮廓
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height);
            }
        }

        // 绘制敌机血量条（适配飞机/方块）
        ctx.fillStyle = '#333';
        ctx.fillRect(enemy.x, enemy.y - 5, enemy.width, 3);
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(enemy.x, enemy.y - 5, (enemy.hp / enemy.maxHp) * enemy.width, 3);
    }
}

// 绘制粒子特效
function drawParticles() {
    const ctx = game.ctx;
    for (const particle of game.particles) {
        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 绘制屏幕特效
function drawScreenEffect() {
    // 技能释放时的全屏渐变
    if (Date.now() - game.lastSkillUse < 1000) {
        game.ctx.save();
        game.ctx.fillStyle = 'rgba(95, 39, 205, 0.2)';
        game.ctx.fillRect(0, 0, game.width, game.height);
        game.ctx.restore();
    }
}

// 创建粒子
function createParticle(x, y, color, size) {
    const particle = {
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        size: size || 3,
        color: color || '#fff',
        alpha: 1
    };
    game.particles.push(particle);
}

// 创建爆炸特效
function createExplosion(x, y) {
    // 生成多个粒子
    for (let i = 0; i < 30; i++) {
        createParticle(x, y, `hsl(${Math.random() * 60 + 270}, 100%, 60%)`, Math.random() * 5 + 2);
    }
    // 屏幕轻微震动
    game.canvas.style.transform = 'translate(2px, 2px)';
    setTimeout(() => {
        game.canvas.style.transform = 'translate(0, 0)';
    }, 50);
}

// 创建屏幕特效（技能释放）
function createScreenEffect() {
    // 生成全屏粒子
    for (let i = 0; i < 100; i++) {
        createParticle(
            Math.random() * game.width,
            Math.random() * game.height,
            '#ff6bff',
            Math.random() * 4 + 1
        );
    }
}

// 初始化游戏
window.onload = initGame;