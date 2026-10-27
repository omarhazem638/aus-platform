/* ================================================================
   AUS — سجل الشهادات الرقمية (للمالك فقط)
   يدير الشهادات الحقيقية القابلة للتحقق التي يصدرها /api/certificates:
   بحث · فلترة (حالة/تخصص) · تعديل الحالة · إعادة توليد QR ·
   إعادة تنزيل PDF · إرسال نسخة للطالب عبر نظام المحادثة · عدد مرات التحقق
   ================================================================ */
(function () {
    'use strict';

    function _base() { return window.AUS_API_BASE || ((typeof CHAT_API_BASE !== 'undefined') ? CHAT_API_BASE : 'http://127.0.0.1:8002'); }
    function _tok() { try { return localStorage.getItem('aus_access_token') || ''; } catch (e) { return ''; } }
    function _host() { return document.getElementById('certHost'); }
    function _isOwner() { return !!(window.ausAuth && window.ausAuth.isAdmin); }
    function _esc(t) { return (t == null ? '' : String(t)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    // The link the certificate's QR code carries. aus_51_cert_view.js owns the rule (public site address when configured, else this site).
    function _verifyUrl(certNumber) {
        var known = (_state.certs || []).filter(function (c) { return c.certificate_number === certNumber; })[0];   // carries the server's own verify_url
        if (window.AUS_CERT_VIEW) return window.AUS_CERT_VIEW.verifyUrl(known || { certificate_number: certNumber });
        return window.location.origin + '/verify.html?id=' + encodeURIComponent(certNumber);
    }

    async function _api(method, path, body) {
        // every call here is an owner action: the shared session gate attaches the Authorization header, renews the 15-minute
        // token by itself and, with no server session at all, asks for the server password once and then continues this call
        if (window.AUS_SESSION) return window.AUS_SESSION.request(method, path, body, { interactive: true, owner: true });
        var t = _tok();
        var headers = { 'Content-Type': 'application/json' };
        if (t) headers.Authorization = 'Bearer ' + t;
        try {
            var res = await fetch(_base() + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined });
            var d = await res.json().catch(function () { return {}; });
            return { ok: res.ok, status: res.status, data: d };
        } catch (e) { return { ok: false, status: 0, data: null }; }
    }

    var STATUS_LABELS = { verified: 'موثّقة', expired: 'منتهية', revoked: 'مُلغاة', suspended: 'موقوفة', inactive: 'غير فعّالة' };
    var STATUS_BADGE_CLASS = { verified: 'pass', expired: 'expired', revoked: 'fail', suspended: 'suspended', inactive: 'expired' };

    var _state = { certs: [], loading: false, loaded: false, err: null, filters: { status: '', specialization: '', search: '' } };

    function _needServerMsg() {
        return '<div class="cert-card" style="text-align:center;color:rgba(255,255,255,.5);padding:1.2rem">' +
            'سجل الشهادات الرقمية يحتاج اتصالاً بالخادم. شغّل الخادم (START_AUS.bat) وسجّل دخولك، ثم افتح هذه اللوحة من جديد.</div>';
    }

    function _specialtyOptions() {
        var specs = (typeof specialties !== 'undefined') ? specialties : [];
        return specs.map(function (s) { return '<option value="' + _esc(s.name) + '">' + _esc(s.name) + '</option>'; }).join('');
    }

    async function _load() {
        _state.loading = true; _state.err = null;
        _renderShell();
        var qs = [];
        if (_state.filters.status) qs.push('status=' + encodeURIComponent(_state.filters.status));
        if (_state.filters.specialization) qs.push('specialization=' + encodeURIComponent(_state.filters.specialization));
        if (_state.filters.search) qs.push('search=' + encodeURIComponent(_state.filters.search));
        var r = await _api('GET', '/api/certificates' + (qs.length ? '?' + qs.join('&') : ''));
        _state.loading = false;
        if (!r.ok) {
            _state.err = r.status === 403 ? 'هذه اللوحة متاحة لمالك التطبيق فقط.' : (r.status === 0 ? 'SERVER_DOWN' : 'تعذر تحميل السجل.');
            _state.certs = [];
        } else {
            _state.loaded = true;
            _state.certs = (r.data && r.data.certificates) || [];
            if (window.AUS_CERT_VIEW) window.AUS_CERT_VIEW.remember(_state.certs);   // public fields only — never the students' e-mails
        }
        _renderShell();
    }

    function _statusOptionsHtml(current) {
        return Object.keys(STATUS_LABELS).map(function (k) {
            return '<option value="' + k + '"' + (k === current ? ' selected' : '') + '>' + STATUS_LABELS[k] + '</option>';
        }).join('');
    }

    function _row(c) {
        var when = c.issue_date ? c.issue_date.slice(0, 10) : '—';
        var badgeClass = STATUS_BADGE_CLASS[c.status] || '';
        return '<div class="cert-track-card" style="text-align:right;cursor:default">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">' +
                '<div>' +
                    '<h4 style="margin-bottom:4px">' + _esc(c.student_name) + ' — ' + _esc(c.tool_name) + '</h4>' +
                    '<div style="font-size:.78rem;color:rgba(255,255,255,.5);line-height:1.8">' +
                        'رقم الشهادة: <b style="direction:ltr;display:inline-block;color:#d4af37;font-family:monospace">' + _esc(c.certificate_number) + '</b><br>' +
                        (c.student_email ? ('الحساب: ' + _esc(c.student_email) + '<br>') : '') +
                        c.cert_label + ' · ' + _esc(c.specialization || '') + ' · الدرجة: <b style="color:#d4af37">' + (c.score != null ? c.score + '%' : '—') + '</b><br>' +
                        'تاريخ الإصدار: ' + when + ' · <i class="fas fa-eye"></i> عدد مرات التحقق: <b>' + (c.verification_count || 0) + '</b>' +
                    '</div>' +
                '</div>' +
                '<span class="cert-status ' + badgeClass + '">' + (STATUS_LABELS[c.status] || c.status) + '</span>' +
            '</div>' +
            '<div class="cert-reg-actions">' +
                (window.AUS_CERT_VIEW ? '<button class="cert-btn-gold" style="padding:8px 18px;font-size:.8rem" data-acv-open="' + _esc(c.certificate_number) + '"><i class="fas fa-qrcode"></i> عرض الشهادة وQR</button>' : '') +
                '<select class="cert-reg-status-sel" id="regSel_' + _esc(c.certificate_number) + '">' + _statusOptionsHtml(c.status) + '</select>' +
                '<button class="cert-btn-ghost" onclick="window._certRegUpdateStatus(\'' + _esc(c.certificate_number) + '\')"><i class="fas fa-rotate"></i> تحديث الحالة</button>' +
                (c.pdf_available ? '<button class="cert-btn-ghost" onclick="window._certRegDownload(\'' + _esc(c.certificate_number) + '\')"><i class="fas fa-file-pdf"></i> تنزيل PDF</button>' : '') +
                '<button class="cert-btn-ghost" onclick="window._certRegRegenQr(\'' + _esc(c.certificate_number) + '\')"><i class="fas fa-qrcode"></i> إعادة توليد QR</button>' +
                (c.student_email ? '<button class="cert-btn-ghost" onclick="window._certRegResend(\'' + _esc(c.certificate_number) + '\',\'' + _esc(c.student_email) + '\',\'' + _esc(c.student_name) + '\')"><i class="fas fa-paper-plane"></i> إرسال نسخة للطالب</button>' : '') +
                '<button class="cert-btn-ghost" onclick="window._certRegCopyLink(\'' + _esc(c.certificate_number) + '\')"><i class="fas fa-link"></i> نسخ رابط التحقق</button>' +
            '</div>' +
        '</div>';
    }

    function _renderShell() {
        var host = _host();
        if (!host || !_isOwner()) return;
        var f = _state.filters;
        var body;
        if (_state.err === 'SERVER_DOWN') {
            body = _needServerMsg();
        } else if (_state.loading) {
            body = '<div class="cert-card" style="text-align:center;color:rgba(255,255,255,.4)"><i class="fas fa-spinner fa-spin"></i> جارٍ التحميل...</div>';
        } else if (_state.err) {
            body = '<div class="cert-card" style="text-align:center;color:#ff8080">' + _esc(_state.err) + '</div>';
        } else if (!_state.certs.length) {
            body = '<div class="cert-card" style="text-align:center;color:rgba(255,255,255,.4)">لا توجد شهادات رقمية صادرة بعد.</div>';
        } else {
            body = _state.certs.map(_row).join('');
        }

        host.innerHTML =
        '<div class="cert-wrap">' +
            '<button class="cert-back-btn" onclick="window.renderCertificationsHub()"><i class="fas fa-arrow-right"></i> رجوع</button>' +
            '<div class="cert-hub-head"><h3><i class="fas fa-qrcode"></i> سجل الشهادات الرقمية</h3>' +
            '<p>الشهادات الحقيقية القابلة للتحقق التي أصدرها AUS — رقم فريد، QR، وملف PDF لكل شهادة.</p></div>' +
            '<div class="cert-reg-filters">' +
                '<input type="text" id="certRegSearch" class="cert-reg-input" placeholder="ابحث بالاسم / البريد / رقم الشهادة" value="' + _esc(f.search) + '">' +
                '<select id="certRegStatusFilter" class="cert-reg-input">' +
                    '<option value="">كل الحالات</option>' + _statusOptionsHtml(f.status) +
                '</select>' +
                '<select id="certRegSpecFilter" class="cert-reg-input">' +
                    '<option value="">كل التخصصات</option>' + _specialtyOptions() +
                '</select>' +
                '<button class="cert-btn-gold" style="padding:8px 18px;font-size:.8rem" onclick="window._certRegApplyFilters()"><i class="fas fa-filter"></i> تطبيق</button>' +
            '</div>' +
            body +
        '</div>';

        if (f.status) { var selEl = document.getElementById('certRegStatusFilter'); if (selEl) selEl.value = f.status; }
        if (f.specialization) { var specEl = document.getElementById('certRegSpecFilter'); if (specEl) specEl.value = f.specialization; }
    }

    window._certRenderRegistryAdmin = function () {
        if (!_isOwner()) return;
        _load();
    };

    window._certRegApplyFilters = function () {
        var s = document.getElementById('certRegSearch');
        var st = document.getElementById('certRegStatusFilter');
        var sp = document.getElementById('certRegSpecFilter');
        _state.filters.search = s ? s.value.trim() : '';
        _state.filters.status = st ? st.value : '';
        _state.filters.specialization = sp ? sp.value : '';
        _load();
    };

    window._certRegUpdateStatus = async function (certNumber) {
        if (!_isOwner()) return;
        var sel = document.getElementById('regSel_' + certNumber);
        if (!sel) return;
        var newStatus = sel.value;
        if (newStatus === 'revoked' && !window.confirm('تأكيد إلغاء هذه الشهادة؟ ستظهر كمُلغاة فوراً لأي جهة تتحقق منها.')) return;
        // POST, not PATCH: the backend's CORS allow_methods has no PATCH, so a browser's preflight for PATCH is refused.
        // The server route answers both verbs.
        var r = await _api('POST', '/api/certificates/' + encodeURIComponent(certNumber) + '/status', { status: newStatus });
        if (r.ok) {
            if (typeof showToast === 'function') showToast('✅ تم تحديث حالة الشهادة', 'xp-toast');
            _load();
        } else if (typeof showToast === 'function') {
            showToast('تعذر تحديث الحالة', 'heart-toast');
        }
    };

    window._certRegDownload = function (certNumber) {
        window.open(_base() + '/api/certificates/' + encodeURIComponent(certNumber) + '/download', '_blank');
    };

    window._certRegRegenQr = async function (certNumber) {
        if (!_isOwner()) return;
        var r = await _api('POST', '/api/certificates/' + encodeURIComponent(certNumber) + '/regenerate-qr');
        if (typeof showToast === 'function') showToast(r.ok ? '✅ تم إعادة توليد رمز QR' : 'تعذر إعادة توليد QR', r.ok ? 'xp-toast' : 'heart-toast');
    };

    window._certRegResend = function (certNumber, email, name) {
        if (!_isOwner() || !window.AusChat || typeof window.AusChat.sendMessage !== 'function') return;
        var link = _verifyUrl(certNumber);
        window.AusChat.sendMessage(email, name, '🎓 هذه نسخة شهادتك الرقمية الموثّقة رقم ' + certNumber + '. يمكنك التحقق منها ومشاركتها عبر: ' + link);
        if (typeof showToast === 'function') showToast('✅ تم إرسال الرابط للطالب', 'xp-toast');
    };

    window._certRegCopyLink = function (certNumber) {
        var link = _verifyUrl(certNumber);
        try {
            navigator.clipboard.writeText(link).then(function () {
                if (typeof showToast === 'function') showToast('🔗 تم نسخ رابط التحقق', 'xp-toast');
            });
        } catch (e) {}
    };

    // ── Styles (Nano Glass System — matches the rest of the cert UI) ───────────
    (function injectCSS() {
        if (document.getElementById('cert-registry-styles')) return;
        var s = document.createElement('style');
        s.id = 'cert-registry-styles';
        s.textContent = [
            '.cert-status.suspended{background:rgba(255,180,0,0.12);color:#ffb400;}',
            '.cert-status.expired{background:rgba(154,160,174,0.14);color:#9aa0ae;}',
            '.cert-reg-filters{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:18px;}',
            '.cert-reg-input{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.14);color:#fff;border-radius:10px;padding:8px 12px;font-family:inherit;font-size:.82rem;flex:1;min-width:150px;}',
            '.cert-reg-input:focus{outline:none;border-color:rgba(212,175,55,0.5);}',
            '.cert-reg-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;align-items:center;}',
            '.cert-reg-status-sel{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.14);color:#fff;border-radius:8px;padding:6px 10px;font-family:inherit;font-size:.78rem;}',
            '@media (max-width:640px){.cert-reg-filters{flex-direction:column;}.cert-reg-input{width:100%;}}'
        ].join('\n');
        document.head.appendChild(s);
    })();

})();
