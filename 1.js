// game.js
// 微信小游戏 - AI剧本杀示例，支持健康值显示、字体居中、返回主页按钮与API容错重试

const GameState = {
  MENU: 0,
  PLAYING: 1
};

let currentState = GameState.MENU;
const stars = [];
const menuOptions = [
  { text: "冒险森林", color: "#4CAF50", scene: "森林" },
  { text: "荒岛求生", color: "#FF9800", scene: "荒岛" },
  { text: "末日生存", color: "#F44336", scene: "末日" }
];

let currentSceneDescription = "";
let currentOptions = [];
let health = 100; // 当前健康值

// 最大重试次数
const MAX_RETRIES = 3;

// 创建 Canvas 与 Context
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// 适配屏幕宽高
canvas.width = wx.getSystemInfoSync().windowWidth;
canvas.height = wx.getSystemInfoSync().windowHeight;

function initStars() {
  stars.length = 0;
  for (let i = 0; i < 100; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 3,
      speed: Math.random() * 2 + 1
    });
  }
}

function drawBackground() {
  ctx.fillStyle = '#0a0a2a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'white';
  stars.forEach(star => {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
    star.y += star.speed;
    if (star.y > canvas.height) {
      star.y = 0;
      star.x = Math.random() * canvas.width;
    }
  });
}

function drawRoundRect(x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawMenu() {
  const optionHeight = 80;
  const spacing = 30;
  const startY = canvas.height / 2 - (optionHeight * menuOptions.length + spacing * (menuOptions.length - 1)) / 2;
  menuOptions.forEach((option, index) => {
    const y = startY + (optionHeight + spacing) * index;
    ctx.fillStyle = option.color + 'CC';
    drawRoundRect(canvas.width / 2 - 150, y, 300, optionHeight, 15);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(option.text, canvas.width / 2, y + optionHeight / 2);
  });
}

function drawPlaying() {
  // 背景框
  ctx.fillStyle = '#222244AA';
  drawRoundRect(50, 50, canvas.width - 100, canvas.height - 100, 20);
  ctx.fill();

  // 返回主页按钮
  const btnW = 100, btnH = 40;
  ctx.fillStyle = '#3333AA';
  drawRoundRect(20, 20, btnW, btnH, 8);
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('返回主页', 20 + btnW / 2, 20 + btnH / 2);

  // 健康值显示
  ctx.fillStyle = 'white';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`❤️ 健康：${health}/100`, 70, 60);

  // 场景描述
  ctx.font = '18px Arial';
  ctx.textAlign = 'left';
  const lines = wrapText(currentSceneDescription, canvas.width - 140);
  lines.forEach((line, idx) => {
    ctx.fillText(line, 70, 100 + idx * 24);
  });

  // 选项按钮
  currentOptions.forEach((opt, i) => {
    const oy = 200 + i * 60;
    ctx.fillStyle = '#5555AA';
    drawRoundRect(70, oy, canvas.width - 140, 50, 10);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = '18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${i + 1}. ${opt}`, canvas.width / 2, oy + 25);
  });
}

function wrapText(text, maxWidth) {
  const words = text.split(' ');
  let lines = [];
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line);
  return lines;
}

function mainLoop() {
  drawBackground();
  if (currentState === GameState.MENU) drawMenu();
  else if (currentState === GameState.PLAYING) drawPlaying();
  requestAnimationFrame(mainLoop);
}

/**
 * 调用AI并处理重试
 * @param {string} scene 剧本场景名
 * @param {string} userChoice 用户选择文本
 * @param {number} [retryCount] 已重试次数
 */
function callAI(scene, userChoice, retryCount = 0) {
  const prompt = `你是一个文字冒险引擎。场景：${scene}。\n玩家选择：${userChoice || '开始'}。\n请生成一段简短描述和5个选项，用中文句子。`;
  wx.request({
    url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer 4b12ed21-a0cb-4a3c-ac62-b51b6351b310'
    },
    data: {
      model: 'deepseek-v3-250324',
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }]
    },
    success(res) {
      if (!res.data || !res.data.choices || !res.data.choices.length) {
        return handleRetry(scene, userChoice, retryCount);
      }
      const text = res.data.choices[0].message.content;
      const parts = text.split(/\d\./);
      currentSceneDescription = parts[0].trim();
      currentOptions = parts.slice(1).map(s => s.trim()).filter(s => s);
    },
    fail(err) {
      console.error('API调用错误：', err);
      handleRetry(scene, userChoice, retryCount);
    }
  });
}

function handleRetry(scene, userChoice, retryCount) {
  if (retryCount < MAX_RETRIES) {
    console.log(`重试第 ${retryCount + 1} 次...`);
    setTimeout(() => callAI(scene, userChoice, retryCount + 1), 1000 * (retryCount + 1));
  } else {
    currentSceneDescription = '多次调用失败，请检查网络或稍后再试。';
    currentOptions = ['返回主页'];
  }
}

// 初始化
initStars();
mainLoop();

// 触摸事件绑定
canvas.addEventListener('touchstart', e => {
  const touch = e.touches[0];
  const x = touch.clientX;
  const y = touch.clientY;

  if (currentState === GameState.MENU) {
    const optionHeight = 80;
    const spacing = 30;
    const startY = canvas.height / 2 - (optionHeight * menuOptions.length + spacing * (menuOptions.length - 1)) / 2;
    menuOptions.forEach((option, index) => {
      const oy = startY + (optionHeight + spacing) * index;
      if (x > canvas.width / 2 - 150 && x < canvas.width / 2 + 150 && y > oy && y < oy + optionHeight) {
        currentState = GameState.PLAYING;
        callAI(option.scene);
      }
    });
  } else if (currentState === GameState.PLAYING) {
    // 检查返回主页按钮
    if (x > 20 && x < 120 && y > 20 && y < 60) {
      currentState = GameState.MENU;
      return;
    }
    // 处理选项
    currentOptions.forEach((opt, i) => {
      const oy = 200 + i * 60;
      if (x > 70 && x < canvas.width - 70 && y > oy && y < oy + 50) {
        if (opt === '返回主页') {
          currentState = GameState.MENU;
        } else {
          callAI('游戏进行中', opt);
        }
      }
    });
  }
});
