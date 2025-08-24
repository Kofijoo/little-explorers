// ui/layout.js
(() => {
  'use strict';

  // ======================================================
  // Basic config (optionally provided by index.html script)
  // ======================================================
  const CONFIG = (typeof window !== 'undefined' && window.LE_CONFIG) ? window.LE_CONFIG : { proxyUrl: '' };

  // ======================================================
  // Assets (filenames are case-exact)
  // ======================================================
  const UI_ASSETS = {
    characters: {
      leo:  { portrait: '../assets/images/characters/leo.png',  fullBody: '../assets/images/characters/leo.png'  },
      ella: { portrait: '../assets/images/characters/ella.png', fullBody: '../assets/images/characters/ella.png' },
      pip:  { portrait: '../assets/images/characters/pip.png',  fullBody: '../assets/images/characters/pip.png'  },
      gina: { portrait: '../assets/images/characters/gina.png', fullBody: '../assets/images/characters/gina.png' }
    },
    backgrounds: {
      discoveryZone: '../assets/images/backgrounds/discovery-zone.png',
      scienceCorner: '../assets/images/backgrounds/science-corner.png',
      naturePath:    '../assets/images/backgrounds/nature-explorers-path.png',
      mathGarden:    '../assets/images/backgrounds/math-garden.png'
    }
  };

  const SCENES = ['discovery-zone', 'science-corner', 'nature-path', 'math-garden'];
  const LS = {
    scene: 'le.activeScene',
    character: 'le.character',
    chatOpen: 'le.chatOpen',
    chatHistory: 'le.chatHistory'
  };

  // ======================================================
  // Fallbacks + diagnostics
  // ======================================================
  const PLACEHOLDER =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="100%" height="100%" fill="#eee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#888" font-family="Arial" font-size="14">image missing</text></svg>');

  function installImgFallbacks() {
    const imgs = document.getElementsByTagName('img');
    for (const img of imgs) {
      img.addEventListener('error', () => {
        console.error('Failed to load image:', img.src);
        img.onerror = null;
        img.src = PLACEHOLDER;
      }, { once: true });
    }
  }

  function logMissingAssets() {
    const urls = [
      ...Object.values(UI_ASSETS.characters).flatMap(c => [c.portrait, c.fullBody]),
      ...Object.values(UI_ASSETS.backgrounds)
    ];
    urls.forEach(src => {
      const probe = new Image();
      probe.onload  = () => console.debug('Loaded:', src);
      probe.onerror = () => console.error('Failed:', src);
      probe.src = src;
    });
  }

  // ======================================================
  // Tiny DOM helpers
  // ======================================================
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const show = el => el && el.classList.remove('hidden');
  const hide = el => el && el.classList.add('hidden');
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const escapeHTML = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }
  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  }

  // ======================================================
  // Elements
  // ======================================================
  const el = {
    // sections
    mainMenu: $('#main-menu'),
    game: $('#game-container'),
    activity: $('#activity-areas'),
    charSelect: $('#character-select'),

    // header + global
    header: $('#app-header'),
    backBtn: $('#back-btn'),
    startBtn: $('#start-game'),
    selectBtn: $('#select-character'),
    settingsBtn: $('#settings'),
    selName: $('#selected-name'),
    selPortrait: $('#selected-portrait'),

    // tabs
    tabs: $$('.scene-switcher .tab'),
    tablist: $('.scene-switcher'),

    // loader
    loadingScreen: $('#loading-screen'),
    loadingBar: document.querySelector('.loading-bar'),
    loadingIndicator: $('#loading-indicator'),

    // chat
    toggleChat: $('#toggle-chat'),
    chatPanel: $('#chat-panel'),
    chatLog: $('#chat-log'),
    chatForm: $('#chat-form'),
    chatInput: $('#chat-input')
  };

  // ======================================================
  // State
  // ======================================================
  const state = {
    view: 'menu',                                     // 'menu' | 'character' | 'game'
    character: load(LS.character, null),              // 'leo' | 'ella' | 'pip' | 'gina' | null
    activeScene: load(LS.scene, 'discovery-zone'),
    chatOpen: load(LS.chatOpen, false),
    chatHistory: load(LS.chatHistory, [])             // [{who:'user'|'bot', text:'...', ts: number}]
  };

  // ======================================================
  // View switching
  // ======================================================
  function setView(view) {
    state.view = view;

    if (view === 'menu') {
      show(el.mainMenu); hide(el.game); hide(el.header); hide(el.chatPanel);
    } else if (view === 'character') {
      hide(el.mainMenu); show(el.game);
      show(el.charSelect); hide(el.activity); show(el.header);
      if (!state.chatOpen) hide(el.chatPanel);
    } else if (view === 'game') {
      hide(el.mainMenu); show(el.game);
      hide(el.charSelect); show(el.activity); show(el.header);
      setScene(state.activeScene);
      if (state.chatOpen) show(el.chatPanel);
    } else {
      console.error('Unknown view:', view);
    }
    renderHeader();
  }

  // ======================================================
  // Header rendering
  // ======================================================
  function renderHeader(){
    const id = state.character;
    if (!id || !UI_ASSETS.characters[id]) {
      el.selName && (el.selName.textContent = 'No character');
      if (el.selPortrait) { el.selPortrait.style.display = 'none'; el.selPortrait.src = ''; }
      return;
    }
    el.selName && (el.selName.textContent = cap(id));
    if (el.selPortrait) {
      el.selPortrait.src = UI_ASSETS.characters[id].portrait;
      el.selPortrait.style.display = 'inline-block';
    }
  }

  // ======================================================
  // Scene switching (tabs)
  // ======================================================
  function updateTabsForScene(id) {
    el.tabs.forEach(btn => {
      const active = btn.dataset.scene === id;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
      btn.setAttribute('tabindex', active ? '0' : '-1');
    });

    // panels
    $$('#activity-areas .activity-area').forEach(p => {
      const isActive = (p.id === id);
      p.classList.toggle('active', isActive);
      p.setAttribute('aria-hidden', String(!isActive));
    });
  }

  function setScene(id) {
    if (!SCENES.includes(id)) id = 'discovery-zone';
    state.activeScene = id;
    updateTabsForScene(id);

    // persist + shallow routing
    save(LS.scene, id);
    const params = new URLSearchParams(location.hash.replace(/^#/, ''));
    params.set('scene', id);
    history.replaceState(null, '', '#' + params.toString());
  }

  function bindSceneSwitcher() {
    // mouse / touch
    el.tabs.forEach(btn => {
      btn.addEventListener('click', () => setScene(btn.dataset.scene));
    });

    // keyboard (roving tabindex)
    el.tablist?.addEventListener('keydown', (e) => {
      const idx = el.tabs.findIndex(b => b.dataset.scene === state.activeScene);
      let next = idx;
      if (e.key === 'ArrowRight') next = (idx + 1) % el.tabs.length;
      else if (e.key === 'ArrowLeft') next = (idx - 1 + el.tabs.length) % el.tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = el.tabs.length - 1;
      else return;

      e.preventDefault();
      const target = el.tabs[next];
      setScene(target.dataset.scene);
      target.focus();
    });
  }

  function bootstrapSceneFromURL() {
    const params = new URLSearchParams(location.hash.replace(/^#/, ''));
    const fromHash = params.get('scene');
    if (SCENES.includes(fromHash)) {
      state.activeScene = fromHash;
    }
    updateTabsForScene(state.activeScene);
  }

  // ======================================================
  // Loading bar (simple)
  // ======================================================
  function startLoading() {
    if (!el.loadingBar) { setView('menu'); return; }
    let p = 0;
    const id = setInterval(() => {
      p = Math.min(100, p + 2);
      el.loadingBar.style.width = p + '%';
      if (p >= 100) {
        clearInterval(id);
        el.loadingScreen?.classList.add('hidden');
        setView('menu');
      }
    }, 30);
  }

  // ======================================================
  // Character selection + base UI binds
  // ======================================================
  function bindUI() {
    el.startBtn?.addEventListener('click', () => setView('game'));
    el.selectBtn?.addEventListener('click', () => setView('character'));
    el.settingsBtn?.addEventListener('click', () => alert('Settings: coming soon.'));
    el.backBtn?.addEventListener('click', () => setView('menu'));

    // Character selection
    $$('#character-select .character-option').forEach(opt => {
      opt.style.cursor = 'pointer';
      opt.setAttribute('role', 'button');
      opt.tabIndex = 0;

      const choose = () => {
        state.character = opt.dataset.character || null;
        save(LS.character, state.character);
        setView('game');
        if (state.chatOpen) {
          appendBot(`Hi! I’m ${cap(state.character)}. Ask for an “activity idea” or switch scenes with the tabs.`);
        }
        renderHeader();
      };

      opt.addEventListener('click', choose);
      opt.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); }
      });
    });

    // Esc → main menu
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') setView('menu');
    });

    // If a character was previously chosen, reflect in header immediately
    renderHeader();
  }

  // ======================================================
  // Chat helpers + bindings
  // ======================================================
  function elMsg(who, text){
    const d = document.createElement('div');
    d.className = 'msg ' + (who === 'you' ? 'user' : 'bot');
    d.innerHTML = `<div class="who">${who === 'you' ? 'You' : (state.character ? cap(state.character) : 'Guide')}</div>
                   <div class="text">${escapeHTML(text)}</div>`;
    return d;
  }

  function appendUser(text){
    if (!el.chatLog) return;
    el.chatLog.appendChild(elMsg('you', text));
    scrollChatToEnd();
    state.chatHistory.push({ who:'user', text, ts: Date.now() });
    save(LS.chatHistory, state.chatHistory);
  }

  function appendBot(text){
    if (!el.chatLog) return;
    el.chatLog.appendChild(elMsg('bot', text));
    scrollChatToEnd();
    state.chatHistory.push({ who:'bot', text, ts: Date.now() });
    save(LS.chatHistory, state.chatHistory);
  }

  function scrollChatToEnd(){
    try { el.chatLog.scrollTop = el.chatLog.scrollHeight; } catch {}
  }

  function restoreChatFromHistory(){
    if (!el.chatLog) return;
    el.chatLog.innerHTML = '';
    for (const m of state.chatHistory) {
      el.chatLog.appendChild(elMsg(m.who === 'user' ? 'you' : 'bot', m.text));
    }
    scrollChatToEnd();
  }

  function setChatOpen(open) {
    state.chatOpen = open;
    save(LS.chatOpen, open);
    el.toggleChat?.setAttribute('aria-expanded', String(open));
    el.chatPanel?.classList.toggle('hidden', !open);
    if (open && el.chatInput) el.chatInput.focus();

    // greet once if empty
    if (open && state.chatHistory.length === 0) {
      appendBot(`Hello! I’m ${cap(state.character) || 'your helper'}. Ask for an “activity idea” or switch scenes with the tabs.`);
    }
  }

  function bindChat(){
    if (!el.toggleChat || !el.chatPanel) return;

    // restore persisted state + history
    setChatOpen(Boolean(state.chatOpen));
    restoreChatFromHistory();

    el.toggleChat.addEventListener('click', () => setChatOpen(!state.chatOpen));

    el.chatForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = (el.chatInput?.value || '').trim();
      if (!text) return;
      el.chatInput.value = '';
      appendUser(text);

      const r = await llmReply(text).catch(err => {
        console.error('LLM error:', err);
        return toyReply(text);
      });
      appendBot(r);
    });
  }

  // ======================================================
  // Local toy replies (client-only fallback)
  // ======================================================
  function toyReply(text){
    const who = cap(state.character) || 'Friend';
    const scene = state.activeScene.replace('-', ' ');
    const lower = text.trim().toLowerCase();

    // navigate scenes by text
    const toScene = {
      discovery: 'discovery-zone',
      science:   'science-corner',
      nature:    'nature-path',
      math:      'math-garden',
    };
    for (const key of Object.keys(toScene)){
      if (lower.includes(key)) {
        setScene(toScene[key]);
        return `Okay! Switched to the ${toScene[key].replace('-', ' ')}.`;
      }
    }

    if (!text.trim()) return `Say something like “What can I do here?”`;
    if (/(hello|hi|hey)\b/.test(lower)) return `Hi! I’m ${who}. We’re in the ${scene}. Want an activity idea?`;

    if (/what.*do|activity|idea/.test(lower)){
      const ideas = {
        'discovery-zone': `Find 3 shapes and name them.`,
        'science-corner': `Guess which objects will sink or float, then test your guess!`,
        'nature-path':    `Count 5 green things you can see.`,
        'math-garden':    `Make 10 using two numbers in your head.`,
      };
      return ideas[state.activeScene] || `Explore and tell me what you notice.`;
    }

    if (/who.*you|name/.test(lower)) return `I’m ${who}, your helper. Pick a different buddy anytime from Character Select.`;
    if (/help|stuck|hint/.test(lower)) return `Click another scene tab or ask me for an “activity idea”.`;

    return `Nice! In the ${scene}, you can also ask for an “activity idea”, or say “go to nature / science / math / discovery”.`;
  }

  // ======================================================
  // LLM reply via proxy (optional)
  // - Do NOT put API keys in client code.
  // - Provide a serverless function that accepts {messages, meta}
  //   and returns JSON: { reply: "..." }.
  // ======================================================
  async function llmReply(userText){
    // If no proxy URL is configured, fallback locally
    if (!CONFIG.proxyUrl) return toyReply(userText);

    const messages = [
      { role: 'system', content: 'You are a friendly learning guide for kids. Keep responses short, positive, and concrete. If asked to switch scenes, answer with a helpful tip instead; scene changes are handled by the UI.' },
      // Include a tiny bit of context for the model
      { role: 'user', content: `Current scene: ${state.activeScene}. Character: ${state.character || 'none'}.` },
      // Last few turns (trim to keep payload small)
      ...state.chatHistory.slice(-8).map(m => ({ role: m.who === 'user' ? 'user' : 'assistant', content: m.text })),
      { role: 'user', content: userText }
    ];

    const payload = {
      messages,
      meta: {
        scene: state.activeScene,
        character: state.character || ''
      }
    };

    const res = await fetch(CONFIG.proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // You may add credentials: 'include' if your proxy needs cookies for auth
    });

    if (!res.ok) {
      console.error('Proxy error:', res.status, await res.text().catch(() => ''));
      return toyReply(userText);
    }
    const data = await res.json().catch(() => ({}));
    if (!data || typeof data.reply !== 'string') {
      return toyReply(userText);
    }
    return data.reply;
  }

  // ======================================================
  // Boot
  // ======================================================
  document.addEventListener('DOMContentLoaded', () => {
    installImgFallbacks();
    bindUI();
    bindSceneSwitcher();
    bootstrapSceneFromURL();
    bindChat();
    startLoading();
    el.loadingIndicator && (el.loadingIndicator.style.display = 'none');
    logMissingAssets();

    // If a character was persisted and we're landing directly into game, reflect that
    renderHeader();

    // Expose minimal debug handle
    window.LE = {
      state,
      setView,
      setScene,
      send(text){ appendUser(text); appendBot(toyReply(text)); } // local quick-send helper
    };
  });
})();
