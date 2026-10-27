/* ================================================================
   AUS — مفتاح المؤثرات والحركات (FX mode: cinematic ⇄ calm performance)
   ----------------------------------------------------------------
   حالة واحدة تتحكم بكل المؤثرات: localStorage['aus_fx_enabled'] = 'true' | 'false'
   (غير موجود = تشغيل، أي التصميم السينمائي الحالي كما هو).

   • ON  : كل شيء كما كان (starfield · nebulae · galaxy particles · scanlines · animations …)
   • OFF : وضع الأداء الهادئ — تُخفى الكانفاس وطبقات الشبكة/الخطوط، تتوقف حلقات الرسم الثقيلة،
           تُعطَّل الحركات، وتصبح الخلفية لوناً داكناً ثابتاً (#000814).
   • التغيير فوري (بدون إعادة تحميل) ويُزامَن بين: خيارَي الـ Splash، مفتاح الإعدادات ← ⚡ الأداء،
     مفتاح "✨ تأثيرات بصرية" القديم (opt-fx)، والتبويبات الأخرى (storage event).

   كيف يعمل (بلا تكرار لأنظمة موجودة):
     1) سكربت صغير في <head> (index.html) يقرأ المفتاح قبل أول رسم ويضع html.aus-fx-off + window.__AUS_FX_ON.
     2) CSS الوضع الهادئ في index.html يخفي الطبقات ويثبّت الخلفية (بدون أي إنشاء عناصر هنا).
     3) هذا الملف: set()/toggle() → يحدّث الحالة + prefs.fx (المؤشر القديم الذي تقرؤه حلقات الـ FX) +
        يستدعي نقاط المزامنة التي يملكها كل نظام:  syncStarfield() [aus_02] · syncSpaceFx() · syncNeonCity() [aus_03].

   API:  AUS_FX.enabled · AUS_FX.set(bool, {source, persist}) · AUS_FX.toggle() · AUS_FX.onChange(cb)
   حدث:  window 'aus-fx-changed' {detail:{enabled, source}} · _AUS_BUS 'FX_CHANGED'
   ================================================================ */
(function () {
    'use strict';
    if (window.AUS_FX) return;

    var KEY = 'aus_fx_enabled';
    var enabled = window.__AUS_FX_ON !== false;          // decided by the <head> script before first paint
    var subs = [];

    function _persist(on) {
        try { localStorage.setItem(KEY, on ? 'true' : 'false'); } catch (e) { /* private mode: the choice lives for this session only */ }
    }

    // A system's own sync hook (function declarations in classic scripts are window props).
    function _hook(name) {
        var fn = window[name];
        if (typeof fn !== 'function') return;
        try {
            var r = fn();
            if (r && typeof r.catch === 'function') r.catch(function (e) { console.warn('[AUS_FX]', name, e); });   // async hooks (initSpaceFx)
        } catch (e) { console.warn('[AUS_FX]', name, e); }
    }

    // Splash options + both settings switches always mirror the one real state.
    function _syncUi() {
        var opts = document.querySelectorAll('.splash-fx-opt');
        for (var i = 0; i < opts.length; i++) {
            var sel = (opts[i].getAttribute('data-fx') === 'on') === enabled;
            opts[i].classList.toggle('active', sel);
            opts[i].setAttribute('aria-pressed', sel ? 'true' : 'false');
        }
        ['opt-fx-master', 'opt-fx'].forEach(function (id) {           // opt-fx = the older "✨ تأثيرات بصرية" switch (same flag)
            var el = document.getElementById(id);
            if (el && el.checked !== enabled) el.checked = enabled;
        });
    }

    // Idempotent: makes the whole page match `enabled`. source 'boot' = first sync after load (builds nothing new).
    function _apply(source) {
        var on = enabled;
        window.__AUS_FX_ON = on;
        document.documentElement.classList.toggle('aus-fx-off', !on);

        // The flag every older FX loop already reads (cursor FX, magnetic cards, ambient light, trails …) + body.fx-on CSS
        if (typeof prefs !== 'undefined' && prefs && prefs.fx !== on) {
            prefs.fx = on;
            if (typeof savePrefs === 'function') { try { savePrefs(); } catch (e) {} }
        }
        if (document.body) {
            document.body.classList.toggle('fx-on', on);
            var halo = document.getElementById('cursor-halo');
            if (halo) halo.style.opacity = (on && !('ontouchstart' in window)) ? '1' : '0';
        }

        // Heavy loops: each owning file decides how to stop / resume its own loop.
        if (on && source !== 'boot') _hook('initSpaceFx');             // first build if the page booted in calm mode (idempotent)
        _hook('syncSpaceFx');
        _hook('syncStarfield');
        _hook('syncNeonCity');

        _syncUi();
    }

    function _notify(source) {
        for (var i = 0; i < subs.length; i++) { try { subs[i](enabled, source); } catch (e) {} }
        try { window.dispatchEvent(new CustomEvent('aus-fx-changed', { detail: { enabled: enabled, source: source } })); } catch (e) {}
        if (window._AUS_BUS && typeof window._AUS_BUS.emit === 'function') window._AUS_BUS.emit('FX_CHANGED', { enabled: enabled, source: source });
    }

    function set(on, opts) {
        opts = opts || {};
        on = !!on;
        var changed = on !== enabled;
        enabled = on;
        if (opts.persist !== false) _persist(on);
        _apply(opts.source || 'api');
        if (changed) _notify(opts.source || 'api');
        return enabled;
    }

    window.AUS_FX = {
        KEY: KEY,
        get enabled() { return enabled; },
        set: set,
        toggle: function (opts) { return set(!enabled, opts); },
        onChange: function (cb) { if (typeof cb === 'function') subs.push(cb); }
    };

    // Another tab changed the choice → follow it live.
    window.addEventListener('storage', function (e) {
        if (e.key !== KEY) return;
        var on = e.newValue !== 'false';
        if (on === enabled) return;
        enabled = on;
        _apply('storage');
        _notify('storage');
    });

    function _boot() { _apply('boot'); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _boot);
    else _boot();

    if (window._AUS_REGISTRY) {
        window._AUS_REGISTRY.register('fxMode', { set: set, toggle: window.AUS_FX.toggle }, {
            name: 'FX Mode (cinematic / calm)', icon: '✨', defaultEnabled: true
        });
    }
})();
