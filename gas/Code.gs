/**
 * 中信 高校進学ナビ（Google Apps Script 版）
 *
 * 画面は top / nyushi / events の3つのHTMLファイル。
 * データは GitHub（hs-navi/chushin-navi）の data/*.json を毎回読み込むので、
 * 毎朝の自動更新の結果がそのまま反映されます。このファイルを書き換える必要はありません。
 */

const DATA_BASE = 'https://raw.githubusercontent.com/hs-navi/chushin-navi/main/data/';
const CACHE_SECONDS = 600; // 10分間は同じデータを使い回す（アクセスが多いときの負担を減らす）

const PAGES = {
  top:    { file: 'top',    title: '中信 高校進学ナビ',     data: null },
  nyushi: { file: 'nyushi', title: '中信 入試ナビ',         data: 'nyushi.json' },
  events: { file: 'events', title: '中信 高校イベントナビ', data: 'events.json' },
};

function doGet(e) {
  const params = (e && e.parameter) || {};
  const page = PAGES[params.page] ? params.page : 'top';
  const conf = PAGES[page];

  const t = HtmlService.createTemplateFromFile(conf.file);
  t.baseUrl = ScriptApp.getService().getUrl();
  t.school = /^[a-z0-9-]{1,40}$/.test(params.school || '') ? params.school : '';
  t.dataJson = conf.data ? safeJson_(loadData_(conf.data)) : 'null';

  return t.evaluate()
    .setTitle(conf.title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** GitHub からデータを読む。読めなかったときは最後に読めたデータを使う。 */
function loadData_(name) {
  const cache = CacheService.getScriptCache();
  const props = PropertiesService.getScriptProperties();
  const cached = cache.get(name);
  if (cached) return cached;
  try {
    const res = UrlFetchApp.fetch(DATA_BASE + name + '?t=' + Date.now(), { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      const text = res.getContentText('UTF-8');
      JSON.parse(text); // 壊れたデータを使わないための確認
      cache.put(name, text, CACHE_SECONDS);
      try { props.setProperty('last_' + name, text); } catch (err) { /* 大きすぎる場合は保存しない */ }
      return text;
    }
  } catch (err) {
    console.error(name + ' の読み込みに失敗: ' + err);
  }
  return props.getProperty('last_' + name); // 予備のデータ（なければ null）
}

/** HTMLの中に安全に埋め込める形にする */
function safeJson_(text) {
  if (!text) return 'null';
  return text.replace(/</g, '\\u003c').replace(/ /g, '\\u2028').replace(/ /g, '\\u2029');
}
