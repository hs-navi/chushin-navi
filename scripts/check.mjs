// データの整合性チェック。更新したら必ず実行する： node scripts/check.mjs
import { readFileSync } from "node:fs";

const errors = [];
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s + "T00:00:00").getTime());
const load = (p) => {
  try { return JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), "utf8")); }
  catch (e) { errors.push(`${p}: JSONとして読めません (${e.message})`); return null; }
};

// ---- 入試ナビ ----
const n = load("data/nyushi.json");
if (n) {
  if (!isDate(n.updatedAt)) errors.push("nyushi.json: updatedAt が日付になっていません");
  for (const k of ["zenki", "koki"]) for (const e of n.publicSchedule[k]) {
    if (!isDate(e.d) || (e.end && !isDate(e.end))) errors.push(`nyushi.json publicSchedule.${k}: 日付が不正 ${JSON.stringify(e)}`);
  }
  const ids = new Set();
  for (const s of n.publicSchools) {
    if (ids.has(s.id)) errors.push(`nyushi.json: id が重複 ${s.id}`); ids.add(s.id);
    if (!n.pdfs[s.pdf]) errors.push(`nyushi.json ${s.name}: pdf "${s.pdf}" が pdfs にありません`);
    if (!s.depts?.length) errors.push(`nyushi.json ${s.name}: 学科がありません`);
    for (const d of s.depts) if (!/科|部$|学科/.test(d.dept)) errors.push(`nyushi.json ${s.name}: 学科名「${d.dept}」は「〇〇科」の形にする`);
    if (/[市町村]）?$/.test(s.name)) errors.push(`nyushi.json ${s.name}: 校名に市町村名を付けない`);
  }
  for (const s of n.privateSchools) {
    if (ids.has(s.id)) errors.push(`nyushi.json: id が重複 ${s.id}`); ids.add(s.id);
    if (!s.depts?.length) errors.push(`nyushi.json ${s.name}: depts がありません`);
    for (const x of s.exams) for (const e of x.ev) {
      if (!isDate(e.d) || (e.end && !isDate(e.end))) errors.push(`nyushi.json ${s.name}: 日付が不正 ${JSON.stringify(e)}`);
      if (!["apply", "exam", "result"].includes(e.k)) errors.push(`nyushi.json ${s.name}: k は apply/exam/result のいずれか`);
    }
  }
}

// ---- イベントナビ ----
const v = load("data/events.json");
if (v) {
  if (!isDate(v.checkedAt)) errors.push("events.json: checkedAt が日付になっていません");
  const ids = new Set(v.schools.map((s) => s.id));
  for (const e of v.events) {
    const where = `events.json「${e.title}」`;
    if (!ids.has(e.school)) errors.push(`${where}: school "${e.school}" が schools にありません`);
    if (!v.kinds.includes(e.kind)) errors.push(`${where}: kind "${e.kind}" は kinds のいずれかにする`);
    for (const k of ["date", "end", "deadline"]) if (e[k] && !isDate(e[k])) errors.push(`${where}: ${k} が日付になっていません`);
    if (!e.date) errors.push(`${where}: date がありません`);
    if (!/^https?:\/\//.test(e.src || "")) errors.push(`${where}: 出典 src がありません`);
    if (!e.srcLabel) errors.push(`${where}: srcLabel がありません`);
  }
}

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`OK: 入試ナビ ${n.publicSchools.length + n.privateSchools.length}校 / イベントナビ ${v.events.length}件`);
