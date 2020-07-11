# okane

# 開発環境構築
- claspのインストール
  - `npm i @google/clasp -g`
- googleアカウントにログイン
  - `clasp login`

# 新規作成
- `clasp create okane-app`
```
? Create which script? (Use arrow keys)
❯ standalone
  docs
  sheets
  slides
  forms
  webapp
  api
(standaloneを選択)
```
```
User has not enabled the Apps Script API. Enable it by visiting https://script.google.com/home/usersettings then retry. If you enabled this API recently, wait a few minutes for the action to propagate to our systems and retry.
```
- `https://script.google.com/home/usersettings` にアクセスして、 `Google App Script API` をONに変更
- `clasp create okane-app` 再実行
```
Created new standalone script: https://script.google.com/d/1uh0-f1T0cF9jdGqoLpbRnLNZaNOiH9tRAcX3Ma00CvnlrY5emFMveHuh/edit
Warning: files in subfolder are not accounted for unless you set a '.claspignore' file.
Cloned 1 file.
└─ appsscript.json
```
- `npm install tslint -g`
- `npm install typescript -g`
- `npm init -y`
- `npm install @google/clasp tslint -D`
- `npm install @types/google-apps-script -S`
- `tslint --init`
- `npm install prettier tslint-config-prettier tslint-plugin-prettier -D`
