/**
 * AUS Module Voice Guide — aus_32_module_voice.js
 * Smart Arabic narration on every module entry.
 * Architecture: hooks showSection → Web Speech API → replay button injection
 * No external deps — pure browser APIs
 */
(function () {
    'use strict';

    // ── Persistence ────────────────────────────────────────────────────────
    const LS_KEY = 'aus.voiceGuide.enabled';
    let   _on    = localStorage.getItem(LS_KEY) !== 'false'; // default: true

    // ── Per-session visited set (no re-narration on back/forward) ─────────
    const _seen = new Set();

    // ── Module voice guides: name + 10-second description ─────────────────
    // Descriptions measured at ~0.88 rate → ≈ 25–30 Arabic words each
    const GUIDES = {
        // ── Entrepreneurship ecosystem ──────────────────────────────────────
        startup: {
            name: 'نظام بناء المشاريع',
            desc: 'هذا النظام يحوّل فكرتك إلى مشروع حقيقي خطوة بخطوة. أدخل فكرتك وسيحللها الذكاء الاصطناعي ويساعدك في بناء نموذج أعمالك الكامل.',
            icon: '🚀',
        },
        'biz-sim': {
            name: 'نظام محاكاة الأعمال',
            desc: 'جرّب إدارة شركة افتراضية بأمان كامل. اتخذ قرارات مالية واستراتيجية وشاهد تأثيرها الفوري. تعلّم من تجاربك دون أي مخاطرة حقيقية.',
            icon: '📊',
        },
        coach: {
            name: 'نظام مدرّب ريادة الأعمال',
            desc: 'مدربك الذكي الشخصي على مدار الساعة. اطرح أي سؤال عن مشروعك وستحصل على إرشاد احترافي مخصص لحالتك في ثوانٍ.',
            icon: '🎯',
        },
        incubator: {
            name: 'نظام الحاضنة',
            desc: 'تقدّم للحاضنة الافتراضية وتتبّع مراحل مشروعك. ستحصل على تقييم ذكي ومسار واضح لتطوير مشروعك من الفكرة وحتى التطبيق.',
            icon: '🌱',
        },
        matching: {
            name: 'نظام مطابقة المؤسسين',
            desc: 'ابحث عن شريكك المثالي أو مستشارك. الذكاء الاصطناعي يحلل مهاراتك ويقترح عليك الشركاء والمرشدين الأنسب لمشروعك.',
            icon: '🤝',
        },
        marketplace: {
            name: 'سوق الشركات الناشئة',
            desc: 'منصة واحدة للمشاريع والمستثمرين. اعرض مشروعك أمام المستثمرين، أو استكشف الفرص الاستثمارية المتاحة الآن.',
            icon: '🏪',
        },
        'invest-ready': {
            name: 'نظام الجاهزية الاستثمارية',
            desc: 'اكتشف مدى استعداد مشروعك لجذب المستثمرين. أجب على أسئلة سبعة محاور وستحصل على تقرير شامل مع خطوات تحسين محددة.',
            icon: '💎',
        },
        innovation: {
            name: 'مركز الابتكار والبراءات',
            desc: 'حلّل أفكارك الابتكارية وتعلّم تسجيل براءات الاختراع. شارك في تحديات الابتكار واحصل على تقييم ذكي لجدة فكرتك.',
            icon: '💡',
        },
        'founder-profile': {
            name: 'ملف المؤسس',
            desc: 'ابنِ هويّتك كمؤسس وتتبّع مسيرتك التعليمية. أكمل المسارات واكسب نقاطاً وشارات تُثبت كفاءتك أمام المستثمرين والشركاء.',
            icon: '👨‍🚀',
        },
        'analytics-hub': {
            name: 'لوحة التحليلات والإنجازات',
            desc: 'مركز متابعة تقدّمك داخل المنصة. شاهد نشاطك ومقارنتك بالآخرين والشارات التي حصلت عليها حتى الآن.',
            icon: '📈',
        },
        quality: {
            name: 'نظام معايير الجودة العالمية',
            desc: 'قيّم مشروعك وفق معايير الأيزو الدولية ومعايير الاستدامة. احصل على شهادة جودة رقمية واكتشف كيف ترتقي بمستواك.',
            icon: '🏅',
        },
        // ── Learning & tools ────────────────────────────────────────────────
        library: {
            name: 'المكتبة التعليمية',
            desc: 'مكتبتك الذكية للقراءة والتعلم. استكشف الكتب المختارة ولخّص أي كتاب بالذكاء الاصطناعي في دقيقتين فقط.',
            icon: '📚',
        },
        english: {
            name: 'نظام تعلم الإنجليزية',
            desc: 'طوّر مستواك في إنجليزية الأعمال. تمارين تفاعلية ومحادثات ذكية مخصصة لتخصصك الأكاديمي.',
            icon: '🌐',
        },
        calc: {
            name: 'الآلة الحاسبة التجارية',
            desc: 'احسب مؤشرات أعمالك الأساسية بسرعة. من صافي الربح إلى نقطة التعادل وتقييم المشاريع، كل شيء في مكان واحد.',
            icon: '🧮',
        },
        doctorai: {
            name: 'نظام دكتور الذكاء الاصطناعي',
            desc: 'مدرّسك الذكي المخصص. اطرح أي سؤال أكاديمي وستحصل على شرح مبسط ومناسب تماماً لتخصصك ومستواك.',
            icon: '🎓',
        },
        // ── Admin/Panels ────────────────────────────────────────────────────
        studentpanel: {
            name: 'لوحة تحكم الطالب',
            desc: 'مركزك الشخصي. تابع اشتراكك ونشاطك اليومي وأدِر إعداداتك من هنا.',
            icon: '🎒',
        },
        doctorpanel: {
            name: 'لوحة تحكم الدكتور',
            desc: 'أدِر محاضراتك وطلابك بكفاءة. تابع أداء الطلاب وأضف محتوى تعليمياً جديداً بكل سهولة.',
            icon: '👨‍🏫',
        },
        adminpanel: {
            name: 'لوحة الإدارة',
            desc: 'مركز التحكم الكامل بالمنصة. أدِر المستخدمين والاشتراكات والإعدادات المتقدمة بصلاحيات المدير.',
            icon: '🛡️',
        },
    };

    // ── Find best Arabic TTS voice ─────────────────────────────────────────
    function _arVoice() {
        const vs = window.speechSynthesis?.getVoices() || [];
        return (
            vs.find(v => v.lang === 'ar-SA')           ||
            vs.find(v => v.lang === 'ar-EG')           ||
            vs.find(v => v.lang.startsWith('ar'))      ||
            vs.find(v => /ar/i.test(v.name))           ||
            null
        );
    }

    // ── Speak one utterance ────────────────────────────────────────────────
    function _say(text, { rate = 0.85, pitch = 1.05, volume = 0.93 } = {}, onEnd) {
        if (!window.speechSynthesis || !text) { onEnd?.(); return; }
        const u    = new SpeechSynthesisUtterance(text);
        u.lang     = 'ar-SA';
        u.rate     = rate;
        u.pitch    = pitch;
        u.volume   = volume;
        const v    = _arVoice();
        if (v) u.voice = v;
        u.onend    = () => onEnd?.();
        u.onerror  = () => onEnd?.();
        window.speechSynthesis.speak(u);
    }

    // ── Play full guide: name pause description ────────────────────────────
    function _play(guide, force = false) {
        if (!_on && !force) return;
        window.speechSynthesis?.cancel();
        _showToast(guide);
        // 1. Name — slower, slightly higher pitch
        _say(guide.name, { rate: 0.76, pitch: 1.1 }, () => {
            // 2. Brief pause then description
            setTimeout(() =>
                _say(guide.desc, { rate: 0.87, pitch: 1.02 })
            , 280);
        });
    }

    // ── Toast notification (visual companion to speech) ───────────────────
    let _toastTimer = null;
    function _showToast(guide) {
        let toast = document.getElementById('avg-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'avg-toast';
            document.body.appendChild(toast);
        }
        toast.innerHTML = `
            <span class="avg-toast-icon">${guide.icon}</span>
            <div class="avg-toast-body">
                <div class="avg-toast-name">${guide.name}</div>
                <div class="avg-toast-wave">
                    <span></span><span></span><span></span><span></span><span></span>
                </div>
            </div>
        `;
        toast.classList.add('avg-show');
        clearTimeout(_toastTimer);
        _toastTimer = setTimeout(() => toast.classList.remove('avg-show'), 12000);
    }

    // ── Inject subtle replay button inside section ─────────────────────────
    function _injectReplay(id, guide) {
        const sec = document.getElementById(id);
        if (!sec || sec.querySelector('.avg-replay')) return;

        const pos = window.getComputedStyle(sec).position;
        if (pos === 'static') sec.style.position = 'relative';

        const btn = document.createElement('button');
        btn.className   = 'avg-replay';
        btn.dataset.mod = id;
        btn.innerHTML   = `<i class="fas fa-volume-up"></i><span>شرح صوتي</span>`;
        btn.title       = `إعادة نطق: ${guide.name}`;

        btn.addEventListener('click', () => {
            _play(guide, true);
            btn.classList.add('avg-replaying');
            btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i><span>جارٍ النطق…</span>`;
            setTimeout(() => {
                btn.classList.remove('avg-replaying');
                btn.innerHTML = `<i class="fas fa-volume-up"></i><span>شرح صوتي</span>`;
            }, 14000);
        });

        sec.appendChild(btn);
    }

    // ── Central entry handler ──────────────────────────────────────────────
    function _enter(id) {
        const g = GUIDES[id];
        if (!g) return;

        // Always inject replay (even if voice is off)
        // Small delay so the module content renders first
        setTimeout(() => _injectReplay(id, g), 600);

        // Voice: only once per session
        if (_seen.has(id) || !_on) return;
        _seen.add(id);
        setTimeout(() => _play(g), 450);
    }

    // ── Hook showSection ──────────────────────────────────────────────────
    // Wrap safely so the original always fires first
    const _orig = window.showSection;
    window.showSection = function (id) {
        try { _orig?.call(this, id); } catch (_) {}
        _enter(id);
    };

    // ── Public API ────────────────────────────────────────────────────────
    window.ausModuleVoice = {
        enable:    () => { _on = true;  localStorage.setItem(LS_KEY, 'true');  _syncUI(true);  },
        disable:   () => { _on = false; localStorage.setItem(LS_KEY, 'false'); _syncUI(false); },
        toggle:    () => _on ? window.ausModuleVoice.disable() : window.ausModuleVoice.enable(),
        stop:      () => { window.speechSynthesis?.cancel(); document.getElementById('avg-toast')?.classList.remove('avg-show'); },
        replay:    (id) => { const g = GUIDES[id]; if (g) _play(g, true); },
        isEnabled: () => _on,
        guides:    GUIDES,
    };

    // ── Control widget (settings button that syncs with the main UI) ───────
    let _sw = null;
    function _syncUI(on) {
        if (!_sw) return;
        _sw.classList.toggle('on', on);
        _sw.closest('#avg-wrap')?.querySelector('#avg-main-btn')
           ?.querySelector('i')
           ?.setAttribute('class', `fas fa-${on ? 'headphones' : 'headphones-alt'}`);
    }

    function _buildWidget() {
        const style       = document.createElement('style');
        style.textContent = `
/* ── Toast ────────────────────────────────────────────────────────────── */
#avg-toast {
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%) translateY(20px);
    background:rgba(7,7,22,.94); border:1px solid rgba(0,212,255,.3);
    border-radius:40px; padding:10px 20px;
    display:flex; align-items:center; gap:12px;
    font-family:'Tajawal',sans-serif; direction:rtl;
    backdrop-filter:blur(20px);
    box-shadow:0 4px 30px rgba(0,0,0,.5),0 0 15px rgba(0,212,255,.1);
    opacity:0; transition:opacity .35s,transform .35s;
    pointer-events:none; z-index:99999;
    max-width:90vw;
}
#avg-toast.avg-show { opacity:1; transform:translateX(-50%) translateY(0); }
.avg-toast-icon { font-size:22px; line-height:1; }
.avg-toast-body { display:flex; flex-direction:column; gap:4px; }
.avg-toast-name { font-size:13px; font-weight:700; color:#00d4ff; letter-spacing:.3px; }
.avg-toast-wave { display:flex; align-items:flex-end; gap:3px; height:14px; }
.avg-toast-wave span {
    display:block; width:3px; background:#00d4ff; border-radius:2px;
    animation:avg-wave 1.1s ease-in-out infinite;
    opacity:.7;
}
.avg-toast-wave span:nth-child(1){height:5px;  animation-delay:0s}
.avg-toast-wave span:nth-child(2){height:11px; animation-delay:.15s}
.avg-toast-wave span:nth-child(3){height:7px;  animation-delay:.3s}
.avg-toast-wave span:nth-child(4){height:13px; animation-delay:.45s}
.avg-toast-wave span:nth-child(5){height:5px;  animation-delay:.6s}
@keyframes avg-wave {
    0%,100%{transform:scaleY(1);opacity:.5}
    50%    {transform:scaleY(1.8);opacity:1}
}

/* ── Replay button (injected into each section) ───────────────────────── */
.avg-replay {
    position:absolute; top:10px; left:12px; z-index:90;
    padding:5px 12px; border-radius:20px;
    border:1px solid rgba(0,212,255,.22);
    background:rgba(0,212,255,.05);
    color:rgba(0,212,255,.6); font-size:11px; cursor:pointer;
    display:flex; align-items:center; gap:6px;
    font-family:'Tajawal',sans-serif; direction:rtl;
    transition:all .2s; opacity:.65;
}
.avg-replay:hover { opacity:1; background:rgba(0,212,255,.12); border-color:rgba(0,212,255,.5); color:#00d4ff; }
.avg-replay i { font-size:12px; }
.avg-replay span { font-size:11px; font-weight:500; }

/* ── Control widget ───────────────────────────────────────────────────── */
#avg-wrap {
    position:fixed; bottom:182px; left:18px; z-index:9994;
    font-family:'Tajawal',sans-serif;
}
#avg-main-btn {
    width:46px; height:46px; border-radius:50%;
    background:linear-gradient(135deg,#080818,#14143a);
    border:1.5px solid rgba(0,212,255,.35);
    color:#00d4ff; font-size:17px; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 0 12px rgba(0,212,255,.15);
    transition:all .3s; outline:none;
}
#avg-main-btn:hover { transform:scale(1.1); box-shadow:0 0 22px rgba(0,212,255,.35); }
#avg-main-btn.muted { border-color:rgba(255,255,255,.12); color:rgba(255,255,255,.25); box-shadow:none; }

#avg-panel {
    position:absolute; bottom:56px; left:0; width:230px;
    background:rgba(7,7,20,.97); border:1px solid rgba(0,212,255,.22);
    border-radius:18px; padding:18px 16px;
    display:none; backdrop-filter:blur(24px);
    box-shadow:0 0 50px rgba(0,0,0,.6),0 0 16px rgba(0,212,255,.06);
}
#avg-panel.open { display:block; animation:avg-up .18s ease; }
@keyframes avg-up { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

.avg-p-head {
    font-size:9px; letter-spacing:3px; color:rgba(0,212,255,.5);
    text-transform:uppercase; margin-bottom:14px;
    display:flex; align-items:center; gap:6px;
}
.avg-p-row {
    display:flex; align-items:center; justify-content:space-between;
    margin-bottom:10px; padding-bottom:10px;
    border-bottom:1px solid rgba(255,255,255,.06);
}
.avg-p-row-lbl { font-size:12.5px; color:rgba(255,255,255,.7); }
.avg-p-row-sub { font-size:9.5px; color:rgba(255,255,255,.3); margin-top:2px; }

/* Toggle switch */
.avg-sw {
    width:40px; height:22px; border-radius:11px;
    background:rgba(255,255,255,.1);
    border:1px solid rgba(255,255,255,.08);
    cursor:pointer; position:relative; transition:all .25s;
    flex-shrink:0;
}
.avg-sw.on { background:rgba(0,212,255,.28); border-color:rgba(0,212,255,.4); }
.avg-sw::after {
    content:''; position:absolute; top:3px; left:3px;
    width:14px; height:14px; border-radius:50%;
    background:rgba(255,255,255,.35); transition:all .25s;
}
.avg-sw.on::after { left:21px; background:#00d4ff; box-shadow:0 0 6px rgba(0,212,255,.5); }

.avg-stop-btn {
    width:100%; padding:8px; border-radius:9px; margin-top:2px;
    border:1px solid rgba(255,80,80,.2);
    background:rgba(255,80,80,.05);
    color:rgba(255,80,80,.65); font-size:11px;
    cursor:pointer; font-family:'Tajawal',sans-serif;
    display:flex; align-items:center; justify-content:center; gap:7px;
    transition:all .2s;
}
.avg-stop-btn:hover { background:rgba(255,80,80,.12); color:#ff6464; border-color:rgba(255,80,80,.4); }
.avg-note {
    font-size:10px; color:rgba(255,255,255,.22);
    line-height:1.55; margin-top:10px;
}
        `;
        document.head.appendChild(style);

        const wrap       = document.createElement('div');
        wrap.id          = 'avg-wrap';
        wrap.innerHTML   = `
<div id="avg-panel">
  <div class="avg-p-head"><i class="fas fa-headphones"></i> الدليل الصوتي</div>
  <div class="avg-p-row">
    <div>
      <div class="avg-p-row-lbl">التعليق عند الدخول</div>
      <div class="avg-p-row-sub">ينطق اسم النظام وشرحاً مختصراً</div>
    </div>
    <button class="avg-sw ${_on ? 'on' : ''}" id="avg-sw"></button>
  </div>
  <button class="avg-stop-btn" id="avg-stop">
    <i class="fas fa-stop-circle"></i> إيقاف الصوت الآن
  </button>
  <div class="avg-note">يتكرر الشرح مرة واحدة فقط لكل نظام في كل جلسة. يمكنك دائماً الضغط على "شرح صوتي" داخل أي نظام للإعادة.</div>
</div>
<button id="avg-main-btn" title="الدليل الصوتي">
  <i class="fas fa-headphones"></i>
</button>
        `;
        document.body.appendChild(wrap);

        const mainBtn = document.getElementById('avg-main-btn');
        const panel   = document.getElementById('avg-panel');
        _sw           = document.getElementById('avg-sw');

        // Panel toggle
        mainBtn.addEventListener('click', () => panel.classList.toggle('open'));
        document.addEventListener('click', e => {
            if (!wrap.contains(e.target)) panel.classList.remove('open');
        });

        // Voice on/off switch
        _sw.addEventListener('click', () => {
            window.ausModuleVoice.toggle();
        });

        // Stop button
        document.getElementById('avg-stop').addEventListener('click', function () {
            window.ausModuleVoice.stop();
            this.innerHTML = '<i class="fas fa-check"></i> تم الإيقاف';
            setTimeout(() => { this.innerHTML = '<i class="fas fa-stop-circle"></i> إيقاف الصوت الآن'; }, 2500);
        });

        // Reflect muted state on icon
        const _iconSync = (on) => {
            mainBtn.classList.toggle('muted', !on);
            mainBtn.querySelector('i').className = `fas fa-${on ? 'headphones' : 'headphones-alt'}`;
        };
        _iconSync(_on);

        // After widget is built, _syncUI calls this directly (no circular ref)
        window._avgSyncUI = function (on) {
            _sw.classList.toggle('on', on);
            _iconSync(on);
        };
        // Sync initial state
        window._avgSyncUI(_on);
    }

    // Called by enable()/disable() — delegates to widget sync once built
    function _syncUI(on) {
        if (window._avgSyncUI) {
            window._avgSyncUI(on);
        } else if (_sw) {
            _sw.classList.toggle('on', on);
        }
    }

    // ── Register ──────────────────────────────────────────────────────────
    if (window._AUS_REGISTRY) {
        window._AUS_REGISTRY.register({ id: 'moduleVoiceGuide', name: 'Module Voice Guide', version: '1.0.0' });
    }

    // ── Pre-warm voice list (Chrome requires interaction first) ───────────
    if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.addEventListener('voiceschanged', () => window.speechSynthesis.getVoices(), { once: true });
    }

    // ── Boot ──────────────────────────────────────────────────────────────
    const _boot = () => _buildWidget();
    document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', _boot)
        : _boot();

})();
