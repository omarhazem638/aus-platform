// =============================================================================
// aus_40_notifications.js — Doctor/Admin → Student notifications
// Students can only acknowledge with a like; no reply of any kind is exposed
// anywhere in the UI (see control_panel.js's inbox card).
// Standalone system | depends on window.ausAuth | touches no existing system
// =============================================================================
(function () {
'use strict';

var NOTIF_KEY = 'aus.notifications';
var BROADCAST_ALL = '__ALL_STUDENTS__';

function _getAll() { try { var a = JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
function _saveAll(list) { try { localStorage.setItem(NOTIF_KEY, JSON.stringify(list)); } catch (e) {} }

// recipientEmail: a specific student's email, or BROADCAST_ALL for everyone.
function send(recipientEmail, text) {
    var u = window.ausAuth && window.ausAuth.user;
    if (!u || (u.role !== 'doctor' && u.role !== 'admin')) return null; // only doctor/admin may send
    text = (text || '').trim();
    if (!text) return null;
    var entry = {
        id: 'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        senderEmail: u.email, senderName: u.full_name || u.email, senderRole: u.role,
        recipientEmail: recipientEmail || BROADCAST_ALL,
        text: text, ts: Date.now(),
        readBy: [], likedBy: []
    };
    var list = _getAll();
    list.push(entry);
    _saveAll(list);
    return entry;
}

// Everything addressed to the CURRENT logged-in user (targeted + broadcasts).
function getMine() {
    var u = window.ausAuth && window.ausAuth.user;
    if (!u) return [];
    return _getAll().filter(function (n) {
        return n.recipientEmail === u.email || n.recipientEmail === BROADCAST_ALL;
    }).sort(function (a, b) { return b.ts - a.ts; });
}

function markRead(notifId) {
    var u = window.ausAuth && window.ausAuth.user;
    if (!u) return;
    var list = _getAll();
    var n = list.filter(function (x) { return x.id === notifId; })[0];
    if (n && n.readBy.indexOf(u.email) === -1) { n.readBy.push(u.email); _saveAll(list); }
}

function getUnreadCount() {
    var u = window.ausAuth && window.ausAuth.user;
    if (!u) return 0;
    return getMine().filter(function (n) { return n.readBy.indexOf(u.email) === -1; }).length;
}

// The ONLY interaction a student ever has with a message — toggle a like.
// Returns the new liked state (true/false) for the caller to update its UI.
function toggleLike(notifId) {
    var u = window.ausAuth && window.ausAuth.user;
    if (!u) return false;
    var list = _getAll();
    var n = list.filter(function (x) { return x.id === notifId; })[0];
    if (!n) return false;
    var idx = n.likedBy.indexOf(u.email);
    if (idx === -1) { n.likedBy.push(u.email); _saveAll(list); return true; }
    n.likedBy.splice(idx, 1); _saveAll(list); return false;
}

// Messages sent BY the current doctor/admin — so they can see who liked what.
function getSentByMe() {
    var u = window.ausAuth && window.ausAuth.user;
    if (!u) return [];
    return _getAll().filter(function (n) { return n.senderEmail === u.email; }).sort(function (a, b) { return b.ts - a.ts; });
}

window.AusNotify = {
    BROADCAST_ALL: BROADCAST_ALL,
    send: send,
    getMine: getMine,
    markRead: markRead,
    getUnreadCount: getUnreadCount,
    toggleLike: toggleLike,
    getSentByMe: getSentByMe
};

})();
