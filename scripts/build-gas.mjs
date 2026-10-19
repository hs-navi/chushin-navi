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

// 画面の組み立てで止まったとき、原因をページ上に表示する（GASの中では開発者ツールを見にくいため）
// 画面に必要な値は、プログラムの中ではなくデータ用の箱にまとめて入れ、プログラム側で読み取る
const DATA_BOX = `<script type="application/json" id="gas-data">{"baseUrl":<?!= JSON.stringify(baseUrl) ?>,"school":<?!= JSON.stringify(school) ?>,"data64":"<?!= Utilities.base64Encode(dataJson, Utilities.Charset.UTF_8) ?>"}</script>
`;
// データは改行などが途中で変わらないよう、英数字だけの形（Base64）にして受け渡す
const READ_BOX = 'const G=JSON.parse(document.getElementById("gas-data").textContent);G.data=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(G.data64),c=>c.charCodeAt(0))));';
const ERROR_BOX = `<script>
(function(){
  function show(msg){
    var box=document.getElementById("gas-error");
    if(!box){box=document.createElement("div");box.id="gas-error";
      box.style.cssText="margin:12px 16px;padding:12px 14px;border:2px solid #a33a2a;border-radius:10px;background:#fff;color:#a33a2a;font:14px/1.6 sans-serif;white-space:pre-wrap";
      (document.body||document.documentElement).insertBefore(box,(document.body||document.documentElement).firstChild);}
    box.textContent+= (box.textContent?"\\n":"")+"表示中にエラーが起きました（この文を管理者に伝えてください）："+msg;
  }
  window.addEventListener("error",function(e){show((e.message||"")+" ["+(e.lineno||"")+":"+(e.colno||"")+"]");});
  window.addEventListener("unhandledrejection",function(e){var r=e.reason;show(r&&r.stack?String(r.stack).split("\\n").slice(0,3).join(" / "):String(r));});
})();
</script>
`;

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
  READ_BOX + "\ntry{ D=G.data; if(!D) throw new Error(\"データが空です\"); }",
  "入試データの読み込み");
ny = replaceOrFail(ny, 'const EVENTS_URL="events.html";', 'const EVENTS_URL=G.baseUrl+"?page=events&school=";', "EVENTS_URL");
ny = replaceOrFail(ny, 'href="${EVENTS_URL}#${s.eventsId||s.id}"', 'href="${EVENTS_URL}${s.eventsId||s.id}" target="_top"', "学校カード→イベントナビ");
write("gas/nyushi.html", ERROR_BOX + ny.replace(/<script>\n\(async/, DATA_BOX + "<script>\n(async"));

// ---- イベントナビ ----
let ev = strip(read("events.html"));
ev = replaceOrFail(ev, '<a href="./" style=', `<a href="${link("")}" target="_top" style=`, "イベントナビ→入口");
ev = replaceOrFail(ev, '<a href="nyushi.html">', `<a href="${link("nyushi")}" target="_top">`, "イベントナビ→入試ナビ");
ev = replaceOrFail(ev,
  'try{ DATA=await (await fetch("data/events.json",{cache:"no-cache"})).json(); }',
  READ_BOX + "\ntry{ DATA=G.data; if(!DATA) throw new Error(\"データが空です\"); }",
  "行事データの読み込み");
ev = replaceOrFail(ev, 'const h=decodeURIComponent(location.hash.slice(1));', 'const h=G.school;', "学校の絞り込み");
write("gas/events.html", ERROR_BOX + ev.replace(/<script>\n\(async/, DATA_BOX + "<script>\n(async"));

console.log("gas/ に top.html・nyushi.html・events.html を作りました");
