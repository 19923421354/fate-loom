/* 幻语AI v5.0.0 综合增强模块（独立自包含，不依赖主程序内部状态） */
(function () {
  'use strict';
  if (window.__HY_V5__) return;
  window.__HY_V5__ = true;
  var V = '5.0.0';
  var LS = window.localStorage;

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  /* ---------- 1. 主题系统：浅色 / 深色 / 护眼 ---------- */
  var THEMES = {
    light: { bg: '#ffffff', fg: '#1b1b1f', sub: '#5f6368', brand: '#3b6ef5' },
    dark: { bg: '#14161a', fg: '#e8eaed', sub: '#9aa0a6', brand: '#6f96ff' },
    eye: { bg: '#c7edcc', fg: '#22322a', sub: '#3f5a49', brand: '#2f7a4f' }
  };
  var styleTag = null;
  function applyTheme(name) {
    var t = THEMES[name] || THEMES.light;
    document.documentElement.setAttribute('data-hy-theme', name);
    if (!styleTag) {
      styleTag = el('style');
      styleTag.id = 'hy-v5-theme';
      document.head.appendChild(styleTag);
    }
    styleTag.textContent =
      'html[data-hy-theme="' + name + '"] body{background:' + t.bg + '!important;color:' + t.fg + '!important;}' +
      'html[data-hy-theme="' + name + '"] .hy-v5-panel,html[data-hy-theme="' + name + '"] .hy-v5-fab{background:' + t.bg + '!important;color:' + t.fg + '!important;border-color:' + t.sub + '33!important;}' +
      'html[data-hy-theme="' + name + '"] .hy-v5-panel *{color:' + t.fg + '!important;}' +
      'html[data-hy-theme="' + name + '"] .hy-v5-row{border-color:' + t.sub + '33!important;}' +
      'html[data-hy-theme="' + name + '"] .hy-v5-btn{background:' + t.brand + '22!important;color:' + t.brand + '!important;}' +
      'html[data-hy-theme="' + name + '"] .hy-v5-sub{color:' + t.sub + '!important;}';
    try { LS.setItem('hy_v5_theme', name); } catch (e) {}
  }
  var savedTheme = 'light';
  try { savedTheme = LS.getItem('hy_v5_theme') || 'light'; } catch (e) {}
  applyTheme(savedTheme);

  /* ---------- 2. 字号缩放 ---------- */
  var fontScale = 1;
  try { fontScale = parseFloat(LS.getItem('hy_v5_font') || '1') || 1; } catch (e) {}
  function applyFont(s) {
    fontScale = Math.min(1.6, Math.max(0.8, s));
    var st = document.getElementById('hy-v5-font');
    if (!st) { st = el('style'); st.id = 'hy-v5-font'; document.head.appendChild(st); }
    st.textContent = 'body{font-size:' + (fontScale * 100) + '%!important;}';
    try { LS.setItem('hy_v5_font', String(fontScale)); } catch (e) {}
  }
  applyFont(fontScale);

  /* ---------- 3. 对话采集与导出（JSON / Markdown / TXT） ---------- */
  function collectMessages() {
    var sels = ['.message', '.msg', '.chat-item', '[class*="message"]', '[class*="bubble"]'];
    var nodes = [];
    for (var i = 0; i < sels.length && nodes.length < 4; i++) {
      var found = document.querySelectorAll(sels[i]);
      if (found.length > nodes.length) nodes = Array.prototype.slice.call(found);
    }
    if (!nodes.length) {
      var body = document.body.innerText || '';
      return body.trim() ? [{ role: 'document', text: body.trim() }] : [];
    }
    var out = [];
    nodes.forEach(function (n) {
      var txt = (n.innerText || '').trim();
      if (!txt) return;
      var cls = (n.className || '') + ' ' + ((n.parentNode && n.parentNode.className) || '');
      var role = /user|me|self|right|out/i.test(cls) ? 'user' : 'ai';
      out.push({ role: role, text: txt, time: Date.now() });
    });
    return out;
  }

  function download(name, content, mime) {
    try {
      var blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
      toast('已导出：' + name);
    } catch (e) { toast('导出失败：' + e.message); }
  }

  function stamp() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  }

  function exportAs(fmt) {
    var msgs = collectMessages();
    if (!msgs.length) return toast('当前没有可导出的对话内容');
    if (fmt === 'json') {
      download('huanyuai-chat-' + stamp() + '.json',
        JSON.stringify({ app: '幻语AI', version: V, exportedAt: new Date().toISOString(), messages: msgs }, null, 2),
        'application/json');
    } else if (fmt === 'md') {
      var md = '# 幻语AI 对话导出\n\n> 版本 v' + V + ' | 导出时间 ' + new Date().toLocaleString() + '\n\n';
      msgs.forEach(function (m) {
        md += (m.role === 'user' ? '## 👤 我\n\n' : '## 🤖 幻语AI\n\n') + m.text + '\n\n---\n\n';
      });
      download('huanyuai-chat-' + stamp() + '.md', md, 'text/markdown;charset=utf-8');
    } else {
      var txt = msgs.map(function (m) { return '[' + m.role + '] ' + m.text; }).join('\n\n');
      download('huanyuai-chat-' + stamp() + '.txt', txt, 'text/plain;charset=utf-8');
    }
  }

  /* ---------- 4. 全文搜索 / 高亮 / 跳转 ---------- */
  var hiIndex = -1, hiHits = [];
  function clearHi() {
    hiHits.forEach(function (h) { h.style.outline = ''; h.style.outlineOffset = ''; });
    hiHits = []; hiIndex = -1;
  }
  function search(kw) {
    clearHi();
    if (!kw || kw.length < 1) return toast('请输入要搜索的关键词');
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = n.parentNode;
        if (!p || /SCRIPT|STYLE|NOSCRIPT/.test(p.nodeName)) return NodeFilter.FILTER_REJECT;
        return n.nodeValue.toLowerCase().indexOf(kw.toLowerCase()) >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    var n;
    while ((n = walker.nextNode())) {
      hiHits.push(n.parentNode);
      if (hiHits.length >= 400) break;
    }
    if (!hiHits.length) return toast('未找到「' + kw + '」');
    hiHits.forEach(function (h) { h.style.outline = '2px solid #ffb300'; h.style.outlineOffset = '2px'; });
    hiIndex = 0;
    hiHits[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast('共 ' + hiHits.length + ' 处命中，点「下一个」继续');
  }
  function nextHit() {
    if (!hiHits.length) return toast('请先搜索');
    hiIndex = (hiIndex + 1) % hiHits.length;
    hiHits[hiIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---------- 5. 快捷指令（提示词模板） ---------- */
  var PROMPTS = [
    ['📄 总结要点', '请把上面的内容浓缩成 5 条要点，每条不超过 25 字。'],
    ['🌐 中英互译', '请把我下一条消息翻译成地道的英文，只输出译文。'],
    ['🧠 深度思考', '请先给出结论，再分点说明理由，最后列出可能的反例。'],
    ['🛠 代码修复', '请找出这段代码的问题，给出可直接运行的修复版本，并解释改动。'],
    ['✍️ 润色改写', '请在保持原意的前提下润色下面这段文字，使其更简洁有力。'],
    ['📚 科普解释', '请用中学生能听懂的语言解释上面的概念，配一个生活化的例子。']
  ];
  function insertPrompt(text) {
    var ta = document.querySelector('textarea, input[type="text"], [contenteditable="true"]');
    if (!ta) return toast('请先点开输入框');
    if (ta.isContentEditable) {
      ta.focus(); document.execCommand('insertText', false, text);
    } else {
      var setter = Object.getOwnPropertyDescriptor(ta.__proto__, 'value');
      setter.set.call(ta, (ta.value ? ta.value + '\n' : '') + text);
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.focus();
    }
    toast('已插入模板');
  }

  /* ---------- 6. UI ---------- */
  function toast(msg) {
    var t = document.getElementById('hy-v5-toast');
    if (!t) {
      t = el('div'); t.id = 'hy-v5-toast';
      t.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);max-width:78%;padding:9px 14px;' +
        'border-radius:10px;background:rgba(20,22,26,.92);color:#fff;font-size:13px;line-height:1.4;z-index:2147483647;' +
        'box-shadow:0 6px 20px rgba(0,0,0,.28);transition:opacity .25s;';
      document.body.appendChild(t);
    }
    t.textContent = msg; t.style.opacity = '1';
    clearTimeout(t.__t);
    t.__t = setTimeout(function () { t.style.opacity = '0'; }, 2200);
  }

  function buildPanel() {
    if (document.getElementById('hy-v5-panel')) return;

    var fab = el('div', 'hy-v5-fab', 'V5');
    fab.id = 'hy-v5-fab';
    fab.style.cssText = 'position:fixed;right:14px;bottom:86px;width:46px;height:46px;border-radius:50%;display:flex;' +
      'align-items:center;justify-content:center;font-size:14px;font-weight:700;letter-spacing:.5px;cursor:pointer;' +
      'background:#3b6ef5;color:#fff;z-index:2147483000;box-shadow:0 6px 18px rgba(59,110,245,.45);user-select:none;';
    document.body.appendChild(fab);

    var p = el('div', 'hy-v5-panel');
    p.id = 'hy-v5-panel';
    p.style.cssText = 'position:fixed;right:12px;bottom:142px;width:268px;max-height:70vh;overflow:auto;display:none;' +
      'padding:12px;border-radius:14px;background:#fff;color:#1b1b1f;border:1px solid rgba(0,0,0,.08);' +
      'box-shadow:0 14px 40px rgba(0,0,0,.28);z-index:2147483001;font-size:13px;';

    var head = el('div');
    head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;';
    head.appendChild(el('b', 'hy-v5-title', '幻语AI v' + V + ' 增强台'));
    var close = el('span', null, '✕');
    close.style.cssText = 'cursor:pointer;opacity:.55;padding:2px 6px;';
    close.onclick = function () { p.style.display = 'none'; };
    head.appendChild(close);
    p.appendChild(head);

    function section(title) {
      var h = el('div', 'hy-v5-sub', title);
      h.style.cssText = 'font-size:11px;opacity:.62;margin:10px 0 6px;letter-spacing:.4px;';
      p.appendChild(h);
    }
    function row(buttons) {
      var r = el('div', 'hy-v5-row');
      r.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
      buttons.forEach(function (cfg) {
        var b = el('div', 'hy-v5-btn', cfg[0]);
        b.style.cssText = 'flex:1 1 42%;text-align:center;padding:8px 6px;border-radius:9px;cursor:pointer;' +
          'background:rgba(59,110,245,.12);color:#3b6ef5;font-size:12px;white-space:nowrap;';
        b.onclick = cfg[1];
        r.appendChild(b);
      });
      p.appendChild(r);
    }

    section('主题与外观');
    row([
      ['☀️ 浅色', function () { applyTheme('light'); }],
      ['🌙 深色', function () { applyTheme('dark'); }],
      ['🌿 护眼', function () { applyTheme('eye'); }],
      ['🔍 搜索', function () {
        var kw = window.prompt('搜索当前对话中的关键词');
        if (kw) search(kw);
      }],
      ['⬇️ 下一处', nextHit],
      ['🔠 字号+', function () { applyFont(fontScale + 0.1); }],
      ['🔡 字号-', function () { applyFont(fontScale - 0.1); }],
      ['♻️ 复位', function () { clearHi(); applyFont(1); toast('已复位'); }]
    ]);

    section('数据与导出');
    row([
      ['JSON', function () { exportAs('json'); }],
      ['Markdown', function () { exportAs('md'); }],
      ['纯文本', function () { exportAs('txt'); }],
      ['字数统计', function () {
        var m = collectMessages();
        var n = m.reduce(function (a, x) { return a + x.text.length; }, 0);
        toast('共 ' + m.length + ' 条消息，约 ' + n + ' 字');
      }]
    ]);

    section('快捷指令');
    PROMPTS.forEach(function (pr) {
      var b = el('div', 'hy-v5-btn', pr[0]);
      b.style.cssText = 'padding:7px 10px;margin-bottom:6px;border-radius:9px;cursor:pointer;' +
        'background:rgba(59,110,245,.10);color:#3b6ef5;font-size:12px;';
      b.onclick = function () { insertPrompt(pr[1]); };
      p.appendChild(b);
    });

    var foot = el('div', 'hy-v5-sub', 'v' + V + ' · 主题/导出/搜索/指令 全面增强');
    foot.style.cssText = 'font-size:10.5px;opacity:.5;margin-top:10px;text-align:center;';
    p.appendChild(foot);

    document.body.appendChild(p);
    fab.onclick = function () {
      p.style.display = (p.style.display === 'none' || !p.style.display) ? 'block' : 'none';
    };
  }

  function boot() {
    buildPanel();
    if (window.AppBridge && typeof window.AppBridge.getVersion === 'function') {
      try { console.log('[V5] native version:', window.AppBridge.getVersion()); } catch (e) {}
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    setTimeout(boot, 300);
  }
})();
