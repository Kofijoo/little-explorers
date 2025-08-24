// ui/layout.js
(() => {
  'use strict';

  // ----------------------------
  // Assets (filenames are case-exact)
  // ----------------------------
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

  // ----------------------------
  // Fallbacks + diagnostics
  // ----------------------------
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

  // ----------------------------
  // Tiny DOM helpers
  // ----------------------------
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const show = el => el && el.classList.remove('hidden');
  const hide = el => el && el.classList.add('hidden');

  // Scenes available
  const SCENES = ['discovery-zone','science-corner','nature-path','math-garden'];

  // ----------------------------
  // Scene switching
  // ----------------------------
  function setScene(id){
    if (!SCENES.includes(id)) id = 'discovery-zone';
    state.activeScene = id;

    // toggle scene DOM
    $$('#activity-areas .activity-area').forEach(a => {
      a.classList.toggle('active', a.id === id);
    });

    // toggle switcher UI
    $$('.scene-switcher [data-scene]').forEach(b => {
      const active = b.dataset.scene === id;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    });

    // persist + shallow routing
    try { localStorage.setItem('le.activeScene', id); } catch {}
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    hash.set('scene', id);
    history.replaceState(null, '', '#' + hash.toString());
  }

  function bindSceneSwitcher(){
    $$('.scene-switcher [data-scene]').forEach(btn => {
      btn.addEventListener('click', () => setScene(btn.dataset.scene));
    });
  }

  function bootstrapSceneFromURL(){
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    const fromHash = hash.get('scene');
    let initial = 'discovery-zone';
    try {
      const fromStorage = localStorage.getItem('le.activeScene');
      if (SCENES.includes(fromStorage)) initial = fromStorage;
    } catch {}
    if (SCENES.includes(fromHash)) initial = fromHash;
    setScene(initial);
  }

  // ----------------------------
  // Elements
  // ----------------------------
  const el = {
    mainMenu: $('#main-menu'),
    game: $('#game-container'),
    charSelect: $('#character-select'),
    activity: $('#activity-areas'),
    startBtn: $('#start-game'),
    selectBtn: $('#select-character'),
    settingsBtn: $('#settings'),
    loadingScreen: $('#loading-screen'),
    loadingBar: document.querySelector('.loading-bar'),
    loadingIndicator: $('#loading-indicator'),
    header: $('#app-header'),
    backBtn: $('#back-btn'),
    selName: $('#selected-name'),
    selPortrait: $('#selected-portrait'),
    // Chat
    toggleChat: $('#toggle-chat'),
    chatPanel: $('#chat-panel'),
    chatLog: $('#chat-log'),
    chatForm: $('#chat-form'),
    chatInput: $('#chat-input'),
  };

  // ----------------------------
  // State
  // ----------------------------
  const state = {
    view: 'menu',                 // 'menu' | 'character' | 'game'
    character: null,              // 'leo' | 'ella' | 'pip' | 'gina' | null
    activeScene: 'discovery-zone',
    chatOpen: false,
  };

  // ----------------------------
  // Header rendering
  // ----------------------------
  function renderHeader(){
    const id = state.character;
    if (!id || !UI_ASSETS.characters[id]) {
      if (el.selName) el.selName.textContent = 'No character';
      if (el.selPortrait) { el.selPortrait.style.display = 'none'; el.selPortrait.src = ''; }
      return;
    }
    if (el.selName) el.selName.textContent = id.charAt(0).toUpperCase() + id.slice(1);
    if (el.selPortrait) {
      el.selPortrait.src = UI_ASSETS.characters[id].portrait;
      el.selPortrait.style.display = 'inline-block';
    }
  }

  // ----------------------------
  // View switching
  // ----------------------------
  function setView(view) {
    state.view = view;

    if (view === 'menu') {
      show(el.mainMenu); hide(el.game); hide(el.header);
      hide(el.chatPanel);
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

  // ----------------------------
  // Loading bar (simple)
  // ----------------------------
  function startLoading() {
    if (!el.loadingBar) { setView('menu'); return; }
    let p = 0;
    const id = setInterval(() => {
      p = Math.min(100, p + 2);
      el.loadingBar.style.width = p + '%'; // crude progress
      if (p >= 100) {
        clearInterval(id);
        el.loadingScreen?.classList.add('hidden');
        setView('menu');
      }
    }, 30);
  }

  // ----------------------------
  // Base UI binds
  // ----------------------------
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
        setView('game');
        // greet in chat when chosen
        if (state.chatOpen) {
          appendBot(`Hi! I’m ${cap(state.character)}. Ask for an “activity idea” or switch scenes with the tabs.`);
        }
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
  }

  // ----------------------------
  // Chat helpers + bindings
  // ----------------------------
  function cap(s){ return s ? s[0].toUpperCase() + s.slice(1) : s; }
  function escapeHTML(s){ return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

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
    el.chatLog.scrollTop = el.chatLog.scrollHeight;
  }

  function appendBot(text){
    if (!el.chatLog) return;
    el.chatLog.appendChild(elMsg('bot', text));
    el.chatLog.scrollTop = el.chatLog.scrollHeight;
  }

  // very small “bot”
  function reply(text){
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

  function bindChat(){
    if (!el.toggleChat || !el.chatPanel) return;

    const setOpen = (open) => {
      state.chatOpen = open;
      el.toggleChat.setAttribute('aria-expanded', String(open));
      el.chatPanel.classList.toggle('hidden', !open);
      if (open) el.chatInput?.focus();
      try { localStorage.setItem('le.chatOpen', open ? '1' : '0'); } catch {}
    };

    el.toggleChat.addEventListener('click', () => setOpen(!state.chatOpen));

    // restore persisted state
    try { setOpen(localStorage.getItem('le.chatOpen') === '1'); } catch {}

    // greet once on first open
    if (state.chatOpen && el.chatLog && el.chatLog.children.length === 0) {
      appendBot(`Hello! I’m ${cap(state.character) || 'your helper'}. Ask for an “activity idea” or switch scenes with the tabs.`);
    }

    // submit handler
    el.chatForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = el.chatInput.value;
      if (!text.trim()) return;
      appendUser(text);
      el.chatInput.value = '';
      const r = reply(text);
      appendBot(r);
    });
  }

  // ----------------------------
  // Boot
  // ----------------------------
  document.addEventListener('DOMContentLoaded', () => {
    installImgFallbacks();
    bindUI();
    bindSceneSwitcher();
    bootstrapSceneFromURL();
    bindChat();
    startLoading();
    el.loadingIndicator && (el.loadingIndicator.style.display = 'none');
    logMissingAssets();
    renderHeader();

    // Debug / programmatic control
    window.LE = {
      state,
      setView,
      setScene,
      send(text){ appendUser(text); appendBot(reply(text)); }
    };
  });
})();
