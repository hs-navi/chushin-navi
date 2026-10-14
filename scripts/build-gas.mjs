// GitHub Pages 用のページから、Google Apps Script（GAS）版のファイルを gas/ に作る。
// ページのデザインや機能を変えたときだけ実行し、gas/ の中身をGASのエディタに貼り直す。
//   node scripts/build-gas.mjs
// データ（data/*.json）はGASが毎回GitHubから読み込むので、データの更新ではこの作業は不要。
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const write = (p, s) => writeFileSync(new URL(p, root), s);
mkdirSync(new URL("gas/", root), { recursive: true });

// GASのテンプレートでは <!doctype>〜<head> はサーバー側で付けるので、中身だけにする
function strip(html) {
  return html
    .replace(/<!doctype html>\s*/i, "")
    .replace(/<html[^>]*>\s*/i, "")
    .replace(/<\/html>\s*$/i, "")
    .replace(/<meta charset[^>]*>\s*/i, "")
    .replace(/<meta name="viewport"[^>]*>\s*/i, "")
    .replace(/<title>.*?<\/title>\s*/i, "")
    .replace(/<\/?head>\s*/gi, "")
    .replace(/<\/?body>\s*/gi, "");
}
function replaceOrFail(s, from, to, label) {
  if (!s.includes(from)) throw new Error(`置き換え対象が見つかりません: ${label}`);
  return s.split(from).join(to);
}
const link = (page) => `<?= baseUrl ?>${page ? `?page=${page}` : ""}`;

// ---- 入口 ----
let top = strip(read("index.html"));
top = replaceOrFail(top, 'href="nyushi.html"', `href="${link("nyushi")}" target="_top"`, "index→入試ナビ");
top = replaceOrFail(top, 'href="events.html"', `href="${link("events")}" target="_top"`, "index→イベントナビ");
write("gas/top.html", top);

// ---- 入試ナビ ----
let ny = strip(read("nyushi.html"));
ny = replaceOrFail(ny, '<a href="./" style=', `<a href="${link("")}" target="_top" style=`, "入試ナビ→入口");
ny = replaceOrFail(ny, '<a href="events.html">', `<a href="${link("events")}" target="_top">`, "入試ナビ→イベントナビ");
ny = replaceOrFail(ny,
  'try{ D=await (await fetch("data/nyushi.json",{cache:"no-cache"})).json(); }',
  "try{ D=<?!= dataJson ?>; if(!D) throw new Error(\"no data\"); }",
  "入試データの読み込み");
ny = replaceOrFail(ny, 'const EVENTS_URL="events.html";', 'const EVENTS_URL=<?!= JSON.stringify(baseUrl + "?page=events&school=") ?>;', "EVENTS_URL");
ny = replaceOrFail(ny, 'href="${EVENTS_URL}#${s.id}"', 'href="${EVENTS_URL}${s.id}" target="_top"', "学校カード→イベントナビ");
write("gas/nyushi.html", ny);

// ---- イベントナビ ----
let ev = strip(read("events.html"));
ev = replaceOrFail(ev, '<a href="./" style=', `<a href="${link("")}" target="_top" style=`, "イベントナビ→入口");
ev = replaceOrFail(ev, '<a href="nyushi.html">', `<a href="${link("nyushi")}" target="_top">`, "イベントナビ→入試ナビ");
ev = replaceOrFail(ev,
  'try{ DATA=await (await fetch("data/events.json",{cache:"no-cache"})).json(); }',
  "try{ DATA=<?!= dataJson ?>; if(!DATA) throw new Error(\"no data\"); }",
  "行事データの読み込み");
ev = replaceOrFail(ev, 'const h=decodeURIComponent(location.hash.slice(1));', 'const h=<?!= JSON.stringify(school) ?>;', "学校の絞り込み");
write("gas/events.html", ev);

console.log("gas/ に top.html・nyushi.html・events.html を作りました");
