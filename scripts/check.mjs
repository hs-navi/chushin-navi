// データの整合性チェック。更新したら必ず実行する： node scripts/check.mjs
import { readFileSync } from "node:fs";

const errors = [];
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s + "T00:00:00").getTime());
const load = (p) => {
  try { return JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8")); }
  catch (e) { errors.push(`${p}: JSONとして読めません (${e.message})`); return null; }
};

// ---- 地区 ----
const regions = load("data/regions.json") || [];
for (const r of regions) if (!["active", "partial", "preparing"].includes(r.status)) errors.push(`regions.json: ${r.id} の status は active / partial / preparing のいずれか`);
const loaded = regions.filter((r) => r.status !== "preparing");

// ---- 入試ナビ ----
const n = load("data/nyushi.json");
const nParts = Object.fromEntries(loaded.map((r) => [r.id, load(`data/nyushi-${r.id}.json`)]));
let nCount = 0;
if (n) {
  if (!isDate(n.checkedAt)) errors.push("nyushi.json: checkedAt が日付になっていません");
  if (!isDate(n.updatedAt)) errors.push("nyushi.json: updatedAt が日付になっていません");
  for (const k of ["zenki", "koki"]) for (const e of n.publicSchedule[k]) {
    if (!isDate(e.d) || (e.end && !isDate(e.end))) errors.push(`nyushi.json publicSchedule.${k}: 日付が不正 ${JSON.stringify(e)}`);
  }
  const ids = new Set();
  for (const [rid, p] of Object.entries(nParts)) {
    if (!p) continue;
    for (const s of p.publicSchools) {
      nCount++;
      if (ids.has(s.id)) errors.push(`nyushi-${rid}.json: id が重複 ${s.id}`); ids.add(s.id);
      if (!p.pdfs[s.pdf] && !n.pdfs?.[s.pdf]) errors.push(`nyushi-${rid}.json ${s.name}: pdf "${s.pdf}" が pdfs にありません`);
      if (!s.depts?.length) errors.push(`nyushi-${rid}.json ${s.name}: 学科がありません`);
      for (const d of s.depts) if (d.pdf && !(p.pdfs[d.pdf] || n.pdfs?.[d.pdf])) errors.push(`nyushi-${rid}.json ${s.name}: 学科「${d.dept}」の pdf "${d.pdf}" が pdfs にありません`);
      for (const d of s.depts) if (!/科|部$|学科|定時制/.test(d.dept)) errors.push(`nyushi-${rid}.json ${s.name}: 学科名「${d.dept}」は「〇〇科」の形にする`);
      if (/[市町村]）?$/.test(s.name)) errors.push(`nyushi-${rid}.json ${s.name}: 校名に市町村名を付けない`);
    }
    for (const s of p.privateSchools) {
      nCount++;
      if (ids.has(s.id)) errors.push(`nyushi-${rid}.json: id が重複 ${s.id}`); ids.add(s.id);
      if (!s.depts?.length) errors.push(`nyushi-${rid}.json ${s.name}: depts がありません`);
      for (const x of s.exams) for (const e of x.ev) {
        if (!isDate(e.d) || (e.end && !isDate(e.end))) errors.push(`nyushi-${rid}.json ${s.name}: 日付が不正 ${JSON.stringify(e)}`);
        if (!["apply", "exam", "result"].includes(e.k)) errors.push(`nyushi-${rid}.json ${s.name}: k は apply/exam/result のいずれか`);
      }
    }
  }
}

// ---- イベントナビ ----
const v = load("data/events.json");
const vParts = Object.fromEntries(loaded.map((r) => [r.id, load(`data/events-${r.id}.json`)]));
let vCount = 0;
if (v) {
  if (!isDate(v.checkedAt)) errors.push("events.json: checkedAt が日付になっていません");
  const ids = new Set();
  for (const [rid, p] of Object.entries(vParts)) {
    if (!p) continue;
    for (const s of p.schools) { if (ids.has(s.id)) errors.push(`events-${rid}.json: 学校 id が重複 ${s.id}`); ids.add(s.id); }
  }
  for (const [rid, p] of Object.entries(vParts)) {
    if (!p) continue;
    const own = new Set(p.schools.map((s) => s.id));
    for (const e of p.events) {
      vCount++;
      const where = `events-${rid}.json「${e.title}」`;
      if (!own.has(e.school)) errors.push(`${where}: school "${e.school}" が同じ地区の schools にありません`);
      if (!v.kinds.includes(e.kind)) errors.push(`${where}: kind "${e.kind}" は kinds のいずれかにする`);
      for (const k of ["date", "end", "deadline"]) if (e[k] && !isDate(e[k])) errors.push(`${where}: ${k} が日付になっていません`);
      if (!e.date) errors.push(`${where}: date がありません`);
      if (!/^https?:\/\//.test(e.src || "")) errors.push(`${where}: 出典 src がありません`);
      if (!e.srcLabel) errors.push(`${where}: srcLabel がありません`);
    }
  }
  // 入試ナビの学校カードのリンク先（eventsId または id）がイベントナビにあるか
  for (const p of Object.values(nParts)) for (const s of [...(p?.publicSchools || []), ...(p?.privateSchools || [])]) {
    const t = s.eventsId || s.id;
    if (!ids.has(t)) errors.push(`nyushi: ${s.name} のリンク先 "${t}" がイベントナビの学校にありません`);
  }
}

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`OK: 地区 ${loaded.length}（${loaded.map((r) => r.name).join('・')}）/ 入試ナビ ${nCount}校 / イベントナビ ${vCount}件`);
