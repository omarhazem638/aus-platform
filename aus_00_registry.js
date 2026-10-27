// =============================================================================
// aus_00_registry.js  —  AUS Module Registry + Central Event Bus
// Foundation for Modular Architecture / Domain-Driven Design
// Every module communicates ONLY via events — never direct function calls
// Modules can be enabled/disabled without affecting others
// Also decides where the backend lives (Dynamic API Base → window.AUS_API_BASE)
// =============================================================================

(function () {
'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC API BASE — the one place that decides where the backend lives
//   • localhost / 127.0.0.1 / file://  → http://127.0.0.1:8002  (the local FastAPI dev server)
//   • any real server                  → the page's own origin   (nginx proxies /api/ to the backend)
//       …unless the API lives on another domain: add to <head>
//         <meta name="aus-api-base" content="https://api.example.com">
//   • local development only: localStorage 'aus.api.base' overrides the dev address (e.g. another port)
// Result: window.AUS_API_BASE (string, no trailing slash) and _AUS_UTILS.apiBase().
// ─────────────────────────────────────────────────────────────────────────────
var DEV_API_BASE = 'http://127.0.0.1:8002';

function _cleanBase(u) {
    u = String(u == null ? '' : u).trim().replace(/\/+$/, '');
    return /^https?:\/\/[^\s\/?#]+/i.test(u) ? u : '';      // absolute http(s) URLs only
}

function _resolveApiBase() {
    var loc = window.location, h = loc.hostname, v = '';
    if (loc.protocol === 'file:' || !h || h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || /\.localhost$/.test(h)) {
        try { v = _cleanBase(localStorage.getItem('aus.api.base')); } catch (e) {}
        return v || DEV_API_BASE;
    }
    var meta = document.querySelector('meta[name="aus-api-base"]');
    return (meta && _cleanBase(meta.getAttribute('content'))) || loc.origin;
}

var API_BASE = window.AUS_API_BASE = _resolveApiBase();

// Older files still contain the literal dev address (CHAT_API_BASE in aus_02_core.js, plus a few
// direct fetch() calls to 127.0.0.1:8002 / localhost:8002). Outside local development those
// fetch() calls are redirected to API_BASE, so the files follow the dynamic base without being
// edited. In local development nothing is touched (the shim is not even installed).
var LEGACY_API_ORIGINS = ['http://127.0.0.1:8002', 'http://localhost:8002'];
if (LEGACY_API_ORIGINS.indexOf(API_BASE) === -1 && typeof window.fetch === 'function') {
    var _nativeFetch = window.fetch;
    window.fetch = function (input, init) {
        try {
            var url = typeof input === 'string' ? input : (input && input.url) || String(input);
            for (var i = 0; i < LEGACY_API_ORIGINS.length; i++) {
                var o = LEGACY_API_ORIGINS[i];
                if (url.indexOf(o) === 0 && /^([\/?#]|$)/.test(url.slice(o.length))) {
                    var next = API_BASE + url.slice(o.length);
                    input = (typeof Request === 'function' && input instanceof Request) ? new Request(next, input) : next;
                    break;
                }
            }
        } catch (e) {}
        return _nativeFetch.call(window, input, init);
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// CENTRAL EVENT BUS — pub/sub for all inter-module communication
// Usage: _AUS_BUS.emit('STARTUP_CREATED', { id, title })
//        _AUS_BUS.on('STARTUP_CREATED', function(data) { ... })
// ─────────────────────────────────────────────────────────────────────────────
var _listeners  = {};
var _onceMap    = new Map();

window._AUS_BUS = {
    on: function (event, cb) {
        if (!_listeners[event]) _listeners[event] = [];
        _listeners[event].push(cb);
        return function () { window._AUS_BUS.off(event, cb); };  // returns unsubscribe fn
    },
    once: function (event, cb) {
        var wrapper = function (data) { window._AUS_BUS.off(event, wrapper); cb(data); };
        _onceMap.set(cb, wrapper);
        window._AUS_BUS.on(event, wrapper);
    },
    off: function (event, cb) {
        if (!_listeners[event]) return;
        var target = _onceMap.get(cb) || cb;
        _listeners[event] = _listeners[event].filter(function (fn) { return fn !== target; });
    },
    emit: function (event, data) {
        (_listeners[event] || []).slice().forEach(function (fn) {
            try { fn(data); } catch (e) { console.warn('[AUS_BUS] Error in handler for', event, e); }
        });
        // Global debug log (dev mode only)
        if (window._AUS_DEBUG) console.info('[BUS]', event, data);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// MODULE REGISTRY — tracks all modules, their status, and public API
// ─────────────────────────────────────────────────────────────────────────────
var _modules = {};
var _STORAGE_KEY = 'aus.modules.enabled';

function _loadPersistedStates() {
    try {
        var saved = JSON.parse(localStorage.getItem(_STORAGE_KEY) || '{}');
        Object.keys(saved).forEach(function (name) {
            if (_modules[name]) _modules[name].enabled = !!saved[name];
        });
    } catch (e) {}
}

function _persistStates() {
    try {
        var state = {};
        Object.keys(_modules).forEach(function (name) { state[name] = _modules[name].enabled; });
        localStorage.setItem(_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
}

window._AUS_REGISTRY = {
    // Called by each module on load: window._AUS_REGISTRY.register('startupBuilder', api, meta)
    register: function (name, api, meta) {
        var existing = _modules[name];
        _modules[name] = {
            name:    name,
            api:     api    || {},
            meta:    meta   || {},
            enabled: existing ? existing.enabled : (meta && meta.defaultEnabled !== false),
            loadedAt: Date.now()
        };
        _loadPersistedStates();
        window._AUS_BUS.emit('MODULE_REGISTERED', { name: name, enabled: _modules[name].enabled });
        if (window._AUS_DEBUG) console.info('[REGISTRY] Module registered:', name);
    },

    enable: function (name) {
        if (_modules[name]) {
            _modules[name].enabled = true;
            _persistStates();
            window._AUS_BUS.emit('MODULE_TOGGLE', { name: name, enabled: true });
            if (_modules[name].api.onEnable) _modules[name].api.onEnable();
        }
    },

    disable: function (name) {
        if (_modules[name]) {
            _modules[name].enabled = false;
            _persistStates();
            window._AUS_BUS.emit('MODULE_TOGGLE', { name: name, enabled: false });
            if (_modules[name].api.onDisable) _modules[name].api.onDisable();
        }
    },

    isEnabled: function (name) {
        return _modules[name] ? _modules[name].enabled : false;
    },

    get: function (name) {
        return _modules[name] || null;
    },

    getAPI: function (name) {
        var m = _modules[name];
        return (m && m.enabled) ? m.api : null;
    },

    list: function () {
        return Object.keys(_modules).map(function (name) {
            var m = _modules[name];
            return { name: name, enabled: m.enabled, meta: m.meta };
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM EVENT CONSTANTS — use these instead of magic strings
// ─────────────────────────────────────────────────────────────────────────────
window._AUS_EVENTS = {
    // Startup Builder
    STARTUP_CREATED:      'STARTUP_CREATED',
    STARTUP_ANALYZED:     'STARTUP_ANALYZED',
    CANVAS_GENERATED:     'CANVAS_GENERATED',
    PITCH_GENERATED:      'PITCH_GENERATED',
    IR_SCORE_UPDATED:     'IR_SCORE_UPDATED',
    // Business Sim
    SIM_STARTED:          'SIM_STARTED',
    SIM_DECISION_MADE:    'SIM_DECISION_MADE',
    SIM_COMPLETED:        'SIM_COMPLETED',
    // Incubator
    PROJECT_SUBMITTED:    'PROJECT_SUBMITTED',
    MILESTONE_COMPLETED:  'MILESTONE_COMPLETED',
    // Matching
    MATCH_FOUND:          'MATCH_FOUND',
    MATCH_ACCEPTED:       'MATCH_ACCEPTED',
    // Marketplace
    LISTING_CREATED:      'LISTING_CREATED',
    INVESTOR_INTERESTED:  'INVESTOR_INTERESTED',
    // Gamification (cross-module XP)
    XP_AWARDED:           'XP_AWARDED',
    BADGE_UNLOCKED:       'BADGE_UNLOCKED',
    FOUNDER_RANK_UP:      'FOUNDER_RANK_UP',
    // System
    MODULE_REGISTERED:    'MODULE_REGISTERED',
    MODULE_TOGGLE:        'MODULE_TOGGLE',
    PROFILE_UPDATED:      'PROFILE_UPDATED'
};

// ─────────────────────────────────────────────────────────────────────────────
// CROSS-MODULE XP BRIDGE — listens for XP_AWARDED events from any module
// and routes them to the existing gamification system in aus_01_data.js
// ─────────────────────────────────────────────────────────────────────────────
window._AUS_BUS.on('XP_AWARDED', function (data) {
    var amount = data && data.amount ? data.amount : 10;
    if (typeof addXP === 'function') {
        addXP(amount);
    } else {
        // Queue for when gamification loads
        window._pendingXP = (window._pendingXP || 0) + amount;
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// AI ROUTER — centralised Claude API calls with per-module context
// Usage: _AUS_AI.ask(module, userPrompt, systemPrompt, callback)
// ─────────────────────────────────────────────────────────────────────────────
window._AUS_AI = {
    _base: API_BASE,      // was the literal 'http://localhost:8002' — now the Dynamic API Base (top of this file)

    ask: function (module, userMsg, systemMsg, callback) {
        var body = {
            message: userMsg,
            history: [],
            system_override: systemMsg || null
        };
        fetch(window._AUS_AI._base + '/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(30000)
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            var text = ((data.text || data.response || data.content || '') + '').trim();
            if (callback) callback(null, text);
        })
        .catch(function (err) {
            if (callback) callback(err, null);
        });
    },

    // JSON-only request — strips markdown, parses JSON
    askJSON: function (module, userMsg, systemMsg, callback) {
        window._AUS_AI.ask(module, userMsg, systemMsg, function (err, text) {
            if (err) { callback(err, null); return; }
            try {
                var match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
                var json = JSON.parse(match ? match[0] : text);
                callback(null, json);
            } catch (e) {
                callback(new Error('JSON parse failed'), null);
            }
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UTILS — sanitization, modals, formatting
// ─────────────────────────────────────────────────────────────────────────────
window._AUS_UTILS = {
    // Backend address (see "DYNAMIC API BASE" at the top of this file)
    apiBase: function () { return API_BASE; },

    // XSS prevention — sanitize before any innerHTML insertion
    sanitize: function (str) {
        return String(str || '').replace(/[<>"'`&]/g, function (c) {
            return { '<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;','&':'&amp;' }[c];
        });
    },

    // Format number as currency
    currency: function (n) {
        if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
        if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
        if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
        return '$' + n;
    },

    // Score color
    scoreColor: function (score) {
        if (score >= 75) return '#00f5a0';
        if (score >= 50) return '#ffc800';
        return '#ff6b6b';
    },

    // Animated counter
    animateCount: function (el, target, duration) {
        var start = 0, step = target / (duration / 16);
        var raf = setInterval(function () {
            start = Math.min(start + step, target);
            el.textContent = Math.round(start);
            if (start >= target) clearInterval(raf);
        }, 16);
    },

    // Toast notification
    toast: function (msg, type) {
        var t = document.createElement('div');
        t.className = 'aus-toast';
        t.textContent = msg;
        t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);' +
            'background:' + (type === 'error' ? 'rgba(255,80,80,0.95)' : 'rgba(0,245,160,0.95)') + ';' +
            'color:#000;padding:10px 20px;border-radius:10px;z-index:99999;font-size:0.85rem;font-weight:700;' +
            'pointer-events:none;animation:aus-toast-in 0.3s ease';
        if (!document.getElementById('aus-toast-style')) {
            var s = document.createElement('style');
            s.id = 'aus-toast-style';
            s.textContent = '@keyframes aus-toast-in{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
            document.head.appendChild(s);
        }
        document.body.appendChild(t);
        setTimeout(function () { t.remove(); }, 3000);
    }
};

console.info('[AUS] Module Registry & Event Bus initialized — API base:', API_BASE);

})();
