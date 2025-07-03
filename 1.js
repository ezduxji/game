const GameState = {
  MENU: 0,
  PLAYING: 1,
  FAIL: 2
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

let optionRects = [];
let historyBtnRect = {x:70,y:0,w:80,h:40};
let health = 100;
const history = [];
let showHistory = false;
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

canvas.width = wx.getSystemInfoSync().windowWidth;
canvas.height = wx.getSystemInfoSync().windowHeight;

function initStars() {
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
  const startY = canvas.height/2 - (optionHeight * menuOptions.length + spacing * (menuOptions.length - 1)) / 2;

  menuOptions.forEach((option, index) => {
    const y = startY + (optionHeight + spacing) * index;

    ctx.fillStyle = option.color + 'CC';
    drawRoundRect(canvas.width/2 - 150, y, 300, optionHeight, 15);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(option.text, canvas.width/2, y + optionHeight/2 + 10);
  });
}

function drawPlaying() {
  ctx.fillStyle = '#222244AA';
  drawRoundRect(50, 50, canvas.width - 100, canvas.height - 100, 20);
  ctx.fill();

  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.textAlign = 'left';

  ctx.fillText(`HP: ${health}`, canvas.width - 150, 80);

  let y = 110;
  const lines = wrapText(currentSceneDescription, canvas.width - 140);
  lines.forEach(line => {
    ctx.fillText(line, 70, y);
    y += 24;
  });

  y += 20;
  optionRects = [];
  currentOptions.forEach((opt, i) => {
    const text = `${i + 1}. ${opt}`;
    const oLines = wrapText(text, canvas.width - 160);
    const h = oLines.length * 24 + 20;
    ctx.fillStyle = '#5555AA';
    drawRoundRect(70, y, canvas.width - 140, h, 10);
    ctx.fill();

    ctx.fillStyle = 'white';
    oLines.forEach((l, idx) => {
      ctx.fillText(l, 80, y + 20 + idx * 24);
    });
    optionRects.push({x:70,y:y,w:canvas.width-140,h:h});
    y += h + 10;
  });

  ctx.fillStyle = '#444';
  historyBtnRect.y = canvas.height - 80;
  drawRoundRect(historyBtnRect.x, historyBtnRect.y, historyBtnRect.w, historyBtnRect.h, 5);
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.fillText('历史', historyBtnRect.x + 20, historyBtnRect.y + 30);

  if (showHistory) {
    ctx.fillStyle = '#000000AA';
    drawRoundRect(60, 100, canvas.width - 120, canvas.height - 160, 10);
    ctx.fill();
    ctx.fillStyle = 'white';
    let hy = 130;
    const recent = history.slice(-10);
    recent.forEach(h => {
      const hs = wrapText(h, canvas.width - 140);
      hs.forEach(line => {
        ctx.fillText(line, 80, hy);
        hy += 24;
      });
      hy += 10;
    });
    ctx.fillStyle = '#555';
    drawRoundRect(canvas.width/2 - 40, canvas.height - 120, 80, 40, 5);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.fillText('关闭', canvas.width/2, canvas.height - 92);
  }
}

function drawFail() {
  ctx.fillStyle = '#222244AA';
  drawRoundRect(50, 50, canvas.width - 100, canvas.height - 100, 20);
  ctx.fill();

  ctx.fillStyle = 'white';
  ctx.font = '24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('游戏失败', canvas.width / 2, canvas.height / 2 - 20);

  ctx.fillStyle = '#AA3333';
  drawRoundRect(canvas.width / 2 - 80, canvas.height / 2 + 20, 160, 50, 10);
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.fillText('返回主菜单', canvas.width / 2, canvas.height / 2 + 55);
}

function wrapText(text, maxWidth) {
  let lines = [];
  let line = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const testLine = line + ch;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line !== "") {
      lines.push(line);
      line = ch;
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function mainLoop() {
  drawBackground();

  if (currentState === GameState.MENU) {
    drawMenu();
  } else if (currentState === GameState.PLAYING) {
    drawPlaying();
  } else if (currentState === GameState.FAIL) {
    drawFail();
  }

  requestAnimationFrame(mainLoop);
}

function callAI(scene, userChoice) {
  const prompt = `你是一个文字冒险引擎。场景：${scene}。\n玩家选择：${userChoice || '开始'}。\n请生成一段简短描述和5个选项，用中文句子。`;

  wx.request({
    url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
      // 注意这里加上 Bearer
      'Authorization': 'Bearer 4b12ed21-a0cb-4a3c-ac62-b51b6351b310'
    },
    data: {
      model: 'deepseek-v3-250324',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            }
          ]
        }
      ]
    },
    success(res) {
      console.log('API响应：', res);
      const text = res.data.choices[0].message.content;
      const parts = text.split(/\d\./);
      currentSceneDescription = parts[0].trim();
      history.push(currentSceneDescription);
      currentOptions = parts.slice(1).map(s => s.trim()).filter(s => s);
    },
    fail(err) {
      console.error('API调用错误：', err);
      currentSceneDescription = 'API调用错误，请重试。';
      currentOptions = [];
    }
  });
}

// 初始化
initStars();
mainLoop();

// 触摸事件绑定 (注意这里)
canvas.addEventListener('touchstart', e => {
  const touch = e.touches[0];
  const x = touch.clientX;
  const y = touch.clientY;

  if (currentState === GameState.MENU) {
    const optionHeight = 80;
    const spacing = 30;
    const startY = canvas.height/2 - (optionHeight * menuOptions.length + spacing * (menuOptions.length - 1)) / 2;

    menuOptions.forEach((option, index) => {
      const oy = startY + (optionHeight + spacing) * index;
      if (
        x > canvas.width/2 - 150 &&
        x < canvas.width/2 + 150 &&
        y > oy &&
        y < oy + optionHeight
      ) {
        currentState = GameState.PLAYING;
        health = 100;
        history.length = 0;
        callAI(option.scene);
      }
    });
  } else if (currentState === GameState.PLAYING) {
    if (showHistory) {
      showHistory = false;
      return;
    }

    if (
      x > historyBtnRect.x &&
      x < historyBtnRect.x + historyBtnRect.w &&
      y > historyBtnRect.y &&
      y < historyBtnRect.y + historyBtnRect.h
    ) {
      showHistory = true;
      return;
    }

    optionRects.forEach((rect, i) => {
      if (
        x > rect.x &&
        x < rect.x + rect.w &&
        y > rect.y &&
        y < rect.y + rect.h
      ) {
        health -= 10;
        if (health <= 0) {
          currentState = GameState.FAIL;
        } else {
          callAI('游戏进行中', currentOptions[i]);
        }
      }
    });
  } else if (currentState === GameState.FAIL) {
    const bx = canvas.width / 2 - 80;
    const by = canvas.height / 2 + 20;
    if (x > bx && x < bx + 160 && y > by && y < by + 50) {
      currentState = GameState.MENU;
      health = 100;
      history.length = 0;
    }
  }
});
