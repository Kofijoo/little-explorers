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
      naturePath:     '../assets/images/backgrounds/nature-explorers-path.png',
      mathGarden:     '../assets/images/backgrounds/math-garden.png'
    }
  };

  // ---- Fallback for all <img> elements
  function installImgFallbacks() {
    const imgs = document.getElementsByTagName('img');
    for (const img of imgs) {
      img.addEventListener('error', () => {
        console.error(`Failed to load image: ${img.src}`);
        img.src = '../assets/images/fallback/placeholder.png';
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
    // Header bits
    header: $('#app-header'),
    backBtn: $('#back-btn'),
    selName: $('#selected-name'),
    selPortrait: $('#selected-portrait'),
  };

  // ---- State
  const state = {
    view: 'menu',            // 'menu' | 'character' | 'game'
    character: null,         // 'leo' | 'ella' | 'pip' | 'gina' | null
    activeScene: 'discovery-zone',   // NEW
  };


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
      setScene(state.activeScene);    // NEW
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
        console.log('Character selected:', state.character);
        setView('game');
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

  // ---- Boot
  document.addEventListener('DOMContentLoaded', () => {
    installImgFallbacks();
    bindUI();
    startLoading();
    if (el.loadingIndicator) el.loadingIndicator.style.display = 'none';
    logMissingAssets();
    renderHeader();
    // Debug handle
    bindSceneSwitcher();        // NEW
    bootstrapSceneFromURL();    // NEW
    window.LE = { state, setView, setScene }; // expose setScene too

  });
})();
