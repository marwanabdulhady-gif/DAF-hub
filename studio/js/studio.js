/**
 * WordWall Studio & Visual Activity Builder
 */
class ActivityStudio {
  constructor() {
    this.engine = null;
    this.currentConfig = null;
    this.init();
  }

  init() {
    this.engine = new ActivityEngine('#studio-player-container');
    this.bindEvents();
    this.loadActivity('matching');
  }

  bindEvents() {
    // Nav Tabs
    document.querySelectorAll('.studio-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.studio-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.studio-tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const target = document.getElementById(btn.dataset.tab);
        if (target) target.classList.add('active');

        if (btn.dataset.tab === 'tab-json') {
          this.syncConfigToJsonEditor();
        } else if (btn.dataset.tab === 'tab-worksheet') {
          this.renderWorksheet();
        }
      });
    });

    // Activity Template Selector Pills
    document.querySelectorAll('.activity-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.activity-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.loadActivity(pill.dataset.type);
      });
    });

    // Theme selector
    document.getElementById('studio-theme-select').addEventListener('change', (e) => {
      if (this.currentConfig) {
        this.currentConfig.theme = e.target.value;
        this.engine.setTheme(e.target.value);
      }
    });

    // Action buttons
    document.getElementById('btn-export-html').addEventListener('click', () => {
      this.exportHtml();
    });

    document.getElementById('btn-download-json').addEventListener('click', () => {
      this.downloadJson();
    });

    document.getElementById('btn-apply-json').addEventListener('click', () => {
      this.applyJsonFromEditor();
    });

    document.getElementById('btn-apply-builder').addEventListener('click', () => {
      this.saveBuilderToConfig();
      this.engine.load(this.currentConfig);
      // Switch to play tab
      document.querySelector('[data-tab="tab-player"]').click();
    });

    // JSON upload
    document.getElementById('input-import-json').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const config = JSON.parse(event.target.result);
          this.currentConfig = config;
          this.engine.load(config);
          this.populateBuilderForm();
          this.syncConfigToJsonEditor();
          alert('Activity configuration successfully loaded!');
        } catch (err) {
          alert('Invalid JSON file format.');
        }
      };
      reader.readAsText(file);
    });
  }

  loadActivity(type) {
    const preset = window.ACTIVITY_PRESETS[type];
    if (preset) {
      this.currentConfig = JSON.parse(JSON.stringify(preset));
      document.getElementById('studio-theme-select').value = this.currentConfig.theme || 'default';
      this.engine.load(this.currentConfig);
      this.populateBuilderForm();
      this.syncConfigToJsonEditor();
    }
  }

  syncConfigToJsonEditor() {
    const jsonArea = document.getElementById('json-editor-textarea');
    if (jsonArea && this.currentConfig) {
      jsonArea.value = JSON.stringify(this.currentConfig, null, 2);
    }
  }

  applyJsonFromEditor() {
    try {
      const jsonArea = document.getElementById('json-editor-textarea');
      const config = JSON.parse(jsonArea.value);
      this.currentConfig = config;
      this.engine.load(config);
      this.populateBuilderForm();
      alert('Activity successfully updated from JSON!');
      document.querySelector('[data-tab="tab-player"]').click();
    } catch (e) {
      alert('Error in JSON syntax: ' + e.message);
    }
  }

  populateBuilderForm() {
    const cfg = this.currentConfig;
    if (!cfg) return;

    document.getElementById('builder-title').value = cfg.title || '';
    document.getElementById('builder-instruction').value = cfg.instruction || '';
    document.getElementById('builder-theme').value = cfg.theme || 'default';
    document.getElementById('builder-timer-enabled').checked = !!(cfg.timer && cfg.timer.enabled);
    document.getElementById('builder-timer-mode').value = (cfg.timer && cfg.timer.mode) || 'countdown';
    document.getElementById('builder-timer-seconds').value = (cfg.timer && cfg.timer.seconds) || 60;
    document.getElementById('builder-lives').value = cfg.lives !== undefined && cfg.lives !== null ? cfg.lives : 0;

    const dynamicContainer = document.getElementById('builder-dynamic-fields');
    dynamicContainer.innerHTML = '';

    switch (cfg.type) {
      case 'matching':
        this.renderMatchingBuilder(dynamicContainer, cfg);
        break;
      case 'wordsearch':
        this.renderWordsearchBuilder(dynamicContainer, cfg);
        break;
      case 'reading':
        this.renderReadingBuilder(dynamicContainer, cfg);
        break;
      case 'sorting':
        this.renderSortingBuilder(dynamicContainer, cfg);
        break;
      case 'cloze':
        this.renderClozeBuilder(dynamicContainer, cfg);
        break;
      case 'diagram':
        this.renderDiagramBuilder(dynamicContainer, cfg);
        break;
      case 'quiz':
        this.renderQuizBuilder(dynamicContainer, cfg);
        break;
      case 'wheel':
        this.renderWheelBuilder(dynamicContainer, cfg);
        break;
      case 'anagram':
        this.renderAnagramBuilder(dynamicContainer, cfg);
        break;
      case 'speedtap':
        this.renderSpeedTapBuilder(dynamicContainer, cfg);
        break;
      case 'memory':
        this.renderMemoryBuilder(dynamicContainer, cfg);
        break;
      default:
        dynamicContainer.innerHTML = `<div class="builder-hint">Edit this game using the JSON Editor tab for full granular control.</div>`;
    }
  }

  renderMatchingBuilder(container, cfg) {
    const pairs = cfg.data || [];
    container.innerHTML = `
      <div class="builder-section-title">Matching Pairs:</div>
      <div id="matching-pairs-rows" style="display:flex; flex-direction:column; gap:8px;"></div>
      <button type="button" class="studio-sub-btn" id="add-pair-btn" style="margin-top:8px;">+ Add New Pair</button>
    `;

    const rowsWrap = container.querySelector('#matching-pairs-rows');
    const addRow = (left = '', right = '') => {
      const row = document.createElement('div');
      row.className = 'builder-pair-row';
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.innerHTML = `
        <input type="text" class="studio-input pair-left" placeholder="Left prompt/term" value="${left}" style="flex:1;"/>
        <input type="text" class="studio-input pair-right" placeholder="Right answer/definition" value="${right}" style="flex:1;"/>
        <button type="button" class="studio-del-btn" style="background:#fee2e2; color:#ef4444; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">✕</button>
      `;
      row.querySelector('.studio-del-btn').onclick = () => row.remove();
      rowsWrap.appendChild(row);
    };

    pairs.forEach(p => addRow(p.left, p.right));
    container.querySelector('#add-pair-btn').onclick = () => addRow('', '');
  }

  renderWordsearchBuilder(container, cfg) {
    const data = cfg.data || { words: [], gridSize: 10 };
    container.innerHTML = `
      <div class="builder-section-title">Word Search Settings:</div>
      <div style="margin-bottom:12px;">
        <label class="studio-label">Grid Size (NxN):</label>
        <input type="number" id="ws-builder-grid-size" class="studio-input" value="${data.gridSize || 10}" min="6" max="16"/>
      </div>
      <div>
        <label class="studio-label">Words List (one word per line):</label>
        <textarea id="ws-builder-words" class="studio-textarea" rows="6">${(data.words || []).join('\n')}</textarea>
      </div>
    `;
  }

  renderReadingBuilder(container, cfg) {
    const data = cfg.data || { passageTitle: '', passageText: '', questions: [] };
    container.innerHTML = `
      <div class="builder-section-title">Reading Passage:</div>
      <div style="margin-bottom:12px;">
        <label class="studio-label">Passage Title:</label>
        <input type="text" id="reading-builder-title" class="studio-input" value="${data.passageTitle || ''}"/>
      </div>
      <div style="margin-bottom:16px;">
        <label class="studio-label">Passage Full Text (Use blank lines between paragraphs):</label>
        <textarea id="reading-builder-text" class="studio-textarea" rows="6">${data.passageText || ''}</textarea>
      </div>
      <div class="builder-section-title">Comprehension Questions:</div>
      <div id="reading-builder-questions" style="display:flex; flex-direction:column; gap:16px;"></div>
      <button type="button" class="studio-sub-btn" id="add-reading-q-btn" style="margin-top:10px;">+ Add Question</button>
    `;

    const qWrap = container.querySelector('#reading-builder-questions');
    const addQ = (q = { question: '', options: ['', '', '', ''], answerIndex: 0, explanation: '' }) => {
      const card = document.createElement('div');
      card.className = 'builder-q-card';
      card.style.background = 'var(--bg-surface-elevated)';
      card.style.border = '1px solid var(--card-border)';
      card.style.padding = '14px';
      card.style.borderRadius = '10px';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <b>Question Item</b>
          <button type="button" class="q-del-btn" style="color:#ef4444; border:none; background:transparent; cursor:pointer;">Remove ✕</button>
        </div>
        <input type="text" class="studio-input q-text-input" placeholder="Question text..." value="${q.question}" style="margin-bottom:8px;"/>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:8px;">
          <input type="text" class="studio-input q-opt-0" placeholder="Option A" value="${q.options[0] || ''}"/>
          <input type="text" class="studio-input q-opt-1" placeholder="Option B" value="${q.options[1] || ''}"/>
          <input type="text" class="studio-input q-opt-2" placeholder="Option C" value="${q.options[2] || ''}"/>
          <input type="text" class="studio-input q-opt-3" placeholder="Option D" value="${q.options[3] || ''}"/>
        </div>
        <div style="display:flex; gap:10px; align-items:center;">
          <label style="font-size:0.85rem; font-weight:600;">Correct Option:</label>
          <select class="studio-select q-correct-select" style="padding:4px 8px;">
            <option value="0" ${q.answerIndex === 0 ? 'selected' : ''}>Option A</option>
            <option value="1" ${q.answerIndex === 1 ? 'selected' : ''}>Option B</option>
            <option value="2" ${q.answerIndex === 2 ? 'selected' : ''}>Option C</option>
            <option value="3" ${q.answerIndex === 3 ? 'selected' : ''}>Option D</option>
          </select>
        </div>
      `;
      card.querySelector('.q-del-btn').onclick = () => card.remove();
      qWrap.appendChild(card);
    };

    (data.questions || []).forEach(q => addQ(q));
    container.querySelector('#add-reading-q-btn').onclick = () => addQ();
  }

  renderSortingBuilder(container, cfg) {
    const data = cfg.data || { categories: [], items: [] };
    container.innerHTML = `
      <div class="builder-section-title">Categories (Buckets):</div>
      <div id="sorting-cats-rows" style="display:flex; flex-direction:column; gap:8px; margin-bottom:14px;"></div>
      <button type="button" class="studio-sub-btn" id="add-sort-cat-btn" style="margin-bottom:18px;">+ Add Category</button>

      <div class="builder-section-title">Items to Sort:</div>
      <div id="sorting-items-rows" style="display:flex; flex-direction:column; gap:8px;"></div>
      <button type="button" class="studio-sub-btn" id="add-sort-item-btn" style="margin-top:8px;">+ Add Item</button>
    `;

    const catsWrap = container.querySelector('#sorting-cats-rows');
    const itemsWrap = container.querySelector('#sorting-items-rows');

    const addCat = (id = `cat_${Date.now()}`, title = '', color = '#3b82f6', icon = '📁') => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.innerHTML = `
        <input type="text" class="studio-input sort-cat-title" placeholder="Category Title" value="${title}" style="flex:2;"/>
        <input type="text" class="studio-input sort-cat-icon" placeholder="Emoji icon" value="${icon}" style="width:60px;"/>
        <input type="color" class="sort-cat-color" value="${color}" style="height:38px; width:40px; border:none; cursor:pointer;"/>
        <input type="hidden" class="sort-cat-id" value="${id}"/>
        <button type="button" class="studio-del-btn" style="background:#fee2e2; color:#ef4444; border:none; padding:6px 10px; border-radius:6px; cursor:pointer;">✕</button>
      `;
      row.querySelector('.studio-del-btn').onclick = () => row.remove();
      catsWrap.appendChild(row);
    };

    const addItem = (text = '', catId = '') => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.innerHTML = `
        <input type="text" class="studio-input sort-item-text" placeholder="Item name" value="${text}" style="flex:2;"/>
        <input type="text" class="studio-input sort-item-cat" placeholder="Category Title/ID" value="${catId}" style="flex:1;"/>
        <button type="button" class="studio-del-btn" style="background:#fee2e2; color:#ef4444; border:none; padding:6px 10px; border-radius:6px; cursor:pointer;">✕</button>
      `;
      row.querySelector('.studio-del-btn').onclick = () => row.remove();
      itemsWrap.appendChild(row);
    };

    data.categories.forEach(c => addCat(c.id, c.title, c.color, c.icon));
    data.items.forEach(i => addItem(i.text, i.categoryId));

    container.querySelector('#add-sort-cat-btn').onclick = () => addCat();
    container.querySelector('#add-sort-item-btn').onclick = () => addItem();
  }

  renderClozeBuilder(container, cfg) {
    const data = cfg.data || { text: '', distractors: [] };
    container.innerHTML = `
      <div class="builder-section-title">Cloze Passage (Use {curly braces} around blank words):</div>
      <textarea id="cloze-builder-text" class="studio-textarea" rows="6" style="margin-bottom:12px;">${data.text || ''}</textarea>
      <div class="builder-section-title">Distractor Chips (Extra fake words separated by commas):</div>
      <input type="text" id="cloze-builder-distractors" class="studio-input" value="${(data.distractors || []).join(', ')}" placeholder="e.g. gravity, velocity, momentum"/>
    `;
  }

  renderDiagramBuilder(container, cfg) {
    const data = cfg.data || { labels: [] };
    container.innerHTML = `
      <div class="builder-section-title">Diagram Hotspot Labels:</div>
      <div class="builder-hint" style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:10px;">
        Specify coordinate pins (X: 0-600, Y: 0-400) and label terms.
      </div>
      <div id="diagram-pins-rows" style="display:flex; flex-direction:column; gap:8px;"></div>
      <button type="button" class="studio-sub-btn" id="add-diagram-pin-btn" style="margin-top:8px;">+ Add Hotspot Pin</button>
    `;

    const pinsWrap = container.querySelector('#diagram-pins-rows');
    const addPin = (name = '', x = 300, y = 200) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.innerHTML = `
        <input type="text" class="studio-input pin-name" placeholder="Label Name" value="${name}" style="flex:2;"/>
        <input type="number" class="studio-input pin-x" placeholder="X" value="${x}" style="width:75px;"/>
        <input type="number" class="studio-input pin-y" placeholder="Y" value="${y}" style="width:75px;"/>
        <button type="button" class="studio-del-btn" style="background:#fee2e2; color:#ef4444; border:none; padding:6px 10px; border-radius:6px; cursor:pointer;">✕</button>
      `;
      row.querySelector('.studio-del-btn').onclick = () => row.remove();
      pinsWrap.appendChild(row);
    };

    (data.labels || []).forEach(l => addPin(l.name, l.x, l.y));
    container.querySelector('#add-diagram-pin-btn').onclick = () => addPin('', 300, 200);
  }

  renderQuizBuilder(container, cfg) {
    const data = cfg.data || { questions: [] };
    container.innerHTML = `
      <div class="builder-section-title">Quiz Questions:</div>
      <div id="quiz-builder-rows" style="display:flex; flex-direction:column; gap:16px;"></div>
      <button type="button" class="studio-sub-btn" id="add-quiz-q-btn" style="margin-top:10px;">+ Add Quiz Question</button>
    `;

    const qWrap = container.querySelector('#quiz-builder-rows');
    const addQ = (q = { question: '', options: ['', '', '', ''], answerIndex: 0 }) => {
      const card = document.createElement('div');
      card.style.background = 'var(--bg-surface-elevated)';
      card.style.border = '1px solid var(--card-border)';
      card.style.padding = '14px';
      card.style.borderRadius = '10px';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <b>Quiz Item</b>
          <button type="button" class="q-del-btn" style="color:#ef4444; border:none; background:transparent; cursor:pointer;">Remove ✕</button>
        </div>
        <input type="text" class="studio-input quiz-q-text" placeholder="Question..." value="${q.question}" style="margin-bottom:8px;"/>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:8px;">
          <input type="text" class="studio-input quiz-opt-0" placeholder="Option 1" value="${q.options[0] || ''}"/>
          <input type="text" class="studio-input quiz-opt-1" placeholder="Option 2" value="${q.options[1] || ''}"/>
          <input type="text" class="studio-input quiz-opt-2" placeholder="Option 3" value="${q.options[2] || ''}"/>
          <input type="text" class="studio-input quiz-opt-3" placeholder="Option 4" value="${q.options[3] || ''}"/>
        </div>
        <div style="display:flex; gap:10px; align-items:center;">
          <label style="font-size:0.85rem; font-weight:600;">Correct Option:</label>
          <select class="studio-select quiz-correct-select" style="padding:4px 8px;">
            <option value="0" ${q.answerIndex === 0 ? 'selected' : ''}>Option 1</option>
            <option value="1" ${q.answerIndex === 1 ? 'selected' : ''}>Option 2</option>
            <option value="2" ${q.answerIndex === 2 ? 'selected' : ''}>Option 3</option>
            <option value="3" ${q.answerIndex === 3 ? 'selected' : ''}>Option 4</option>
          </select>
        </div>
      `;
      card.querySelector('.q-del-btn').onclick = () => card.remove();
      qWrap.appendChild(card);
    };

    (data.questions || []).forEach(q => addQ(q));
    container.querySelector('#add-quiz-q-btn').onclick = () => addQ();
  }

  renderWheelBuilder(container, cfg) {
    const items = (cfg.data && cfg.data.items) || [];
    container.innerHTML = `
      <div class="builder-section-title">Wheel Slices (one per line):</div>
      <textarea id="wheel-builder-items" class="studio-textarea" rows="8">${items.join('\n')}</textarea>
    `;
  }

  renderAnagramBuilder(container, cfg) {
    const data = cfg.data || { clue: '', word: '' };
    container.innerHTML = `
      <div class="builder-section-title">Target Word & Clue:</div>
      <div style="margin-bottom:12px;">
        <label class="studio-label">Secret Word:</label>
        <input type="text" id="anagram-builder-word" class="studio-input" value="${data.word || ''}" placeholder="e.g. MITOSIS"/>
      </div>
      <div>
        <label class="studio-label">Clue / Hint Description:</label>
        <textarea id="anagram-builder-clue" class="studio-textarea" rows="3">${data.clue || ''}</textarea>
      </div>
    `;
  }

  renderSpeedTapBuilder(container, cfg) {
    const data = cfg.data || { instruction: '', targets: [], distractors: [] };
    container.innerHTML = `
      <div class="builder-section-title">Target Goal & Items:</div>
      <div style="margin-bottom:12px;">
        <label class="studio-label">Banner Instruction:</label>
        <input type="text" id="speedtap-builder-instr" class="studio-input" value="${data.instruction || ''}"/>
      </div>
      <div style="margin-bottom:12px;">
        <label class="studio-label">Target Items (Comma separated):</label>
        <input type="text" id="speedtap-builder-targets" class="studio-input" value="${(data.targets || []).join(', ')}"/>
      </div>
      <div>
        <label class="studio-label">Distractor Items (Comma separated):</label>
        <input type="text" id="speedtap-builder-distractors" class="studio-input" value="${(data.distractors || []).join(', ')}"/>
      </div>
    `;
  }

  renderMemoryBuilder(container, cfg) {
    const pairs = (cfg.data && cfg.data.pairs) || [];
    container.innerHTML = `
      <div class="builder-section-title">Card Pairs (A & B):</div>
      <div id="memory-pairs-rows" style="display:flex; flex-direction:column; gap:8px;"></div>
      <button type="button" class="studio-sub-btn" id="add-mem-pair-btn" style="margin-top:8px;">+ Add Card Pair</button>
    `;

    const rowsWrap = container.querySelector('#memory-pairs-rows');
    const addRow = (a = '', b = '') => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.gap = '8px';
      row.innerHTML = `
        <input type="text" class="studio-input mem-a" placeholder="Side A (e.g. Hydrogen)" value="${a}" style="flex:1;"/>
        <input type="text" class="studio-input mem-b" placeholder="Side B (e.g. H)" value="${b}" style="flex:1;"/>
        <button type="button" class="studio-del-btn" style="background:#fee2e2; color:#ef4444; border:none; padding:6px 10px; border-radius:6px; cursor:pointer;">✕</button>
      `;
      row.querySelector('.studio-del-btn').onclick = () => row.remove();
      rowsWrap.appendChild(row);
    };

    pairs.forEach(p => addRow(p.a, p.b));
    container.querySelector('#add-mem-pair-btn').onclick = () => addRow();
  }

  saveBuilderToConfig() {
    if (!this.currentConfig) return;

    this.currentConfig.title = document.getElementById('builder-title').value;
    this.currentConfig.instruction = document.getElementById('builder-instruction').value;
    this.currentConfig.theme = document.getElementById('builder-theme').value;

    const timerEnabled = document.getElementById('builder-timer-enabled').checked;
    if (timerEnabled) {
      this.currentConfig.timer = {
        enabled: true,
        mode: document.getElementById('builder-timer-mode').value,
        seconds: parseInt(document.getElementById('builder-timer-seconds').value) || 60
      };
    } else {
      this.currentConfig.timer = { enabled: false };
    }

    const livesVal = parseInt(document.getElementById('builder-lives').value);
    this.currentConfig.lives = livesVal > 0 ? livesVal : null;

    // Save type-specific fields
    switch (this.currentConfig.type) {
      case 'matching': {
        const rows = document.querySelectorAll('.builder-pair-row');
        const pairs = [];
        rows.forEach(r => {
          const l = r.querySelector('.pair-left').value.trim();
          const right = r.querySelector('.pair-right').value.trim();
          if (l && right) pairs.push({ left: l, right });
        });
        this.currentConfig.data = pairs;
        break;
      }
      case 'wordsearch': {
        const size = parseInt(document.getElementById('ws-builder-grid-size').value) || 10;
        const words = document.getElementById('ws-builder-words').value
          .split('\n')
          .map(w => w.trim())
          .filter(Boolean);
        this.currentConfig.data = { gridSize: size, words };
        break;
      }
      case 'reading': {
        const title = document.getElementById('reading-builder-title').value;
        const text = document.getElementById('reading-builder-text').value;
        const qCards = document.querySelectorAll('.builder-q-card');
        const questions = [];
        qCards.forEach(qc => {
          const qText = qc.querySelector('.q-text-input').value.trim();
          const opts = [
            qc.querySelector('.q-opt-0').value.trim(),
            qc.querySelector('.q-opt-1').value.trim(),
            qc.querySelector('.q-opt-2').value.trim(),
            qc.querySelector('.q-opt-3').value.trim()
          ];
          const ansIdx = parseInt(qc.querySelector('.q-correct-select').value) || 0;
          if (qText) questions.push({ question: qText, options: opts, answerIndex: ansIdx });
        });
        this.currentConfig.data = { passageTitle: title, passageText: text, questions };
        break;
      }
      case 'sorting': {
        const catRows = document.querySelectorAll('#sorting-cats-rows > div');
        const itemRows = document.querySelectorAll('#sorting-items-rows > div');
        const categories = [];
        catRows.forEach(cr => {
          categories.push({
            id: cr.querySelector('.sort-cat-id').value || cr.querySelector('.sort-cat-title').value.toLowerCase().replace(/\s/g, '_'),
            title: cr.querySelector('.sort-cat-title').value,
            icon: cr.querySelector('.sort-cat-icon').value || '📁',
            color: cr.querySelector('.sort-cat-color').value || '#3b82f6'
          });
        });
        const items = [];
        itemRows.forEach(ir => {
          const t = ir.querySelector('.sort-item-text').value.trim();
          const c = ir.querySelector('.sort-item-cat').value.trim();
          if (t) items.push({ text: t, categoryId: c });
        });
        this.currentConfig.data = { categories, items };
        break;
      }
      case 'cloze': {
        const text = document.getElementById('cloze-builder-text').value;
        const distractors = document.getElementById('cloze-builder-distractors').value
          .split(',')
          .map(d => d.trim())
          .filter(Boolean);
        this.currentConfig.data = { text, distractors };
        break;
      }
      case 'diagram': {
        const pinRows = document.querySelectorAll('#diagram-pins-rows > div');
        const labels = [];
        pinRows.forEach((pr, i) => {
          const name = pr.querySelector('.pin-name').value.trim();
          const x = parseFloat(pr.querySelector('.pin-x').value) || 300;
          const y = parseFloat(pr.querySelector('.pin-y').value) || 200;
          if (name) labels.push({ id: `p${i + 1}`, name, x, y });
        });
        this.currentConfig.data = Object.assign(this.currentConfig.data || {}, { labels });
        break;
      }
      case 'quiz': {
        const qRows = document.querySelectorAll('#quiz-builder-rows > div');
        const questions = [];
        qRows.forEach(qr => {
          const qText = qr.querySelector('.quiz-q-text').value.trim();
          const opts = [
            qr.querySelector('.quiz-opt-0').value.trim(),
            qr.querySelector('.quiz-opt-1').value.trim(),
            qr.querySelector('.quiz-opt-2').value.trim(),
            qr.querySelector('.quiz-opt-3').value.trim()
          ];
          const ansIdx = parseInt(qr.querySelector('.quiz-correct-select').value) || 0;
          if (qText) questions.push({ question: qText, options: opts, answerIndex: ansIdx });
        });
        this.currentConfig.data = { questions };
        break;
      }
      case 'wheel': {
        const items = document.getElementById('wheel-builder-items').value
          .split('\n')
          .map(i => i.trim())
          .filter(Boolean);
        this.currentConfig.data = { items };
        break;
      }
      case 'anagram': {
        const word = document.getElementById('anagram-builder-word').value.trim();
        const clue = document.getElementById('anagram-builder-clue').value.trim();
        this.currentConfig.data = { word, clue };
        break;
      }
      case 'speedtap': {
        const instr = document.getElementById('speedtap-builder-instr').value.trim();
        const targets = document.getElementById('speedtap-builder-targets').value.split(',').map(s => s.trim()).filter(Boolean);
        const distractors = document.getElementById('speedtap-builder-distractors').value.split(',').map(s => s.trim()).filter(Boolean);
        this.currentConfig.data = { instruction: instr, targets, distractors };
        break;
      }
      case 'memory': {
        const memRows = document.querySelectorAll('#memory-pairs-rows > div');
        const pairs = [];
        memRows.forEach(mr => {
          const a = mr.querySelector('.mem-a').value.trim();
          const b = mr.querySelector('.mem-b').value.trim();
          if (a && b) pairs.push({ a, b });
        });
        this.currentConfig.data = { pairs };
        break;
      }
    }
  }

  exportHtml() {
    this.saveBuilderToConfig();
    const slug = (this.currentConfig.title || 'activity').toLowerCase().replace(/[^a-z0-9]/g, '-');
    ActivityExporter.exportToHtml(this.currentConfig, `${slug}-game.html`);
  }

  downloadJson() {
    this.saveBuilderToConfig();
    const slug = (this.currentConfig.title || 'activity').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.currentConfig, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `${slug}.json`);
    dlAnchorElem.click();
  }

  renderWorksheet() {
    const wsContainer = document.getElementById('worksheet-view-stage');
    if (!wsContainer || !this.currentConfig) return;

    const cfg = this.currentConfig;
    let contentHtml = '';

    switch (cfg.type) {
      case 'matching': {
        const pairs = cfg.data || [];
        const lefts = pairs.map(p => p.left);
        const rights = pairs.map(p => p.right).sort(() => Math.random() - 0.5);
        contentHtml = `
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-top:24px;">
            <div style="display:flex; flex-direction:column; gap:20px;">
              ${lefts.map((l, i) => `
                <div style="display:flex; align-items:center; justify-content:space-between; border:1px solid #ccc; padding:12px; border-radius:8px;">
                  <span><b>${i + 1}.</b> ${l}</span>
                  <span style="display:inline-block; width:14px; height:14px; border:2px solid #333; border-radius:50%;"></span>
                </div>
              `).join('')}
            </div>
            <div style="display:flex; flex-direction:column; gap:20px;">
              ${rights.map((r, i) => `
                <div style="display:flex; align-items:center; justify-content:space-between; border:1px solid #ccc; padding:12px; border-radius:8px;">
                  <span style="display:inline-block; width:14px; height:14px; border:2px solid #333; border-radius:50%;"></span>
                  <span><b>(${String.fromCharCode(65 + i)})</b> ${r}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        break;
      }
      case 'reading': {
        const data = cfg.data || { passageTitle: '', passageText: '', questions: [] };
        contentHtml = `
          <div style="margin-top:20px;">
            <h3 style="border-bottom:2px solid #333; padding-bottom:6px;">${data.passageTitle}</h3>
            <div style="line-height:1.8; font-size:1.05rem; margin-bottom:24px;">
              ${(data.passageText || '').split('\n\n').map(p => `<p>${p}</p>`).join('')}
            </div>
            <h3>Comprehension Questions:</h3>
            <div style="display:flex; flex-direction:column; gap:20px;">
              ${(data.questions || []).map((q, i) => `
                <div style="margin-bottom:12px;">
                  <div style="font-weight:700; margin-bottom:8px;">${i + 1}. ${q.question}</div>
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                    ${q.options.map((opt, oIdx) => `
                      <div>[ ] (${String.fromCharCode(65 + oIdx)}) ${opt}</div>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        break;
      }
      case 'cloze': {
        const data = cfg.data || { text: '', distractors: [] };
        const cleanText = (data.text || '').replace(/\{([^}]+)\}/g, '__________________');
        contentHtml = `
          <div style="margin-top:24px; line-height:2.4; font-size:1.15rem;">
            ${cleanText}
          </div>
          <div style="margin-top:30px; border:2px dashed #999; padding:16px; border-radius:10px;">
            <b>Word Bank:</b>
            <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:8px;">
              ${((data.text || '').match(/\{([^}]+)\}/g) || []).map(m => m.replace(/[{}]/g, ''))
                .concat(data.distractors || [])
                .sort(() => Math.random() - 0.5)
                .map(w => `<span style="border:1px solid #666; padding:4px 12px; border-radius:999px;">${w}</span>`).join('')}
            </div>
          </div>
        `;
        break;
      }
      default: {
        contentHtml = `
          <div style="padding:30px; text-align:center; color:#666;">
            Printable worksheet rendering is available for Matching, Reading Comprehension, Cloze, and Quiz formats.
          </div>
        `;
      }
    }

    wsContainer.innerHTML = `
      <div class="worksheet-paper">
        <div class="ws-header">
          <div>
            <h2 style="margin:0;">${cfg.title}</h2>
            <div style="color:#666; font-size:0.95rem; margin-top:4px;">${cfg.instruction || ''}</div>
          </div>
          <div class="ws-student-info">
            <div><b>Name:</b> ___________________________</div>
            <div style="margin-top:6px;"><b>Date:</b> ____________ <b>Score:</b> _____/100</div>
          </div>
        </div>
        <hr style="border:none; border-top:2px solid #333; margin:16px 0;"/>
        ${contentHtml}
      </div>
    `;
  }
}

window.ActivityStudio = ActivityStudio;
