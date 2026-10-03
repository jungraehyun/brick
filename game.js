const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const speedEl = document.getElementById("speed");
const waveEl = document.getElementById("wave");
const statusEl = document.getElementById("status");

const titleScreen = document.getElementById("titleScreen");
const gameOverScreen = document.getElementById("gameOverScreen");

const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const finalScoreEl = document.getElementById("finalScore");

const W = canvas.width;
const H = canvas.height;

const STATE = {
  TITLE: "TITLE",
  PLAYING: "PLAYING",
  GAME_OVER: "GAME_OVER"
};

let state = STATE.TITLE;

let score = 0;
let best = Number(localStorage.getItem("neonBreakerBest")) || 0;
let wave = 1;
let bricksDestroyed = 0;

let lastTime = 0;
let shake = 0;

bestEl.textContent = best;

const keys = {
  left: false,
  right: false
};

const paddle = {
  x: W / 2 - 75,
  y: H - 55,
  width: 150,
  height: 14,
  speed: 900
};

const ball = {
  x: W / 2,
  y: H - 90,
  r: 8,
  speed: 600,
  baseSpeed: 600,
  maxSpeed: 1100,
  vx: 0,
  vy: 0
};

const particles = [];
const stars = [];

const brickConfig = {
  cols: 12,
  rows: 7,
  width: 76,
  height: 25,
  gap: 8,
  top: 85
};

let bricks = [];

for (let i = 0; i < 100; i++) {
  stars.push({
    x: Math.random() * W,
    y: Math.random() * H,
    size: Math.random() * 2 + 0.4,
    alpha: Math.random() * 0.7 + 0.2,
    speed: Math.random() * 0.4 + 0.1
  });
}

function resetBall() {
  ball.x = W / 2;
  ball.y = H - 90;

  ball.speed = Math.min(
    ball.baseSpeed + (wave - 1) * 45,
    ball.maxSpeed
  );

  const angle = (Math.random() * 0.8 - 0.4);

  ball.vx = ball.speed * angle;
  ball.vy = -Math.sqrt(
    ball.speed * ball.speed -
    ball.vx * ball.vx
  );
}

function createBricks() {
  bricks = [];

  const totalWidth =
    brickConfig.cols * brickConfig.width +
    (brickConfig.cols - 1) * brickConfig.gap;

  const startX = (W - totalWidth) / 2;

  for (let row = 0; row < brickConfig.rows; row++) {
    for (let col = 0; col < brickConfig.cols; col++) {

      let type = "normal";

      const random = Math.random();

      if (random < 0.06) {
        type = "rare";
      } else if (random < 0.16) {
        type = "special";
      }

      bricks.push({
        x: startX + col * (brickConfig.width + brickConfig.gap),
        y: brickConfig.top + row * (brickConfig.height + brickConfig.gap),
        width: brickConfig.width,
        height: brickConfig.height,
        type,
        alive: true
      });
    }
  }
}

function startGame() {
  score = 0;
  wave = 1;
  bricksDestroyed = 0;

  paddle.x = W / 2 - paddle.width / 2;

  createBricks();
  resetBall();

  state = STATE.PLAYING;

  titleScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");

  updateHUD();
}

function endGame() {
  state = STATE.GAME_OVER;

  if (score > best) {
    best = score;
    localStorage.setItem("neonBreakerBest", best);
  }

  finalScoreEl.textContent = score;
  bestEl.textContent = best;

  statusEl.textContent = "GAME OVER";

  gameOverScreen.classList.remove("hidden");
}

function nextWave() {
  wave++;

  score += 500 + wave * 100;

  createBricks();
  resetBall();

  shake = 12;

  for (let i = 0; i < 50; i++) {
    createParticle(
      W / 2,
      H / 2,
      "#00eaff"
    );
  }
}

function destroyBrick(brick, causeExplosion = false) {
  if (!brick.alive) return;

  brick.alive = false;
  bricksDestroyed++;

  if (causeExplosion) {
    score += 10;
  } else {
    score += 25;
  }

  accelerateBall();

  for (let i = 0; i < 10; i++) {
    createParticle(
      brick.x + brick.width / 2,
      brick.y + brick.height / 2,
      getBrickColor(brick)
    );
  }

  if (brick.type === "special") {
    explode(brick, 1, 100);
  }

  if (brick.type === "rare") {
    explode(brick, 2, 300);
  }

  shake = Math.max(shake, 4);
}

function explode(source, radius, bonus) {
  score += bonus;

  const centerX = source.x + source.width / 2;
  const centerY = source.y + source.height / 2;

  for (const brick of bricks) {
    if (!brick.alive || brick === source) continue;

    const bx = brick.x + brick.width / 2;
    const by = brick.y + brick.height / 2;

    const dx = Math.abs(bx - centerX);
    const dy = Math.abs(by - centerY);

    const maxDistance =
      radius * (brickConfig.width + brickConfig.gap);

    if (dx <= maxDistance && dy <= maxDistance) {
      destroyBrick(brick, true);
    }
  }

  createExplosionParticles(centerX, centerY, radius);

  shake = Math.max(shake, radius === 2 ? 16 : 9);
}

function accelerateBall() {
  ball.speed = Math.min(
    ball.speed * 1.006,
    ball.maxSpeed
  );

  const length = Math.sqrt(
    ball.vx * ball.vx +
    ball.vy * ball.vy
  );

  if (length === 0) return;

  ball.vx = (ball.vx / length) * ball.speed;
  ball.vy = (ball.vy / length) * ball.speed;
}

function getBrickColor(brick) {
  if (brick.type === "rare") return "#ff2bd6";
  if (brick.type === "special") return "#ffe600";

  const colors = [
    "#00eaff",
    "#008cff",
    "#7b5cff",
    "#00ffc8",
    "#1aff72"
  ];

  return colors[Math.floor(brick.y / 45) % colors.length];
}

function createParticle(x, y, color) {
  particles.push({
    x,
    y,
    vx: (Math.random() - 0.5) * 500,
    vy: (Math.random() - 0.5) * 500,
    life: 0.5 + Math.random() * 0.5,
    maxLife: 1,
    size: Math.random() * 4 + 1,
    color
  });
}

function createExplosionParticles(x, y, radius) {
  const count = radius === 2 ? 80 : 35;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 500 + 100;

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.7 + Math.random() * 0.7,
      maxLife: 1.2,
      size: Math.random() * 5 + 2,
      color: radius === 2 ? "#ff2bd6" : "#ffe600"
    });
  }
}

function update(dt) {
  if (state !== STATE.PLAYING) {
    updateParticles(dt);
    return;
  }

  movePaddle(dt);

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  shake *= 0.88;

  updateParticles(dt);

  for (const star of stars) {
    star.y += star.speed * dt * 20;

    if (star.y > H) {
      star.y = 0;
      star.x = Math.random() * W;
    }
  }

  handleWallCollision();
  handlePaddleCollision();
  handleBrickCollision();

  if (ball.y - ball.r > H) {
    endGame();
  }

  if (bricks.length > 0 && bricks.every(brick => !brick.alive)) {
    nextWave();
  }

  updateHUD();
}

function movePaddle(dt) {
  if (keys.left) {
    paddle.x -= paddle.speed * dt;
  }

  if (keys.right) {
    paddle.x += paddle.speed * dt;
  }

  paddle.x = Math.max(
    0,
    Math.min(W - paddle.width, paddle.x)
  );
}

function handleWallCollision() {
  if (ball.x - ball.r <= 0) {
    ball.x = ball.r;
    ball.vx *= -1;
  }

  if (ball.x + ball.r >= W) {
    ball.x = W - ball.r;
    ball.vx *= -1;
  }

  if (ball.y - ball.r <= 0) {
    ball.y = ball.r;
    ball.vy *= -1;
  }
}

function handlePaddleCollision() {
  const hit =
    ball.x + ball.r > paddle.x &&
    ball.x - ball.r < paddle.x + paddle.width &&
    ball.y + ball.r > paddle.y &&
    ball.y - ball.r < paddle.y + paddle.height &&
    ball.vy > 0;

  if (!hit) return;

  ball.y = paddle.y - ball.r;

  const relative =
    (ball.x - (paddle.x + paddle.width / 2)) /
    (paddle.width / 2);

  const maxAngle = Math.PI * 0.43;
  const angle = relative * maxAngle;

  ball.vx = Math.sin(angle) * ball.speed;
  ball.vy = -Math.cos(angle) * ball.speed;
}

function handleBrickCollision() {
  for (const brick of bricks) {
    if (!brick.alive) continue;

    const closestX = Math.max(
      brick.x,
      Math.min(ball.x, brick.x + brick.width)
    );

    const closestY = Math.max(
      brick.y,
      Math.min(ball.y, brick.y + brick.height)
    );

    const dx = ball.x - closestX;
    const dy = ball.y - closestY;

    if (dx * dx + dy * dy <= ball.r * ball.r) {

      const overlapLeft =
        Math.abs((ball.x + ball.r) - brick.x);

      const overlapRight =
        Math.abs((brick.x + brick.width) - (ball.x - ball.r));

      const overlapTop =
        Math.abs((ball.y + ball.r) - brick.y);

      const overlapBottom =
        Math.abs((brick.y + brick.height) - (ball.y - ball.r));

      const minHorizontal =
        Math.min(overlapLeft, overlapRight);

      const minVertical =
        Math.min(overlapTop, overlapBottom);

      if (minHorizontal < minVertical) {
        ball.vx *= -1;
      } else {
        ball.vy *= -1;
      }

      destroyBrick(brick);

      break;
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    p.vx *= 0.97;
    p.vy *= 0.97;

    p.life -= dt;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function draw() {
  ctx.save();

  if (shake > 0) {
    ctx.translate(
      (Math.random() - 0.5) * shake,
      (Math.random() - 0.5) * shake
    );
  }

  drawBackground();
  drawBricks();
  drawPaddle();
  drawBall();
  drawParticles();

  ctx.restore();
}

function drawBackground() {
  ctx.fillStyle = "#030711";
  ctx.fillRect(0, 0, W, H);

  const gradient = ctx.createRadialGradient(
    W / 2,
    H / 2,
    50,
    W / 2,
    H / 2,
    700
  );

  gradient.addColorStop(0, "rgba(0, 234, 255, 0.06)");
  gradient.addColorStop(0.5, "rgba(50, 30, 120, 0.03)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  drawGrid();
  drawStars();
}

function drawGrid() {
  ctx.save();

  ctx.strokeStyle = "rgba(0, 234, 255, 0.035)";
  ctx.lineWidth = 1;

  const size = 50;

  for (let x = 0; x <= W; x += size) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  for (let y = 0; y <= H; y += size) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawStars() {
  for (const star of stars) {
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = "#ffffff";

    ctx.beginPath();
    ctx.arc(
      star.x,
      star.y,
      star.size,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

function drawBricks() {
  for (const brick of bricks) {
    if (!brick.alive) continue;

    const color = getBrickColor(brick);

    ctx.save();

    ctx.shadowColor = color;
    ctx.shadowBlur =
      brick.type === "rare"
        ? 20
        : brick.type === "special"
          ? 16
          : 9;

    ctx.fillStyle = color;

    ctx.fillRect(
      brick.x,
      brick.y,
      brick.width,
      brick.height
    );

    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(255,255,255,0.16)";

    ctx.fillRect(
      brick.x + 2,
      brick.y + 2,
      brick.width - 4,
      4
    );

    if (brick.type !== "normal") {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;

      ctx.strokeRect(
        brick.x + 4,
        brick.y + 4,
        brick.width - 8,
        brick.height - 8
      );

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px Orbitron";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillText(
        brick.type === "rare" ? "5×5" : "3×3",
        brick.x + brick.width / 2,
        brick.y + brick.height / 2 + 1
      );
    }

    ctx.restore();
  }
}

function drawPaddle() {
  ctx.save();

  const gradient = ctx.createLinearGradient(
    paddle.x,
    paddle.y,
    paddle.x + paddle.width,
    paddle.y
  );

  gradient.addColorStop(0, "#00eaff");
  gradient.addColorStop(0.5, "#ffffff");
  gradient.addColorStop(1, "#ff2bd6");

  ctx.shadowColor = "#00eaff";
  ctx.shadowBlur = 22;

  ctx.fillStyle = gradient;

  ctx.fillRect(
    paddle.x,
    paddle.y,
    paddle.width,
    paddle.height
  );

  ctx.restore();
}

function drawBall() {
  ctx.save();

  const speedRatio =
    ball.speed / ball.maxSpeed;

  const trailLength =
    18 + speedRatio * 35;

  for (let i = 0; i < trailLength; i += 5) {
    const alpha =
      (1 - i / trailLength) * 0.25;

    ctx.globalAlpha = alpha;

    ctx.fillStyle = "#00eaff";

    ctx.beginPath();

    ctx.arc(
      ball.x - ball.vx * i / ball.speed * 0.35,
      ball.y - ball.vy * i / ball.speed * 0.35,
      ball.r * (1 - i / trailLength * 0.5),
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  ctx.globalAlpha = 1;

  ctx.shadowColor = "#ffffff";
  ctx.shadowBlur = 25;

  const gradient = ctx.createRadialGradient(
    ball.x - 2,
    ball.y - 2,
    1,
    ball.x,
    ball.y,
    ball.r * 2
  );

  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.35, "#00eaff");
  gradient.addColorStop(1, "#007bff");

  ctx.fillStyle = gradient;

  ctx.beginPath();
  ctx.arc(
    ball.x,
    ball.y,
    ball.r,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.restore();
}

function drawParticles() {
  for (const p of particles) {
    ctx.save();

    ctx.globalAlpha =
      Math.max(0, p.life / p.maxLife);

    ctx.fillStyle = p.color;

    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;

    ctx.beginPath();

    ctx.arc(
      p.x,
      p.y,
      p.size,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
  }
}

function updateHUD() {
  scoreEl.textContent = score;
  bestEl.textContent = best;

  speedEl.textContent =
    (ball.speed / ball.baseSpeed).toFixed(2) + "x";

  waveEl.textContent = wave;

  if (state === STATE.PLAYING) {
    statusEl.textContent = "ONLINE";
  }
}

function gameLoop(timestamp) {
  if (!lastTime) {
    lastTime = timestamp;
  }

  let dt =
    (timestamp - lastTime) / 1000;

  lastTime = timestamp;

  dt = Math.min(dt, 0.033);

  update(dt);
  draw();

  requestAnimationFrame(gameLoop);
}

function handleKeyDown(e) {
  if (
    e.code === "ArrowLeft" ||
    e.code === "KeyA"
  ) {
    keys.left = true;
    e.preventDefault();
  }

  if (
    e.code === "ArrowRight" ||
    e.code === "KeyD"
  ) {
    keys.right = true;
    e.preventDefault();
  }

  if (e.code === "Space") {
    e.preventDefault();

    if (state === STATE.TITLE) {
      startGame();
    } else if (state === STATE.GAME_OVER) {
      startGame();
    }
  }
}

function handleKeyUp(e) {
  if (
    e.code === "ArrowLeft" ||
    e.code === "KeyA"
  ) {
    keys.left = false;
  }

  if (
    e.code === "ArrowRight" ||
    e.code === "KeyD"
  ) {
    keys.right = false;
  }
}

startButton.addEventListener(
  "click",
  startGame
);

restartButton.addEventListener(
  "click",
  startGame
);

window.addEventListener(
  "keydown",
  handleKeyDown
);

window.addEventListener(
  "keyup",
  handleKeyUp
);

createBricks();
updateHUD();

requestAnimationFrame(gameLoop);