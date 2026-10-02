# Chloe · GrowGPT 電子名片

GrowGPT 顧問 Chloe 的單頁電子名片。

## 開啟方式

用瀏覽器直接開啟：

```bash
open chloe-card/index.html
```

或在本機起一個靜態伺服器：

```bash
cd chloe-card && python3 -m http.server 4173
```

然後造訪 `http://localhost:4173`。

## 功能

- 儲存聯絡人（`.vcf`）
- 前往 GrowGPT 官網
- 寫信聯繫（目前連到公開信箱 `info@growgpt.co`）
- 分享 / 複製名片連結
- QR code（指向目前頁面網址）

## 自訂聯絡資訊

若要換成 Chloe 的專屬信箱、電話或 LinkedIn，請同步更新：

1. `index.html` 的聯絡區塊與 CTA
2. `chloe.vcf` 的 `EMAIL` / `TEL` / `URL` 欄位
