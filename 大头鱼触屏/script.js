// 1. 获取DOM元素和初始化Canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// Canvas尺寸（固定基础尺寸，移动端通过CSS缩放）
canvas.width = 600;
canvas.height = 400;

// 2. 游戏参数配置
const gameParams = {
    fish: {
        x: canvas.width / 2,    // 鱼头x坐标
        y: canvas.height / 2,   // 鱼头y坐标
        width: 60,              // 鱼头宽度（半椭圆长轴）
        height: 40,             // 鱼头高度（半椭圆短轴）
        speed: 5,               // 移动速度
        angle: 0                // 鱼头朝向角度（弧度制）
    },
    block: {
        x: 0,
        y: 0,
        size: 30,               // 方块尺寸
        color: '#ff5722'        // 方块颜色
    },
    score: 0,
    // 触屏相关参数
    touch: {
        isTouching: false,      // 是否正在触摸
        touchX: 0,              // 触摸点的x坐标（Canvas坐标系）
        touchY: 0               // 触摸点的y坐标（Canvas坐标系）
    }
};

// 3. 生成随机方块
function spawnBlock() {
    // 避免方块出现在边界（留一定间距）
    gameParams.block.x = Math.random() * (canvas.width - gameParams.block.size * 2) + gameParams.block.size;
    gameParams.block.y = Math.random() * (canvas.height - gameParams.block.size * 2) + gameParams.block.size;
}

// 4. 计算鱼头背向方块的角度
function calculateAngleToBlock() {
    const { fish, block } = gameParams;
    const dx = block.x - fish.x;
    const dy = block.y - fish.y;
    // 背向方块：朝向角度+π（180°）
    fish.angle = Math.atan2(dy, dx) + Math.PI;
}

// 5. 转换触摸坐标到Canvas坐标系（解决Canvas缩放后坐标偏移问题）
function getCanvasTouchPos(touchEvent) {
    const rect = canvas.getBoundingClientRect(); // 获取Canvas的位置和尺寸
    return {
        x: (touchEvent.clientX - rect.left) * (canvas.width / rect.width),
        y: (touchEvent.clientY - rect.top) * (canvas.height / rect.height)
    };
}

// 6. 绑定触屏事件（核心：适配苹果手机触屏）
function bindTouchEvents() {
    // 触摸开始（手指按下）
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault(); // 阻止默认行为（如页面滚动、缩放）
        const touchPos = getCanvasTouchPos(e.touches[0]);
        gameParams.touch.isTouching = true;
        gameParams.touch.touchX = touchPos.x;
        gameParams.touch.touchY = touchPos.y;
    });

    // 触摸移动（手指滑动）
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (gameParams.touch.isTouching) {
            const touchPos = getCanvasTouchPos(e.touches[0]);
            gameParams.touch.touchX = touchPos.x;
            gameParams.touch.touchY = touchPos.y;
        }
    });

    // 触摸结束（手指抬起）
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        gameParams.touch.isTouching = false;
    });

    // 触摸取消（如手指移出屏幕）
    canvas.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        gameParams.touch.isTouching = false;
    });

    // 兼容鼠标操作（电脑端测试用）
    canvas.addEventListener('mousedown', (e) => {
        const touchPos = getCanvasTouchPos(e);
        gameParams.touch.isTouching = true;
        gameParams.touch.touchX = touchPos.x;
        gameParams.touch.touchY = touchPos.y;
    });

    canvas.addEventListener('mousemove', (e) => {
        if (gameParams.touch.isTouching) {
            const touchPos = getCanvasTouchPos(e);
            gameParams.touch.touchX = touchPos.x;
            gameParams.touch.touchY = touchPos.y;
        }
    });

    canvas.addEventListener('mouseup', () => {
        gameParams.touch.isTouching = false;
    });

    canvas.addEventListener('mouseleave', () => {
        gameParams.touch.isTouching = false;
    });
}

// 7. 绘制半椭圆形鱼头
function drawFish() {
    const { x, y, width, height, angle } = gameParams.fish;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // 绘制半椭圆轮廓
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(0, -height / 2);
    ctx.quadraticCurveTo(-width, 0, 0, height / 2);
    ctx.closePath();

    // 渐变填充
    const fishGradient = ctx.createLinearGradient(-width, -height / 2, 0, 0);
    fishGradient.addColorStop(0, '#4fc3f7');
    fishGradient.addColorStop(1, '#0288d1');
    ctx.fillStyle = fishGradient;
    ctx.fill();

    // 轮廓线
    ctx.strokeStyle = '#01579b';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 鱼眼
    const eyeSize = height / 5;
    const eyeX = -width / 2;
    const eyeY = -height / 4;

    // 眼白
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeSize, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.stroke();

    // 眼珠
    ctx.beginPath();
    ctx.arc(eyeX - eyeSize / 3, eyeY, eyeSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    // 鱼嘴
    ctx.beginPath();
    ctx.arc(-width / 3, height / 4, eyeSize / 1.5, 0, Math.PI / 2);
    ctx.strokeStyle = '#01579b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
}

// 8. 绘制方块
function drawBlock() {
    const { x, y, size, color } = gameParams.block;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, size, size);
    // 渐变填充
    const blockGradient = ctx.createLinearGradient(x, y, x + size, y + size);
    blockGradient.addColorStop(0, color);
    blockGradient.addColorStop(1, '#e64a19');
    ctx.fillStyle = blockGradient;
    ctx.fill();
    // 轮廓线
    ctx.strokeStyle = '#bf360c';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
}

// 9. 碰撞检测
function checkCollisions() {
    const { fish, block } = gameParams;

    // 鱼头碰撞盒
    const fishRect = {
        x: fish.x - fish.width / 2,
        y: fish.y - fish.height / 2,
        width: fish.width,
        height: fish.height
    };
    const blockRect = {
        x: block.x,
        y: block.y,
        width: block.size,
        height: block.size
    };

    // 鱼头与方块碰撞
    if (
        fishRect.x < blockRect.x + blockRect.width &&
        fishRect.x + fishRect.width > blockRect.x &&
        fishRect.y < blockRect.y + blockRect.height &&
        fishRect.y + fishRect.height > blockRect.y
    ) {
        gameParams.score += 10;
        scoreElement.textContent = gameParams.score;
        spawnBlock();
    }

    // 鱼头与边界碰撞（游戏结束）
    if (
        fish.x - fish.width / 2 < 0 ||
        fish.x + fish.width / 2 > canvas.width ||
        fish.y - fish.height / 2 < 0 ||
        fish.y + fish.height / 2 > canvas.height
    ) {
        // 适配移动端的提示（使用alert，或自定义弹窗）
        alert(`游戏结束！你的分数：${gameParams.score}`);
        resetGame();
    }
}

// 10. 重置游戏
function resetGame() {
    gameParams.fish.x = canvas.width / 2;
    gameParams.fish.y = canvas.height / 2;
    gameParams.fish.angle = 0;
    gameParams.score = 0;
    scoreElement.textContent = 0;
    spawnBlock();
}

// 11. 更新游戏状态（触屏控制移动）
function updateGame() {
    const { fish, touch } = gameParams;

    // 实时计算鱼头背向方块的角度
    calculateAngleToBlock();

    // 触屏控制：如果正在触摸，鱼头向触摸点移动
    if (touch.isTouching) {
        // 计算鱼头到触摸点的差值
        const dx = touch.touchX - fish.x;
        const dy = touch.touchY - fish.y;
        // 计算移动的单位向量（避免斜向移动速度更快）
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > fish.speed) { // 只有当距离大于速度时才移动，避免抖动
            fish.x += (dx / distance) * fish.speed;
            fish.y += (dy / distance) * fish.speed;
        } else {
            // 距离过近时直接移动到触摸点，避免抖动
            fish.x = touch.touchX;
            fish.y = touch.touchY;
        }
    }

    // 限制鱼头在Canvas内（额外防护，避免越界）
    fish.x = Math.max(fish.width / 2, Math.min(canvas.width - fish.width / 2, fish.x));
    fish.y = Math.max(fish.height / 2, Math.min(canvas.height - fish.height / 2, fish.y));
}

// 12. 游戏主循环
function gameLoop() {
    // 清空画布
    ctx.fillStyle = 'rgba(240, 249, 255, 0.95)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    updateGame();
    checkCollisions();
    drawFish();
    drawBlock();

    requestAnimationFrame(gameLoop);
}

// 13. 初始化游戏
bindTouchEvents(); // 绑定触屏事件
spawnBlock();
gameLoop();