/* Backstage capture (B1). Raw-first: no AI, no polish, no review step.
   Every save goes queue-first, then the queue flushes. One code path means
   the offline case and the online case cannot drift apart. */
(function () {
  'use strict';

  var QUEUE_KEY = 'backstage.queue.v1';
  var INBOX_BASE = 'https://graph.microsoft.com/v1.0/me/drive/root:/PKA-Business/Team-Inbox/';

  var els = {};
  var flushing = false;
  var recognizing = false;
  var recognition = null;

  /* ---------- queue (localStorage) ---------- */

  function loadQueue() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; }
    catch (e) { return []; }
  }

  function saveQueue(q) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    renderQueue(q);
  }

  function shortId() {
    var bytes = new Uint8Array(3);
    crypto.getRandomValues(bytes);
    return Array.prototype.map.call(bytes, function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function buildCapture(text) {
    var now = new Date();
    var stamp = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate())
      + '-' + pad(now.getHours()) + pad(now.getMinutes());
    // The id is minted once, here. A retry re-PUTs the same filename and
    // overwrites itself — that is the no-duplicates guarantee.
    var id = shortId();
    return {
      id: id,
      filename: 'backstage-' + stamp + '-' + id + '.md',
      content: '---\nsource: backstage\nsender: Ben\ncaptured: ' + now.toISOString() + '\n---\n\n' + text + '\n',
      created: now.toISOString()
    };
  }

  /* ---------- Graph ---------- */

  function putFile(token, filename, content) {
    return fetch(INBOX_BASE + encodeURIComponent(filename) + ':/content', {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'text/markdown' },
      body: content
    }).then(function (resp) {
      if (!resp.ok) throw new Error('graph-put-' + resp.status);
      return resp;
    });
  }

  function deleteFile(token, filename) {
    return fetch('https://graph.microsoft.com/v1.0/me/drive/root:/PKA-Business/Team-Inbox/' + encodeURIComponent(filename), {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    }).then(function (resp) {
      if (!resp.ok && resp.status !== 404) throw new Error('graph-delete-' + resp.status);
      return resp;
    });
  }

  function flushQueue() {
    if (flushing) return Promise.resolve();
    var q = loadQueue();
    if (q.length === 0) { renderQueue(q); return Promise.resolve(); }
    if (!navigator.onLine) { renderQueue(q); return Promise.resolve(); }
    flushing = true;
    setStatus('sending', 'Sending ' + q.length + '…');

    return BackstageAuth.getToken().then(function (token) {
      var chain = Promise.resolve();
      q.forEach(function (item) {
        chain = chain.then(function () {
          return putFile(token, item.filename, item.content).then(function () {
            var rest = loadQueue().filter(function (x) { return x.id !== item.id; });
            saveQueue(rest);
          });
        });
      });
      return chain;
    }).then(function () {
      setStatus('ok', 'All sent');
      toast('Sent to Team-Inbox');
    }).catch(function (err) {
      setStatus('warn', 'Will retry (' + (loadQueue().length) + ' waiting)');
      console.warn('flush failed', err);
    }).finally(function () {
      flushing = false;
      renderQueue(loadQueue());
    });
  }

  /* ---------- capture ---------- */

  function saveCapture() {
    var text = els.text.value.trim();
    if (!text) { toast('Nothing to send yet'); return; }
    var item = buildCapture(text);
    var q = loadQueue();
    q.push(item);
    saveQueue(q);
    els.text.value = '';
    stopDictation();
    flushQueue();
  }

  /* ---------- dictation (Web Speech API; hidden if unsupported) ---------- */

  function setupDictation() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { els.mic.style.display = 'none'; return; }
    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = function (event) {
      var added = '';
      for (var i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) added += event.results[i][0].transcript;
      }
      if (added) {
        els.text.value = (els.text.value ? els.text.value.replace(/\s+$/, '') + ' ' : '') + added.trim();
      }
    };
    recognition.onend = function () {
      recognizing = false;
      els.mic.classList.remove('live');
      els.mic.textContent = '🎙 Dictate';
    };
    recognition.onerror = recognition.onend;
  }

  function stopDictation() {
    if (recognition && recognizing) recognition.stop();
  }

  function toggleDictation() {
    if (!recognition) return;
    if (recognizing) { recognition.stop(); return; }
    recognizing = true;
    els.mic.classList.add('live');
    els.mic.textContent = '⏹ Stop';
    recognition.start();
  }

  /* ---------- test signal ---------- */

  function testSignal() {
    var filename = 'backstage-test-signal-' + shortId() + '.md';
    var started = Date.now();
    setSignal('…', 'testing');
    BackstageAuth.getToken().then(function (token) {
      return putFile(token, filename, 'Backstage test signal ' + new Date().toISOString() + '\n')
        .then(function () { return deleteFile(token, filename); });
    }).then(function () {
      setSignal('SIGNAL OK · ' + (Date.now() - started) + 'ms', 'ok');
    }).catch(function (err) {
      setSignal('NO SIGNAL · ' + err.message, 'bad');
    });
  }

  /* ---------- UI plumbing ---------- */

  function setStatus(kind, msg) {
    els.status.dataset.kind = kind;
    els.status.textContent = msg;
  }

  function setSignal(msg, kind) {
    els.signalResult.textContent = msg;
    els.signalResult.dataset.kind = kind;
  }

  function renderQueue(q) {
    els.queueBadge.textContent = q.length;
    els.queueCard.style.display = q.length ? '' : 'none';
    els.queueList.innerHTML = '';
    q.forEach(function (item) {
      var li = document.createElement('li');
      li.textContent = item.filename;
      els.queueList.appendChild(li);
    });
    if (q.length && navigator.onLine) setStatus('warn', q.length + ' waiting to send');
    else if (q.length) setStatus('warn', q.length + ' queued (offline)');
    else setStatus('ok', navigator.onLine ? 'Ready' : 'Offline · captures will queue');
  }

  var toastTimer = null;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove('show'); }, 2200);
  }

  function showSignedIn(account) {
    els.signedOut.style.display = 'none';
    els.signedIn.style.display = '';
    els.who.textContent = account.username || account.name || 'signed in';
  }

  function showSignedOut() {
    els.signedOut.style.display = '';
    els.signedIn.style.display = 'none';
  }

  /* ---------- boot ---------- */

  function boot() {
    ['text', 'mic', 'save', 'status', 'toast', 'queueBadge', 'queueCard', 'queueList',
     'signedOut', 'signedIn', 'who', 'signInBtn', 'signOutBtn', 'testBtn', 'retryBtn', 'signalResult']
      .forEach(function (id) { els[id] = document.getElementById(id); });

    els.save.addEventListener('click', saveCapture);
    els.mic.addEventListener('click', toggleDictation);
    els.signInBtn.addEventListener('click', function () { BackstageAuth.signIn(); });
    els.signOutBtn.addEventListener('click', function () { BackstageAuth.signOut(); });
    els.testBtn.addEventListener('click', testSignal);
    els.retryBtn.addEventListener('click', flushQueue);
    window.addEventListener('online', flushQueue);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') flushQueue();
    });

    setupDictation();
    renderQueue(loadQueue());

    // Opened as a local file (preview): sign-in physically can't work here,
    // because file:// is not a valid reply URL for Microsoft. Say so instead
    // of letting the button lead to an AADSTS500111 error page.
    if (window.location.protocol === 'file:') {
      showSignedOut();
      els.signInBtn.disabled = true;
      els.signInBtn.textContent = 'Preview only — sign-in works after deploy';
      var note = document.getElementById('previewNote');
      if (note) note.style.display = '';
      return;
    }

    BackstageAuth.init().then(function (account) {
      if (account) {
        showSignedIn(account);
        flushQueue();
      } else {
        showSignedOut();
      }
    }).catch(function (err) {
      showSignedOut();
      toast('Sign-in error: ' + err.message);
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* app works without it */ });
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
