/* material-plus · 构建期 HTML 后处理
   1) FontAwesome / iconfont 图标 -> 内联 SVG sprite 引用（移除图标字体与外链 CSS）
   2) 图片统一加 loading=lazy + decoding=async
   全部在 hexo generate 阶段完成，页面运行时零额外脚本、零额外请求。 */

'use strict';

var ICON_MAP = {
  'search': 'i-search',
  'bars': 'i-menu', 'times': 'i-close', 'close': 'i-close',
  'calendar': 'i-calendar', 'calendar-alt': 'i-calendar', 'calendar-o': 'i-calendar',
  'eye': 'i-eye',
  'user': 'i-user', 'user-o': 'i-user',
  'chevron-left': 'i-chev-left', 'chevron-right': 'i-chev-right',
  'arrow-up': 'i-arrow-up', 'angle-up': 'i-arrow-up',
  'tag': 'i-tag', 'tags': 'i-tag',
  'comment': 'i-comment', 'comments': 'i-comment',
  'bell': 'i-bell', 'volume-down': 'i-bell', 'volume-up': 'i-bell',
  'sync': 'i-refresh', 'refresh': 'i-refresh', 'spinner': 'i-refresh',
  'bookmark': 'i-bookmark', 'star': 'i-star',
  'music': 'i-music', 'envelope': 'i-mail', 'mail': 'i-mail',
  'github': 'i-code', 'code': 'i-code', 'codepen': 'i-code',
  'qq': 'i-user', 'weibo': 'i-share', 'google-plus': 'i-share',
  'list-ul': 'i-list', 'list': 'i-list', 'th-large': 'i-grid', 'th': 'i-grid',
  'thumbtack': 'i-pin', 'clock-o': 'i-clock', 'clock': 'i-clock',
  'link': 'i-link', 'external-link': 'i-link', 'share': 'i-share',
  'circle-o': 'i-dot', 'codiepie': 'i-dot', 'dot-circle-o': 'i-dot'
};

/* FontAwesome 的尺寸/状态修饰符，不作为图标名参与映射 */
var MODIFIERS = {
  'fw': 1, 'spin': 1, 'pulse': 1, 'lg': 1, 'sm': 1, 'xs': 1,
  '2x': 1, '3x': 1, '4x': 1, '5x': 1, 'inverse': 1, 'stack': 1,
  'stack-1x': 1, 'stack-2x': 1, 'pull-left': 1, 'pull-right': 1,
  'border': 1, 'flip-horizontal': 1, 'rotate-90': 1, 'li': 1
};

var ICONFONT_MAP = {
  'weibo': 'i-share', 'qqkongjian': 'i-share', 'qq': 'i-share',
  'chevron-left': 'i-chev-left', 'chevron-right': 'i-chev-right'
};

function resolveFaIcon(cls) {
  var re = /\bfa-([a-z0-9-]+)\b/g;
  var match;
  while ((match = re.exec(cls)) !== null) {
    var name = match[1];
    if (!MODIFIERS[name]) return ICON_MAP[name] || 'i-dot';
  }
  return 'i-dot';
}

function svgUse(id) {
  return '<svg class="icon" aria-hidden="true"><use href="#' + id + '"></use></svg>';
}

hexo.extend.filter.register('after_render:html', function (html) {
  if (typeof html !== 'string' || html.indexOf('<body') === -1) return html;

  /* <i class="fa fa-xxx ..."></i> -> <svg><use .../></svg> */
  html = html.replace(/<i\s+class=["']([^"']*\bfa-[a-z0-9-]+[^"']*)["'][^>]*>\s*<\/i>/gi,
    function (all, cls) { return svgUse(resolveFaIcon(cls)); });

  /* 旧 iconfont 分享/翻页图标 */
  html = html.replace(/<span\s+class=["']iconfont\s+icon-([a-z0-9-]+)["'][^>]*>\s*<\/span>/gi,
    function (all, name) { return svgUse(ICONFONT_MAP[name.toLowerCase()] || 'i-share'); });

  /* 图片懒加载：跳过已声明 loading、data URI 及显式 no-lazy 的图片 */
  html = html.replace(/<img\b([^>]*)>/gi, function (all, attrs) {
    if (/\bloading\s*=|no-lazy|data:image\//i.test(attrs)) return all;
    return '<img' + attrs.replace(/\s*\/\s*$/, '') + ' loading="lazy" decoding="async">';
  });

  return html;
});
