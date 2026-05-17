# Inonu Rehberi

Inonu Rehberi, Inonu Universitesi ogrencileri icin hazirlanmis bir kampus rehberi ve ogrenci paylasim platformudur. Uygulama; bolum bazli paylasimlar, kampus panosu, etkinlikler, duyurular, kayip-esya kayitlari, yeni ogrenci rehberi ve admin yonetim paneli gibi temel ogrenci ihtiyaclarini tek bir arayuzde toplar.

## Proje Ozeti

Bu projede React ile modern bir kullanici arayuzu, Node.js/Express ile REST API ve PostgreSQL ile kalici veri katmani gelistirildi. Ogrenciler bolumlerine gore icerik gorebilir, kampus panosuna genel paylasim ekleyebilir ve etkinlik/duyuru gibi kampus bilgilerine ulasabilir. Admin kullanicilar ise paylasimlari, kullanicilari, etkinlikleri, raporlari ve bolum degisikligi taleplerini yonetebilir.

## Ozellikler

- Ogrenci girisi ve kayit sistemi
- Bolum bazli ders tavsiyesi, secmeli ders yorumu ve akademik tavsiye paylasimlari
- Tum ogrencilere acik kampus panosu
- Etkinlik ve duyuru listeleme
- Kayip-esya bildirimi
- Yeni ogrenci rehberi
- Profil ve bolum degisikligi talebi
- Icerik raporlama sistemi
- Admin paneli ile kullanici, paylasim, etkinlik, rapor ve kara liste yonetimi
- PostgreSQL veritabani entegrasyonu
- Vercel deploy uyumlu API ve frontend yapisi

## Kullanilan Teknolojiler

- React
- Vite
- TypeScript
- Tailwind CSS
- Node.js
- Express
- PostgreSQL
- Vercel

## Kurulum

Projeyi bilgisayarinda calistirmak icin once bagimliliklari yukle:

```bash
npm install
```

PostgreSQL icinde `inonu_kampus_rehberi` adli bir veritabani olustur ve SQL dosyalarini sirasiyla calistir:

```text
database/inonu_kampus_rehberi.sql
database/seed_app_data.sql
```

`seed_app_data.sql` istege baglidir. Demo kullanici, ornek duyuru, etkinlik ve paylasim verileri ekler.

## Ortam Degiskenleri

Proje kok dizininde `.env` dosyasi olustur:

```env
PORT=3001
CLIENT_ORIGIN=http://127.0.0.1:5173
DATABASE_URL=postgres://postgres:SENIN_POSTGRES_SIFREN@localhost:5432/inonu_kampus_rehberi
VITE_API_URL=http://127.0.0.1:3001/api
ENABLE_EXTERNAL_EVENT_SYNC=false
```

Canli ortamda Vercel icin `VITE_API_URL` degeri genellikle soyle olmalidir:

```env
VITE_API_URL=/api
```

## Calistirma

API sunucusunu baslat:

```bash
npm run server
```

Ayrica frontend gelistirme sunucusunu baslat:

```bash
npm run dev
```

Kontrol adresleri:

```text
http://127.0.0.1:3001/api/health
http://127.0.0.1:5173
```

## Demo Giris

Seed verileri yuklendiyse demo hesap:

```text
demo@ogr.inonu.edu.tr
Deneme123
```

## Deploy

Proje Vercel uzerinde yayinlanacak sekilde hazirlandi. Vercel'de gerekli ortam degiskenleri:

```env
DATABASE_URL=canli_postgresql_baglanti_adresi
VITE_API_URL=/api
CLIENT_ORIGIN=https://proje-adresi.vercel.app
ENABLE_EXTERNAL_EVENT_SYNC=false
```

PostgreSQL icin Neon, Supabase veya Vercel Marketplace uzerinden bir Postgres servisi kullanilabilir.

## Not

Bu proje egitim ve kampus rehberi amaciyla gelistirilmistir. Gercek kullanimda kullanici verileri, sifre politikasi, yetkilendirme, hata kayitlari ve icerik moderasyonu gibi konular icin ek guvenlik kontrolleri uygulanmalidir.
