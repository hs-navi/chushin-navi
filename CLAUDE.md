# 中信 高校進学ナビ

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

中信地区の公立：松本深志、松本県ケ丘、松本美須々ケ丘、松本蟻ケ崎、松本筑摩（定時制 多部制・単位制／通信制）、田川、梓川、松本工業、塩尻志学館、豊科、明科、南安曇農業、穂高商業、池田工業、大町岳陽、白馬、木曽青峰、蘇南
東信の公立：小諸義塾
私立：松商学園、松本国際、松本第一、東京都市大学塩尻、エクセラン
通信制（本校のみ。サポート校・広域通信制の他県本校は対象外）：松本筑摩、松商学園、松本国際、信濃むつみ（松本市・私立。公式 https://www.terra.ed.jp/）
県教委（中信教育事務所など）の中学生向け行事も含む。

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

## データ形式

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

1. 公式サイトを確認して JSON を書き換える。
2. `node scripts/check.mjs` が OK になることを確認する。
3. 変更点が分かるメッセージでコミットし、main に push する（GitHub Pages に数分で反映）。
