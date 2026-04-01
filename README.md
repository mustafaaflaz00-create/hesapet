# Hesap Et POS (Faz-2 + Masaüstü EXE + Auto Update)

Bu sürüm, şarküteri/kasap için tek bilgisayarda çalışan ve masaüstünden açılabilen POS altyapısıdır.

## Öne Çıkanlar

- A+B Hibrit 2 tasarımı tek tema olarak sabitlendi
- Logo entegrasyonu + arka plan filigranı
- Satış + iade + satır iptali
- Perakende ve tartılı ürün satışı (manuel kg)
- Yönetici kontrollü ürün tanımı
- 2 adımlı stok akışı:
  1. Stok giriş planı oluştur
  2. Yönetici teslim alıp stoğa işler
- Tarih aralığında fiş dökümü
- Fiş dökümü yazdırma
- Fiş dökümü CSV dışa aktarma
- Günlük / haftalık / aylık rapor
- Manuel Gün Sonu girişi (nakit + kart)
- Manuel Gider girişi
- Raporlarda ciro + gider + net görünümü
- Stok kalan ve kritik stok görünümü
- Zorunlu giriş ekranı (login olmadan kullanım yok)
- Admin (`admin/admin`) ve kasiyer oturum modeli
- Rol bazlı yetki (admin tüm sekmeler, kasiyer sınırlı sekmeler)
- Electron auto-update altyapısı (`electron-updater`)

## Proje Dosyaları

- `index.html` → Ekran yapısı
- `styles.css` → A+B Hibrit 2 sabit tema
- `app.js` → Satış/stok/rapor iş kuralları
- `assets/logo.png` → İşletme logosu
- `electron/main.js` → Masaüstü pencere + auto-update kontrolü
- `electron/preload.js` → Güvenli preload köprüsü
- `package.json` → Electron Builder + yayın ayarları
- `tab-gunsonu` → Manuel gün sonu kayıt ekranı
- `tab-giderler` → Manuel gider kayıt ekranı

## Geliştirme Modu (Desktop)

```bash
npm install
npm start
```

## Windows Kurulum Paketi Alma (NSIS)

```bash
npm run build:win
```

Üretilen kurulum dosyası:

- `release/Hesap Et POS-Setup-<version>.exe`

## Otomatik Güncelleme (Auto Update)

Uygulama, paketli kurulumdan çalışırken güncellemeleri otomatik kontrol eder:

- Açılışta güncelleme kontrolü
- Her 6 saatte bir arka plan güncelleme kontrolü
- Güncelleme inince kullanıcıya “Şimdi yeniden başlat” bildirimi

### Yayınlama Akışı

1. `package.json` içindeki sürümü artırın (`version`).
2. Uygulamayı yayın modunda üretin:

```bash
npm run publish:win
```

3. Üretilen dosyaları (`.exe`, `latest.yml`, blok haritaları) update sunucunuza yükleyin.
4. `build.publish.url` adresi uygulamanın erişebildiği HTTPS endpoint olmalıdır.

> Bu projede varsayılan yayın adresi: `https://updates.hesapet.com/pos`

## Masaüstünden Açma

Kurulum tamamlandığında masaüstü kısayolu otomatik oluşur (NSIS ayarı etkin).

## Auto Update Sorun Giderme

`Hesap Et POS.exe` güncellenmiyorsa genelde nedenlerden biri şudur:

1. **Yanlış EXE çalıştırılıyor (en sık hata)**
   - Kısayol `release/Hesap Et POS-win32-x64/Hesap Et POS.exe` veya `release/win-unpacked/Hesap Et POS.exe` dosyasını açıyorsa auto-update çalışmaz.
   - Bu dosyalar test amaçlı unpacked çıktıdır.
   - Çözüm: `release/Hesap Et POS-Setup-<version>.exe` ile kurulum yapın ve sadece kurulan uygulama kısayolunu kullanın.

2. **Sunucuda update metadata yok**
   - Auto update için sadece `.exe` yetmez.
   - Aynı dizinde en az `latest.yml` ve `.blockmap` dosyaları da olmalıdır.

3. **Sürüm artırılmamış**
   - `package.json` içindeki `version` artmadan yeni sürüm algılanmaz.

4. **Yayın URL erişilemiyor**
   - `build.publish.url` HTTPS olmalı ve istemci makineden erişilebilir olmalı.

5. **Yerel geliştirme modunda test beklentisi**
   - `npm start` ile çalışan uygulamada update mekanizması devre dışıdır.

### Doğru Güncelleme Akışı (Özet)

1. `package.json` içinde `version` artır.
2. `npm run publish:win` çalıştır.
3. `release/` altında üretilen yeni `.exe`, `latest.yml`, `.blockmap` dosyalarını update sunucusuna yükle.
4. İstemcide kurulu sürümü aç (setup ile kurulmuş olan).
5. Uygulama açılışta ve periyodik olarak güncellemeyi alır.

## Giriş ve Yetki Kuralları

- Uygulama açılışında giriş ekranı zorunludur.
- Yönetici girişi: kullanıcı adı `admin`, şifre `admin`.
- Giriş yapılmadan sekmeler ve işlem akışları kullanılamaz.
- Varsayılan/başlangıç rolü kasiyerdir.
- Kasiyer erişimi: `Satış`, `Fiş Dökümü`, `Raporlar`, `Gün Sonu`, `Giderler`.
- Yönetici erişimi: tüm sekmeler (`Ürün Kataloğu`, `Stok Operasyon`, `Ayarlar` dahil).
- Yönetici, ürün/stok planı/gider/gün sonu kayıtlarında düzenle-sil işlemlerini yapabilir.
- Stoğa kesin işleme (teslim alma): sadece yönetici.
- Yeni ürün tanımı: sadece yönetici.

## Veri Saklama ve Bulutta Koruma Stratejisi

Mevcut sürümde veriler `localStorage` içinde saklanır.

- Anahtar: `hesap_et_pos_v2`

Bulut koruması için önerilen yol:

1. **Yerel + Bulut hibrit model**
   - Kasa çevrimdışı çalışmaya devam eder.
   - Arka planda değişiklikler buluta senkronlanır.

2. **Kimlik ve yetkilendirme**
   - Her kasaya kullanıcı hesabı/PIN.
   - Her API çağrısı kimlik doğrulanmış token ile yapılır.

3. **Şifreli aktarım ve şifreli yedek**
   - Zorunlu TLS (HTTPS).
   - Sunucuda günlük snapshot yedekleri (AES-256 at-rest).

4. **Veri modeli (özet)**
   - `products`, `sales`, `stock_moves`, `intake_plans`, `users`, `audit_logs` tabloları.
   - Her kayıtta `store_id` + `updated_at` alanı.

5. **Çakışma çözümü**
   - Aynı kayıt farklı kasalardan güncellenirse `updated_at` + sürüm numarası ile çözüm.
   - Kritik işlemler (satış kapanışı/iade) işlem (transaction) içinde atomik yazılır.

6. **Felaket kurtarma**
   - Günlük tam yedek + saatlik artımlı yedek.
   - En az haftalık restore testi.

### Hızlı Uygulanabilir Teknoloji Seçenekleri

- **Basit başlangıç:** Supabase (PostgreSQL + Auth + Row Level Security)
- **Kurumsal kontrol:** Kendi VPS üzerinde PostgreSQL + Node.js API + MinIO/S3 yedek
- **Tam yönetilen:** Firebase Auth + Cloud SQL / Firestore (iş kuralına göre)

## Bulut Yedekleme ve Çoklu Bilgisayar Senkronu (Supabase REST)

Uygulama içinde **Ayarlar > Bulut Yedekleme** alanına aşağıdakileri girin:

- Supabase URL (`https://<project-ref>.supabase.co`)
- Supabase API Key (anon veya service role)
- Store ID (ör. `sube-1`)

Ardından:

- **Şimdi Buluta Yedekle**: mevcut local veriyi buluta yazar (upsert)
- **Buluttan Geri Yükle**: buluttaki payload ile yerel veriyi değiştirir
- **Otomatik Senkron Aktif**: açıksa uygulama belirlenen saniye aralığında bulutu kontrol eder
- **Senkron Aralığı (sn)**: minimum 10 sn

### Çoklu Bilgisayar Çalışma Mantığı

- Kasa bilgisayarında yapılan değişiklikler otomatik olarak buluta push edilir (kısa gecikmeli).
- Diğer bilgisayar(lar) belirlenen aralıkla buluttan pull yapar.
- Çakışma çözümü: **son yazan kazanır** (`updated_at` daha yeni olan payload uygulanır).
- Veriler localStorage’da da kalır; internet kesilirse yerel çalışma devam eder.

### Supabase Tablo (SQL)

```sql
create table if not exists public.pos_backups (
  store_id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
```

### Örnek RLS / Policy

```sql
alter table public.pos_backups enable row level security;

create policy "allow select backups"
on public.pos_backups
for select
using (true);

create policy "allow upsert backups"
on public.pos_backups
for insert
with check (true);

create policy "allow update backups"
on public.pos_backups
for update
using (true)
with check (true);
```

> Üretim ortamında `true` yerine kullanıcı/store bazlı kısıtlı policy kullanın.

## Manuel Gün Sonu ve Gider Akışı

- **Gün Sonu sekmesi** üzerinden tarih bazlı `nakit` ve `kart` tutarları elle girilir.
- Gün sonu kayıtlarında **düzenle** ve **sil** işlemleri desteklenir.
- **Giderler sekmesi** üzerinden tarih bazlı gider tutarı elle girilir.
- Gider kayıtlarında **düzenle** ve **sil** işlemleri desteklenir.
- **Raporlar sekmesi** günlük/haftalık/aylık periyotlarda şu alanları gösterir:
  - Gün Sonu Kaydı adedi
  - Toplam Ciro (Nakit + Kart)
  - Toplam Gider
  - Net (Ciro - Gider)
- Raporlarda **Ay Seçimi** ile geçmiş aylar arşivden görüntülenebilir.
- Veriler localStorage içinde tutulur, ay kapanınca otomatik silinmez.

> Not: Bu akış, satış sekmesi kullanılmadan sadece manuel giriş ile raporlama yapmak için uygundur.

## Sonraki Adım Önerileri

- İşlem denetim kaydı (kim, ne zaman, hangi işlem)
- Barkod okuyucu hızlı satış modu
- 58mm yazıcı için ESC/POS doğrudan çıktı
- Bulut senkron servisinin eklenmesi (offline queue + retry)
