// ui/layout.js
(() => {
  'use strict';

  // ---- Asset catalog (normalized filenames)
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
      naturePath:   '../assets/images/backgrounds/nature-explorers-path.png',
      mathGarden:   '../assets/images/backgrounds/math-garden.png'
    }
  };

  // ---- Fallback for all <img> elements (data-URI placeholder, no extra file needed)
  const PLACEHOLDER =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="100%" height="100%" fill="#eee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#888" font-family="Arial" font-size="14">image missing</text></svg>');

  function installImgFallbacks() {
    const imgs = document.getElementsByTagName('img');
    for (const img of imgs) {
      img.addEventListener('error', () => {
        console.error(`Failed to load image: ${img.src}`);
        img.onerror = null;
        img.src = PLACEHOLDER;
      }, { once: true });
    }
  }

  // ---- Log asset availability (non-blocking)
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

  // ---- Tiny DOM helpers
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const show = el => el && el.classList.remove('hidden');
  const hide = el => el && el.classList.add('hidden');

  const SCENES = ['discovery-zone','science-corner','nature-path','math-garden'];

  // ---- Elements
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
    toggleChatBtn: $('#toggle-chat'),
    chatPanel: $('#chat-panel'),
    chatLog: $('#chat-log'),
    chatForm: $('#chat-form'),
    chatInput: $('#chat-input'),
  };

  // ---- State
  const state = {
    view: 'menu',                 // 'menu' | 'character' | 'game'
    character: null,              // 'leo' | 'ella' | 'pip' | 'gina' | null
    activeScene: 'discovery-zone',
    chatOpen: false,
    chat: []                      // [{role:'user'|'bot', text:string}]
  };

  // ---- Header render
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

  // ---- Scene switching
  function setScene(id){
    if (!SCENES.includes(id)) id = 'discovery-zone';
    state.activeScene = id;

    // toggle scene DOM
    $$('#activity-areas .activity-area').forEach(a => {
      a.classList.toggle('active', a.id === id);
    });

    // toggle switcher UI
    $$('.scene-switcher [data-scene]').forEach(b => {
      b.classList.toggle('active', b.dataset.scene === id);
    });

    // persist + shallow routing
    try { localStorage.setItem('le.activeScene', id); } catch {}
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    hash.set('scene', id);
    history.replaceState(null, '', '#' + hash.toString());

    // Announce in chat (non-intrusive)
    if (state.chatOpen) {
      addMsg('bot', sceneIntroText());
      persistChat();
    }
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

  // ---- Views
  function setView(view) {
    state.view = view;

    if (view === 'menu') {
      show(el.mainMenu); hide(el.game);
      hide(el.header);
    } else if (view === 'character') {
      hide(el.mainMenu);  show(el.game);
      show(el.charSelect);  hide(el.activity);
      show(el.header);
    } else if (view === 'game') {
      hide(el.mainMenu);  show(el.game);
      hide(el.charSelect);  show(el.activity);
      show(el.header);
      setScene(state.activeScene);
    } else {
      console.error('Unknown view:', view);
    }
    renderHeader();
  }

  // ---- Loading bar
  function startLoading() {
    if (!el.loadingBar) { setView('menu'); return; }
    let p = 0;
    const id = setInterval(() => {
      p = Math.min(100, p + 2);
      el.loadingBar.style.width = p + '%';
      if (p >= 100) {
        clearInterval(id);
        if (el.loadingScreen) el.loadingScreen.classList.add('hidden');
        setView('menu');
      }
    }, 30);
  }

  // ---- Chat helpers
  function cap(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  function sceneLabel(){
    switch(state.activeScene){
      case 'science-corner': return 'Science Corner';
      case 'nature-path':    return 'Nature Path';
      case 'math-garden':    return 'Math Garden';
      default:               return 'Discovery Zone';
    }
  }

  function sceneIntroText(){
    const name = state.character ? cap(state.character) : 'Explorer';
    return `You’re now in the ${sceneLabel()}, ${name}. What would you like to try here?`;
  }

  function addMsg(role, text){
    if (!el.chatLog) return;
    const wrap = document.createElement('div');
    wrap.className = 'msg ' + (role === 'user' ? 'user' : 'bot');

    const who = document.createElement('div');
    who.className = 'who';
    who.textContent = role === 'user' ? 'You' : 'Guide';

    const body = document.createElement('div');
    body.className = 'text';
    body.textContent = text;

    wrap.appendChild(who);
    wrap.appendChild(body);
    el.chatLog.appendChild(wrap);
    el.chatLog.scrollTop = el.chatLog.scrollHeight;

    state.chat.push({ role, text });
  }

  function generateReply(userText){
    const name = state.character ? cap(state.character) : 'Explorer';
    const scene = sceneLabel();

    // tiny heuristic “assistant”
    const t = userText.toLowerCase();
    if (t.includes('hello') || t.includes('hi')) {
      return `Hi ${name}! Welcome to the ${scene}.`;
    }
    if (t.includes('help')) {
      return `Here’s a tip: tap the scene tabs to switch areas. In ${scene}, try describing what you see.`;
    }
    if (t.includes('math')) {
      return `In Math Garden, start with counting objects you can spot in the picture.`;
    }
    if (t.includes('science')) {
      return `In Science Corner, try predicting what happens if we mix or move things around.`;
    }
    // default echo with context
    return `Got it, ${name}. We’re in ${scene}. You said: “${userText}”.`;
  }

  function persistChat(){
    try {
      localStorage.setItem('le.chat', JSON.stringify(state.chat.slice(-100))); // cap length
    } catch {}
  }

  function restoreChat(){
    try {
      const raw = localStorage.getItem('le.chat');
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach(m => addMsg(m.role, m.text));
      }
    } catch {}
  }

  function openChat(open){
    state.chatOpen = !!open;
    if (!el.chatPanel || !el.toggleChatBtn) return;
    el.chatPanel.classList.toggle('hidden', !open);
    el.toggleChatBtn.setAttribute('aria-expanded', String(open));
    if (open) setTimeout(() => el.chatInput?.focus(), 0);
  }

  // ---- Bind UI events
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
        try { localStorage.setItem('le.character', state.character || ''); } catch {}
        console.log('Character selected:', state.character);
        setView('game');
        if (state.chatOpen) { addMsg('bot', `Nice choice — ${cap(state.character)}!`); persistChat(); }
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

    // Chat toggle
    el.toggleChatBtn?.addEventListener('click', () => openChat(!state.chatOpen));

    // Chat submit
    el.chatForm?.addEventListener('submit', e => {
      e.preventDefault();
      const txt = el.chatInput?.value?.trim() || '';
      if (!txt) return;
      addMsg('user', txt);
      el.chatInput.value = '';
      persistChat();
      setTimeout(() => {
        const reply = generateReply(txt);
        addMsg('bot', reply);
        persistChat();
      }, 250);
    });
  }

  function restoreCharacter(){
    try {
      const c = localStorage.getItem('le.character');
      if (c) state.character = c;
    } catch {}
  }

  // ---- Boot
  document.addEventListener('DOMContentLoaded', () => {
    installImgFallbacks();
    bindUI();
    startLoading();

    if (el.loadingIndicator) el.loadingIndicator.style.display = 'none';
    logMissingAssets();

    restoreCharacter();
    renderHeader();

    bindSceneSwitcher();
    bootstrapSceneFromURL();

    // Chat init
    restoreChat();
    openChat(false); // start closed by default

    // Debug handle
    window.LE = { state, setView, setScene, openChat };
  });
})();
