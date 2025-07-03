Page({
  onReady() {
    const query = wx.createSelectorQuery().in(this)
    query.select('#gameCanvas').fields({ node: true, size: true }).exec(res => {
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')

      const GameState = {
        MENU: 0,
        PLAYING: 1
      }
      let currentState = GameState.MENU
      const stars = []
      const menuOptions = [
        { text: '冒险森林', color: '#4CAF50', scene: '森林' },
        { text: '荒岛求生', color: '#FF9800', scene: '荒岛' },
        { text: '末日生存', color: '#F44336', scene: '末日' }
      ]
      let currentSceneDescription = ''
      let currentOptions = []

      canvas.width = res[0].width
      canvas.height = res[0].height

      function initStars() {
        for (let i = 0; i < 100; i++) {
          stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 3,
            speed: Math.random() * 2 + 1
          })
        }
      }

      function drawBackground() {
        ctx.fillStyle = '#0a0a2a'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        ctx.fillStyle = 'white'
        stars.forEach(star => {
          ctx.beginPath()
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
          ctx.fill()
          star.y += star.speed
          if (star.y > canvas.height) {
            star.y = 0
            star.x = Math.random() * canvas.width
          }
        })
      }

      function drawRoundRect(x, y, w, h, r) {
        if (w < 2 * r) r = w / 2
        if (h < 2 * r) r = h / 2
        ctx.beginPath()
        ctx.moveTo(x + r, y)
        ctx.arcTo(x + w, y, x + w, y + h, r)
        ctx.arcTo(x + w, y + h, x, y + h, r)
        ctx.arcTo(x, y + h, x, y, r)
        ctx.arcTo(x, y, x + w, y, r)
        ctx.closePath()
      }

      function drawMenu() {
        const optionHeight = 80
        const spacing = 30
        const startY = canvas.height / 2 - (optionHeight * menuOptions.length + spacing * (menuOptions.length - 1)) / 2

        menuOptions.forEach((option, index) => {
          const y = startY + (optionHeight + spacing) * index
          ctx.fillStyle = option.color + 'CC'
          drawRoundRect(canvas.width / 2 - 150, y, 300, optionHeight, 15)
          ctx.fill()

          ctx.fillStyle = 'white'
          ctx.font = 'bold 24px Arial'
          ctx.textAlign = 'center'
          ctx.fillText(option.text, canvas.width / 2, y + optionHeight / 2 + 10)
        })
      }

      function drawPlaying() {
        ctx.fillStyle = '#222244AA'
        drawRoundRect(50, 50, canvas.width - 100, canvas.height - 100, 20)
        ctx.fill()

        ctx.fillStyle = 'white'
        ctx.font = '20px Arial'
        ctx.textAlign = 'left'

        const lines = wrapText(currentSceneDescription, canvas.width - 140)
        lines.forEach((line, idx) => {
          ctx.fillText(line, 70, 80 + idx * 24)
        })

        currentOptions.forEach((opt, i) => {
          ctx.fillStyle = '#5555AA'
          drawRoundRect(70, 200 + i * 60, canvas.width - 140, 50, 10)
          ctx.fill()

          ctx.fillStyle = 'white'
          ctx.fillText(`${i + 1}. ${opt}`, 80, 230 + i * 60)
        })
      }

      function wrapText(text, maxWidth) {
        const words = text.split(' ')
        let lines = []
        let line = ''
        for (let n = 0; n < words.length; n++) {
          let testLine = line + words[n] + ' '
          let metrics = ctx.measureText(testLine)
          if (metrics.width > maxWidth && n > 0) {
            lines.push(line)
            line = words[n] + ' '
          } else {
            line = testLine
          }
        }
        lines.push(line)
        return lines
      }

      function mainLoop() {
        drawBackground()
        if (currentState === GameState.MENU) {
          drawMenu()
        } else if (currentState === GameState.PLAYING) {
          drawPlaying()
        }
        canvas.requestAnimationFrame(mainLoop)
      }

      function callAI(scene, userChoice) {
        const prompt = `你是一个文字冒险引擎。场景：${scene}。\n玩家选择：${userChoice || '开始'}。\n请生成一段简短描述和5个选项，用中文句子。`
        wx.request({
          url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer 4b12ed21-a0cb-4a3c-ac62-b51b6351b310'
          },
          data: {
            model: 'deepseek-v3-250324',
            messages: [{
              role: 'user',
              content: [{ type: 'text', text: prompt }]
            }]
          },
          success(res) {
            const text = res.data.choices[0].message.content
            const parts = text.split(/\d\./)
            currentSceneDescription = parts[0].trim()
            currentOptions = parts.slice(1).map(s => s.trim()).filter(s => s)
          },
          fail(err) {
            console.error('API调用错误：', err)
            currentSceneDescription = 'API调用错误，请重试。'
            currentOptions = []
          }
        })
      }

      canvas.addEventListener('touchstart', e => {
        const touch = e.touches[0]
        const x = touch.clientX
        const y = touch.clientY
        if (currentState === GameState.MENU) {
          const optionHeight = 80
          const spacing = 30
          const startY = canvas.height / 2 - (optionHeight * menuOptions.length + spacing * (menuOptions.length - 1)) / 2
          menuOptions.forEach((option, index) => {
            const oy = startY + (optionHeight + spacing) * index
            if (x > canvas.width / 2 - 150 && x < canvas.width / 2 + 150 && y > oy && y < oy + optionHeight) {
              currentState = GameState.PLAYING
              callAI(option.scene)
            }
          })
        } else if (currentState === GameState.PLAYING) {
          currentOptions.forEach((opt, i) => {
            const oy = 200 + i * 60
            if (x > 70 && x < canvas.width - 70 && y > oy && y < oy + 50) {
              callAI('游戏进行中', opt)
            }
          })
        }
      })

      initStars()
      mainLoop()
    })
  }
})
