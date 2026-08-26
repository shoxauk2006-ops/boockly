import { Language, translations, detectLanguage, applyLanguageDirection } from './i18n';

type Row = Record<Language,string>;
const EXTRA: Record<string,Row> = {
  'Главная': {ru:'Главная',en:'Home',uz:'Bosh sahifa',tr:'Ana sayfa',ar:'الرئيسية'},
  'Сохранённые': {ru:'Сохранённые',en:'Saved',uz:'Saqlanganlar',tr:'Kaydedilenler',ar:'المحفوظة'},
  'Профиль': {ru:'Профиль',en:'Profile',uz:'Profil',tr:'Profil',ar:'الملف الشخصي'},
  'Админ-панель': {ru:'Админ-панель',en:'Admin panel',uz:'Admin panel',tr:'Yönetim paneli',ar:'لوحة الإدارة'},
  'Ещё': {ru:'Ещё',en:'More',uz:'Yana',tr:'Daha fazla',ar:'المزيد'},
  'Меню': {ru:'Меню',en:'Menu',uz:'Menyu',tr:'Menü',ar:'القائمة'},
  'Назад': {ru:'Назад',en:'Back',uz:'Orqaga',tr:'Geri',ar:'رجوع'},
  'Управление услугами': {ru:'Управление услугами',en:'Manage services',uz:'Xizmatlarni boshqarish',tr:'Hizmetleri yönet',ar:'إدارة الخدمات'},
  'Рабочие часы': {ru:'Рабочие часы',en:'Working hours',uz:'Ish vaqti',tr:'Çalışma saatleri',ar:'ساعات العمل'},
  'Закрытые интервалы': {ru:'Закрытые интервалы',en:'Blocked intervals',uz:'Bloklangan vaqtlar',tr:'Engellenen aralıklar',ar:'الفترات المغلقة'},
  'Информация и контакты': {ru:'Информация и контакты',en:'Information and contacts',uz:'Ma’lumot va kontaktlar',tr:'Bilgi ve iletişim',ar:'المعلومات وبيانات الاتصال'},
  'Ваши бронирования': {ru:'Ваши бронирования',en:'Your bookings',uz:'Bronlaringiz',tr:'Rezervasyonlarınız',ar:'حجوزاتك'},
  'Ваши сохранённые места': {ru:'Ваши сохранённые места',en:'Your saved places',uz:'Saqlangan joylaringiz',tr:'Kaydettiğiniz yerler',ar:'أماكنك المحفوظة'},
  'Название': {ru:'Название',en:'Name',uz:'Nomi',tr:'Ad',ar:'الاسم'},
  'Описание': {ru:'Описание',en:'Description',uz:'Tavsif',tr:'Açıklama',ar:'الوصف'},
  'Цена': {ru:'Цена',en:'Price',uz:'Narx',tr:'Fiyat',ar:'السعر'},
  'Поиск валюты': {ru:'Поиск валюты',en:'Search currency',uz:'Valyutani qidirish',tr:'Para birimi ara',ar:'بحث عن العملة'},
  'Длительность': {ru:'Длительность',en:'Duration',uz:'Davomiyligi',tr:'Süre',ar:'المدة'},
  'Контакты бизнеса': {ru:'Контакты бизнеса',en:'Business contacts',uz:'Biznes kontaktlari',tr:'İşletme iletişim bilgileri',ar:'بيانات اتصال النشاط'},
  'Номер телефона бизнеса': {ru:'Номер телефона бизнеса',en:'Business phone number',uz:'Biznes telefon raqami',tr:'İşletme telefon numarası',ar:'رقم هاتف النشاط'},
  'Адрес бизнеса': {ru:'Адрес бизнеса',en:'Business address',uz:'Biznes manzili',tr:'İşletme adresi',ar:'عنوان النشاط'},
  'Номер не передан': {ru:'Номер не передан',en:'Phone not provided',uz:'Telefon raqami berilmagan',tr:'Telefon numarası verilmedi',ar:'لم يتم توفير رقم الهاتف'},
  'Сохранить': {ru:'Сохранить',en:'Save',uz:'Saqlash',tr:'Kaydet',ar:'حفظ'},
  'Удалить': {ru:'Удалить',en:'Delete',uz:'O‘chirish',tr:'Sil',ar:'حذف'},
  'Изменить': {ru:'Изменить',en:'Edit',uz:'Tahrirlash',tr:'Düzenle',ar:'تعديل'},
  'Закрыть': {ru:'Закрыть',en:'Close',uz:'Yopish',tr:'Kapat',ar:'إغلاق'},

  'Настройка бизнеса': {ru:'Настройка бизнеса',en:'Business setup',uz:'Biznesni sozlash',tr:'İşletme kurulumu',ar:'إعداد النشاط'},
  'Выполните основные шаги настройки.': {ru:'Выполните основные шаги настройки.',en:'Complete the main setup steps.',uz:'Asosiy sozlash bosqichlarini bajaring.',tr:'Ana kurulum adımlarını tamamlayın.',ar:'أكمل خطوات الإعداد الأساسية.'},
  'Эта инструкция доступна на всех вкладках.': {ru:'Эта инструкция доступна на всех вкладках.',en:'This guide is available on all tabs.',uz:'Bu yo‘riqnoma barcha bo‘limlarda mavjud.',tr:'Bu rehber tüm sekmelerde kullanılabilir.',ar:'هذا الدليل متاح في جميع علامات التبويب.'},
  '1. Основная информация': {ru:'1. Основная информация',en:'1. Basic information',uz:'1. Asosiy ma’lumotlar',tr:'1. Temel bilgiler',ar:'1. المعلومات الأساسية'},
  'Проверьте название, описание,': {ru:'Проверьте название, описание,',en:'Check the name, description,',uz:'Nom, tavsif,',tr:'Adı, açıklamayı,',ar:'تحقق من الاسم والوصف،'},
  'телефон, адрес и фотографию бизнеса.': {ru:'телефон, адрес и фотографию бизнеса.',en:'phone, address and business photo.',uz:'telefon, manzil va biznes suratini tekshiring.',tr:'telefon, adres ve işletme fotoğrafını kontrol edin.',ar:'الهاتف والعنوان وصورة النشاط.'},
  'Настроить →': {ru:'Настроить →',en:'Set up →',uz:'Sozlash →',tr:'Kur →',ar:'إعداد ←'},
  '2. Фотография': {ru:'2. Фотография',en:'2. Photo',uz:'2. Surat',tr:'2. Fotoğraf',ar:'2. الصورة'},
  'Добавьте фотографию бизнеса,': {ru:'Добавьте фотографию бизнеса,',en:'Add a business photo,',uz:'Biznes suratini qo‘shing,',tr:'İşletme fotoğrafı ekleyin,',ar:'أضف صورة للنشاط،'},
  'чтобы клиентам было проще его узнать.': {ru:'чтобы клиентам было проще его узнать.',en:'so clients can recognize it more easily.',uz:'mijozlar uni osonroq tanishi uchun.',tr:'müşterilerin işletmeyi daha kolay tanıması için.',ar:'حتى يتمكن العملاء من التعرّف عليه بسهولة.'},
  'Добавить фото →': {ru:'Добавить фото →',en:'Add photo →',uz:'Surat qo‘shish →',tr:'Fotoğraf ekle →',ar:'إضافة صورة ←'},
  '3. Услуги': {ru:'3. Услуги',en:'3. Services',uz:'3. Xizmatlar',tr:'3. Hizmetler',ar:'3. الخدمات'},
  'Добавьте услуги, цены и': {ru:'Добавьте услуги, цены и',en:'Add services, prices and',uz:'Xizmatlar, narxlar va',tr:'Hizmetleri, fiyatları ve',ar:'أضف الخدمات والأسعار و'},
  'продолжительность записи.': {ru:'продолжительность записи.',en:'booking duration.',uz:'bron davomiyligini qo‘shing.',tr:'rezervasyon süresini ekleyin.',ar:'مدة الحجز.'},
  'Добавить услуги →': {ru:'Добавить услуги →',en:'Add services →',uz:'Xizmat qo‘shish →',tr:'Hizmet ekle →',ar:'إضافة خدمات ←'},
  '4. График работы': {ru:'4. График работы',en:'4. Work schedule',uz:'4. Ish jadvali',tr:'4. Çalışma programı',ar:'4. جدول العمل'},
  'Укажите рабочие дни и часы,': {ru:'Укажите рабочие дни и часы,',en:'Set the working days and hours',uz:'Ish kunlari va soatlarini belgilang',tr:'Çalışma günlerini ve saatlerini belirtin',ar:'حدد أيام وساعات العمل'},
  'когда клиенты могут записываться.': {ru:'когда клиенты могут записываться.',en:'when clients can book.',uz:'mijozlar bron qilishi mumkin bo‘lgan vaqtni.',tr:'müşterilerin rezervasyon yapabileceği zamanı.',ar:'التي يمكن للعملاء الحجز خلالها.'},
  'Настроить график →': {ru:'Настроить график →',en:'Set schedule →',uz:'Jadvalni sozlash →',tr:'Programı ayarla →',ar:'إعداد الجدول ←'},
  '5. Блокировки': {ru:'5. Блокировки',en:'5. Blocked times',uz:'5. Bloklangan vaqtlar',tr:'5. Engellenen zamanlar',ar:'5. الأوقات المحظورة'},
  'Временно закрывайте время для записей,': {ru:'Временно закрывайте время для записей,',en:'Temporarily block booking times',uz:'Bronlar uchun vaqtni vaqtincha yoping,',tr:'Rezervasyon saatlerini geçici olarak kapatın,',ar:'احظر أوقات الحجز مؤقتًا،'},
  'когда бизнес не принимает клиентов.': {ru:'когда бизнес не принимает клиентов.',en:'when the business is not accepting clients.',uz:'biznes mijozlarni qabul qilmayotganda.',tr:'işletme müşteri kabul etmediğinde.',ar:'عندما لا يستقبل النشاط العملاء.'},
  'Добавить блокировку →': {ru:'Добавить блокировку →',en:'Add blocked time →',uz:'Bloklash qo‘shish →',tr:'Engelleme ekle →',ar:'إضافة حظر ←'},
  'Как это работает': {ru:'Как это работает',en:'How it works',uz:'Bu qanday ishlaydi',tr:'Nasıl çalışır',ar:'كيف يعمل'},
  'Сначала настройте бизнес, услуги и расписание.': {ru:'Сначала настройте бизнес, услуги и расписание.',en:'First set up your business, services and schedule.',uz:'Avval biznes, xizmatlar va jadvalni sozlang.',tr:'Önce işletmenizi, hizmetlerinizi ve programınızı ayarlayın.',ar:'ابدأ بإعداد النشاط والخدمات والجدول.'},
  'После этого Bookly будет готов к работе внутри админки.': {ru:'После этого Bookly будет готов к работе внутри админки.',en:'After that, Bookly will be ready to use in the admin panel.',uz:'Shundan so‘ng Bookly admin panelda ishlashga tayyor bo‘ladi.',tr:'Bundan sonra Bookly yönetim panelinde kullanıma hazır olur.',ar:'بعد ذلك سيكون Bookly جاهزًا للاستخدام داخل لوحة الإدارة.'},
  'Клиенты смогут самостоятельно записываться': {ru:'Клиенты смогут самостоятельно записываться',en:'Clients will be able to book independently',uz:'Mijozlar mustaqil ravishda bron qilishlari mumkin',tr:'Müşteriler bağımsız olarak rezervasyon yapabilecek',ar:'سيتمكن العملاء من الحجز بأنفسهم'},
  'только после активации Bookly Pro.': {ru:'только после активации Bookly Pro.',en:'only after Bookly Pro is activated.',uz:'faqat Bookly Pro faollashtirilgandan keyin.',tr:'yalnızca Bookly Pro etkinleştirildikten sonra.',ar:'فقط بعد تفعيل Bookly Pro.'},
  'Админкой можно пользоваться без подписки.': {ru:'Админкой можно пользоваться без подписки.',en:'You can use the admin panel without a subscription.',uz:'Admin paneldan obunasiz foydalanishingiz mumkin.',tr:'Yönetim panelini abonelik olmadan kullanabilirsiniz.',ar:'يمكنك استخدام لوحة الإدارة بدون اشتراك.'},
  'Bookly Pro нужен для клиентского доступа.': {ru:'Bookly Pro нужен для клиентского доступа.',en:'Bookly Pro is required for client access.',uz:'Mijozlar uchun kirish Bookly Pro talab qiladi.',tr:'Müşteri erişimi için Bookly Pro gereklidir.',ar:'يلزم Bookly Pro للوصول للعملاء.'},
  'Клиентская страница': {ru:'Клиентская страница',en:'Client page',uz:'Mijozlar sahifasi',tr:'Müşteri sayfası',ar:'صفحة العملاء'},
  'Персональная ссылка': {ru:'Персональная ссылка',en:'Personal link',uz:'Shaxsiy havola',tr:'Kişisel bağlantı',ar:'رابط شخصي'},
  'QR-код бизнеса': {ru:'QR-код бизнеса',en:'Business QR code',uz:'Biznes QR-kodi',tr:'İşletme QR kodu',ar:'رمز QR للنشاط'},
  'Онлайн-записи': {ru:'Онлайн-записи',en:'Online bookings',uz:'Onlayn bronlar',tr:'Online rezervasyonlar',ar:'الحجوزات عبر الإنترنت'},
  'Уведомления о новых записях': {ru:'Уведомления о новых записях',en:'New booking notifications',uz:'Yangi bronlar bildirishnomalari',tr:'Yeni rezervasyon bildirimleri',ar:'إشعارات الحجوزات الجديدة'},
  'Активировать Bookly Pro': {ru:'Активировать Bookly Pro',en:'Activate Bookly Pro',uz:'Bookly Pro’ni faollashtirish',tr:'Bookly Pro’yu etkinleştir',ar:'تفعيل Bookly Pro'},
  'Часовой пояс бизнеса': {ru:'Часовой пояс бизнеса',en:'Business time zone',uz:'Biznes vaqt mintaqasi',tr:'İşletmenin saat dilimi',ar:'المنطقة الزمنية للنشاط'},
  'Скрыть': {ru:'Скрыть',en:'Hide',uz:'Yashirish',tr:'Gizle',ar:'إخفاء'},
  'Выберите часовой пояс': {ru:'Выберите часовой пояс',en:'Choose a time zone',uz:'Vaqt mintaqasini tanlang',tr:'Saat dilimi seçin',ar:'اختر المنطقة الزمنية'},
  'Найти город или часовой пояс...': {ru:'Найти город или часовой пояс...',en:'Find a city or time zone...',uz:'Shahar yoki vaqt mintaqasini qidiring...',tr:'Şehir veya saat dilimi ara...',ar:'ابحث عن مدينة أو منطقة زمنية...'},
  'Часовой пояс не найден': {ru:'Часовой пояс не найден',en:'Time zone not found',uz:'Vaqt mintaqasi topilmadi',tr:'Saat dilimi bulunamadı',ar:'لم يتم العثور على المنطقة الزمنية'},
  'По умолчанию выбран часовой пояс': {ru:'По умолчанию выбран часовой пояс',en:'Your device time zone is selected by default',uz:'Standart bo‘yicha qurilmangiz vaqt mintaqasi tanlanadi',tr:'Varsayılan olarak cihazınızın saat dilimi seçilir',ar:'يتم اختيار المنطقة الزمنية لجهازك افتراضيًا'},
  'вашего устройства. Вы можете изменить': {ru:'вашего устройства. Вы можете изменить',en:'by default. You can change',uz:'avvaldan tanlanadi. Uni',tr:'varsayılan olarak. Bunu',ar:'افتراضيًا. يمكنك تغييرها'},
  'его вручную.': {ru:'его вручную.',en:'it manually.',uz:'qo‘lda o‘zgartirishingiz mumkin.',tr:'manuel olarak değiştirebilirsiniz.',ar:'يدويًا.'},
  'Фото бизнеса': {ru:'Фото бизнеса',en:'Business photo',uz:'Biznes surati',tr:'İşletme fotoğrafı',ar:'صورة النشاط'},
  'Добавьте фотографию, которая будет отображаться у клиентов.': {ru:'Добавьте фотографию, которая будет отображаться у клиентов.',en:'Add a photo that will be shown to clients.',uz:'Mijozlarga ko‘rsatiladigan surat qo‘shing.',tr:'Müşterilere gösterilecek bir fotoğraf ekleyin.',ar:'أضف صورة ستظهر للعملاء.'},
  'Фото пока не добавлено': {ru:'Фото пока не добавлено',en:'No photo added yet',uz:'Hali surat qo‘shilmagan',tr:'Henüz fotoğraf eklenmedi',ar:'لم تتم إضافة صورة بعد'},
  'Заменить фото': {ru:'Заменить фото',en:'Replace photo',uz:'Suratni almashtirish',tr:'Fotoğrafı değiştir',ar:'استبدال الصورة'},
  'Добавить фото': {ru:'Добавить фото',en:'Add photo',uz:'Surat qo‘shish',tr:'Fotoğraf ekle',ar:'إضافة صورة'},
  'Определить местоположение': {ru:'Определить местоположение',en:'Detect location',uz:'Joylashuvni aniqlash',tr:'Konumu belirle',ar:'تحديد الموقع'},
  'Местоположение выбрано': {ru:'Местоположение выбрано',en:'Location selected',uz:'Joylashuv tanlandi',tr:'Konum seçildi',ar:'تم اختيار الموقع'},
  'Укажите часы работы бизнеса.': {ru:'Укажите часы работы бизнеса.',en:'Set the business working hours.',uz:'Biznes ish vaqtlarini ko‘rsating.',tr:'İşletmenin çalışma saatlerini belirtin.',ar:'حدد ساعات عمل النشاط.'},
  'Открытие': {ru:'Открытие',en:'Opening',uz:'Ochish',tr:'Açılış',ar:'الافتتاح'},
  'Закрытие': {ru:'Закрытие',en:'Closing',uz:'Yopish',tr:'Kapanış',ar:'الإغلاق'},
  'Бизнес создан': {ru:'Бизнес создан',en:'Business created',uz:'Biznes yaratildi',tr:'İşletme oluşturuldu',ar:'تم إنشاء النشاط'},
  'Создание...': {ru:'Создание...',en:'Creating...',uz:'Yaratilmoqda...',tr:'Oluşturuluyor...',ar:'جارٍ الإنشاء...'},
  'Сохранение...': {ru:'Сохранение...',en:'Saving...',uz:'Saqlanmoqda...',tr:'Kaydediliyor...',ar:'جارٍ الحفظ...'},
  'Удаление...': {ru:'Удаление...',en:'Deleting...',uz:'O‘chirilmoqda...',tr:'Siliniyor...',ar:'جارٍ الحذف...'},
  '✓ Прошедшее': {ru:'✓ Прошедшее',en:'✓ Past',uz:'✓ O‘tgan',tr:'✓ Geçmiş',ar:'✓ منتهٍ'},
  'Блокировка добавлена': {ru:'Блокировка добавлена',en:'Blocked time added',uz:'Blok qo‘shildi',tr:'Engellenen zaman eklendi',ar:'تمت إضافة وقت محظور'},
  'Блокировка удалена': {ru:'Блокировка удалена',en:'Blocked time deleted',uz:'Blok o‘chirildi',tr:'Engellenen zaman silindi',ar:'تم حذف الوقت المحظور'},
  'Макет для печати': {ru:'Макет для печати',en:'Print layout',uz:'Chop etish maketi',tr:'Yazdırma düzeni',ar:'تصميم للطباعة'},
  'Скачать макет': {ru:'Скачать макет',en:'Download layout',uz:'Maketni yuklab olish',tr:'Maket indir',ar:'تنزيل التصميم'},
  'Онлайн-запись': {ru:'Онлайн-запись',en:'Online booking',uz:'Onlayn bron',tr:'Online rezervasyon',ar:'حجز عبر الإنترنت'},
  'Запишитесь онлайн': {ru:'Запишитесь онлайн',en:'Book online',uz:'Onlayn bron qiling',tr:'Online rezervasyon yapın',ar:'احجز عبر الإنترنت'},
  'Отсканируйте QR-код': {ru:'Отсканируйте QR-код',en:'Scan the QR code',uz:'QR-kodni skanerlang',tr:'QR kodunu tarayın',ar:'امسح رمز QR'},
  'камерой телефона': {ru:'камерой телефона',en:'with your phone camera',uz:'telefon kamerasi bilan',tr:'telefon kameranızla',ar:'بكاميرا الهاتف'},
  'Клиенты могут сканировать и сразу перейти к записи': {ru:'Клиенты могут сканировать и сразу перейти к записи',en:'Clients can scan and go straight to booking',uz:'Mijozlar skanerlab darhol bron qilishga o‘tishlari mumkin',tr:'Müşteriler tarayıp doğrudan rezervasyona geçebilir',ar:'يمكن للعملاء المسح والانتقال مباشرةً للحجز'},
  'QR-код для записи': {ru:'QR-код для записи',en:'QR code for booking',uz:'Bron uchun QR-kod',tr:'Rezervasyon için QR kodu',ar:'رمز QR للحجز'},
  'Bookly QR-код': {ru:'Bookly QR-код',en:'Bookly QR code',uz:'Bookly QR-kodi',tr:'Bookly QR kodu',ar:'رمز QR لـ Bookly'},
  'Лимит услуг': {ru:'Лимит услуг',en:'Service limit',uz:'Xizmatlar limiti',tr:'Hizmet limiti',ar:'حد الخدمات'},
  'Сейчас к оплате:': {ru:'Сейчас к оплате:',en:'Due now:',uz:'Hozir to‘lanadi:',tr:'Şimdi ödenecek:',ar:'المستحق الآن:'},
  'Со следующего продления:': {ru:'Со следующего продления:',en:'From the next renewal:',uz:'Keyingi yangilanishdan:',tr:'Sonraki yenilemeden:',ar:'من التجديد التالي:'},
  'Отменить дополнительный пакет?': {ru:'Отменить дополнительный пакет?',en:'Cancel the add-on package?',uz:'Qo‘shimcha paket bekor qilinsinmi?',tr:'Ek paket iptal edilsin mi?',ar:'هل تريد إلغاء الباقة الإضافية؟'},
  'Пакет останется доступен до конца оплаченного периода.': {ru:'Пакет останется доступен до конца оплаченного периода.',en:'The package will remain available until the end of the paid period.',uz:'Paket to‘langan davr oxirigacha mavjud bo‘ladi.',tr:'Paket ücretli dönemin sonuna kadar kullanılabilir.',ar:'ستظل الباقة متاحة حتى نهاية الفترة المدفوعة.'},
  'Возобновить дополнительный пакет?': {ru:'Возобновить дополнительный пакет?',en:'Resume the add-on package?',uz:'Qo‘shimcha paket davom ettirilsinmi?',tr:'Ek paket sürdürülsün mü?',ar:'هل تريد استئناف الباقة الإضافية؟'},
  'Автопродление отменено. Доступ сохраняется до конца оплаченного периода.': {ru:'Автопродление отменено. Доступ сохраняется до конца оплаченного периода.',en:'Auto-renewal is cancelled. Access remains available until the end of the paid period.',uz:'Avtomatik yangilash bekor qilindi. Kirish to‘langan davr oxirigacha saqlanadi.',tr:'Otomatik yenileme iptal edildi. Erişim ücretli dönemin sonuna kadar devam eder.',ar:'تم إلغاء التجديد التلقائي. سيظل الوصول متاحًا حتى نهاية الفترة المدفوعة.'},
  'Доступ до:': {ru:'Доступ до:',en:'Access until:',uz:'Kirish muddati:',tr:'Erişim tarihi:',ar:'الوصول حتى:'},
  'Возобновляем…': {ru:'Возобновляем…',en:'Resuming…',uz:'Davom ettirilmoqda…',tr:'Sürdürülüyor…',ar:'جارٍ الاستئناف…'},
  'Отменяем…': {ru:'Отменяем…',en:'Cancelling…',uz:'Bekor qilinmoqda…',tr:'İptal ediliyor…',ar:'جارٍ الإلغاء…'},

  'Ташкент': {ru:'Ташкент',en:'Tashkent',uz:'Toshkent',tr:'Taşkent',ar:'طشقند'},
  'Алматы': {ru:'Алматы',en:'Almaty',uz:'Olmaota',tr:'Almatı',ar:'ألماتي'},
  'Бишкек': {ru:'Бишкек',en:'Bishkek',uz:'Bishkek',tr:'Bişkek',ar:'بишкك'},
  'Дакка': {ru:'Дакка',en:'Dhaka',uz:'Dakha',tr:'Dakka',ar:'دكا'},
  'Карачи': {ru:'Карачи',en:'Karachi',uz:'Karachi',tr:'Karaçi',ar:'كراتشي'},
  'Калькутта': {ru:'Калькутта',en:'Kolkata',uz:'Kolkata',tr:'Kalküta',ar:'كولكاتا'},
  'Дубай': {ru:'Дубай',en:'Dubai',uz:'Dubay',tr:'Dubai',ar:'دبي'},
  'Эр-Рияд': {ru:'Эр-Рияд',en:'Riyadh',uz:'Ar-Riyod',tr:'Riyad',ar:'الرياض'},
  'Тегеран': {ru:'Тегеран',en:'Tehran',uz:'Tehron',tr:'Tahran',ar:'طهران'},
  'Багдад': {ru:'Багдад',en:'Baghdad',uz:'Bag‘dod',tr:'Bağdat',ar:'بغداد'},
  'Иерусалим': {ru:'Иерусалим',en:'Jerusalem',uz:'Quddus',tr:'Kudüs',ar:'القدس'},
  'Баку': {ru:'Баку',en:'Baku',uz:'Boku',tr:'Bakü',ar:'باكو'},
  'Тбилиси': {ru:'Тбилиси',en:'Tbilisi',uz:'Tbilisi',tr:'Tiflis',ar:'تبليسي'},
  'Москва': {ru:'Москва',en:'Moscow',uz:'Moskva',tr:'Moskova',ar:'موسكو'},
  'Стамбул': {ru:'Стамбул',en:'Istanbul',uz:'Istanbul',tr:'İstanbul',ar:'إسطنبول'},
  'Киев': {ru:'Киев',en:'Kyiv',uz:'Kiiv',tr:'Kiev',ar:'كييف'},
  'Берлин': {ru:'Берлин',en:'Berlin',uz:'Berlin',tr:'Berlin',ar:'برلين'},
  'Париж': {ru:'Париж',en:'Paris',uz:'Parij',tr:'Paris',ar:'باريس'},
  'Лондон': {ru:'Лондон',en:'London',uz:'London',tr:'Londra',ar:'لندن'},
  'Рим': {ru:'Рим',en:'Rome',uz:'Rim',tr:'Roma',ar:'روما'},
  'Мадрид': {ru:'Мадрид',en:'Madrid',uz:'Madrid',tr:'Madrid',ar:'مدريد'},
  'Каир': {ru:'Каир',en:'Cairo',uz:'Qohira',tr:'Kahire',ar:'القاهرة'},
  'Йоханнесбург': {ru:'Йоханнесбург',en:'Johannesburg',uz:'Yoxannesburg',tr:'Johannesburg',ar:'جوهانسبرغ'},
  'Нью-Йорк': {ru:'Нью-Йорк',en:'New York',uz:'Nyu-York',tr:'New York',ar:'نيويورك'},
  'Чикаго': {ru:'Чикаго',en:'Chicago',uz:'Chikago',tr:'Chicago',ar:'شيكاغو'},
  'Денвер': {ru:'Денвер',en:'Denver',uz:'Denver',tr:'Denver',ar:'دنفر'},
  'Лос-Анджелес': {ru:'Лос-Анджелес',en:'Los Angeles',uz:'Los-Anjeles',tr:'Los Angeles',ar:'لوس أنجلوس'},
  'Торонто': {ru:'Торонто',en:'Toronto',uz:'Toronto',tr:'Toronto',ar:'تورونتو'},
  'Сан-Паулу': {ru:'Сан-Паулу',en:'São Paulo',uz:'San-Paulu',tr:'São Paulo',ar:'ساو باولو'},
  'Сидней': {ru:'Сидней',en:'Sydney',uz:'Sidney',tr:'Sidney',ar:'سيدني'},
  'Окленд': {ru:'Окленд',en:'Auckland',uz:'Oklend',tr:'Auckland',ar:'أوكلاند'},
};

const KEYS: Record<string,string> = {
  'Главная':'nav.home','Сохранённые':'nav.saved','Профиль':'nav.profile','Услуги':'nav.services','Записи':'nav.bookings','График':'nav.schedule','Блокировки':'nav.blocks','Мои бизнесы':'nav.businesses','Настройки':'nav.settings','Подписка':'nav.subscription','Админ-панель':'nav.admin','Ещё':'nav.more','Назад':'common.back','Открыть':'common.open','Сохранить':'common.save','Удалить':'common.delete','Изменить':'common.edit','Закрыть':'common.close','Загрузка...':'common.loading','Язык':'language.title','Русский':'language.russian','English':'language.english','O‘zbek':'language.uzbek','Türkçe':'language.turkish','العربية':'language.arabic','Сохранить бизнес':'client.saveBusiness','Выбрать':'client.chooseService','Выберите дату':'client.chooseDate','Выберите время':'client.chooseTime','Ваше имя':'client.name','Номер телефона':'client.phone','Подтвердить запись':'client.confirmBooking','Мои записи':'client.myBookings','Сохранённые бизнесы':'client.savedBusinesses','Поделиться':'settings.share','Копировать ссылку':'settings.copyLink','QR-код':'settings.qr','Сохранить QR-код':'settings.downloadQr'};

const normalize=(v:string)=>v.replace(/\s+/g,' ').trim();
const reverse=new Map<string,string>();
Object.entries(KEYS).forEach(([source,key])=>Object.entries(translations).forEach(([lang,map])=>{const value=map[key];if(value)reverse.set(`${lang}|${normalize(value)}`,source);}));
Object.entries(EXTRA).forEach(([source,row])=>Object.entries(row).forEach(([lang,value])=>reverse.set(`${lang}|${normalize(value)}`,source)));

const translate=(text:string,language:Language)=>{
  const n=normalize(text);if(!n)return text;
  const source=reverse.get(`${language}|${n}`)||KEYS[n]||(EXTRA[n]?n:'');
  if(!source)return text;
  if(EXTRA[source])return EXTRA[source][language];
  const key=KEYS[source];
  return translations[language]?.[key]||translations.en?.[key]||text;
};

const run=()=>{
  const language=detectLanguage();
  applyLanguageDirection(language);
  document.documentElement.lang=language;
  document.documentElement.dir=language==='ar'?'rtl':'ltr';
  document.body.dir=language==='ar'?'rtl':'ltr';

  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const nodes:Node[]=[];let n:Node|null;
  while((n=walker.nextNode()))nodes.push(n);
  nodes.forEach((node)=>{
    const parent=node.parentElement;
    if(!parent||parent.closest('[data-bookly-ignore-i18n]'))return;
    if(parent.tagName==='SCRIPT'||parent.tagName==='STYLE')return;
    const raw=node.nodeValue||'';const value=normalize(raw);if(!value)return;
    const next=translate(value,language);if(next===value)return;
    const i=raw.indexOf(value);node.nodeValue=i>=0?`${raw.slice(0,i)}${next}${raw.slice(i+value.length)}`:next;
  });

  document.querySelectorAll('input,textarea,select,option,[title],[aria-label]').forEach((node)=>{
    const el=node as HTMLElement;if(el.closest('[data-bookly-ignore-i18n]'))return;
    const field=el as HTMLInputElement|HTMLTextAreaElement;
    const p=field.getAttribute('placeholder');if(p)field.setAttribute('placeholder',translate(p,language));
    const title=el.getAttribute('title');if(title)el.setAttribute('title',translate(title,language));
    const aria=el.getAttribute('aria-label');if(aria)el.setAttribute('aria-label',translate(aria,language));
  });
};

let queued=false;
const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;run();});};
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']});
run();
setInterval(run,1000);
