/* Tiny two-language switch. English lives in the HTML; Chinese lives next to it in data-zh.
 * Choice order: ?lang=zh|en in the URL, then the visitor's last click on the switch, then the browser language.
 * Load this in <head> so page scripts can call tr(en, zh) before the DOM is ready. */
(function () {
  let lang = new URLSearchParams(location.search).get('lang');
  if (!lang) { try { lang = localStorage.getItem('elm-lang'); } catch (e) {} }
  if (!lang) lang = /^zh/i.test(navigator.language || '') ? 'zh' : 'en';
  lang = lang === 'zh' ? 'zh' : 'en';
  const zh = lang === 'zh';
  window.LANG = lang;
  window.tr = (en, cn) => (zh ? cn : en);
  document.documentElement.lang = zh ? 'zh-CN' : 'en';

  function apply() {
    if (zh) {
      document.querySelectorAll('[data-zh]').forEach(el => { el.innerHTML = el.dataset.zh; });
      document.querySelectorAll('[data-zh-alt]').forEach(el => { el.alt = el.dataset.zhAlt; });
      document.querySelectorAll('[data-zh-href]').forEach(el => { el.href = el.dataset.zhHref; });
    }
    // carry the language to the next page, so a shared ?lang=en link stays English in a Chinese browser
    document.querySelectorAll('a[href]').forEach(a => {
      const h = a.getAttribute('href');
      if (/^[a-z]+:|^#/i.test(h) || !/\.html(#|$)/.test(h)) return;
      a.setAttribute('href', h.replace(/\.html(#.*)?$/, (m, hash) => '.html?lang=' + lang + (hash || '')));
    });
    const sw = document.querySelector('[data-lang-switch]');
    if (sw) {
      const other = zh ? 'en' : 'zh';
      sw.textContent = zh ? 'EN' : '中文';
      sw.href = '?lang=' + other + location.hash;
      sw.onclick = () => { try { localStorage.setItem('elm-lang', other); } catch (e) {} };
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();
