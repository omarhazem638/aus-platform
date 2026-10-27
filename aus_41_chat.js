// =============================================================================
// aus_41_chat.js — Real two-way chat: student↔student, student↔doctor
// Directory search by name, instant add (no approval), shared conversation
// threads. Admin is intentionally excluded from directory/chat — this system
// is scoped to students and doctors only, per the request that created it.
// =============================================================================
(function () {
'use strict';

var THREADS_KEY = 'aus.chat.threads';

function _getThreads() { try { var a = JSON.parse(localStorage.getItem(THREADS_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function _saveThreads(list) { try { localStorage.setItem(THREADS_KEY, JSON.stringify(list)); } catch (e) {} }
function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

// Deterministic id regardless of who initiated — same pair always maps to
// the same thread, so it's automatically visible to BOTH participants the
// moment either one sends a message, with no separate "accept" step needed.
function _threadId(emailA, emailB) {
    var pair = [emailA, emailB].sort();
    return 'thread_' + pair[0] + '__' + pair[1];
}

function ensureThread(otherEmail, otherName) {
    var me = window.ausAuth && window.ausAuth.user;
    if (!me || !otherEmail || otherEmail === me.email) return null;
    var id = _threadId(me.email, otherEmail);
    var list = _getThreads();
    var t = list.filter(function (x) { return x.id === id; })[0];
    if (!t) {
        t = { id: id, participants: [me.email, otherEmail], participantNames: {}, createdAt: Date.now(), messages: [], readBy: {} };
        t.participantNames[me.email] = me.full_name || me.email;
        t.participantNames[otherEmail] = otherName || otherEmail;
        list.push(t);
        _saveThreads(list);
    } else if (otherName && t.participantNames[otherEmail] !== otherName) {
        t.participantNames[otherEmail] = otherName; // keep the display name fresh
        _saveThreads(list);
    }
    return t;
}

function getMyThreads() {
    var me = window.ausAuth && window.ausAuth.user;
    if (!me) return [];
    return _getThreads().filter(function (t) { return t.participants.indexOf(me.email) !== -1; })
        .sort(function (a, b) {
            var la = a.messages[a.messages.length - 1], lb = b.messages[b.messages.length - 1];
            return (lb ? lb.ts : b.createdAt) - (la ? la.ts : a.createdAt);
        });
}

function getThread(threadId) {
    var me = window.ausAuth && window.ausAuth.user;
    if (!me) return null;
    var t = _getThreads().filter(function (x) { return x.id === threadId; })[0];
    if (!t || t.participants.indexOf(me.email) === -1) return null; // not a participant — can't view it
    return t;
}

function sendMessage(otherEmail, otherName, text) {
    var me = window.ausAuth && window.ausAuth.user;
    text = (text || '').trim();
    if (!me || !text) return null;
    var t = ensureThread(otherEmail, otherName);
    if (!t) return null;
    var list = _getThreads();
    var thread = list.filter(function (x) { return x.id === t.id; })[0];
    var msg = { senderEmail: me.email, text: text, ts: Date.now() };
    thread.messages.push(msg);
    _saveThreads(list);
    return msg;
}

function markThreadRead(threadId) {
    var me = window.ausAuth && window.ausAuth.user;
    if (!me) return;
    var list = _getThreads();
    var t = list.filter(function (x) { return x.id === threadId; })[0];
    if (!t) return;
    var lastTs = t.messages.length ? t.messages[t.messages.length - 1].ts : 0;
    if (t.readBy[me.email] !== lastTs) { t.readBy[me.email] = lastTs; _saveThreads(list); }
}

function threadUnreadCount(t, myEmail) {
    var lastRead = (t.readBy && t.readBy[myEmail]) || 0;
    return t.messages.filter(function (m) { return m.ts > lastRead && m.senderEmail !== myEmail; }).length;
}

function getTotalUnread() {
    var me = window.ausAuth && window.ausAuth.user;
    if (!me) return 0;
    return getMyThreads().reduce(function (sum, t) { return sum + threadUnreadCount(t, me.email); }, 0);
}

// Students and doctors can find each other by name; admin is out of scope.
function searchPeople(query) {
    var me = window.ausAuth && window.ausAuth.user;
    query = (query || '').toLowerCase().trim();
    if (!me || !query) return [];
    var accounts = (window.ausAuth.listAccounts ? window.ausAuth.listAccounts() : []);
    return accounts.filter(function (a) {
        if (a.email === me.email) return false;
        if (a.role !== 'student' && a.role !== 'doctor') return false;
        return (a.full_name || '').toLowerCase().indexOf(query) !== -1;
    }).slice(0, 20);
}

window.AusChat = {
    ensureThread: ensureThread, getMyThreads: getMyThreads, getThread: getThread,
    sendMessage: sendMessage, markThreadRead: markThreadRead,
    threadUnreadCount: threadUnreadCount, getTotalUnread: getTotalUnread,
    searchPeople: searchPeople
};

// =============================================================================
// UI
// =============================================================================
var _activeThreadId = null;

function _chatHost() { return document.getElementById('chatHost'); }

function _roleBadge(role) { return role === 'doctor' ? '👨‍🏫' : '🎓'; }

window.renderChatHub = function () {
    var host = _chatHost();
    if (!host) return;
    var u = window.ausAuth && window.ausAuth.user;
    if (!u) {
        host.innerHTML = '<div class="chat-wrap"><div class="chat-empty"><div class="ic">🔒</div><h3>سجّل الدخول لاستخدام الدردشة</h3>' +
            '<button class="chat-btn gold" onclick="ausAuth.openModal(\'login\')"><i class="fas fa-user"></i> تسجيل الدخول</button></div></div>';
        return;
    }
    if (u.role !== 'student' && u.role !== 'doctor') {
        host.innerHTML = '<div class="chat-wrap"><div class="chat-empty"><div class="ic">💬</div><h3>الدردشة متاحة للطلاب والدكاترة فقط</h3></div></div>';
        return;
    }
    // Every fresh navigation into Chat starts at the thread list (with
    // accurate unread badges) — never auto-reopens whatever was last active.
    // Without this, _activeThreadId (a single variable, not scoped per
    // account) could silently mark a brand-new message as read before the
    // user ever saw the unread indicator, or leak across an account switch
    // within the same page session.
    _activeThreadId = null;

    host.innerHTML =
        '<div class="chat-wrap">' +
            '<div class="chat-sidebar">' +
                '<div class="chat-search-box">' +
                    '<input type="text" id="chatSearchInput" placeholder="ابحث بالاسم لإضافة شخص..." oninput="_chatSearch(this.value)">' +
                '</div>' +
                '<div id="chatSearchResults"></div>' +
                '<div class="chat-thread-list" id="chatThreadList"></div>' +
            '</div>' +
            '<div class="chat-main" id="chatMain">' +
                '<div class="chat-placeholder"><div class="ic">💬</div><p>ابحث عن طالب أو دكتور بالاسم لبدء محادثة، أو افتح محادثة من القائمة</p></div>' +
            '</div>' +
        '</div>';

    _renderThreadList();
};

function _renderThreadList() {
    var listEl = document.getElementById('chatThreadList');
    if (!listEl) return;
    var u = window.ausAuth.user;
    var threads = window.AusChat.getMyThreads();
    listEl.innerHTML = threads.length ? threads.map(function (t) {
        var otherEmail = t.participants.filter(function (e) { return e !== u.email; })[0];
        var otherName = t.participantNames[otherEmail] || otherEmail;
        var last = t.messages[t.messages.length - 1];
        var unread = window.AusChat.threadUnreadCount(t, u.email);
        return '<div class="chat-thread-item' + (t.id === _activeThreadId ? ' active' : '') + '" onclick="_chatOpenThread(\'' + t.id + '\')">' +
            '<div class="chat-thread-name">' + _esc(otherName) + '</div>' +
            '<div class="chat-thread-preview">' + (last ? _esc(last.text.slice(0, 40)) : 'لا توجد رسائل بعد') + '</div>' +
            (unread ? '<span class="chat-unread-dot">' + unread + '</span>' : '') +
            '</div>';
    }).join('') : '<div class="chat-note">لا توجد محادثات بعد — ابحث عن اسم لبدء واحدة.</div>';
}

window._chatSearch = function (query) {
    var resultsEl = document.getElementById('chatSearchResults');
    if (!resultsEl) return;
    query = (query || '').trim();
    if (!query) { resultsEl.innerHTML = ''; return; }
    var results = window.AusChat.searchPeople(query);
    resultsEl.innerHTML = results.length ? results.map(function (a) {
        return '<div class="chat-search-item">' +
            '<span>' + _roleBadge(a.role) + ' ' + _esc(a.full_name || a.email) + '</span>' +
            '<button class="chat-btn gold sm" onclick="_chatAddContact(\'' + _esc(a.email) + '\',\'' + _esc((a.full_name || a.email).replace(/'/g, "\\'")) + '\')">+ إضافة</button>' +
            '</div>';
    }).join('') : '<div class="chat-note">لا توجد نتائج مطابقة.</div>';
};

window._chatAddContact = function (email, name) {
    var t = window.AusChat.ensureThread(email, name);
    if (!t) return;
    document.getElementById('chatSearchInput').value = '';
    document.getElementById('chatSearchResults').innerHTML = '';
    _renderThreadList();
    _openThread(t.id);
    if (typeof showToast === 'function') showToast('✅ تمت الإضافة — ابدأ المحادثة الآن', 'xp-toast');
};

window._chatOpenThread = function (threadId) { _openThread(threadId); };

function _openThread(threadId) {
    var t = window.AusChat.getThread(threadId);
    var mainEl = document.getElementById('chatMain');
    if (!t || !mainEl) return;
    _activeThreadId = threadId;
    window.AusChat.markThreadRead(threadId);
    _renderThreadList(); // refresh unread dot + active highlight

    var u = window.ausAuth.user;
    var otherEmail = t.participants.filter(function (e) { return e !== u.email; })[0];
    var otherName = t.participantNames[otherEmail] || otherEmail;
    var otherAccounts = window.ausAuth.listAccounts ? window.ausAuth.listAccounts() : [];
    var otherAccount = otherAccounts.filter(function (a) { return a.email === otherEmail; })[0];

    var msgsHtml = t.messages.length ? t.messages.map(function (m) {
        var mine = m.senderEmail === u.email;
        return '<div class="chat-msg' + (mine ? ' mine' : '') + '"><div class="chat-msg-bubble">' + _esc(m.text) + '</div>' +
            '<div class="chat-msg-time">' + new Date(m.ts).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) + '</div></div>';
    }).join('') : '<div class="chat-note" style="text-align:center;padding:1rem">لا توجد رسائل بعد — ابدأ المحادثة.</div>';

    mainEl.innerHTML =
        '<div class="chat-conv-head">' + _roleBadge(otherAccount && otherAccount.role) + ' ' + _esc(otherName) + '</div>' +
        '<div class="chat-messages" id="chatMessages">' + msgsHtml + '</div>' +
        '<div class="chat-composer">' +
            '<textarea id="chatComposerText" rows="1" placeholder="اكتب رسالتك..." onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();_chatSend();}"></textarea>' +
            '<button class="chat-btn gold" onclick="_chatSend()"><i class="fas fa-paper-plane"></i></button>' +
        '</div>';

    var box = document.getElementById('chatMessages');
    if (box) box.scrollTop = box.scrollHeight;
}

window._chatSend = function () {
    if (!_activeThreadId) return;
    var t = window.AusChat.getThread(_activeThreadId);
    if (!t) return;
    var u = window.ausAuth.user;
    var otherEmail = t.participants.filter(function (e) { return e !== u.email; })[0];
    var otherName = t.participantNames[otherEmail] || otherEmail;
    var textEl = document.getElementById('chatComposerText');
    var text = (textEl.value || '').trim();
    if (!text) return;
    window.AusChat.sendMessage(otherEmail, otherName, text);
    textEl.value = '';
    _openThread(_activeThreadId);
};

// Same-device live refresh: if the other participant's tab is open on the
// SAME browser/device, new messages appear without needing to click around.
// Does not reach a different physical device — that needs a real backend.
window.addEventListener('storage', function (e) {
    if (e.key !== THREADS_KEY) return;
    if (!document.getElementById('chatHost') || !document.getElementById('chatHost').closest('.section.active')) return;
    _renderThreadList();
    if (_activeThreadId) _openThread(_activeThreadId);
});

// ── Styles (Nano Glass System — matches the rest of the app) ───────────────
(function injectCSS() {
    if (document.getElementById('chat-styles')) return;
    var s = document.createElement('style');
    s.id = 'chat-styles';
    s.textContent = [
        '.chat-wrap{display:flex;gap:16px;height:calc(100vh - 220px);min-height:480px;max-width:1100px;margin:16px auto;padding:0 16px;}',
        '.chat-empty{max-width:420px;margin:60px auto;text-align:center;color:rgba(255,255,255,.6);}',
        '.chat-empty .ic{font-size:2.6rem;margin-bottom:10px;}',
        '.chat-empty h3{color:#fff;margin-bottom:14px;}',
        '.chat-btn{border:none;border-radius:11px;padding:.6rem 1.1rem;cursor:pointer;font-family:"Tajawal",sans-serif;font-weight:700;font-size:.84rem;display:inline-flex;align-items:center;gap:7px;}',
        '.chat-btn.gold{background:linear-gradient(135deg,#ffd700,#ff9500);color:#1a1000;}',
        '.chat-btn.sm{padding:.35rem .7rem;font-size:.74rem;}',
        '.chat-sidebar{width:290px;flex-shrink:0;background:rgba(255,255,255,.06);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.12);border-radius:18px;box-shadow:0 20px 50px rgba(0,0,0,.4);padding:14px;display:flex;flex-direction:column;overflow:hidden;}',
        '.chat-search-box input{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);color:#fff;padding:10px 12px;border-radius:11px;font-family:inherit;font-size:.85rem;box-sizing:border-box;}',
        '.chat-search-item{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 6px;color:#fff;font-size:.82rem;border-bottom:1px solid rgba(255,255,255,.06);}',
        '.chat-thread-list{flex:1;overflow-y:auto;margin-top:10px;}',
        '.chat-thread-item{position:relative;padding:10px 12px;border-radius:12px;cursor:pointer;margin-bottom:6px;transition:background .15s;}',
        '.chat-thread-item:hover{background:rgba(255,255,255,.06);}',
        '.chat-thread-item.active{background:rgba(0,212,255,.12);border:1px solid rgba(0,212,255,.35);}',
        '.chat-thread-name{color:#fff;font-weight:700;font-size:.85rem;}',
        '.chat-thread-preview{color:rgba(255,255,255,.5);font-size:.76rem;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
        '.chat-unread-dot{position:absolute;left:10px;top:10px;background:#ff006e;color:#fff;font-size:.68rem;font-weight:800;border-radius:50%;min-width:18px;height:18px;display:flex;align-items:center;justify-content:center;padding:0 4px;}',
        '.chat-note{color:rgba(255,255,255,.4);font-size:.78rem;padding:8px 4px;}',
        '.chat-main{flex:1;background:rgba(255,255,255,.06);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,.12);border-radius:18px;box-shadow:0 20px 50px rgba(0,0,0,.4);display:flex;flex-direction:column;overflow:hidden;}',
        '.chat-placeholder{margin:auto;text-align:center;color:rgba(255,255,255,.4);padding:20px;}',
        '.chat-placeholder .ic{font-size:2.2rem;margin-bottom:10px;}',
        '.chat-conv-head{padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.08);color:#fff;font-weight:800;}',
        '.chat-messages{flex:1;overflow-y:auto;padding:16px 18px;display:flex;flex-direction:column;gap:10px;}',
        '.chat-msg{max-width:70%;align-self:flex-start;}',
        '.chat-msg.mine{align-self:flex-end;}',
        '.chat-msg-bubble{background:rgba(255,255,255,.08);color:#fff;padding:9px 14px;border-radius:14px;font-size:.86rem;line-height:1.6;word-break:break-word;}',
        '.chat-msg.mine .chat-msg-bubble{background:linear-gradient(135deg,rgba(255,215,0,.25),rgba(255,149,0,.15));border:1px solid rgba(255,215,0,.3);}',
        '.chat-msg-time{color:rgba(255,255,255,.35);font-size:.68rem;margin-top:3px;text-align:end;}',
        '.chat-composer{display:flex;gap:8px;padding:12px 14px;border-top:1px solid rgba(255,255,255,.08);}',
        '.chat-composer textarea{flex:1;resize:none;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.15);color:#fff;padding:10px 12px;border-radius:11px;font-family:inherit;font-size:.85rem;max-height:90px;}',
        '@media (max-width:768px){',
        '  .chat-wrap{flex-direction:column;height:auto;}',
        '  .chat-sidebar{width:100%;max-height:260px;}',
        '  .chat-main{min-height:380px;}',
        '}'
    ].join('\n');
    document.head.appendChild(s);
})();

})();
