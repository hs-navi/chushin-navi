# 長野県高校進学ナビ

中学3年生とその保護者向けに、長野県中信地区の高校の入試情報と中学生向け行事をまとめた静的サイト。GitHub Pages で公開する。管理者は中学校教員の瀧川翔太さん。生徒は学校の Chromebook で見る。

## 構成

- `index.html` 入口ページ（2つのナビへのリンク）
- `nyushi.html` 入試ナビ：第一希望・併願校を選ぶと令和9年度の入試日程と入試内容を表示。データは `data/nyushi.json`
- `events.html` イベントナビ：学校説明会・体験入学・公開授業などを日付順に表示。データは `data/events.json`
- `scripts/check.mjs` データの整合性チェック（`node scripts/check.mjs`）

ビルドは不要。HTML は `fetch()` で JSON を読む。ふだんの更新は JSON だけを書き換える。

## Google Apps Script（GAS）版

学校のフィルタリングで github.io が開けない環境向けに、同じ画面を GAS のWebアプリとしても公開する。

- `gas/Code.gs` と `gas/top.html`・`gas/nyushi.html`・`gas/events.html` を、先生の個人Googleアカウントの GAS プロジェクトに貼って「全員」に公開する。
- GAS は `raw.githubusercontent.com/hs-navi/chushin-navi/main/data/*.json` をサーバー側で読む（10分キャッシュ）。そのため JSON の毎日の更新だけなら GAS 側の作業は不要。
- `index.html`・`nyushi.html`・`events.html` のデザインや機能を変えたら、`node scripts/build-gas.mjs` で `gas/*.html` を作り直してコミットし、先生に GAS への貼り直しを頼む（自動では反映されない）。
- GAS 版ではページ間リンクは `?page=nyushi|events`、学校の絞り込みは `?page=events&school=学校id`。build-gas.mjs の置き換え対象の文字列を HTML 側で変えると build が失敗するので、合わせて直す。

## 対象校

長野県全体（北信・東信・中信・南信の4地区）の、公立・私立・通信制（本校のみ。サポート校・広域通信制の他県本校は対象外）。県教委の中学生向け行事（教育事務所など）も含む。

- 公立：県教委の令和9年度「学校別実施内容一覧」（第1〜第4通学区）に載る全日制の学校が基本。学校の一覧は `data/nyushi-<地区id>.json` の `publicSchools` を正とする。
- 私立・通信制：県の私立高等学校名簿（https://www.pref.nagano.lg.jp/ken-manabi/kyoiku/gakkoukou/koukou/koukou/mebo.html）で、休校・閉校でない学校を確認する。
- まだ載せていない課程：定時制・多部制（県教委 r9-1-05.pdf・r9-1-06.pdf）。松本筑摩の定時制は載せている。
- 表記：「ケ」は大きい「ケ」にそろえる（県ケ丘、蟻ケ崎、伊那弥生ケ丘、駒ケ根工業）。

## 情報の扱い（最重要）

- 情報源は長野県教育委員会（pref.nagano.lg.jp）と各高校の公式サイト（学校が使う公式イベント予約ページ mirai-compass.net を含む）のみ。
- 公式に書いてあることだけを書く。推測や昨年度の日付を今年度として載せない。
- 公式で確認できず二次情報（js88、進研ゼミなど）しかない行事は `"secondary": true` を付けて載せる。公式で確認できたら外し、`src` を公式に差し替える。
- 資料の読み取りが不確かな項目は「要確認」と書く。公式資料ではっきり確認できたら直す。
- robots などで取得できないページを別の方法で取りに行かない。
- 曜日はページ側で日付から計算するので、データには曜日を書かない。

## 表記ルール

- 入試ナビの選択肢は校名のみ（市町村名は付けない）。学科が2つ以上ある学校は「松本県ケ丘（探究科）」のように「校名（学科）」に分かれる（ページ側で自動）。
- 学科名は「普通科」「探究科」のように「科」まで書く。松本筑摩は「午前部・午後部」「夜間部」。
- 校名は県の公式表記（「県ケ丘」「蟻ケ崎」の大きい「ケ」）。
- ヘッダーに対象地域の説明文は入れない。

## 地区とデータの分割（全県対応）

- 対象は長野県全体。地区は北信・東信・中信・南信の4つ（県教委の教育事務所の区分）。
- `data/regions.json`：地区の一覧。`status` は `active`（掲載中）／`partial`（一部の学校だけ掲載）／`preparing`（準備中。データを読み込まない）。順に増やす（東信→南信→北信）。
- データは地区ごとのファイルに分ける。`data/nyushi.json`（共通：updatedAt・checkedAt・prefPage・publicSchedule）、`data/nyushi-<地区id>.json`（`pdfs`・`publicSchools`・`privateSchools`）、`data/events.json`（共通：checkedAt・kinds）、`data/events-<地区id>.json`（`schools`・`events`）。地区id は hokushin / toshin / chushin / nanshin。
- 学校 id は全地区で重複させない。行事の `school` は同じ地区の `schools` に置く。
- 地区を増やすときは、`regions.json` の status を変え、`nyushi-<id>.json` と `events-<id>.json` を作る。
- 地区の指定：`nyushi.html?area=toshin`、`events.html?area=toshin`（GAS版は `?page=events&area=toshin`）で、その地区に絞った状態で開く。先生に渡すURLに使える。
- 入試ナビの学校選択は、地区・種別（公立／私立／通信制）の絞り込みと学校名の検索つきのダイアログ。

## データ形式

（以下のファイル名は、地区ごとのファイル `data/nyushi-<地区id>.json`・`data/events-<地区id>.json` に読み替える）


### data/nyushi.json
- `updatedAt`：最終更新日（YYYY-MM-DD）。内容を変えた日に更新する。
- `checkedAt`：確認日（毎日更新）。入試ナビ下部の「○年○月○日に確認した情報です」に表示される。
- `publicSchedule`：公立共通の前期・後期日程（`d`, `end`, `t`, `n`, `k` = apply/exam/result）と検査内容の説明。
- `publicSchools[]`：`id`, `name`, `pdf`（pdfs のキー）, `note`, `depts[]`（`dept`, `zenki`=前期募集枠, `zenkiTest`=前期の検査, `kokiInterview`=後期の面接, `note`）。`zenki` が「実施なし」で始まる学科は前期の日程を出さない。
- 通信制は `privateSchools[]` に「校名＋`track`: "通信制"」で入れる（選択肢は「松商学園（通信制）」）。`type: "公立"` を付けると公立表示、`eventsId` でイベントナビのリンク先学校idを指定（松本筑摩は `chikuma`）。`exams` を持つ学校は前期・後期の公立共通日程に乗らない。
- `privateSchools[]`：`id`, `name`, `depts`（学科名の配列）, `status`（ok / warn）, `statusText`, `src`, `exams[]`（`name`, `sub`, `ev[]`, `content[]`）。令和9年度の要項で確認できたら `status: "ok"`, `statusText: "令和9年度要項で確認済"`。

### data/events.json
- `checkedAt`：確認日（毎日更新）。
- `kinds`：種類の一覧。`schools[]`：`id`, `name`, `area`, `type`（公立/私立/県教委）, `url`（中学生向けページ）, `note`。
- `events[]`：`school`, `kind`, `title`, `date`, `end`, `time`, `place`, `target`, `apply`, `deadline`, `deadlineTime`, `secondary`, `src`, `srcLabel`。
- 終わった行事は消さない（ページで「終了」表示）。2027年4月以降の年度替わりで整理する。中止はタイトルに「（中止）」。
- 入試ナビの学校カードは `events.html#学校id` へリンクするので、両方の id をそろえる。

## 更新の手順

1. 公式サイトを確認して JSON を書き換える。全県を見るときは、地区ごとにサブエージェントを並行して動かし、各自は自分の地区のファイル（`events-<地区id>.json`・`nyushi-<地区id>.json`）だけを書き換える。共通のファイル（`events.json`・`nyushi.json`・`regions.json`）は最後にまとめて更新する。
2. `node scripts/check.mjs` が OK になることを確認する。
3. 変更点が分かるメッセージでコミットし、main に push する（GitHub Pages に数分で反映）。
4. 毎日の更新用の指示文の案は `docs/daily-update-prompt.md`。
