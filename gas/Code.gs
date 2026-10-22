/**
 * 長野県高校進学ナビ（Google Apps Script 版）
 *
 * 画面は top / nyushi / events の3つのHTMLファイル。
 * データは GitHub（hs-navi/chushin-navi）の data/*.json を毎回読み込むので、
 * 毎朝の自動更新の結果がそのまま反映されます。このファイルを書き換える必要はありません。
 */

const DATA_BASE = 'https://raw.githubusercontent.com/hs-navi/chushin-navi/main/data/';
const FAVICON_URL = 'https://hs-navi.github.io/chushin-navi/icons/favicon-32.png'; // タブのアイコン（GitHub Pages に置いたPNG）
const CACHE_SECONDS = 600; // 10分間は同じデータを使い回す（アクセスが多いときの負担を減らす）

const PAGES = {
  top:    { file: 'top',    title: '長野県高校進学ナビ',     data: null },
  nyushi: { file: 'nyushi', title: '長野県 入試ナビ',         data: 'nyushi' },
  events: { file: 'events', title: '長野県 イベントナビ', data: 'events' },
};

function doGet(e) {
  const params = (e && e.parameter) || {};
  const page = PAGES[params.page] ? params.page : 'top';
  const conf = PAGES[page];

  const t = HtmlService.createTemplateFromFile(conf.file);
  t.baseUrl = ScriptApp.getService().getUrl();
  t.school = /^[a-z0-9-]{1,40}$/.test(params.school || '') ? params.school : '';
  t.area = /^[a-z0-9-]{1,20}$/.test(params.area || '') ? params.area : ''; // 地区の指定（例：?page=events&area=toshin）
  t.dataJson = conf.data ? (loadRaw_(conf.data) || 'null') : 'null'; // ページ側でBase64にして渡すので加工しない

  return t.evaluate()
    .setTitle(conf.title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setFaviconUrl(FAVICON_URL)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 画面に渡すデータをまとめる。地区ごとのファイル（data/<種類>-<地区>.json）を読んで1つにする。
 * 読めない地区があるときは、その地区を除いて表示する（全体を止めない）。
 */
function loadRaw_(kind) {
  const regionsText = loadData_('regions.json');
  const commonText = loadData_(kind + '.json');
  if (!regionsText || !commonText) return null;
  const regions = JSON.parse(regionsText);
  const parts = {};
  regions.filter(function (r) { return r.status !== 'preparing'; }).forEach(function (r) {
    const text = loadData_(kind + '-' + r.id + '.json');
    if (text) parts[r.id] = JSON.parse(text);
  });
  return JSON.stringify({ regions: regions, common: JSON.parse(commonText), parts: parts });
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
      if (text.length < 30000) cache.put(name, text, CACHE_SECONDS); // CacheService は1件100KBまで（日本語は文字数×3バイト）。超える分はキャッシュしない
      try { props.setProperty('last_' + name, text); } catch (err) { /* 大きすぎる場合は保存しない */ }
      return text;
    }
  } catch (err) {
    console.error(name + ' の読み込みに失敗: ' + err);
  }
  return props.getProperty('last_' + name); // 予備のデータ（なければ null）
}
