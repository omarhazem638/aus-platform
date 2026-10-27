/* mobile_nav.js — on phones (< 768px) the 32-tab strip (.nav-tabs) becomes a side drawer opened by a ☰ button.
   Layout lives in mobile_nav.css; this file only adds the ☰ button, the dim backdrop and the drawer head, and toggles .open.
   It re-uses the REAL <nav> (nothing is cloned), so showSection(), the active-tab highlight, i18n and the click sounds
   keep working untouched. On desktop the added elements are display:none, so nothing changes there. */
(function () {
    'use strict';

    var nav = document.querySelector('.nav-tabs');
    var header = document.querySelector('.header');
    if (!nav || !header || nav.dataset.drawer) return;
    nav.dataset.drawer = '1';

    var phone = window.matchMedia('(max-width: 767.98px)');            // the same breakpoint as mobile_nav.css

    function make(tag, cls, attrs) {
        var e = document.createElement(tag);
        e.className = cls;
        Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
        return e;
    }

    nav.id = nav.id || 'main-nav';
    var burger = make('button', 'nav-burger', { type: 'button', 'aria-controls': nav.id, 'aria-expanded': 'false' });
    burger.innerHTML = '<span></span><span></span><span></span>';
    var backdrop = make('div', 'nav-backdrop');
    var head = make('div', 'nav-drawer-head');
    var title = make('span', 'nav-drawer-title');
    title.textContent = 'AUS';
    var closeBtn = make('button', 'nav-drawer-close', { type: 'button' });
    closeBtn.textContent = '✕';
    head.appendChild(title);
    head.appendChild(closeBtn);

    function labels() {                                                // screen-reader names follow the app language
        var ar = (document.documentElement.lang || 'ar') === 'ar';
        burger.setAttribute('aria-label', ar ? 'القائمة' : 'Menu');
        closeBtn.setAttribute('aria-label', ar ? 'إغلاق' : 'Close');
    }
    labels();
    new MutationObserver(labels).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

    header.appendChild(burger);                       // the header is sticky: the button stays reachable while scrolling
    nav.parentNode.insertBefore(backdrop, nav);
    nav.insertBefore(head, nav.firstChild);

    function setOpen(on) {
        on = !!on && phone.matches;
        if (on === nav.classList.contains('open')) return;
        nav.classList.toggle('open', on);
        backdrop.classList.toggle('open', on);
        document.documentElement.classList.toggle('nav-open', on);   // CSS: raise the app above the floating buttons, lock page scroll
        burger.setAttribute('aria-expanded', String(on));
        if (on) {
            var active = nav.querySelector('.nav-tab.active');       // 32 rows: open with the current section in view
            if (active) nav.scrollTop = active.offsetTop - (nav.clientHeight - active.offsetHeight) / 2;
            closeBtn.focus({ preventScroll: true });
        } else {
            burger.focus({ preventScroll: true });
        }
    }

    burger.addEventListener('click', function () { setOpen(true); });
    closeBtn.addEventListener('click', function () { setOpen(false); });
    backdrop.addEventListener('click', function () { setOpen(false); });
    nav.addEventListener('click', function (e) {                     // a tab's own onclick (showSection) has already run by now
        if (e.target.closest('.nav-tab')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });

    function onBreakpoint() { setOpen(false); }                      // rotated / resized to a wide screen: leave drawer mode cleanly
    if (phone.addEventListener) phone.addEventListener('change', onBreakpoint); else phone.addListener(onBreakpoint);
})();
