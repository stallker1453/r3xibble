# Halı Saha Grubu — Online MVP

Mobil uyumlu, Node.js + Express + SQLite tabanlı halı saha katılım/kadro uygulaması.

## Yerelde çalıştırma

Node.js 20+ gerekir.

```bash
npm install
ADMIN_KEY="guclu-bir-sifre" DB_PATH="./hali_saha.db" npm start
```

Tarayıcı: http://localhost:3000

## İnternete yayınlama — Render

Projeyi GitHub'a yükleyin ve Render'da **New → Blueprint** ile repo'yu seçin. `render.yaml` web servisi ve 1 GB persistent disk oluşturur. `ADMIN_KEY` Render tarafından otomatik üretilir.

> Ücretsiz planlarda servis uykuya geçebilir. Gerçek kullanım için ücretli web service + persistent disk tercih edilir.

## Ortam değişkenleri

- `PORT`: Sunucu portu (Render otomatik verir)
- `ADMIN_KEY`: Yönetici anahtarı
- `DB_PATH`: SQLite dosya yolu

## Özellikler

- Haftalık maç bilgisi
- Geliyorum / gelemiyorum
- Beyaz / siyah takım tercihi
- 14 kişilik otomatik kadro
- Yedek sırası
- Katılım geçmişine göre rotasyon
- Yönetici anahtarıyla oyuncu ekleme
- Mobil uyumlu arayüz
