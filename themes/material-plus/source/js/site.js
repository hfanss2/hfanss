/* material-plus · site.js
   零依赖原生脚本：导航、本地搜索、回到顶部、运行时间、第三方脚本延迟加载。
   取代原 app.js / search.js / back.top.js（三者均依赖 jQuery）。 */
(function () {
  'use strict';

  var cfgEl = document.getElementById('site-config');
  var cfg = {};
  if (cfgEl) {
    try { cfg = JSON.parse(cfgEl.textContent) || {}; } catch (e) { cfg = {}; }
  }

  function el(id) { return document.getElementById(id); }
  function on(node, type, fn, options) { if (node) node.addEventListener(type, fn, options); }

  /* ------------------------- 移动端菜单 / 搜索面板 / 「更多」折叠组 */
  var header = document.querySelector('.l_header');
  var menuBtn = el('menu-toggle');
  var mobileNav = el('mobile-nav');
  var searchBtn = el('search-toggle');
  var searchPanel = el('search-panel');
  var searchInput = el('search-input');
  var searchResults = el('search-results');
  var searchClose = el('search-close');

  /* 「更多」折叠组：PC 下拉在有 hover 能力时由 CSS :hover 负责，
     这里处理移动端弹出，以及无 hover 设备（触屏大屏）的点击兜底。 */
  var moreGroups = document.querySelectorAll('[data-nav-more]');
  var hoverCapable = window.matchMedia
    ? window.matchMedia('(hover: hover) and (pointer: fine)').matches
    : true;
  function setMoreOpen(group, open) {
    group.classList.toggle('is-open', open);
    var btn = group.querySelector('[data-nav-more-toggle]');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function closeMore(except) {
    Array.prototype.forEach.call(moreGroups, function (g) {
      if (g !== except) setMoreOpen(g, false);
    });
  }
  function insideMore(node) {
    while (node) {
      if (node.hasAttribute && node.hasAttribute('data-nav-more')) return true;
      node = node.parentNode;
    }
    return false;
  }

  function setOpen(node, button, open) {
    if (!node) return;
    node.hidden = !open;
    if (button) button.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function closeAll() {
    setOpen(mobileNav, menuBtn, false);
    setOpen(searchPanel, searchBtn, false);
    closeMore();
  }

  on(menuBtn, 'click', function () {
    var open = mobileNav.hidden;
    closeAll();
    setOpen(mobileNav, menuBtn, open);
  });

  on(searchBtn, 'click', function () {
    var open = searchPanel.hidden;
    closeAll();
    setOpen(searchPanel, searchBtn, open);
    if (open && searchInput) searchInput.focus();
  });

  on(searchClose, 'click', closeAll);
  on(document, 'click', function (e) {
    if (!header || !header.contains(e.target)) { closeAll(); return; }
    /* 点击导航栏内、但不在任何「更多」组内：收起子菜单 */
    if (!insideMore(e.target)) closeMore();
  });
  on(document, 'keydown', function (e) {
    if (e.key === 'Escape') closeAll();
  });

  /* 绑定「更多」触发按钮：移动端抽屉与无 hover 设备点击切换。
     有精确指针的 PC 交给 CSS :hover，避免「点击收起但鼠标仍悬停」的显示冲突。 */
  Array.prototype.forEach.call(moreGroups, function (group) {
    if (group.classList.contains('nav-more-item') && hoverCapable) return;
    on(group.querySelector('[data-nav-more-toggle]'), 'click', function (e) {
      e.stopPropagation();
      var open = !group.classList.contains('is-open');
      closeMore(group);
      setMoreOpen(group, open);
    });
  });

  /* 当前页菜单项标记为选中：移动端下拉菜单用更深一档底色突出 */
  (function markActiveNav() {
    var path = location.pathname.replace(/index\.html$/i, '');
    var links = document.querySelectorAll('.nav-links a[href], .mobile-nav a[href]');
    Array.prototype.forEach.call(links, function (a) {
      var href = a.getAttribute('href');
      if (!href || /^https?:/i.test(href) || href.charAt(0) === '#') return;
      var target = href.split('?')[0].replace(/index\.html$/i, '');
      var isHome = target === '/' || target === '';
      if ((isHome && (path === '/' || path === '')) ||
          (!isHome && path.indexOf(target) === 0)) {
        a.classList.add('is-active');
        a.setAttribute('aria-current', 'page');
      }
    });
  })();

  /* ------------------------------------------------------------ 本地搜索 */
  var indexPromise = null;
  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch(cfg.searchPath || '/search.xml')
        .then(function (r) { return r.text(); })
        .then(function (text) {
          var doc = new DOMParser().parseFromString(text, 'text/xml');
          return Array.prototype.map.call(doc.querySelectorAll('entry'), function (entry) {
            function field(name) {
              var n = entry.querySelector(name);
              return n ? (n.textContent || '').trim() : '';
            }
            var link = entry.querySelector('link');
            return {
              title: field('title'),
              url: field('url') || (link ? link.getAttribute('href') : '') || '',
              content: field('content').replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim()
            };
          });
        });
    }
    return indexPromise;
  }

  /* 关键词高亮：全部用文本节点拼接，绝不把用户输入拼进 innerHTML（防 XSS） */
  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function highlightText(node, text, terms) {
    if (!terms.length || !text) {
      node.appendChild(document.createTextNode(text || ''));
      return;
    }
    var lower = text.toLowerCase();
    var re = new RegExp(terms.map(escapeRe).join('|'), 'gi');
    var last = 0, m;
    while ((m = re.exec(lower)) !== null) {
      if (m[0].length === 0) { re.lastIndex++; continue; }
      if (m.index > last) node.appendChild(document.createTextNode(text.slice(last, m.index)));
      var mark = document.createElement('mark');
      mark.className = 'search-hl';
      mark.textContent = text.slice(m.index, m.index + m[0].length);
      node.appendChild(mark);
      last = m.index + m[0].length;
    }
    if (last < text.length) node.appendChild(document.createTextNode(text.slice(last)));
  }

  /* 摘要窗口围绕首个命中位置截取，保证关键词一定出现在结果里 */
  function makeSnippet(content, terms, len) {
    var pos = -1;
    if (content) {
      var lower = content.toLowerCase();
      for (var i = 0; i < terms.length; i++) {
        var p = lower.indexOf(terms[i]);
        if (p > -1 && (pos === -1 || p < pos)) pos = p;
      }
    }
    var start = pos > 30 ? Math.max(0, pos - 24) : 0;
    var end = Math.min(content.length, start + len);
    return (start > 0 ? '…' : '') + content.slice(start, end) + (end < content.length ? '…' : '');
  }

  function render(items, q) {
    if (!searchResults) return;
    searchResults.textContent = '';
    var terms = (q || '').split(/\s+/).filter(Boolean);
    if (!items.length) {
      var empty = document.createElement('div');
      empty.className = 'search-results__empty';
      empty.textContent = '没有找到相关内容';
      searchResults.appendChild(empty);
      return;
    }
    items.slice(0, 8).forEach(function (item) {
      var a = document.createElement('a');
      a.className = 'search-result';
      a.href = item.url;
      var t = document.createElement('span');
      t.className = 'search-result__title';
      highlightText(t, item.title, terms);
      var s = document.createElement('span');
      s.className = 'search-result__snippet';
      highlightText(s, makeSnippet(item.content, terms, 88), terms);
      a.appendChild(t);
      a.appendChild(s);
      searchResults.appendChild(a);
    });
  }

  var timer = null;
  on(searchInput, 'input', function () {
    var q = searchInput.value.trim().toLowerCase();
    clearTimeout(timer);
    if (!q) {
      if (searchResults) searchResults.textContent = '';
      return;
    }
    timer = setTimeout(function () {
      loadIndex().then(function (items) {
        var words = q.split(/\s+/).filter(Boolean);
        var hits = items.filter(function (item) {
          var hay = (item.title + ' ' + item.content).toLowerCase();
          return words.every(function (w) { return hay.indexOf(w) > -1; });
        });
        render(hits, q);
      }).catch(function () {
        if (searchResults) {
          searchResults.textContent = '';
          var err = document.createElement('div');
          err.className = 'search-results__empty';
          err.textContent = '搜索索引加载失败，请稍后重试';
          searchResults.appendChild(err);
        }
      });
    }, 180);
  });

  on(el('search-form'), 'submit', function (e) { e.preventDefault(); });

  /* ---------------------------------------------------------- 回到顶部 */
  var topBtn = el('back-to-top');
  if (topBtn) {
    on(topBtn, 'click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    var ticking = false;
    function syncTop() {
      topBtn.classList.toggle('is-visible', window.scrollY > 420);
      ticking = false;
    }
    on(window, 'scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(syncTop); }
    }, { passive: true });
    syncTop();
  }

  /* ---------------------------------------------------------- 运行时间 */
  var runtime = el('site-runtime');
  if (runtime) {
    var since = new Date(runtime.getAttribute('data-since') || '').getTime();
    var label = runtime.getAttribute('data-span') || '本站已稳定运行：';
    var output = el('runtime_span');
    if (output && !isNaN(since)) {
      function tick() {
        var sec = Math.floor(Math.max(0, Date.now() - since) / 1000);
        var d = Math.floor(sec / 86400);
        var h = Math.floor(sec % 86400 / 3600);
        var m = Math.floor(sec % 3600 / 60);
        var s = sec % 60;
        output.textContent = label + ' ' + d + '天' + h + '小时' + m + '分' + s + '秒';
      }
      tick();
      setInterval(tick, 1000);
    }
  }

  /* ------------------------------------------------------ 标签页标题 */
  if (cfg.changeTitle) {
    var normalTitle = document.title;
    on(document, 'visibilitychange', function () {
      if (document.hidden) {
        normalTitle = document.title;
        document.title = cfg.changeTitle;
      } else {
        document.title = normalTitle;
      }
    });
  }

  /* --------------------------------- 第三方脚本：首屏渲染完成后再加载 */
  function injectScript(src) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }
  function loadThirdParty() {
    if (cfg.baiduAnalytics) {
      window._hmt = window._hmt || [];
      injectScript('https://hm.baidu.com/hm.js?' + cfg.baiduAnalytics);
    }
    if (cfg.baiduPush) {
      injectScript(location.protocol === 'https:'
        ? 'https://zz.bdstatic.com/linksubmit/push.js'
        : 'http://push.zhanzhang.baidu.com/push.js');
    }
    /* 仅在页面确有阅读量占位时才加载计数脚本 */
    if (cfg.busuanzi && el('busuanzi_value_page_pv')) {
      injectScript('//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js');
    }
  }
  function scheduleThirdParty() {
    if (window.requestIdleCallback) {
      window.requestIdleCallback(loadThirdParty, { timeout: 3000 });
    } else {
      setTimeout(loadThirdParty, 1000);
    }
  }
  if (document.readyState === 'complete') {
    scheduleThirdParty();
  } else {
    on(window, 'load', scheduleThirdParty);
  }

  /* ------------------------------ 评论：滚动接近评论区时才加载 Valine */
  var vbox = el('vcomments');
  if (vbox && cfg.valine) {
    var valineLoading = false;
    function initValine() {
      if (valineLoading || window.Valine) return;
      valineLoading = true;
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://unpkg.com/valine/dist/Valine.min.js';
      s.onload = function () {
        if (!window.Valine) return;
        new window.Valine({
          el: '#vcomments',
          appId: cfg.valine.appId,
          appKey: cfg.valine.appKey,
          avatar: cfg.valine.avatar,
          placeholder: cfg.valine.placeholder,
          pageSize: Number(cfg.valine.pageSize) || 10
        });
      };
      document.head.appendChild(s);
    }
    if (window.IntersectionObserver) {
      var io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) { io.disconnect(); initValine(); break; }
        }
      }, { rootMargin: '300px' });
      io.observe(vbox);
    } else {
      initValine();
    }
  }
})();
