/**
 * ActivityEngine Core v1.0.0
 * Universal Educational Game & Activity Engine (Wordwall & LearningApps Mechanics)
 * Fully standalone, zero external dependencies.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ActivityEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // Global sound & particle singletons
  const sound = window.SoundSynth ? new window.SoundSynth() : { play: () => {}, toggle: () => true };
  const particles = window.ParticleEngine ? new window.ParticleEngine() : { confettiBurst: () => {}, floatingText: () => {} };

  class ActivityEngine {
    constructor(container, options = {}) {
      this.container = typeof container === 'string' ? document.querySelector(container) : container;
      if (!this.container) {
        throw new Error('ActivityEngine: Container element not found');
      }
      this.options = Object.assign({
        theme: 'default',
        sound: true,
        lives: null, // null for unlimited, or number (e.g. 3)
        timer: null, // { enabled: true, mode: 'countdown'|'countup', seconds: 120 }
        showStats: true,
        onComplete: null,
        onScore: null,
        onMistake: null,
      }, options);

      this.currentActivity = null;
      this.state = {
        score: 0,
        maxScore: 0,
        streak: 0,
        lives: 3,
        maxLives: 3,
        timerSeconds: 0,
        timerInterval: null,
        isCompleted: false,
        startTime: null,
        mistakes: 0,
      };

      this.eventListeners = {};
      this.initShell();
    }

    // Event Emitter API
    on(event, callback) {
      if (!this.eventListeners[event]) this.eventListeners[event] = [];
      this.eventListeners[event].push(callback);
      return this;
    }

    emit(event, data) {
      if (this.eventListeners[event]) {
        this.eventListeners[event].forEach(cb => cb(data));
      }
      if (this.options['on' + event.charAt(0).toUpperCase() + event.slice(1)]) {
        this.options['on' + event.charAt(0).toUpperCase() + event.slice(1)](data);
      }
    }

    // Initialize Outer Container Shell & HUD
    initShell() {
      this.container.innerHTML = `
        <div class="activity-container theme-${this.options.theme}">
          <div class="activity-hud" id="hud-bar">
            <div class="activity-hud-left">
              <span class="hud-type-tag" id="hud-activity-type">ACTIVITY</span>
              <span class="hud-title-badge" id="hud-activity-title">Title</span>
            </div>
            <div class="activity-hud-center">
              <div class="hud-stat" id="hud-timer-box" style="display:none;">
                <span class="hud-stat-icon">⏱️</span>
                <span id="hud-timer-val">00:00</span>
              </div>
              <div class="hud-stat" id="hud-score-box">
                <span class="hud-stat-icon">⭐</span>
                <span id="hud-score-val">0</span>
              </div>
              <div class="hud-stat hud-lives" id="hud-lives-box" style="display:none;"></div>
            </div>
            <div class="activity-hud-right">
              <button class="hud-btn" id="hud-sound-btn" title="Toggle Sound">🔊</button>
              <button class="hud-btn" id="hud-fullscreen-btn" title="Fullscreen">⛶</button>
              <button class="hud-btn" id="hud-reset-btn" title="Restart">🔄</button>
            </div>
          </div>
          <div class="activity-stage" id="activity-stage"></div>
        </div>
      `;

      this.hudEl = this.container.querySelector('#hud-bar');
      this.stageEl = this.container.querySelector('#activity-stage');
      this.mainWrapper = this.container.querySelector('.activity-container');

      // Bind HUD Buttons
      this.container.querySelector('#hud-sound-btn').onclick = () => {
        const on = sound.toggle();
        this.container.querySelector('#hud-sound-btn').textContent = on ? '🔊' : '🔇';
      };

      this.container.querySelector('#hud-fullscreen-btn').onclick = () => {
        if (!document.fullscreenElement) {
          this.mainWrapper.requestFullscreen().catch(err => console.warn(err));
        } else {
          document.exitFullscreen();
        }
      };

      this.container.querySelector('#hud-reset-btn').onclick = () => {
        this.reset();
      };
    }

    setTheme(themeName) {
      this.mainWrapper.className = `activity-container theme-${themeName}`;
    }

    load(config) {
      this.currentActivity = JSON.parse(JSON.stringify(config));
      if (this.currentActivity.theme) {
        this.setTheme(this.currentActivity.theme);
      }
      this.reset();
    }

    reset() {
      if (!this.currentActivity) return;
      if (this.state.timerInterval) clearInterval(this.state.timerInterval);

      // Reset state
      this.state.score = 0;
      this.state.streak = 0;
      this.state.mistakes = 0;
      this.state.isCompleted = false;
      this.state.startTime = Date.now();

      // Configure lives
      const livesConfig = this.currentActivity.lives !== undefined ? this.currentActivity.lives : this.options.lives;
      const livesBox = this.container.querySelector('#hud-lives-box');
      if (livesConfig && livesConfig > 0) {
        this.state.lives = livesConfig;
        this.state.maxLives = livesConfig;
        livesBox.style.display = 'flex';
        this.renderLives();
      } else {
        this.state.lives = null;
        livesBox.style.display = 'none';
      }

      // Configure timer
      const timerConfig = this.currentActivity.timer || this.options.timer;
      const timerBox = this.container.querySelector('#hud-timer-box');
      if (timerConfig && timerConfig.enabled) {
        timerBox.style.display = 'inline-flex';
        if (timerConfig.mode === 'countdown') {
          this.state.timerSeconds = timerConfig.seconds || 60;
        } else {
          this.state.timerSeconds = 0;
        }
        this.updateTimerDisplay();
        this.state.timerInterval = setInterval(() => {
          if (timerConfig.mode === 'countdown') {
            this.state.timerSeconds--;
            if (this.state.timerSeconds <= 5 && this.state.timerSeconds > 0) {
              sound.play('tick');
            }
            if (this.state.timerSeconds <= 0) {
              this.state.timerSeconds = 0;
              clearInterval(this.state.timerInterval);
              this.gameOver('Time is up!');
            }
          } else {
            this.state.timerSeconds++;
          }
          this.updateTimerDisplay();
        }, 1000);
      } else {
        timerBox.style.display = 'none';
      }

      // Update HUD Labels
      this.container.querySelector('#hud-activity-type').textContent = (this.currentActivity.type || 'Activity').toUpperCase();
      this.container.querySelector('#hud-activity-title').textContent = this.currentActivity.title || 'Interactive Activity';
      this.updateScoreDisplay();

      // Clear stage
      this.stageEl.innerHTML = '';

      // Add instruction banner if available
      if (this.currentActivity.instruction) {
        const instr = document.createElement('div');
        instr.className = 'activity-instruction-banner';
        instr.innerHTML = `<span>💡</span><span>${this.currentActivity.instruction}</span>`;
        this.stageEl.appendChild(instr);
      }

      // Render corresponding game mechanics
      switch (this.currentActivity.type) {
        case 'matching':
          this.renderMatching();
          break;
        case 'wordsearch':
          this.renderWordSearch();
          break;
        case 'reading':
          this.renderReading();
          break;
        case 'sorting':
          this.renderSorting();
          break;
        case 'cloze':
          this.renderCloze();
          break;
        case 'diagram':
          this.renderDiagram();
          break;
        case 'quiz':
          this.renderQuiz();
          break;
        case 'wheel':
          this.renderWheel();
          break;
        case 'anagram':
          this.renderAnagram();
          break;
        case 'speedtap':
          this.renderSpeedTap();
          break;
        case 'crossword':
          this.renderCrossword();
          break;
        case 'memory':
          this.renderMemory();
          break;
        case 'balloon':
          this.renderBalloonPop();
          break;
        case 'airplane':
          this.renderAirplane();
          break;
        case 'openthebox':
          this.renderOpenTheBox();
          break;
        case 'hangman':
          this.renderHangman();
          break;
        case 'mazechase':
          this.renderMazeChase();
          break;
        case 'venn':
          this.renderVennDiagram();
          break;
        case 'timeline':
          this.renderTimeline();
          break;
        case 'scratch':
          this.renderScratchReveal();
          break;
        case 'scramble':
          this.renderSentenceScramble();
          break;
        case 'bubbleshooter':
          this.renderBubbleShooter();
          break;
        default:
          this.stageEl.innerHTML += `<div style="padding: 30px; text-align: center;">Unknown activity type: ${this.currentActivity.type}</div>`;
      }
    }

    renderLives() {
      const box = this.container.querySelector('#hud-lives-box');
      box.innerHTML = '';
      for (let i = 0; i < this.state.maxLives; i++) {
        const heart = document.createElement('span');
        heart.className = `hud-heart ${i >= this.state.lives ? 'lost' : ''}`;
        heart.textContent = '❤️';
        box.appendChild(heart);
      }
    }

    loseLife() {
      if (this.state.lives !== null) {
        this.state.lives--;
        this.renderLives();
        sound.play('error');
        if (this.state.lives <= 0) {
          this.gameOver('Out of lives!');
          return true;
        }
      }
      return false;
    }

    addScore(points = 100) {
      this.state.streak++;
      const bonus = this.state.streak > 2 ? Math.min(this.state.streak * 20, 100) : 0;
      const totalGain = points + bonus;
      this.state.score += totalGain;
      this.updateScoreDisplay();
      sound.play('correct');
      particles.floatingText(window.innerWidth / 2, window.innerHeight / 2, `+${totalGain}`, '#10b981');
      this.emit('score', { score: this.state.score, streak: this.state.streak, gain: totalGain });
    }

    recordMistake() {
      this.state.streak = 0;
      this.state.mistakes++;
      sound.play('wrong');
      this.emit('mistake', { mistakes: this.state.mistakes });
      this.loseLife();
    }

    updateScoreDisplay() {
      this.container.querySelector('#hud-score-val').textContent = this.state.score;
    }

    updateTimerDisplay() {
      const mins = Math.floor(this.state.timerSeconds / 60);
      const secs = this.state.timerSeconds % 60;
      this.container.querySelector('#hud-timer-val').textContent =
        `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    gameOver(reason = 'Game Over') {
      if (this.state.timerInterval) clearInterval(this.state.timerInterval);
      sound.play('gameover');
      this.showSummaryModal(false, reason);
    }

    victory() {
      if (this.state.isCompleted) return;
      this.state.isCompleted = true;
      if (this.state.timerInterval) clearInterval(this.state.timerInterval);
      sound.play('win');
      particles.confettiBurst();
      setTimeout(() => {
        particles.confettiBurst(window.innerWidth * 0.3, window.innerHeight * 0.4, 50);
        particles.confettiBurst(window.innerWidth * 0.7, window.innerHeight * 0.4, 50);
      }, 300);
      this.showSummaryModal(true, 'Spectacular Job!');
      this.emit('complete', {
        score: this.state.score,
        mistakes: this.state.mistakes,
        timeTaken: Math.round((Date.now() - this.state.startTime) / 1000)
      });
    }

    showSummaryModal(isWin, heading) {
      const starsCount = !isWin ? 0 : this.state.mistakes === 0 ? 3 : this.state.mistakes <= 2 ? 2 : 1;
      const timeTaken = Math.round((Date.now() - this.state.startTime) / 1000);
      const mins = Math.floor(timeTaken / 60);
      const secs = timeTaken % 60;
      const timeStr = `${mins}m ${secs}s`;

      const modal = document.createElement('div');
      modal.className = 'activity-modal-overlay';
      modal.innerHTML = `
        <div class="activity-modal-card">
          <div class="modal-stars">
            <span class="modal-star ${starsCount >= 1 ? 'active' : ''}">★</span>
            <span class="modal-star ${starsCount >= 2 ? 'active' : ''}">★</span>
            <span class="modal-star ${starsCount >= 3 ? 'active' : ''}">★</span>
          </div>
          <div class="modal-title">${isWin ? heading : 'Try Again!'}</div>
          <div class="modal-subtitle">${isWin ? 'You have successfully completed this activity!' : heading}</div>
          
          <div class="modal-stats-grid">
            <div class="modal-stat-box">
              <div class="modal-stat-val">${this.state.score}</div>
              <div class="modal-stat-lbl">Score</div>
            </div>
            <div class="modal-stat-box">
              <div class="modal-stat-val">${timeStr}</div>
              <div class="modal-stat-lbl">Time</div>
            </div>
            <div class="modal-stat-box">
              <div class="modal-stat-val">${this.state.mistakes}</div>
              <div class="modal-stat-lbl">Mistakes</div>
            </div>
          </div>

          <div class="modal-actions">
            <button class="primary-btn" id="modal-retry-btn">🔄 Play Again</button>
            <button class="secondary-btn" id="modal-review-btn">👀 Review</button>
          </div>
        </div>
      `;

      this.stageEl.appendChild(modal);

      modal.querySelector('#modal-retry-btn').onclick = () => {
        modal.remove();
        this.reset();
      };
      modal.querySelector('#modal-review-btn').onclick = () => {
        modal.remove();
      };
    }

    /* ==========================================================================
       1. MATCHING MECHANICS (Connect pairs, SVG line connector, Tap/Drag)
       ========================================================================== */
    renderMatching() {
      const data = this.currentActivity.data || [];
      const wrap = document.createElement('div');
      wrap.className = 'matching-game-wrap';

      const svgLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgLayer.setAttribute('class', 'matching-svg-layer');

      const board = document.createElement('div');
      board.className = 'matching-board';

      const colLeft = document.createElement('div');
      colLeft.className = 'matching-column';
      const colRight = document.createElement('div');
      colRight.className = 'matching-column';

      // Shuffle items
      const leftItems = data.map((d, i) => ({ id: `left-${i}`, pairId: i, text: d.left, image: d.leftImage }));
      const rightItems = data.map((d, i) => ({ id: `right-${i}`, pairId: i, text: d.right, image: d.rightImage }))
                             .sort(() => Math.random() - 0.5);

      leftItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'matching-item';
        div.dataset.id = item.id;
        div.dataset.pair = item.pairId;
        div.innerHTML = `
          <span>${item.text || ''}</span>
          <span class="match-dot"></span>
        `;
        colLeft.appendChild(div);
      });

      rightItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'matching-item';
        div.dataset.id = item.id;
        div.dataset.pair = item.pairId;
        div.innerHTML = `
          <span class="match-dot"></span>
          <span>${item.text || ''}</span>
        `;
        colRight.appendChild(div);
      });

      board.appendChild(colLeft);
      board.appendChild(colRight);
      wrap.appendChild(svgLayer);
      wrap.appendChild(board);
      this.stageEl.appendChild(wrap);

      let selectedLeft = null;
      let matchedCount = 0;
      const totalPairs = data.length;

      const drawLines = () => {
        svgLayer.innerHTML = '';
        const matchedLefts = colLeft.querySelectorAll('.matching-item.matched');
        const wrapRect = wrap.getBoundingClientRect();

        matchedLefts.forEach(leftEl => {
          const pairId = leftEl.dataset.pair;
          const rightEl = colRight.querySelector(`.matching-item.matched[data-pair="${pairId}"]`);
          if (rightEl) {
            const leftDot = leftEl.querySelector('.match-dot').getBoundingClientRect();
            const rightDot = rightEl.querySelector('.match-dot').getBoundingClientRect();

            const x1 = leftDot.left + leftDot.width / 2 - wrapRect.left;
            const y1 = leftDot.top + leftDot.height / 2 - wrapRect.top;
            const x2 = rightDot.left + rightDot.width / 2 - wrapRect.left;
            const y2 = rightDot.top + rightDot.height / 2 - wrapRect.top;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const dx = (x2 - x1) * 0.5;
            const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
            path.setAttribute('d', d);
            path.setAttribute('stroke', '#10b981');
            path.setAttribute('stroke-width', '4');
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-linecap', 'round');
            svgLayer.appendChild(path);
          }
        });
      };

      // Click event handling
      colLeft.addEventListener('click', (e) => {
        const item = e.target.closest('.matching-item');
        if (!item || item.classList.contains('matched')) return;
        sound.play('tap');

        colLeft.querySelectorAll('.matching-item').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        selectedLeft = item;
      });

      colRight.addEventListener('click', (e) => {
        const item = e.target.closest('.matching-item');
        if (!item || item.classList.contains('matched') || !selectedLeft) return;

        if (selectedLeft.dataset.pair === item.dataset.pair) {
          // Correct Match!
          selectedLeft.classList.remove('selected');
          selectedLeft.classList.add('matched');
          item.classList.add('matched');
          matchedCount++;
          this.addScore(100);
          drawLines();

          selectedLeft = null;
          if (matchedCount === totalPairs) {
            setTimeout(() => this.victory(), 500);
          }
        } else {
          // Incorrect Match
          selectedLeft.classList.add('wrong');
          item.classList.add('wrong');
          this.recordMistake();
          setTimeout(() => {
            selectedLeft.classList.remove('wrong', 'selected');
            item.classList.remove('wrong');
            selectedLeft = null;
          }, 600);
        }
      });

      window.addEventListener('resize', drawLines);
    }

    /* ==========================================================================
       2. WORD SEARCH MECHANICS (Dynamic Grid Gen, Multi-angle drag highlight)
       ========================================================================== */
    renderWordSearch() {
      const words = (this.currentActivity.data && this.currentActivity.data.words) || ['LEARN', 'STUDY', 'CHALK', 'PAPER', 'SMART'];
      const gridSize = this.currentActivity.data && this.currentActivity.data.gridSize || 10;

      // Build grid matrix
      const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(''));
      const directions = [
        [0, 1],   // horizontal
        [1, 0],   // vertical
        [1, 1],   // diagonal down-right
        [-1, 1]   // diagonal up-right
      ];

      const placedWords = [];

      words.forEach(rawWord => {
        const word = rawWord.toUpperCase().replace(/[^A-Z]/g, '');
        let placed = false;
        let attempts = 0;

        while (!placed && attempts < 100) {
          attempts++;
          const dir = directions[Math.floor(Math.random() * directions.length)];
          const r = Math.floor(Math.random() * gridSize);
          const c = Math.floor(Math.random() * gridSize);

          let fits = true;
          for (let i = 0; i < word.length; i++) {
            const nr = r + dir[0] * i;
            const nc = c + dir[1] * i;
            if (nr < 0 || nr >= gridSize || nc < 0 || nc >= gridSize || (grid[nr][nc] !== '' && grid[nr][nc] !== word[i])) {
              fits = false;
              break;
            }
          }

          if (fits) {
            const coords = [];
            for (let i = 0; i < word.length; i++) {
              const nr = r + dir[0] * i;
              const nc = c + dir[1] * i;
              grid[nr][nc] = word[i];
              coords.push(`${nr}-${nc}`);
            }
            placedWords.push({ word, coords, found: false });
            placed = true;
          }
        }
      });

      // Fill remaining empty cells with random letters
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (!grid[r][c]) {
            grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
          }
        }
      }

      // Render Layout
      const layout = document.createElement('div');
      layout.className = 'wordsearch-layout';

      const gridWrap = document.createElement('div');
      gridWrap.className = 'wordsearch-grid-wrap';
      const gridEl = document.createElement('div');
      gridEl.className = 'wordsearch-grid';
      gridEl.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;

      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          const cell = document.createElement('div');
          cell.className = 'ws-cell';
          cell.dataset.r = r;
          cell.dataset.c = c;
          cell.textContent = grid[r][c];
          gridEl.appendChild(cell);
        }
      }
      gridWrap.appendChild(gridEl);

      const sidebar = document.createElement('div');
      sidebar.className = 'wordsearch-sidebar';
      sidebar.innerHTML = `
        <div style="font-weight: 800; font-size: 1.1rem;">Words to Find (${placedWords.length})</div>
        <div class="word-list" id="ws-word-list"></div>
      `;

      const wordListEl = sidebar.querySelector('#ws-word-list');
      placedWords.forEach(pw => {
        const item = document.createElement('div');
        item.className = 'word-item';
        item.dataset.word = pw.word;
        item.innerHTML = `<span>${pw.word}</span> <span>🔍</span>`;
        wordListEl.appendChild(item);
      });

      layout.appendChild(gridWrap);
      layout.appendChild(sidebar);
      this.stageEl.appendChild(layout);

      // Drag selection logic
      let isSelecting = false;
      let startCell = null;
      let selectedCoords = [];

      const getCellFromEvent = (e) => {
        const touch = e.touches ? e.touches[0] : e;
        const target = document.elementFromPoint(touch.clientX, touch.clientY);
        return target && target.classList.contains('ws-cell') ? target : null;
      };

      const getLineCoords = (r1, c1, r2, c2) => {
        const dr = r2 - r1;
        const dc = c2 - c1;
        const steps = Math.max(Math.abs(dr), Math.abs(dc));
        if (steps === 0) return [`${r1}-${c1}`];

        const rStep = dr === 0 ? 0 : dr / steps;
        const cStep = dc === 0 ? 0 : dc / steps;

        // Only allow straight horizontal, vertical, diagonal
        if (Math.abs(dr) !== 0 && Math.abs(dc) !== 0 && Math.abs(dr) !== Math.abs(dc)) {
          return [`${r1}-${c1}`];
        }

        const list = [];
        for (let i = 0; i <= steps; i++) {
          list.push(`${Math.round(r1 + rStep * i)}-${Math.round(c1 + cStep * i)}`);
        }
        return list;
      };

      const onStart = (e) => {
        const cell = getCellFromEvent(e);
        if (!cell) return;
        isSelecting = true;
        startCell = cell;
        sound.play('tap');
        updateSelection([`${cell.dataset.r}-${cell.dataset.c}`]);
      };

      const onMove = (e) => {
        if (!isSelecting || !startCell) return;
        const currentCell = getCellFromEvent(e);
        if (!currentCell) return;

        const coords = getLineCoords(
          parseInt(startCell.dataset.r),
          parseInt(startCell.dataset.c),
          parseInt(currentCell.dataset.r),
          parseInt(currentCell.dataset.c)
        );
        updateSelection(coords);
      };

      const updateSelection = (coords) => {
        selectedCoords = coords;
        gridEl.querySelectorAll('.ws-cell').forEach(c => c.classList.remove('selecting'));
        coords.forEach(coord => {
          const [r, c] = coord.split('-');
          const cell = gridEl.querySelector(`.ws-cell[data-r="${r}"][data-c="${c}"]`);
          if (cell) cell.classList.add('selecting');
        });
      };

      const onEnd = () => {
        if (!isSelecting) return;
        isSelecting = false;
        gridEl.querySelectorAll('.ws-cell').forEach(c => c.classList.remove('selecting'));

        // Check if selection matches any placed word
        const formedWord = selectedCoords.map(coord => {
          const [r, c] = coord.split('-');
          return grid[r][c];
        }).join('');
        const reversedWord = formedWord.split('').reverse().join('');

        const target = placedWords.find(pw => !pw.found && (pw.word === formedWord || pw.word === reversedWord));

        if (target) {
          target.found = true;
          this.addScore(150);
          sound.play('match');
          selectedCoords.forEach(coord => {
            const [r, c] = coord.split('-');
            const cell = gridEl.querySelector(`.ws-cell[data-r="${r}"][data-c="${c}"]`);
            if (cell) cell.classList.add('found');
          });

          const wordItem = sidebar.querySelector(`.word-item[data-word="${target.word}"]`);
          if (wordItem) wordItem.classList.add('found');

          // Check win condition
          if (placedWords.every(pw => pw.found)) {
            setTimeout(() => this.victory(), 500);
          }
        }

        selectedCoords = [];
        startCell = null;
      };

      gridWrap.addEventListener('mousedown', onStart);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);

      gridWrap.addEventListener('touchstart', onStart, { passive: true });
      window.addEventListener('touchmove', onMove, { passive: true });
      window.addEventListener('touchend', onEnd);
    }

    /* ==========================================================================
       3. READING COMPREHENSION MECHANICS (Story Passage, TTS, Interactive Quiz)
       ========================================================================== */
    renderReading() {
      const data = this.currentActivity.data || {
        passageTitle: 'The Marvel of Photosynthesis',
        passageText: 'Plants are the primary producers on Earth. Through a remarkable biochemical process called photosynthesis, they harness solar radiation and convert it into chemical energy stored in glucose molecules.\n\nChloroplasts contain the green pigment chlorophyll, which absorbs blue and red wavelengths of light while reflecting green. During this reaction, water molecules absorbed by roots are split, releasing oxygen gas into the atmosphere as a vital byproduct.\n\nWithout photosynthesis, the atmospheric oxygen would rapidly deplete, collapsing complex terrestrial and marine food webs.',
        questions: [
          {
            question: 'What is the primary green pigment in plant chloroplasts?',
            options: ['Hemoglobin', 'Chlorophyll', 'Melanin', 'Carotene'],
            answerIndex: 1,
            explanation: 'Chlorophyll is the pigment that captures sunlight for photosynthesis.'
          },
          {
            question: 'Which gas is released into the atmosphere as a byproduct?',
            options: ['Carbon Dioxide', 'Nitrogen', 'Oxygen', 'Methane'],
            answerIndex: 2,
            explanation: 'Water splitting during photosynthesis produces oxygen gas.'
          }
        ]
      };

      const layout = document.createElement('div');
      layout.className = 'reading-layout';

      // Left Passage Card
      const passageCard = document.createElement('div');
      passageCard.className = 'reading-passage-card';
      passageCard.innerHTML = `
        <div class="reading-passage-header">
          <div class="passage-title">${data.passageTitle || 'Reading Passage'}</div>
          <button class="hud-btn" id="tts-btn">🔊 Read Aloud</button>
        </div>
        <div class="passage-content" id="passage-content">
          ${(data.passageText || '').split('\n\n').map(p => `<p>${p}</p>`).join('')}
        </div>
      `;

      // Right Question Card
      let currentQIndex = 0;
      const questionsCard = document.createElement('div');
      questionsCard.className = 'reading-questions-card';

      const renderQuestion = () => {
        const q = data.questions[currentQIndex];
        questionsCard.innerHTML = `
          <div class="q-badge">Question ${currentQIndex + 1} of ${data.questions.length}</div>
          <div class="q-text">${q.question}</div>
          <div class="q-options" id="reading-q-options">
            ${q.options.map((opt, i) => `
              <div class="q-opt" data-index="${i}">
                <span style="opacity:0.6;">${String.fromCharCode(65 + i)}.</span>
                <span>${opt}</span>
              </div>
            `).join('')}
          </div>
          <div class="q-nav">
            <span style="font-size:0.85rem; font-weight:600; color:var(--text-secondary);" id="reading-feedback"></span>
            <button class="primary-btn" id="reading-next-btn" style="display:none;">Next Question ➔</button>
          </div>
        `;

        const optEls = questionsCard.querySelectorAll('.q-opt');
        let answered = false;

        optEls.forEach(el => {
          el.addEventListener('click', () => {
            if (answered) return;
            answered = true;
            const chosen = parseInt(el.dataset.index);
            const feedbackEl = questionsCard.querySelector('#reading-feedback');
            const nextBtn = questionsCard.querySelector('#reading-next-btn');

            if (chosen === q.answerIndex) {
              el.classList.add('correct');
              feedbackEl.textContent = '✓ Correct! ' + (q.explanation || '');
              feedbackEl.style.color = 'var(--success)';
              this.addScore(100);
            } else {
              el.classList.add('wrong');
              optEls[q.answerIndex].classList.add('correct');
              feedbackEl.textContent = '✗ ' + (q.explanation || 'Incorrect choice.');
              feedbackEl.style.color = 'var(--danger)';
              this.recordMistake();
            }

            nextBtn.style.display = 'inline-block';
            nextBtn.onclick = () => {
              currentQIndex++;
              if (currentQIndex < data.questions.length) {
                renderQuestion();
              } else {
                this.victory();
              }
            };
          });
        });
      };

      layout.appendChild(passageCard);
      layout.appendChild(questionsCard);
      this.stageEl.appendChild(layout);

      renderQuestion();

      // Text-To-Speech reader button
      const ttsBtn = passageCard.querySelector('#tts-btn');
      ttsBtn.onclick = () => {
        if ('speechSynthesis' in window) {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            ttsBtn.textContent = '🔊 Read Aloud';
          } else {
            const utterance = new SpeechSynthesisUtterance(data.passageText);
            utterance.rate = 0.95;
            utterance.onend = () => { ttsBtn.textContent = '🔊 Read Aloud'; };
            window.speechSynthesis.speak(utterance);
            ttsBtn.textContent = '⏹️ Stop Reading';
          }
        } else {
          alert('Text-to-speech is not supported in this browser environment.');
        }
      };
    }

    /* ==========================================================================
       4. SORTING & CATEGORIZING MECHANICS (Drag & Drop Buckets / Columns)
       ========================================================================== */
    renderSorting() {
      const data = this.currentActivity.data || {
        categories: [
          { id: 'cat1', title: 'Solid', color: '#3b82f6', icon: '🧊' },
          { id: 'cat2', title: 'Liquid', color: '#06b6d4', icon: '💧' },
          { id: 'cat3', title: 'Gas', color: '#f59e0b', icon: '💨' }
        ],
        items: [
          { text: 'Ice Cube', categoryId: 'cat1' },
          { text: 'Water Vapor', categoryId: 'cat3' },
          { text: 'Orange Juice', categoryId: 'cat2' },
          { text: 'Iron Rod', categoryId: 'cat1' },
          { text: 'Helium Balloon', categoryId: 'cat3' },
          { text: 'Milk', categoryId: 'cat2' }
        ]
      };

      const layout = document.createElement('div');
      layout.className = 'sorting-layout';

      // Item source tray
      const pool = document.createElement('div');
      pool.className = 'sorting-pool';
      pool.id = 'sorting-pool';

      const shuffledItems = [...data.items].sort(() => Math.random() - 0.5);
      shuffledItems.forEach((item, idx) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'sort-item';
        itemEl.id = `sort-item-${idx}`;
        itemEl.draggable = true;
        itemEl.dataset.cat = item.categoryId;
        itemEl.dataset.text = item.text;
        itemEl.textContent = item.text;
        pool.appendChild(itemEl);
      });

      // Categories buckets grid
      const bucketsGrid = document.createElement('div');
      bucketsGrid.className = 'sorting-buckets-grid';

      data.categories.forEach(cat => {
        const bucket = document.createElement('div');
        bucket.className = 'sort-bucket';
        bucket.dataset.cat = cat.id;
        bucket.innerHTML = `
          <div class="bucket-header" style="border-top: 4px solid ${cat.color || 'var(--primary)'};">
            <span>${cat.icon || '📁'}</span>
            <span>${cat.title}</span>
          </div>
          <div class="bucket-content" id="bucket-${cat.id}"></div>
        `;
        bucketsGrid.appendChild(bucket);
      });

      layout.appendChild(pool);
      layout.appendChild(bucketsGrid);
      this.stageEl.appendChild(layout);

      let selectedItemEl = null;
      let totalSorted = 0;
      const totalItems = data.items.length;

      // Tap-to-select support for mobile / touch
      pool.addEventListener('click', (e) => {
        const item = e.target.closest('.sort-item');
        if (!item) return;
        sound.play('tap');
        pool.querySelectorAll('.sort-item').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        selectedItemEl = item;
      });

      bucketsGrid.addEventListener('click', (e) => {
        const bucket = e.target.closest('.sort-bucket');
        if (!bucket || !selectedItemEl) return;
        assignItemToBucket(selectedItemEl, bucket);
      });

      // Drag and drop handlers
      pool.querySelectorAll('.sort-item').forEach(item => {
        item.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', item.id);
          item.classList.add('dragging');
        });
        item.addEventListener('dragend', () => {
          item.classList.remove('dragging');
        });
      });

      bucketsGrid.querySelectorAll('.sort-bucket').forEach(bucket => {
        bucket.addEventListener('dragover', (e) => {
          e.preventDefault();
          bucket.classList.add('drag-over');
        });
        bucket.addEventListener('dragleave', () => {
          bucket.classList.remove('drag-over');
        });
        bucket.addEventListener('drop', (e) => {
          e.preventDefault();
          bucket.classList.remove('drag-over');
          const itemId = e.dataTransfer.getData('text/plain');
          const item = document.getElementById(itemId);
          if (item) {
            assignItemToBucket(item, bucket);
          }
        });
      });

      const assignItemToBucket = (itemEl, bucketEl) => {
        const targetCat = bucketEl.dataset.cat;
        const itemCat = itemEl.dataset.cat;

        if (targetCat === itemCat) {
          // Correct!
          sound.play('correct');
          this.addScore(100);
          itemEl.classList.remove('selected');
          itemEl.draggable = false;
          itemEl.style.cursor = 'default';
          itemEl.style.borderColor = 'var(--success)';
          itemEl.style.background = 'var(--success-light)';
          bucketEl.querySelector('.bucket-content').appendChild(itemEl);
          totalSorted++;
          selectedItemEl = null;

          if (totalSorted === totalItems) {
            setTimeout(() => this.victory(), 500);
          }
        } else {
          // Wrong category!
          this.recordMistake();
          itemEl.classList.add('wrong');
          setTimeout(() => {
            itemEl.classList.remove('wrong', 'selected');
            selectedItemEl = null;
          }, 500);
        }
      };
    }

    /* ==========================================================================
       5. CLOZE / FILL IN THE BLANK MECHANICS (Chip Drop, Inline Blanks)
       ========================================================================== */
    renderCloze() {
      // Template string with gaps e.g. "The {sun} rises in the {east} and sets in the {west}."
      const data = this.currentActivity.data || {
        text: 'The {sun} is the star at the center of the Solar System. Earth revolves around it in an {elliptical} orbit, completing one revolution every {365} days.',
        distractors: ['moon', 'square', '24']
      };

      const rawText = data.text;
      const regex = /\{([^}]+)\}/g;
      const answers = [];
      let match;
      while ((match = regex.exec(rawText)) !== null) {
        answers.push(match[1]);
      }

      const layout = document.createElement('div');
      layout.className = 'cloze-layout';

      // Passage card
      const passageCard = document.createElement('div');
      passageCard.className = 'cloze-passage-card';

      let gapIndex = 0;
      const formattedHtml = rawText.replace(regex, (_, answer) => {
        const idx = gapIndex++;
        return `<span class="cloze-slot" data-index="${idx}" data-answer="${answer}">___</span>`;
      });
      passageCard.innerHTML = formattedHtml;

      // Word Chips Bank
      const allChips = [...answers, ...(data.distractors || [])].sort(() => Math.random() - 0.5);
      const bank = document.createElement('div');
      bank.className = 'cloze-bank';

      allChips.forEach((chipText, idx) => {
        const chip = document.createElement('div');
        chip.className = 'cloze-chip';
        chip.dataset.text = chipText;
        chip.textContent = chipText;
        bank.appendChild(chip);
      });

      layout.appendChild(passageCard);
      layout.appendChild(bank);
      this.stageEl.appendChild(layout);

      let selectedChip = null;
      let filledGaps = 0;
      const totalGaps = answers.length;

      bank.addEventListener('click', (e) => {
        const chip = e.target.closest('.cloze-chip');
        if (!chip || chip.classList.contains('used')) return;
        sound.play('tap');
        bank.querySelectorAll('.cloze-chip').forEach(c => c.style.outline = 'none');
        chip.style.outline = '3px solid #ffffff';
        selectedChip = chip;
      });

      passageCard.addEventListener('click', (e) => {
        const slot = e.target.closest('.cloze-slot');
        if (!slot || slot.classList.contains('correct') || !selectedChip) return;

        const chosenWord = selectedChip.dataset.text;
        const correctWord = slot.dataset.answer;

        if (chosenWord.toLowerCase().trim() === correctWord.toLowerCase().trim()) {
          slot.textContent = chosenWord;
          slot.classList.add('correct');
          selectedChip.classList.add('used');
          selectedChip.style.outline = 'none';
          this.addScore(100);
          filledGaps++;
          selectedChip = null;

          if (filledGaps === totalGaps) {
            setTimeout(() => this.victory(), 500);
          }
        } else {
          slot.textContent = chosenWord;
          slot.classList.add('wrong');
          this.recordMistake();
          setTimeout(() => {
            slot.textContent = '___';
            slot.classList.remove('wrong');
            if (selectedChip) selectedChip.style.outline = 'none';
            selectedChip = null;
          }, 600);
        }
      });
    }

    /* ==========================================================================
       6. LABELING DIAGRAM MECHANICS (Interactive Hotspots & Labels)
       ========================================================================== */
    renderDiagram() {
      const data = this.currentActivity.data || {
        diagramSvg: `
          <svg viewBox="0 0 600 400" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <rect width="600" height="400" fill="#f8fafc" rx="16"/>
            <!-- Flower Anatomy SVG Diagram -->
            <path d="M300,380 C300,280 290,200 300,160" stroke="#16a34a" stroke-width="16" fill="none" stroke-linecap="round"/>
            <!-- Leaves -->
            <path d="M295,290 C220,280 180,310 160,330 C200,350 260,320 295,300" fill="#22c55e" stroke="#15803d" stroke-width="3"/>
            <path d="M305,240 C380,230 420,260 440,280 C400,300 340,270 305,250" fill="#22c55e" stroke="#15803d" stroke-width="3"/>
            <!-- Petals -->
            <circle cx="300" cy="100" r="50" fill="#f43f5e" opacity="0.85"/>
            <circle cx="240" cy="130" r="50" fill="#f43f5e" opacity="0.85"/>
            <circle cx="360" cy="130" r="50" fill="#f43f5e" opacity="0.85"/>
            <circle cx="260" cy="190" r="50" fill="#f43f5e" opacity="0.85"/>
            <circle cx="340" cy="190" r="50" fill="#f43f5e" opacity="0.85"/>
            <!-- Center Receptacle -->
            <circle cx="300" cy="150" r="38" fill="#fbbf24" stroke="#d97706" stroke-width="4"/>
            <!-- Roots base -->
            <ellipse cx="300" cy="385" rx="80" ry="12" fill="#78350f" opacity="0.4"/>
          </svg>
        `,
        labels: [
          { id: 'p1', name: 'Petal', x: 230, y: 100 },
          { id: 'p2', name: 'Center / Pollen', x: 300, y: 150 },
          { id: 'p3', name: 'Stem', x: 300, y: 220 },
          { id: 'p4', name: 'Leaf', x: 200, y: 310 },
          { id: 'p5', name: 'Roots', x: 300, y: 380 }
        ]
      };

      const layout = document.createElement('div');
      layout.className = 'diagram-layout';

      // Canvas / Stage
      const canvasWrap = document.createElement('div');
      canvasWrap.className = 'diagram-canvas-wrap';

      const stage = document.createElement('div');
      stage.className = 'diagram-stage';
      stage.innerHTML = data.diagramSvg || `<img src="${data.imageUrl}" class="diagram-img"/>`;

      // Pins
      data.labels.forEach((lbl, idx) => {
        const pin = document.createElement('div');
        pin.className = 'diagram-pin';
        pin.id = `pin-${lbl.id}`;
        pin.dataset.id = lbl.id;
        pin.dataset.name = lbl.name;
        pin.style.left = `${(lbl.x / 600) * 100}%`;
        pin.style.top = `${(lbl.y / 400) * 100}%`;
        pin.textContent = idx + 1;
        stage.appendChild(pin);
      });

      canvasWrap.appendChild(stage);

      // Labels Bank
      const bank = document.createElement('div');
      bank.className = 'diagram-bank';
      bank.innerHTML = '<div style="font-weight: 800; margin-bottom: 6px;">Select & Place Labels:</div>';

      const shuffledLabels = [...data.labels].sort(() => Math.random() - 0.5);
      shuffledLabels.forEach(lbl => {
        const chip = document.createElement('div');
        chip.className = 'diagram-label-chip';
        chip.dataset.id = lbl.id;
        chip.dataset.name = lbl.name;
        chip.textContent = lbl.name;
        bank.appendChild(chip);
      });

      layout.appendChild(canvasWrap);
      layout.appendChild(bank);
      this.stageEl.appendChild(layout);

      let selectedChip = null;
      let placedCount = 0;
      const totalLabels = data.labels.length;

      bank.addEventListener('click', (e) => {
        const chip = e.target.closest('.diagram-label-chip');
        if (!chip || chip.classList.contains('placed')) return;
        sound.play('tap');
        bank.querySelectorAll('.diagram-label-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        selectedChip = chip;
      });

      stage.addEventListener('click', (e) => {
        const pin = e.target.closest('.diagram-pin');
        if (!pin || pin.classList.contains('labeled') || !selectedChip) return;

        if (pin.dataset.id === selectedChip.dataset.id) {
          // Correct!
          sound.play('match');
          this.addScore(100);
          pin.classList.add('labeled');
          pin.textContent = selectedChip.dataset.name;
          selectedChip.classList.add('placed');
          selectedChip.classList.remove('selected');
          placedCount++;
          selectedChip = null;

          if (placedCount === totalLabels) {
            setTimeout(() => this.victory(), 500);
          }
        } else {
          this.recordMistake();
          pin.classList.add('wrong');
          setTimeout(() => pin.classList.remove('wrong'), 500);
        }
      });
    }

    /* ==========================================================================
       7. QUIZ / GAMESHOW MECHANICS (Timer attack, lifelines, streak bonus)
       ========================================================================== */
    renderQuiz() {
      const questions = (this.currentActivity.data && this.currentActivity.data.questions) || [
        {
          question: 'What is the powerhouse organelle of the cell?',
          options: ['Ribosome', 'Mitochondria', 'Nucleus', 'Endoplasmic Reticulum'],
          answerIndex: 1
        },
        {
          question: 'What is the chemical formula for water?',
          options: ['CO2', 'NaCl', 'H2O', 'CH4'],
          answerIndex: 2
        }
      ];

      let qIdx = 0;
      let used5050 = false;
      const layout = document.createElement('div');
      layout.className = 'quiz-game-layout';

      const renderCurrent = () => {
        const q = questions[qIdx];
        layout.innerHTML = `
          <div class="quiz-card">
            <div style="font-weight: 700; color: var(--primary); margin-bottom: 8px;">Question ${qIdx + 1} of ${questions.length}</div>
            <div class="quiz-question-text">${q.question}</div>
            <div class="quiz-options-grid" id="quiz-opts">
              ${q.options.map((opt, i) => `
                <button class="quiz-option-btn" data-index="${i}">
                  <span>${opt}</span>
                </button>
              `).join('')}
            </div>
          </div>
          <div class="quiz-lifelines">
            <button class="lifeline-btn" id="ll-5050" ${used5050 ? 'disabled' : ''}>🎯 50:50 Lifeline</button>
          </div>
        `;

        const optBtns = layout.querySelectorAll('.quiz-option-btn');
        let answered = false;

        optBtns.forEach(btn => {
          btn.onclick = () => {
            if (answered) return;
            answered = true;
            const chosen = parseInt(btn.dataset.index);

            if (chosen === q.answerIndex) {
              btn.classList.add('correct');
              this.addScore(150);
            } else {
              btn.classList.add('wrong');
              optBtns[q.answerIndex].classList.add('correct');
              this.recordMistake();
            }

            setTimeout(() => {
              qIdx++;
              if (qIdx < questions.length) {
                renderCurrent();
              } else {
                this.victory();
              }
            }, 1000);
          };
        });

        const btn50 = layout.querySelector('#ll-5050');
        if (btn50) {
          btn50.onclick = () => {
            if (used5050 || answered) return;
            used5050 = true;
            btn50.disabled = true;
            sound.play('whoosh');

            const wrongIndices = q.options.map((_, i) => i).filter(i => i !== q.answerIndex);
            const toRemove = wrongIndices.sort(() => Math.random() - 0.5).slice(0, 2);
            toRemove.forEach(idx => {
              optBtns[idx].style.visibility = 'hidden';
            });
          };
        }
      };

      this.stageEl.appendChild(layout);
      renderCurrent();
    }

    /* ==========================================================================
       8. SPIN THE WHEEL MECHANICS (Canvas Physics & Elimination)
       ========================================================================== */
    renderWheel() {
      const items = (this.currentActivity.data && this.currentActivity.data.items) || [
        'Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta', 'Team Epsilon', 'Team Zeta'
      ];

      const colors = ['#f43f5e', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

      const layout = document.createElement('div');
      layout.className = 'wheel-layout';

      layout.innerHTML = `
        <div class="wheel-container">
          <div class="wheel-pointer"></div>
          <canvas class="wheel-canvas" id="wheel-canvas" width="420" height="420"></canvas>
          <button class="wheel-spin-btn" id="wheel-btn">SPIN</button>
        </div>
        <div style="font-weight: 700; font-size: 1.1rem;" id="wheel-winner-text">Click SPIN to randomly select!</div>
      `;

      this.stageEl.appendChild(layout);

      const canvas = layout.querySelector('#wheel-canvas');
      const ctx = canvas.getContext('2d');
      const spinBtn = layout.querySelector('#wheel-btn');
      const winnerText = layout.querySelector('#wheel-winner-text');

      let currentAngle = 0;
      let isSpinning = false;

      const drawWheel = () => {
        const numSlices = items.length;
        const sliceAngle = (Math.PI * 2) / numSlices;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = centerX - 10;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        items.forEach((item, i) => {
          const angle = currentAngle + i * sliceAngle;
          ctx.beginPath();
          ctx.fillStyle = colors[i % colors.length];
          ctx.moveTo(centerX, centerY);
          ctx.arc(centerX, centerY, radius, angle, angle + sliceAngle);
          ctx.closePath();
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();

          // Slice Label
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(angle + sliceAngle / 2);
          ctx.textAlign = 'right';
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px "Inter", system-ui, sans-serif';
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 4;
          ctx.fillText(item, radius - 24, 6);
          ctx.restore();
        });
      };

      drawWheel();

      spinBtn.onclick = () => {
        if (isSpinning || items.length === 0) return;
        isSpinning = true;
        sound.play('whoosh');

        const spinRotations = 5 + Math.random() * 5;
        const totalSpinAngle = spinRotations * Math.PI * 2 + Math.random() * Math.PI * 2;
        const duration = 4000;
        const startTime = performance.now();
        const initialAngle = currentAngle;

        let lastTickSlice = -1;

        const animateSpin = (time) => {
          const elapsed = time - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // Ease out cubic
          const easeOut = 1 - Math.pow(1 - progress, 3);
          currentAngle = initialAngle + totalSpinAngle * easeOut;

          // Sound tick on peg crossing
          const numSlices = items.length;
          const sliceAngle = (Math.PI * 2) / numSlices;
          const currentSlice = Math.floor((currentAngle % (Math.PI * 2)) / sliceAngle);
          if (currentSlice !== lastTickSlice) {
            sound.play('wheel-tick');
            lastTickSlice = currentSlice;
          }

          drawWheel();

          if (progress < 1) {
            requestAnimationFrame(animateSpin);
          } else {
            isSpinning = false;
            // Calculate winning item at top pointer (3 * PI / 2)
            const normalizedAngle = (Math.PI * 2 - (currentAngle % (Math.PI * 2)) + Math.PI * 1.5) % (Math.PI * 2);
            const winnerIdx = Math.floor(normalizedAngle / sliceAngle) % numSlices;
            const winner = items[winnerIdx];

            winnerText.textContent = `🎉 Selected: ${winner}!`;
            sound.play('win');
            particles.confettiBurst();
            this.addScore(100);
          }
        };

        requestAnimationFrame(animateSpin);
      };
    }

    /* ==========================================================================
       9. ANAGRAM / WORD UNJUMBLE MECHANICS
       ========================================================================== */
    renderAnagram() {
      const data = this.currentActivity.data || {
        clue: 'The biological process of cell division producing two identical daughter cells.',
        word: 'MITOSIS'
      };

      const targetWord = data.word.toUpperCase().replace(/\s/g, '');
      const letters = targetWord.split('').sort(() => Math.random() - 0.5);

      const layout = document.createElement('div');
      layout.className = 'anagram-layout';

      layout.innerHTML = `
        <div class="anagram-clue-card">💡 ${data.clue || 'Unjumble the letters to find the word:'}</div>
        <div class="anagram-slots-row" id="anagram-slots"></div>
        <div class="anagram-pool-row" id="anagram-pool"></div>
        <button class="hud-btn" id="anagram-clear-btn" style="margin-top: 10px;">Clear All</button>
      `;

      this.stageEl.appendChild(layout);

      const slotsEl = layout.querySelector('#anagram-slots');
      const poolEl = layout.querySelector('#anagram-pool');

      for (let i = 0; i < targetWord.length; i++) {
        const slot = document.createElement('div');
        slot.className = 'anagram-slot';
        slot.dataset.index = i;
        slotsEl.appendChild(slot);
      }

      letters.forEach((ltr, idx) => {
        const tile = document.createElement('div');
        tile.className = 'anagram-letter-tile';
        tile.id = `tile-${idx}`;
        tile.textContent = ltr;
        poolEl.appendChild(tile);
      });

      let placedTiles = [];

      poolEl.addEventListener('click', (e) => {
        const tile = e.target.closest('.anagram-letter-tile');
        if (!tile || tile.classList.contains('placed')) return;
        sound.play('tap');

        const nextSlotIndex = placedTiles.length;
        if (nextSlotIndex < targetWord.length) {
          tile.classList.add('placed');
          placedTiles.push(tile);
          slotsEl.children[nextSlotIndex].textContent = tile.textContent;

          // Check if full
          if (placedTiles.length === targetWord.length) {
            const formed = placedTiles.map(t => t.textContent).join('');
            if (formed === targetWord) {
              sound.play('correct');
              this.addScore(200);
              setTimeout(() => this.victory(), 500);
            } else {
              this.recordMistake();
              slotsEl.querySelectorAll('.anagram-slot').forEach(s => s.style.borderColor = 'var(--danger)');
              setTimeout(() => {
                slotsEl.querySelectorAll('.anagram-slot').forEach(s => {
                  s.style.borderColor = 'var(--primary)';
                  s.textContent = '';
                });
                placedTiles.forEach(t => t.classList.remove('placed'));
                placedTiles = [];
              }, 700);
            }
          }
        }
      });

      layout.querySelector('#anagram-clear-btn').onclick = () => {
        slotsEl.querySelectorAll('.anagram-slot').forEach(s => s.textContent = '');
        placedTiles.forEach(t => t.classList.remove('placed'));
        placedTiles = [];
      };
    }

    /* ==========================================================================
       10. SPEED TAP / WHACK-A-MOLE MECHANICS
       ========================================================================== */
    renderSpeedTap() {
      const data = this.currentActivity.data || {
        instruction: 'Tap only the PRIME numbers!',
        targets: ['2', '3', '5', '7', '11', '13', '17', '19'],
        distractors: ['4', '6', '8', '9', '10', '12', '14', '15', '16', '18']
      };

      const layout = document.createElement('div');
      layout.className = 'speedtap-layout';

      layout.innerHTML = `
        <div class="speedtap-target-banner">${data.instruction}</div>
        <div class="speedtap-grid" id="mole-grid"></div>
      `;

      this.stageEl.appendChild(layout);

      const grid = layout.querySelector('#mole-grid');
      for (let i = 0; i < 9; i++) {
        const hole = document.createElement('div');
        hole.className = 'mole-hole';
        hole.id = `hole-${i}`;
        grid.appendChild(hole);
      }

      let activeInterval = null;
      let caughtCount = 0;
      const targetCountGoal = 10;

      const spawnMole = () => {
        if (this.state.isCompleted) return;
        const availableHoles = Array.from(grid.children).filter(h => h.children.length === 0);
        if (availableHoles.length === 0) return;

        const randomHole = availableHoles[Math.floor(Math.random() * availableHoles.length)];
        const isTarget = Math.random() < 0.55;
        const text = isTarget
          ? data.targets[Math.floor(Math.random() * data.targets.length)]
          : data.distractors[Math.floor(Math.random() * data.distractors.length)];

        const card = document.createElement('div');
        card.className = 'mole-card';
        card.textContent = text;
        card.dataset.target = isTarget ? 'true' : 'false';

        card.onclick = (e) => {
          e.stopPropagation();
          if (card.dataset.target === 'true') {
            sound.play('correct');
            this.addScore(100);
            caughtCount++;
            card.remove();
            if (caughtCount >= targetCountGoal) {
              clearInterval(activeInterval);
              setTimeout(() => this.victory(), 500);
            }
          } else {
            this.recordMistake();
            card.style.background = 'var(--danger-light)';
            setTimeout(() => card.remove(), 200);
          }
        };

        randomHole.appendChild(card);
        setTimeout(() => {
          if (card.parentNode) card.remove();
        }, 1800);
      };

      activeInterval = setInterval(spawnMole, 900);
    }

    /* ==========================================================================
       11. CROSSWORD PUZZLE MECHANICS
       ========================================================================== */
    renderCrossword() {
      const data = this.currentActivity.data || {
        grid: [
          ['C', 'A', 'T', '#', '#'],
          ['O', '#', 'E', '#', '#'],
          ['W', '#', 'A', 'P', 'E'],
          ['#', '#', 'C', '#', '#'],
          ['#', '#', 'H', '#', '#']
        ],
        clues: [
          { num: 1, dir: 'across', clue: 'Feline domestic pet', answer: 'CAT' },
          { num: 1, dir: 'down', clue: 'Bovine farm milk animal', answer: 'COW' },
          { num: 2, dir: 'down', clue: 'Hot infusion beverage or schooling instructor', answer: 'TEACH' },
          { num: 3, dir: 'across', clue: 'Primate ancestor', answer: 'APE' }
        ]
      };

      const layout = document.createElement('div');
      layout.className = 'crossword-layout';

      const gridWrap = document.createElement('div');
      gridWrap.className = 'crossword-grid-wrap';

      const rows = data.grid.length;
      const cols = data.grid[0].length;

      const gridEl = document.createElement('div');
      gridEl.className = 'crossword-grid';
      gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const letter = data.grid[r][c];
          const cell = document.createElement('div');
          cell.className = `cw-cell ${letter !== '#' ? 'active' : ''}`;
          if (letter !== '#') {
            cell.innerHTML = `<input type="text" maxlength="1" class="cw-input" data-r="${r}" data-c="${c}" data-answer="${letter}"/>`;
          }
          gridEl.appendChild(cell);
        }
      }
      gridWrap.appendChild(gridEl);

      const cluesCard = document.createElement('div');
      cluesCard.className = 'crossword-clues';
      cluesCard.innerHTML = `
        <div style="font-weight: 800; font-size: 1.1rem; margin-bottom: 8px;">Crossword Clues</div>
        ${data.clues.map(c => `
          <div class="cw-clue-item" data-num="${c.num}" data-dir="${c.dir}">
            <b>${c.num}. ${c.dir.toUpperCase()}:</b> ${c.clue}
          </div>
        `).join('')}
        <button class="primary-btn" id="cw-check-btn" style="margin-top: 14px;">Check Answers</button>
      `;

      layout.appendChild(gridWrap);
      layout.appendChild(cluesCard);
      this.stageEl.appendChild(layout);

      const inputs = gridWrap.querySelectorAll('.cw-input');
      inputs.forEach((input, idx) => {
        input.addEventListener('input', () => {
          sound.play('tap');
          if (input.value && idx < inputs.length - 1) {
            inputs[idx + 1].focus();
          }
        });
      });

      cluesCard.querySelector('#cw-check-btn').onclick = () => {
        let allCorrect = true;
        inputs.forEach(inp => {
          if (inp.value.toUpperCase() === inp.dataset.answer.toUpperCase()) {
            inp.parentElement.style.background = 'var(--success-light)';
          } else {
            inp.parentElement.style.background = 'var(--danger-light)';
            allCorrect = false;
          }
        });

        if (allCorrect) {
          sound.play('correct');
          this.addScore(300);
          setTimeout(() => this.victory(), 500);
        } else {
          this.recordMistake();
        }
      };
    }

    /* ==========================================================================
       12. MEMORY MATCH MECHANICS (3D Flippable Cards)
       ========================================================================== */
    renderMemory() {
      const data = this.currentActivity.data || {
        pairs: [
          { a: 'Hydrogen', b: 'H' },
          { a: 'Helium', b: 'He' },
          { a: 'Carbon', b: 'C' },
          { a: 'Oxygen', b: 'O' },
          { a: 'Gold', b: 'Au' },
          { a: 'Silver', b: 'Ag' }
        ]
      };

      const cards = [];
      data.pairs.forEach((pair, pairIdx) => {
        cards.push({ id: `c-${pairIdx}-a`, pairIdx, text: pair.a });
        cards.push({ id: `c-${pairIdx}-b`, pairIdx, text: pair.b });
      });
      cards.sort(() => Math.random() - 0.5);

      const grid = document.createElement('div');
      grid.className = 'memory-grid';

      cards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'memory-card';
        cardEl.dataset.id = card.id;
        cardEl.dataset.pair = card.pairIdx;
        cardEl.innerHTML = `
          <div class="memory-face memory-face-back">?</div>
          <div class="memory-face memory-face-front">${card.text}</div>
        `;
        grid.appendChild(cardEl);
      });

      this.stageEl.appendChild(grid);

      let flipped = [];
      let lockBoard = false;
      let matchedPairs = 0;
      const totalPairs = data.pairs.length;

      grid.addEventListener('click', (e) => {
        const card = e.target.closest('.memory-card');
        if (!card || lockBoard || card.classList.contains('flipped') || card.classList.contains('matched')) return;

        sound.play('flip');
        card.classList.add('flipped');
        flipped.push(card);

        if (flipped.length === 2) {
          lockBoard = true;
          const [card1, card2] = flipped;

          if (card1.dataset.pair === card2.dataset.pair) {
            // Matched!
            sound.play('match');
            card1.classList.add('matched');
            card2.classList.add('matched');
            this.addScore(100);
            matchedPairs++;
            flipped = [];
            lockBoard = false;

            if (matchedPairs === totalPairs) {
              setTimeout(() => this.victory(), 500);
            }
          } else {
            // Mismatch
            this.recordMistake();
            setTimeout(() => {
              card1.classList.remove('flipped');
              card2.classList.remove('flipped');
              flipped = [];
              lockBoard = false;
            }, 900);
          }
        }
      });
    }

    /* ==========================================================================
       13. BALLOON POP ARCADE MECHANICS (WordWall Style 2D Floating Targets)
       ========================================================================== */
    renderBalloonPop() {
      const data = this.currentActivity.data || {
        instruction: 'Pop only the Synonyms for "DELIGHTED"!',
        targets: ['Joyful', 'Ecstatic', 'Thrilled', 'Elated', 'Gleeful', 'Overjoyed'],
        distractors: ['Miserable', 'Gloomy', 'Furious', 'Sorrowful', 'Dreary', 'Tired']
      };

      const wrap = document.createElement('div');
      wrap.className = 'balloon-arcade-stage';
      wrap.style.width = '100%';
      wrap.style.maxWidth = '900px';
      wrap.style.height = '480px';
      wrap.style.position = 'relative';
      wrap.style.overflow = 'hidden';
      wrap.style.borderRadius = '20px';
      wrap.style.background = 'linear-gradient(180deg, #38bdf8 0%, #bae6fd 60%, #86efac 100%)';
      wrap.style.boxShadow = 'var(--card-shadow)';

      const banner = document.createElement('div');
      banner.style.position = 'absolute';
      banner.style.top = '12px';
      banner.style.left = '50%';
      banner.style.transform = 'translateX(-50%)';
      banner.style.background = 'rgba(255, 255, 255, 0.92)';
      banner.style.color = '#0f172a';
      banner.style.padding = '8px 20px';
      banner.style.borderRadius = '999px';
      banner.style.fontWeight = '800';
      banner.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      banner.style.zIndex = '50';
      banner.textContent = data.instruction;
      wrap.appendChild(banner);

      this.stageEl.appendChild(wrap);

      const colors = ['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];
      let poppedCount = 0;
      const targetGoal = 6;
      let activeBalloons = [];
      let spawnTimer = null;
      let animFrameId = null;

      const spawnBalloon = () => {
        if (this.state.isCompleted) return;
        const isTarget = Math.random() < 0.55;
        const text = isTarget
          ? data.targets[Math.floor(Math.random() * data.targets.length)]
          : data.distractors[Math.floor(Math.random() * data.distractors.length)];

        const balloonEl = document.createElement('div');
        balloonEl.className = 'arcade-balloon';
        balloonEl.dataset.target = isTarget ? 'true' : 'false';
        const color = colors[Math.floor(Math.random() * colors.length)];

        const x = 40 + Math.random() * (wrap.clientWidth - 140);
        const speed = 1.2 + Math.random() * 1.3;

        balloonEl.style.position = 'absolute';
        balloonEl.style.left = `${x}px`;
        balloonEl.style.bottom = '-120px';
        balloonEl.style.width = '90px';
        balloonEl.style.height = '110px';
        balloonEl.style.borderRadius = '50% 50% 50% 50% / 40% 40% 60% 60%';
        balloonEl.style.background = `radial-gradient(circle at 30% 30%, #ffffff 0%, ${color} 70%)`;
        balloonEl.style.color = '#ffffff';
        balloonEl.style.display = 'flex';
        balloonEl.style.alignItems = 'center';
        balloonEl.style.justifyContent = 'center';
        balloonEl.style.textAlign = 'center';
        balloonEl.style.fontWeight = '800';
        balloonEl.style.fontSize = '0.9rem';
        balloonEl.style.padding = '8px';
        balloonEl.style.cursor = 'pointer';
        balloonEl.style.boxShadow = 'inset -4px -4px 8px rgba(0,0,0,0.2), 0 8px 16px rgba(0,0,0,0.15)';
        balloonEl.style.userSelect = 'none';
        balloonEl.style.transition = 'transform 0.1s';
        balloonEl.textContent = text;

        // Balloon string tail
        const stringTail = document.createElement('div');
        stringTail.style.position = 'absolute';
        stringTail.style.bottom = '-16px';
        stringTail.style.left = '50%';
        stringTail.style.transform = 'translateX(-50%)';
        stringTail.style.width = '2px';
        stringTail.style.height = '16px';
        stringTail.style.background = '#64748b';
        balloonEl.appendChild(stringTail);

        balloonEl.onmousedown = balloonEl.ontouchstart = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const rect = balloonEl.getBoundingClientRect();
          if (balloonEl.dataset.target === 'true') {
            sound.play('correct');
            particles.confettiBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 25);
            this.addScore(100);
            poppedCount++;
            balloonEl.remove();
            activeBalloons = activeBalloons.filter(b => b.el !== balloonEl);

            if (poppedCount >= targetGoal) {
              clearInterval(spawnTimer);
              cancelAnimationFrame(animFrameId);
              setTimeout(() => this.victory(), 500);
            }
          } else {
            sound.play('error');
            this.recordMistake();
            balloonEl.style.filter = 'brightness(0.5)';
            setTimeout(() => {
              balloonEl.remove();
              activeBalloons = activeBalloons.filter(b => b.el !== balloonEl);
            }, 200);
          }
        };

        wrap.appendChild(balloonEl);
        activeBalloons.push({ el: balloonEl, y: -120, x: x, speed: speed, wobble: Math.random() * Math.PI * 2 });
      };

      const updateBalloons = () => {
        for (let i = activeBalloons.length - 1; i >= 0; i--) {
          const b = activeBalloons[i];
          b.y += b.speed;
          b.wobble += 0.04;
          const wobbleX = Math.sin(b.wobble) * 15;
          b.el.style.bottom = `${b.y}px`;
          b.el.style.left = `${b.x + wobbleX}px`;

          if (b.y > wrap.clientHeight + 50) {
            b.el.remove();
            activeBalloons.splice(i, 1);
          }
        }
        if (!this.state.isCompleted) {
          animFrameId = requestAnimationFrame(updateBalloons);
        }
      };

      spawnTimer = setInterval(spawnBalloon, 1400);
      spawnBalloon();
      animFrameId = requestAnimationFrame(updateBalloons);
    }

    /* ==========================================================================
       14. AIRPLANE CLOUD PILOT (WordWall 2D Side-scroller Navigation)
       ========================================================================== */
    renderAirplane() {
      const data = this.currentActivity.data || {
        questions: [
          { question: 'What is 8 × 7?', options: ['56', '54', '64'], answerIndex: 0 },
          { question: 'What is 9 × 6?', options: ['45', '54', '63'], answerIndex: 1 },
          { question: 'What is 12 × 4?', options: ['44', '36', '48'], answerIndex: 2 }
        ]
      };

      let qIdx = 0;
      const wrap = document.createElement('div');
      wrap.style.width = '100%';
      wrap.style.maxWidth = '900px';
      wrap.style.height = '480px';
      wrap.style.position = 'relative';
      wrap.style.overflow = 'hidden';
      wrap.style.borderRadius = '20px';
      wrap.style.background = 'linear-gradient(180deg, #0284c7 0%, #38bdf8 70%, #bae6fd 100%)';
      wrap.style.boxShadow = 'var(--card-shadow)';

      const canvas = document.createElement('canvas');
      canvas.width = 900;
      canvas.height = 480;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      wrap.appendChild(canvas);
      this.stageEl.appendChild(wrap);

      const ctx = canvas.getContext('2d');

      // Airplane state
      let planeY = 240;
      let planeVy = 0;
      const planeX = 140;
      let keys = {};

      window.addEventListener('keydown', (e) => { keys[e.key] = true; });
      window.addEventListener('keyup', (e) => { keys[e.key] = false; });

      // Touch / mouse steer
      wrap.addEventListener('mousemove', (e) => {
        const rect = wrap.getBoundingClientRect();
        planeY = (e.clientY - rect.top) * (canvas.height / rect.height);
      });
      wrap.addEventListener('touchmove', (e) => {
        const rect = wrap.getBoundingClientRect();
        planeY = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
      }, { passive: true });

      let clouds = [];
      let nextQuestionClouds = () => {
        const q = data.questions[qIdx];
        clouds = [];
        const yPositions = [120, 240, 360];
        q.options.forEach((opt, idx) => {
          clouds.push({
            x: 950,
            y: yPositions[idx],
            text: opt,
            isCorrect: idx === q.answerIndex,
            width: 140,
            height: 70,
            hit: false
          });
        });
      };

      nextQuestionClouds();

      let animId = null;
      const loop = () => {
        if (this.state.isCompleted) return;

        // Keyboard control
        if (keys['ArrowUp'] || keys['w'] || keys['W']) planeVy = -4.5;
        else if (keys['ArrowDown'] || keys['s'] || keys['S']) planeVy = 4.5;
        else planeVy *= 0.85;

        planeY += planeVy;
        planeY = Math.max(50, Math.min(430, planeY));

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Header Question
        const q = data.questions[qIdx];
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.roundRect(canvas.width / 2 - 200, 16, 400, 46, 23);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 20px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`✈️ Fly through: ${q.question}`, canvas.width / 2, 46);

        // Render Clouds
        clouds.forEach(cloud => {
          cloud.x -= 3.2;

          // Draw fluffy cloud
          ctx.save();
          ctx.translate(cloud.x, cloud.y);
          ctx.fillStyle = cloud.hit ? (cloud.isCorrect ? '#10b981' : '#ef4444') : '#ffffff';
          ctx.shadowColor = 'rgba(0,0,0,0.15)';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(0, 0, 35, 0, Math.PI * 2);
          ctx.arc(-30, 8, 25, 0, Math.PI * 2);
          ctx.arc(30, 8, 25, 0, Math.PI * 2);
          ctx.arc(-15, 18, 22, 0, Math.PI * 2);
          ctx.arc(15, 18, 22, 0, Math.PI * 2);
          ctx.fill();

          // Cloud label
          ctx.shadowBlur = 0;
          ctx.fillStyle = cloud.hit ? '#ffffff' : '#0369a1';
          ctx.font = 'bold 18px "Inter", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(cloud.text, 0, 10);
          ctx.restore();

          // Collision detection with airplane
          const dist = Math.hypot(cloud.x - planeX, cloud.y - planeY);
          if (dist < 60 && !cloud.hit) {
            cloud.hit = true;
            if (cloud.isCorrect) {
              sound.play('correct');
              particles.confettiBurst(wrap.offsetLeft + 200, wrap.offsetTop + planeY, 30);
              this.addScore(150);
              setTimeout(() => {
                qIdx++;
                if (qIdx < data.questions.length) {
                  nextQuestionClouds();
                } else {
                  this.victory();
                }
              }, 400);
            } else {
              sound.play('wrong');
              this.recordMistake();
            }
          }
        });

        // If clouds flew past screen, reset
        if (clouds.length > 0 && clouds.every(c => c.x < -100)) {
          nextQuestionClouds();
        }

        // Draw Airplane
        ctx.save();
        ctx.translate(planeX, planeY);
        // Plane body
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.ellipse(0, 0, 30, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        // Cockpit
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(8, -4, 8, Math.PI, Math.PI * 2);
        ctx.fill();
        // Wings
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-8, -20, 14, 40);
        // Tail
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.moveTo(-25, 0);
        ctx.lineTo(-35, -16);
        ctx.lineTo(-20, 0);
        ctx.fill();
        ctx.restore();

        animId = requestAnimationFrame(loop);
      };

      animId = requestAnimationFrame(loop);
    }

    /* ==========================================================================
       15. OPEN THE BOX / MYSTERY DOORS MECHANICS
       ========================================================================== */
    renderOpenTheBox() {
      const data = this.currentActivity.data || {
        boxes: [
          { num: 1, title: 'Question 1', question: 'What is the capital of France?', options: ['Paris', 'Lyon', 'Marseille'], answerIndex: 0 },
          { num: 2, title: 'Question 2', question: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Pacific', 'Indian'], answerIndex: 1 },
          { num: 3, title: 'Question 3', question: 'How many sides does a hexagon have?', options: ['5', '6', '8'], answerIndex: 1 },
          { num: 4, title: 'Question 4', question: 'What force pulls objects towards Earth?', options: ['Magnetism', 'Friction', 'Gravity'], answerIndex: 2 }
        ]
      };

      const wrap = document.createElement('div');
      wrap.className = 'openbox-layout';
      wrap.style.width = '100%';
      wrap.style.maxWidth = '900px';
      wrap.style.display = 'grid';
      wrap.style.gridTemplateColumns = 'repeat(auto-fit, minmax(180px, 1fr))';
      wrap.style.gap = '20px';

      let openedCount = 0;
      const totalBoxes = data.boxes.length;

      data.boxes.forEach((box, idx) => {
        const card = document.createElement('div');
        card.className = 'mystery-box-card';
        card.style.background = 'linear-gradient(135deg, #1e293b, #0f172a)';
        card.style.border = '3px solid #6366f1';
        card.style.borderRadius = '16px';
        card.style.padding = '24px 16px';
        card.style.textAlign = 'center';
        card.style.cursor = 'pointer';
        card.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';
        card.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
        card.innerHTML = `
          <div style="font-size: 2.8rem; margin-bottom: 8px;">🎁</div>
          <div style="font-size: 1.4rem; font-weight: 900; color: #38bdf8;">Box ${box.num || idx + 1}</div>
          <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 4px;">Tap to Open</div>
        `;

        card.onclick = () => {
          if (card.classList.contains('opened')) return;
          sound.play('whoosh');
          sound.play('match');
          card.classList.add('opened');
          card.style.borderColor = '#10b981';
          card.style.background = 'var(--bg-surface-elevated)';

          card.innerHTML = `
            <div style="font-size: 0.85rem; font-weight: 800; color: var(--primary); margin-bottom: 6px;">BOX ${box.num || idx + 1}</div>
            <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 12px; color: var(--text-primary);">${box.question}</div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${box.options.map((opt, oIdx) => `
                <button class="box-opt-btn" data-index="${oIdx}" style="padding: 6px 10px; border-radius: 6px; border: 1px solid var(--card-border); background: var(--bg-surface); color: var(--text-primary); font-weight: 600; cursor: pointer;">
                  ${opt}
                </button>
              `).join('')}
            </div>
          `;

          const optBtns = card.querySelectorAll('.box-opt-btn');
          let answered = false;

          optBtns.forEach(btn => {
            btn.onclick = (e) => {
              e.stopPropagation();
              if (answered) return;
              answered = true;
              const chosen = parseInt(btn.dataset.index);
              if (chosen === box.answerIndex) {
                btn.style.background = 'var(--success)';
                btn.style.color = '#ffffff';
                sound.play('correct');
                this.addScore(100);
                openedCount++;
                if (openedCount === totalBoxes) {
                  setTimeout(() => this.victory(), 500);
                }
              } else {
                btn.style.background = 'var(--danger)';
                btn.style.color = '#ffffff';
                this.recordMistake();
                optBtns[box.answerIndex].style.background = 'var(--success)';
                optBtns[box.answerIndex].style.color = '#ffffff';
              }
            };
          });
        };

        wrap.appendChild(card);
      });

      this.stageEl.appendChild(wrap);
    }

    /* ==========================================================================
       16. HANGMAN / ROCKET LAUNCH LETTER GUESSER
       ========================================================================== */
    renderHangman() {
      const data = this.currentActivity.data || {
        clue: 'The largest mammal on planet Earth.',
        word: 'BLUE WHALE'
      };

      const secret = data.word.toUpperCase();
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      const guessedLetters = new Set();
      let wrongGuesses = 0;
      const maxWrong = 6;

      const wrap = document.createElement('div');
      wrap.style.width = '100%';
      wrap.style.maxWidth = '750px';
      wrap.style.display = 'flex';
      wrap.style.flexDirection = 'column';
      wrap.style.alignItems = 'center';
      wrap.style.gap = '20px';

      wrap.innerHTML = `
        <div style="background: var(--card-bg); border: 2px solid var(--card-border); padding: 14px 24px; border-radius: 12px; font-weight: 600; font-size: 1.1rem; text-align: center; box-shadow: var(--card-shadow);">
          💡 ${data.clue || 'Guess the letters to solve the secret phrase:'}
        </div>
        
        <!-- Rocket / Space Launch Visual -->
        <div id="rocket-stage" style="width: 100%; height: 160px; background: #0f172a; border-radius: 16px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; border: 2px solid #334155;">
          <div id="rocket-status" style="font-size: 3rem; transition: transform 0.3s;">🚀</div>
          <div style="position: absolute; bottom: 10px; font-weight: 700; color: #38bdf8; font-size: 0.9rem;" id="hangman-fuel-text">Rocket Fuel: 100% (6 attempts remaining)</div>
        </div>

        <!-- Secret Word Blanks -->
        <div id="hangman-word-slots" style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;"></div>

        <!-- Virtual Keyboard -->
        <div id="hangman-keyboard" style="display: grid; grid-template-columns: repeat(9, 1fr); gap: 6px; width: 100%;"></div>
      `;

      this.stageEl.appendChild(wrap);

      const slotsWrap = wrap.querySelector('#hangman-word-slots');
      const keyboardWrap = wrap.querySelector('#hangman-keyboard');
      const fuelText = wrap.querySelector('#hangman-fuel-text');
      const rocketIcon = wrap.querySelector('#rocket-status');

      const renderSlots = () => {
        slotsWrap.innerHTML = '';
        let isWon = true;

        for (let char of secret) {
          if (char === ' ') {
            const space = document.createElement('div');
            space.style.width = '24px';
            slotsWrap.appendChild(space);
          } else {
            const slot = document.createElement('div');
            slot.style.width = '36px';
            slot.style.height = '46px';
            slot.style.borderBottom = '4px solid var(--primary)';
            slot.style.display = 'flex';
            slot.style.alignItems = 'center';
            slot.style.justifyContent = 'center';
            slot.style.fontSize = '1.5rem';
            slot.style.fontWeight = '800';
            slot.style.background = 'var(--bg-surface-elevated)';
            slot.style.borderRadius = '6px 6px 0 0';

            if (guessedLetters.has(char)) {
              slot.textContent = char;
            } else {
              slot.textContent = '';
              isWon = false;
            }
            slotsWrap.appendChild(slot);
          }
        }

        if (isWon) {
          sound.play('win');
          particles.confettiBurst();
          this.addScore(250);
          setTimeout(() => this.victory(), 500);
        }
      };

      letters.forEach(ltr => {
        const btn = document.createElement('button');
        btn.textContent = ltr;
        btn.style.padding = '10px 0';
        btn.style.fontWeight = '800';
        btn.style.fontSize = '1.1rem';
        btn.style.borderRadius = '8px';
        btn.style.border = '1px solid var(--card-border)';
        btn.style.background = 'var(--bg-surface-elevated)';
        btn.style.color = 'var(--text-primary)';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all 0.15s';

        btn.onclick = () => {
          if (guessedLetters.has(ltr) || this.state.isCompleted) return;
          guessedLetters.add(ltr);
          btn.disabled = true;
          btn.style.opacity = '0.35';

          if (secret.includes(ltr)) {
            sound.play('match');
            btn.style.background = 'var(--success-light)';
            btn.style.color = 'var(--success)';
            renderSlots();
          } else {
            sound.play('error');
            this.recordMistake();
            btn.style.background = 'var(--danger-light)';
            btn.style.color = 'var(--danger)';
            wrongGuesses++;
            const remaining = maxWrong - wrongGuesses;
            fuelText.textContent = `Rocket Fuel: ${Math.round((remaining / maxWrong) * 100)}% (${remaining} attempts left)`;
            rocketIcon.style.transform = `rotate(${wrongGuesses * 15}deg)`;

            if (wrongGuesses >= maxWrong) {
              this.gameOver('Out of rocket fuel!');
            }
          }
        };

        keyboardWrap.appendChild(btn);
      });

      renderSlots();
    }

    /* ==========================================================================
       17. MAZE CHASE (Pac-Man 2D Tile Corridor Engine)
       ========================================================================== */
    renderMazeChase() {
      const data = this.currentActivity.data || {
        instruction: 'Eat only the NOUNS while avoiding the roaming monsters!',
        targets: ['Apple', 'Ocean', 'Rocket', 'Library'],
        distractors: ['Quickly', 'Glowing', 'Run', 'Ancient']
      };

      const wrap = document.createElement('div');
      wrap.style.width = '100%';
      wrap.style.maxWidth = '850px';
      wrap.style.display = 'flex';
      wrap.style.flexDirection = 'column';
      wrap.style.alignItems = 'center';
      wrap.style.gap = '14px';

      const banner = document.createElement('div');
      banner.style.background = 'var(--bg-surface-elevated)';
      banner.style.border = '2px solid var(--primary)';
      banner.style.color = 'var(--primary)';
      banner.style.padding = '10px 24px';
      banner.style.borderRadius = '999px';
      banner.style.fontWeight = '800';
      banner.style.fontSize = '1.1rem';
      banner.textContent = data.instruction;
      wrap.appendChild(banner);

      const canvas = document.createElement('canvas');
      canvas.width = 750;
      canvas.height = 450;
      canvas.style.background = '#090d16';
      canvas.style.borderRadius = '16px';
      canvas.style.border = '3px solid #334155';
      canvas.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
      wrap.appendChild(canvas);

      // On-screen Virtual D-Pad for Touch/Mobile
      const dpad = document.createElement('div');
      dpad.style.display = 'flex';
      dpad.style.gap = '10px';
      dpad.style.justifyContent = 'center';
      dpad.style.marginTop = '4px';
      dpad.innerHTML = `
        <button class="hud-btn" id="dpad-up" style="font-size:1.4rem; padding:8px 16px;">⬆️</button>
        <button class="hud-btn" id="dpad-left" style="font-size:1.4rem; padding:8px 16px;">⬅️</button>
        <button class="hud-btn" id="dpad-down" style="font-size:1.4rem; padding:8px 16px;">⬇️</button>
        <button class="hud-btn" id="dpad-right" style="font-size:1.4rem; padding:8px 16px;">➡️</button>
      `;
      wrap.appendChild(dpad);
      this.stageEl.appendChild(wrap);

      const ctx = canvas.getContext('2d');
      const tileSize = 50;
      const cols = 15;
      const rows = 9;

      // 0: path, 1: wall
      const mazeMap = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
        [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
        [1,0,1,0,0,0,0,0,0,0,0,0,1,0,1],
        [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1],
        [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1],
        [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
        [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
      ];

      // Player state
      let player = { x: 1.5 * tileSize, y: 1.5 * tileSize, vx: 0, vy: 0, nextVx: 0, nextVy: 0, speed: 3.2 };

      // Monsters
      const monsters = [
        { x: 13.5 * tileSize, y: 1.5 * tileSize, vx: -2.5, vy: 0, color: '#ef4444' },
        { x: 7.5 * tileSize, y: 7.5 * tileSize, vx: 0, vy: -2.5, color: '#a855f7' }
      ];

      // Tokens placed in corridors
      const tokenCoords = [
        { c: 2, r: 1 }, { c: 6, r: 1 }, { c: 12, r: 1 },
        { c: 3, r: 3 }, { c: 7, r: 3 }, { c: 11, r: 3 },
        { c: 2, r: 7 }, { c: 8, r: 7 }, { c: 12, r: 7 }
      ];

      const tokens = [];
      const shuffledTargets = [...data.targets].sort(() => Math.random() - 0.5);
      const shuffledDistractors = [...data.distractors].sort(() => Math.random() - 0.5);

      tokenCoords.forEach((coord, idx) => {
        const isTarget = idx < shuffledTargets.length;
        const text = isTarget ? shuffledTargets[idx] : (shuffledDistractors[idx - shuffledTargets.length] || 'Fake');
        tokens.push({
          x: (coord.c + 0.5) * tileSize,
          y: (coord.r + 0.5) * tileSize,
          text: text,
          isTarget: isTarget,
          eaten: false
        });
      });

      let eatenTargetCount = 0;
      const totalTargets = data.targets.length;

      // Controls
      const setDirection = (dx, dy) => {
        player.nextVx = dx * player.speed;
        player.nextVy = dy * player.speed;
      };

      window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') setDirection(0, -1);
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') setDirection(0, 1);
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') setDirection(-1, 0);
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') setDirection(1, 0);
      });

      dpad.querySelector('#dpad-up').onclick = () => setDirection(0, -1);
      dpad.querySelector('#dpad-down').onclick = () => setDirection(0, 1);
      dpad.querySelector('#dpad-left').onclick = () => setDirection(-1, 0);
      dpad.querySelector('#dpad-right').onclick = () => setDirection(1, 0);

      const isWall = (x, y) => {
        const c = Math.floor(x / tileSize);
        const r = Math.floor(y / tileSize);
        if (c < 0 || c >= cols || r < 0 || r >= rows) return true;
        return mazeMap[r][c] === 1;
      };

      let animId = null;
      let mouthAngle = 0;

      const loop = () => {
        if (this.state.isCompleted) return;

        // Try applying next direction if clear
        if (!isWall(player.x + player.nextVx * 4, player.y + player.nextVy * 4)) {
          player.vx = player.nextVx;
          player.vy = player.nextVy;
        }

        // Move player
        if (!isWall(player.x + player.vx, player.y + player.vy)) {
          player.x += player.vx;
          player.y += player.vy;
        }

        // Move Monsters with simple bounce AI
        monsters.forEach(m => {
          if (isWall(m.x + m.vx * 3, m.y + m.vy * 3)) {
            const dirs = [{ vx: 2.5, vy: 0 }, { vx: -2.5, vy: 0 }, { vx: 0, vy: 2.5 }, { vx: 0, vy: -2.5 }];
            const valid = dirs.filter(d => !isWall(m.x + d.vx * 4, m.y + d.vy * 4));
            if (valid.length > 0) {
              const chosen = valid[Math.floor(Math.random() * valid.length)];
              m.vx = chosen.vx;
              m.vy = chosen.vy;
            }
          }
          m.x += m.vx;
          m.y += m.vy;

          // Check monster collision
          if (Math.hypot(m.x - player.x, m.y - player.y) < 26) {
            sound.play('error');
            this.recordMistake();
            player.x = 1.5 * tileSize;
            player.y = 1.5 * tileSize;
            player.vx = player.vy = player.nextVx = player.nextVy = 0;
          }
        });

        // Check token eating
        tokens.forEach(tok => {
          if (!tok.eaten && Math.hypot(tok.x - player.x, tok.y - player.y) < 28) {
            tok.eaten = true;
            if (tok.isTarget) {
              sound.play('correct');
              particles.confettiBurst(wrap.offsetLeft + tok.x, wrap.offsetTop + tok.y, 20);
              this.addScore(150);
              eatenTargetCount++;
              if (eatenTargetCount === totalTargets) {
                setTimeout(() => this.victory(), 500);
              }
            } else {
              sound.play('wrong');
              this.recordMistake();
            }
          }
        });

        // RENDER SCENE
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw maze walls
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (mazeMap[r][c] === 1) {
              ctx.fillStyle = '#1e293b';
              ctx.strokeStyle = '#4f46e5';
              ctx.lineWidth = 2;
              ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
              ctx.strokeRect(c * tileSize + 2, r * tileSize + 2, tileSize - 4, tileSize - 4);
            }
          }
        }

        // Draw Tokens
        tokens.forEach(tok => {
          if (!tok.eaten) {
            ctx.fillStyle = tok.isTarget ? 'rgba(56, 189, 248, 0.95)' : 'rgba(244, 63, 94, 0.95)';
            ctx.beginPath();
            ctx.roundRect(tok.x - 36, tok.y - 14, 72, 28, 8);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(tok.text, tok.x, tok.y + 4);
          }
        });

        // Draw Pac-Man Player
        mouthAngle = (mouthAngle + 0.15) % (Math.PI * 0.4);
        const heading = Math.atan2(player.vy, player.vx) || 0;
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(heading);
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(0, 0, 18, mouthAngle, Math.PI * 2 - mouthAngle);
        ctx.lineTo(0, 0);
        ctx.fill();
        ctx.restore();

        // Draw Monsters
        monsters.forEach(m => {
          ctx.save();
          ctx.translate(m.x, m.y);
          ctx.fillStyle = m.color;
          ctx.beginPath();
          ctx.arc(0, -4, 16, Math.PI, 0);
          ctx.lineTo(16, 14);
          ctx.lineTo(8, 8);
          ctx.lineTo(0, 14);
          ctx.lineTo(-8, 8);
          ctx.lineTo(-16, 14);
          ctx.closePath();
          ctx.fill();
          // Eyes
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(-6, -4, 4, 0, Math.PI * 2);
          ctx.arc(6, -4, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(-5, -4, 2, 0, Math.PI * 2);
          ctx.arc(7, -4, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        animId = requestAnimationFrame(loop);
      };

      animId = requestAnimationFrame(loop);
    }

    /* ==========================================================================
       18. VENN DIAGRAM SORT (2 or 3 Zone Overlapping Set Classifier)
       ========================================================================== */
    renderVennDiagram() {
      const data = this.currentActivity.data || {
        circleA: { title: 'Photosynthesis', color: '#10b981' },
        circleB: { title: 'Cellular Respiration', color: '#3b82f6' },
        items: [
          { text: 'Produces Oxygen (O2)', zone: 'a' },
          { text: 'Uses Chlorophyll', zone: 'a' },
          { text: 'Occurs in Mitochondria', zone: 'b' },
          { text: 'Releases Carbon Dioxide (CO2)', zone: 'b' },
          { text: 'Synthesizes ATP Energy', zone: 'both' },
          { text: 'Essential for Living Cells', zone: 'both' }
        ]
      };

      const wrap = document.createElement('div');
      wrap.style.width = '100%';
      wrap.style.maxWidth = '950px';
      wrap.style.display = 'flex';
      wrap.style.flexDirection = 'column';
      wrap.style.gap = '20px';

      wrap.innerHTML = `
        <!-- Venn Diagram Stage -->
        <div id="venn-stage" style="position: relative; height: 360px; background: var(--card-bg); border: 2px solid var(--card-border); border-radius: 20px; overflow: hidden; box-shadow: var(--card-shadow); display: flex; align-items: center; justify-content: center;">
          
          <!-- Circle A (Left) -->
          <div id="zone-a" class="venn-drop-zone" data-zone="a" style="position: absolute; left: 14%; width: 320px; height: 320px; border-radius: 50%; border: 3px dashed ${data.circleA.color}; background: rgba(16, 185, 129, 0.08); display: flex; flex-direction: column; align-items: center; padding-top: 16px;">
            <span style="font-weight: 800; color: ${data.circleA.color}; font-size: 1.1rem;">${data.circleA.title}</span>
            <div class="venn-items-slot" style="margin-top: 20px; display: flex; flex-direction: column; gap: 6px; width: 65%;"></div>
          </div>

          <!-- Circle B (Right) -->
          <div id="zone-b" class="venn-drop-zone" data-zone="b" style="position: absolute; right: 14%; width: 320px; height: 320px; border-radius: 50%; border: 3px dashed ${data.circleB.color}; background: rgba(59, 130, 246, 0.08); display: flex; flex-direction: column; align-items: center; padding-top: 16px;">
            <span style="font-weight: 800; color: ${data.circleB.color}; font-size: 1.1rem;">${data.circleB.title}</span>
            <div class="venn-items-slot" style="margin-top: 20px; display: flex; flex-direction: column; gap: 6px; width: 65%;"></div>
          </div>

          <!-- Overlap / Both Center Zone -->
          <div id="zone-both" class="venn-drop-zone" data-zone="both" style="position: absolute; width: 140px; height: 240px; border-radius: 999px; background: rgba(168, 85, 247, 0.12); border: 2px solid #a855f7; z-index: 5; display: flex; flex-direction: column; align-items: center; padding: 10px 4px;">
            <span style="font-weight: 800; color: #a855f7; font-size: 0.85rem; text-transform: uppercase;">Both</span>
            <div class="venn-items-slot" style="margin-top: 10px; display: flex; flex-direction: column; gap: 6px; width: 90%;"></div>
          </div>
        </div>

        <!-- Items Source Tray -->
        <div id="venn-tray" style="background: var(--bg-surface-elevated); border: 2px solid var(--card-border); border-radius: 16px; padding: 16px; display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;"></div>
      `;

      this.stageEl.appendChild(wrap);

      const tray = wrap.querySelector('#venn-tray');
      const zones = wrap.querySelectorAll('.venn-drop-zone');

      const shuffled = [...data.items].sort(() => Math.random() - 0.5);
      shuffled.forEach((item, idx) => {
        const chip = document.createElement('div');
        chip.className = 'venn-chip';
        chip.id = `venn-chip-${idx}`;
        chip.dataset.zone = item.zone;
        chip.dataset.text = item.text;
        chip.textContent = item.text;
        chip.style.padding = '8px 16px';
        chip.style.borderRadius = '999px';
        chip.style.background = 'var(--card-bg)';
        chip.style.border = '2px solid var(--card-border)';
        chip.style.fontWeight = '700';
        chip.style.fontSize = '0.9rem';
        chip.style.cursor = 'pointer';
        chip.style.boxShadow = 'var(--card-shadow)';
        chip.style.transition = 'all 0.2s';
        tray.appendChild(chip);
      });

      let selectedChip = null;
      let placedCount = 0;
      const totalItems = data.items.length;

      tray.addEventListener('click', (e) => {
        const chip = e.target.closest('.venn-chip');
        if (!chip || chip.classList.contains('placed')) return;
        sound.play('tap');
        tray.querySelectorAll('.venn-chip').forEach(c => c.style.borderColor = 'var(--card-border)');
        chip.style.borderColor = 'var(--primary)';
        chip.style.transform = 'scale(1.05)';
        selectedChip = chip;
      });

      zones.forEach(zone => {
        zone.addEventListener('click', () => {
          if (!selectedChip) return;
          const targetZone = zone.dataset.zone;
          const correctZone = selectedChip.dataset.zone;

          if (targetZone === correctZone) {
            sound.play('match');
            this.addScore(100);
            selectedChip.classList.add('placed');
            selectedChip.style.transform = 'none';
            selectedChip.style.background = 'var(--success-light)';
            selectedChip.style.borderColor = 'var(--success)';
            selectedChip.style.fontSize = '0.78rem';
            selectedChip.style.padding = '4px 8px';
            zone.querySelector('.venn-items-slot').appendChild(selectedChip);
            placedCount++;
            selectedChip = null;

            if (placedCount === totalItems) {
              setTimeout(() => this.victory(), 500);
            }
          } else {
            sound.play('wrong');
            this.recordMistake();
            selectedChip.style.borderColor = 'var(--danger)';
            setTimeout(() => {
              if (selectedChip) selectedChip.style.borderColor = 'var(--card-border)';
              selectedChip = null;
            }, 500);
          }
        });
      });
    }

    /* ==========================================================================
       19. TIMELINE / NUMBER SCALE SLIDER
       ========================================================================== */
    renderTimeline() {
      const data = this.currentActivity.data || {
        instruction: 'Arrange these major human historical milestones in chronological order on the timeline:',
        events: [
          { year: '3000 BCE', title: 'Invention of Writing', desc: 'Sumerian Cuneiform in Mesopotamia' },
          { year: '1440 CE', title: 'Gutenberg Printing Press', desc: 'Movable type revolutionized book production' },
          { year: '1769 CE', title: 'Steam Engine Patent', desc: 'James Watt sparked the Industrial Revolution' },
          { year: '1969 CE', title: 'Apollo 11 Moon Landing', desc: 'First humans walked on lunar surface' },
          { year: '1989 CE', title: 'World Wide Web Created', desc: 'Tim Berners-Lee at CERN' }
        ]
      };

      const wrap = document.createElement('div');
      wrap.style.width = '100%';
      wrap.style.maxWidth = '1000px';
      wrap.style.display = 'flex';
      wrap.style.flexDirection = 'column';
      wrap.style.gap = '24px';

      wrap.innerHTML = `
        <!-- Timeline Track -->
        <div style="background: var(--card-bg); border: 2px solid var(--card-border); border-radius: 20px; padding: 32px 20px; position: relative; box-shadow: var(--card-shadow);">
          
          <!-- Central Horizontal Bar -->
          <div style="position: absolute; top: 50%; left: 40px; right: 40px; height: 6px; background: linear-gradient(90deg, #4f46e5, #06b6d4); transform: translateY(-50%); border-radius: 999px;"></div>
          
          <!-- Drop Slots -->
          <div id="timeline-slots-grid" style="display: grid; grid-template-columns: repeat(${data.events.length}, 1fr); gap: 14px; position: relative; z-index: 5;"></div>
        </div>

        <!-- Available Event Cards -->
        <div id="timeline-cards-tray" style="display: flex; flex-wrap: wrap; gap: 12px; justify-content: center;"></div>
      `;

      this.stageEl.appendChild(wrap);

      const slotsGrid = wrap.querySelector('#timeline-slots-grid');
      const cardsTray = wrap.querySelector('#timeline-cards-tray');

      data.events.forEach((ev, idx) => {
        const slot = document.createElement('div');
        slot.className = 'timeline-slot';
        slot.dataset.index = idx;
        slot.style.minHeight = '140px';
        slot.style.border = '2px dashed var(--card-border)';
        slot.style.borderRadius = '14px';
        slot.style.background = 'var(--bg-surface-elevated)';
        slot.style.display = 'flex';
        slot.style.flexDirection = 'column';
        slot.style.alignItems = 'center';
        slot.style.justifyContent = 'center';
        slot.style.padding = '8px';
        slot.innerHTML = `<span style="font-weight: 800; font-size: 0.85rem; color: var(--primary);">Slot ${idx + 1}</span>`;
        slotsGrid.appendChild(slot);
      });

      const shuffled = [...data.events].map((ev, i) => ({ ...ev, originalIdx: i })).sort(() => Math.random() - 0.5);

      shuffled.forEach(item => {
        const card = document.createElement('div');
        card.className = 'timeline-card';
        card.dataset.index = item.originalIdx;
        card.style.background = 'var(--card-bg)';
        card.style.border = '2px solid var(--card-border)';
        card.style.borderRadius = '12px';
        card.style.padding = '12px 16px';
        card.style.width = '200px';
        card.style.cursor = 'pointer';
        card.style.boxShadow = 'var(--card-shadow)';
        card.style.transition = 'all 0.2s';
        card.innerHTML = `
          <div style="font-weight: 800; font-size: 1.05rem; color: #38bdf8; margin-bottom: 4px;">${item.year}</div>
          <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 4px;">${item.title}</div>
          <div style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.3;">${item.desc}</div>
        `;
        cardsTray.appendChild(card);
      });

      let selectedTimelineCard = null;
      let placedTimelineCount = 0;
      const totalEvents = data.events.length;

      cardsTray.addEventListener('click', (e) => {
        const card = e.target.closest('.timeline-card');
        if (!card || card.classList.contains('placed')) return;
        sound.play('tap');
        cardsTray.querySelectorAll('.timeline-card').forEach(c => c.style.borderColor = 'var(--card-border)');
        card.style.borderColor = 'var(--primary)';
        card.style.transform = 'translateY(-4px)';
        selectedTimelineCard = card;
      });

      slotsGrid.addEventListener('click', (e) => {
        const slot = e.target.closest('.timeline-slot');
        if (!slot || slot.classList.contains('filled') || !selectedTimelineCard) return;

        const slotIdx = parseInt(slot.dataset.index);
        const cardIdx = parseInt(selectedTimelineCard.dataset.index);

        if (slotIdx === cardIdx) {
          sound.play('match');
          this.addScore(100);
          slot.classList.add('filled');
          slot.innerHTML = '';
          selectedTimelineCard.classList.add('placed');
          selectedTimelineCard.style.width = '100%';
          selectedTimelineCard.style.boxShadow = 'none';
          selectedTimelineCard.style.borderColor = 'var(--success)';
          slot.appendChild(selectedTimelineCard);
          placedTimelineCount++;
          selectedTimelineCard = null;

          if (placedTimelineCount === totalEvents) {
            setTimeout(() => this.victory(), 500);
          }
        } else {
          sound.play('wrong');
          this.recordMistake();
          selectedTimelineCard.style.borderColor = 'var(--danger)';
          setTimeout(() => {
            if (selectedTimelineCard) {
              selectedTimelineCard.style.borderColor = 'var(--card-border)';
              selectedTimelineCard.style.transform = 'none';
            }
            selectedTimelineCard = null;
          }, 500);
        }
      });
    }

    /* ==========================================================================
       20. SCRATCH & REVEAL (Canvas Shimmer Coin Scratch Surface)
       ========================================================================== */
    renderScratchReveal() {
      const data = this.currentActivity.data || {
        clue: 'Scratch away the metallic foil with your finger/cursor to reveal the hidden mystery artifact!',
        secretName: 'Rosetta Stone (Ancient Egyptian Hieroglyphs)',
        secretSvg: `
          <svg viewBox="0 0 600 380" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <rect width="600" height="380" fill="#1e293b" rx="16"/>
            <!-- Ancient Tablet Graphic -->
            <path d="M120,40 L480,40 L500,340 L100,340 Z" fill="#334155" stroke="#64748b" stroke-width="4"/>
            <text x="300" y="90" fill="#facc15" font-size="24" font-weight="bold" text-anchor="middle">𓇋𓈖𓊪𓅱 𓃠 𓆣 𓇋𓏏𓈖</text>
            <text x="300" y="140" fill="#38bdf8" font-size="18" font-family="serif" text-anchor="middle">THE ROSETTA STONE (196 BCE)</text>
            <text x="300" y="190" fill="#cbd5e1" font-size="14" text-anchor="middle">Unlocked the decipherment of Ancient Egyptian Hieroglyphics</text>
            <text x="300" y="230" fill="#94a3b8" font-size="13" text-anchor="middle">Key decree inscribed in Hieroglyphic, Demotic, and Ancient Greek</text>
            <circle cx="300" cy="290" r="28" fill="#eab308" opacity="0.9"/>
            <text x="300" y="296" fill="#000" font-size="18" font-weight="bold" text-anchor="middle">★</text>
          </svg>
        `,
        options: ['Rosetta Stone', 'Code of Hammurabi', 'Dead Sea Scrolls', 'Magna Carta'],
        answerIndex: 0
      };

      const wrap = document.createElement('div');
      wrap.style.width = '100%';
      wrap.style.maxWidth = '750px';
      wrap.style.display = 'flex';
      wrap.style.flexDirection = 'column';
      wrap.style.alignItems = 'center';
      wrap.style.gap = '16px';

      wrap.innerHTML = `
        <div style="font-weight: 700; color: var(--text-secondary); text-align: center;">${data.clue}</div>
        
        <!-- Scratch Surface Container -->
        <div id="scratch-stage-box" style="position: relative; width: 600px; height: 360px; border-radius: 16px; overflow: hidden; border: 3px solid #6366f1; box-shadow: 0 10px 30px rgba(0,0,0,0.4);">
          <!-- Underneath Hidden Visual -->
          <div style="position: absolute; width: 100%; height: 100%; top: 0; left: 0;">
            ${data.secretSvg}
          </div>
          <!-- Scratch-off Canvas Foil -->
          <canvas id="scratch-canvas" width="600" height="360" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: crosshair;"></canvas>
        </div>

        <div style="font-weight: 800; color: #38bdf8;" id="scratch-meter">Scratch Progress: 0% Revealed</div>

        <!-- Follow-up Question Panel -->
        <div id="scratch-quiz" style="width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 6px;">
          ${data.options.map((opt, i) => `
            <button class="scratch-opt-btn" data-index="${i}" style="padding: 12px; border-radius: 10px; background: var(--bg-surface-elevated); border: 2px solid var(--card-border); color: var(--text-primary); font-weight: 700; cursor: pointer; transition: all 0.2s;">
              ${opt}
            </button>
          `).join('')}
        </div>
      `;

      this.stageEl.appendChild(wrap);

      const canvas = wrap.querySelector('#scratch-canvas');
      const ctx = canvas.getContext('2d');
      const meter = wrap.querySelector('#scratch-meter');

      // Paint metallic silver foil with glitter texture
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#cbd5e1';
      for (let i = 0; i < 500; i++) {
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 3, 3);
      }
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✨ SCRATCH HERE WITH CURSOR ✨', canvas.width / 2, canvas.height / 2);

      let isScratching = false;
      let scratchedPixels = 0;

      const scratch = (e) => {
        if (!isScratching) return;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = (clientX - rect.left) * (canvas.width / rect.width);
        const y = (clientY - rect.top) * (canvas.height / rect.height);

        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, 28, 0, Math.PI * 2);
        ctx.fill();

        scratchedPixels += 1;
        const percent = Math.min(100, Math.round((scratchedPixels / 140) * 100));
        meter.textContent = `Scratch Progress: ${percent}% Revealed`;

        if (percent >= 60 && !canvas.classList.contains('revealed')) {
          canvas.classList.add('revealed');
          sound.play('whoosh');
        }
      };

      canvas.addEventListener('mousedown', () => { isScratching = true; });
      window.addEventListener('mouseup', () => { isScratching = false; });
      canvas.addEventListener('mousemove', scratch);

      canvas.addEventListener('touchstart', (e) => { isScratching = true; scratch(e); }, { passive: true });
      window.addEventListener('touchend', () => { isScratching = false; });
      canvas.addEventListener('touchmove', scratch, { passive: true });

      // Quiz Buttons
      const optBtns = wrap.querySelectorAll('.scratch-opt-btn');
      let answered = false;
      optBtns.forEach(btn => {
        btn.onclick = () => {
          if (answered) return;
          answered = true;
          const chosen = parseInt(btn.dataset.index);
          if (chosen === data.answerIndex) {
            btn.style.background = 'var(--success)';
            btn.style.color = '#ffffff';
            sound.play('win');
            particles.confettiBurst();
            this.addScore(200);
            setTimeout(() => this.victory(), 600);
          } else {
            btn.style.background = 'var(--danger)';
            btn.style.color = '#ffffff';
            optBtns[data.answerIndex].style.background = 'var(--success)';
            optBtns[data.answerIndex].style.color = '#ffffff';
            sound.play('wrong');
            this.recordMistake();
          }
        };
      });
    }

    /* ==========================================================================
       21. SENTENCE SCRAMBLE (Word Order Rail)
       ========================================================================== */
    renderSentenceScramble() {
      const data = this.currentActivity.data || {
        clue: 'Form a correct scientific sentence describing cellular respiration:',
        sentence: 'Mitochondria convert glucose and oxygen into cellular energy.'
      };

      const correctWords = data.sentence.split(/\s+/);
      const shuffledWords = [...correctWords].sort(() => Math.random() - 0.5);

      const wrap = document.createElement('div');
      wrap.style.width = '100%';
      wrap.style.maxWidth = '850px';
      wrap.style.display = 'flex';
      wrap.style.flexDirection = 'column';
      wrap.style.alignItems = 'center';
      wrap.style.gap = '24px';

      wrap.innerHTML = `
        <div style="background: var(--card-bg); border: 2px solid var(--card-border); padding: 14px 24px; border-radius: 12px; font-weight: 600; font-size: 1.1rem; text-align: center; box-shadow: var(--card-shadow);">
          💡 ${data.clue}
        </div>

        <!-- Target Assembly Rail -->
        <div id="scramble-rail" style="width: 100%; min-height: 80px; background: var(--bg-surface-elevated); border: 2px dashed var(--primary); border-radius: 16px; padding: 16px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: center;"></div>

        <!-- Available Words Pool -->
        <div id="scramble-pool" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;"></div>

        <button class="primary-btn" id="scramble-check-btn" style="padding: 12px 32px;">✓ Check Sentence</button>
      `;

      this.stageEl.appendChild(wrap);

      const rail = wrap.querySelector('#scramble-rail');
      const pool = wrap.querySelector('#scramble-pool');

      shuffledWords.forEach((word, idx) => {
        const chip = document.createElement('div');
        chip.className = 'scramble-word-chip';
        chip.id = `scramble-word-${idx}`;
        chip.textContent = word;
        chip.style.padding = '10px 18px';
        chip.style.borderRadius = '10px';
        chip.style.background = 'var(--card-bg)';
        chip.style.border = '2px solid var(--card-border)';
        chip.style.fontWeight = '700';
        chip.style.fontSize = '1.05rem';
        chip.style.cursor = 'pointer';
        chip.style.boxShadow = 'var(--card-shadow)';
        chip.style.transition = 'all 0.15s';
        pool.appendChild(chip);
      });

      // Tap word chip to move between pool and rail
      wrap.addEventListener('click', (e) => {
        const chip = e.target.closest('.scramble-word-chip');
        if (!chip) return;
        sound.play('tap');

        if (chip.parentElement === pool) {
          rail.appendChild(chip);
        } else {
          pool.appendChild(chip);
        }
      });

      wrap.querySelector('#scramble-check-btn').onclick = () => {
        const assembled = Array.from(rail.children).map(c => c.textContent).join(' ');
        if (assembled.trim().toLowerCase() === data.sentence.trim().toLowerCase()) {
          sound.play('win');
          particles.confettiBurst();
          this.addScore(200);
          rail.style.borderColor = 'var(--success)';
          rail.style.background = 'var(--success-light)';
          setTimeout(() => this.victory(), 500);
        } else {
          sound.play('wrong');
          this.recordMistake();
          rail.style.borderColor = 'var(--danger)';
          setTimeout(() => rail.style.borderColor = 'var(--primary)', 600);
        }
      };
    }

    /* ==========================================================================
       22. MATH BUBBLE SHOOTER / CANNON
       ========================================================================== */
    renderBubbleShooter() {
      const data = this.currentActivity.data || {
        targetInstruction: 'Shoot multiples of 5!',
        bubbles: [
          { val: '25', isTarget: true }, { val: '14', isTarget: false }, { val: '40', isTarget: true },
          { val: '33', isTarget: false }, { val: '50', isTarget: true }, { val: '18', isTarget: false },
          { val: '15', isTarget: true }, { val: '22', isTarget: false }, { val: '65', isTarget: true }
        ]
      };

      const wrap = document.createElement('div');
      wrap.style.width = '100%';
      wrap.style.maxWidth = '800px';
      wrap.style.display = 'flex';
      wrap.style.flexDirection = 'column';
      wrap.style.alignItems = 'center';
      wrap.style.gap = '12px';

      const banner = document.createElement('div');
      banner.style.background = 'var(--primary-light)';
      banner.style.color = 'var(--primary)';
      banner.style.padding = '8px 24px';
      banner.style.borderRadius = '999px';
      banner.style.fontWeight = '800';
      banner.style.fontSize = '1.1rem';
      banner.textContent = `🎯 ${data.targetInstruction}`;
      wrap.appendChild(banner);

      const canvas = document.createElement('canvas');
      canvas.width = 750;
      canvas.height = 480;
      canvas.style.background = 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)';
      canvas.style.borderRadius = '16px';
      canvas.style.border = '3px solid #6366f1';
      canvas.style.cursor = 'crosshair';
      wrap.appendChild(canvas);
      this.stageEl.appendChild(wrap);

      const ctx = canvas.getContext('2d');
      const cannonX = canvas.width / 2;
      const cannonY = canvas.height - 30;
      let cannonAngle = -Math.PI / 2;

      // Build initial grid of bubbles at top
      const bubbles = [];
      const cols = 6;
      data.bubbles.forEach((b, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        bubbles.push({
          x: 100 + c * 105,
          y: 70 + r * 75,
          radius: 32,
          val: b.val,
          isTarget: b.isTarget,
          color: b.isTarget ? '#06b6d4' : '#ec4899',
          popped: false
        });
      });

      let projectiles = [];
      let poppedTargets = 0;
      const totalTargets = data.bubbles.filter(b => b.isTarget).length;

      // Aiming
      const updateAim = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const mouseX = (clientX - rect.left) * (canvas.width / rect.width);
        const mouseY = (clientY - rect.top) * (canvas.height / rect.height);
        cannonAngle = Math.atan2(mouseY - cannonY, mouseX - cannonX);
      };

      canvas.addEventListener('mousemove', updateAim);
      canvas.addEventListener('touchmove', updateAim, { passive: true });

      const fireCannon = () => {
        if (this.state.isCompleted) return;
        sound.play('whoosh');
        const speed = 10;
        projectiles.push({
          x: cannonX + Math.cos(cannonAngle) * 45,
          y: cannonY + Math.sin(cannonAngle) * 45,
          vx: Math.cos(cannonAngle) * speed,
          vy: Math.sin(cannonAngle) * speed,
          radius: 14
        });
      };

      canvas.addEventListener('click', fireCannon);
      canvas.addEventListener('touchstart', (e) => { updateAim(e); fireCannon(); }, { passive: true });

      let animId = null;
      const loop = () => {
        if (this.state.isCompleted) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update & Render Projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
          const p = projectiles[i];
          p.x += p.vx;
          p.y += p.vy;

          // Wall bounce
          if (p.x - p.radius < 0 || p.x + p.radius > canvas.width) {
            p.vx *= -1;
          }

          // Check collision with bubbles
          bubbles.forEach(b => {
            if (!b.popped && Math.hypot(b.x - p.x, b.y - p.y) < b.radius + p.radius) {
              b.popped = true;
              projectiles.splice(i, 1);
              if (b.isTarget) {
                sound.play('correct');
                particles.confettiBurst(wrap.offsetLeft + b.x, wrap.offsetTop + b.y, 25);
                this.addScore(150);
                poppedTargets++;
                if (poppedTargets === totalTargets) {
                  setTimeout(() => this.victory(), 500);
                }
              } else {
                sound.play('wrong');
                this.recordMistake();
              }
            }
          });

          // Draw projectile
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();

          // Out of bounds
          if (p.y < -20 || p.y > canvas.height + 20) {
            projectiles.splice(i, 1);
          }
        }

        // Render Bubbles
        bubbles.forEach(b => {
          if (!b.popped) {
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#ffffff';
            ctx.stroke();

            // Label
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(b.val, b.x, b.y + 6);
          }
        });

        // Draw Aim Trajectory Line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(cannonX, cannonY);
        ctx.lineTo(cannonX + Math.cos(cannonAngle) * 300, cannonY + Math.sin(cannonAngle) * 300);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Cannon Turret
        ctx.save();
        ctx.translate(cannonX, cannonY);
        ctx.rotate(cannonAngle);
        ctx.fillStyle = '#4f46e5';
        ctx.fillRect(0, -12, 45, 24);
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        animId = requestAnimationFrame(loop);
      };

      animId = requestAnimationFrame(loop);
    }
  }

  return ActivityEngine;
}));
