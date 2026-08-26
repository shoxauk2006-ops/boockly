export type Language = 'ru' | 'en' | 'uz' | 'tr' | 'ar';

export const SUPPORTED_LANGUAGES: Array<{
  code: Language;
  label: string;
  nativeLabel: string;
  dir: 'ltr' | 'rtl';
}> = [
  { code: 'ru', label: 'Russian', nativeLabel: 'Русский', dir: 'ltr' },
  { code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr' },
  { code: 'uz', label: 'Uzbek', nativeLabel: "O‘zbek", dir: 'ltr' },
  { code: 'tr', label: 'Turkish', nativeLabel: 'Türkçe', dir: 'ltr' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl' },
];

type TranslationMap = Record<string, string>;

const ru: TranslationMap = {
  'app.name': 'Bookly',
  'app.tagline': 'Бронирование внутри Telegram',
  'nav.home': 'Главная',
  'nav.bookings': 'Записи',
  'nav.saved': 'Сохранённые',
  'nav.profile': 'Профиль',
  'nav.services': 'Услуги',
  'nav.more': 'Ещё',
  'nav.schedule': 'График',
  'nav.blocks': 'Блокировки',
  'nav.businesses': 'Мои бизнесы',
  'nav.settings': 'Настройки',
  'nav.subscription': 'Подписка',
  'nav.admin': 'Админ-панель',
    'common.back': 'Назад',
  'common.open': 'Открыть',
  'common.save': 'Сохранить',
  'common.cancel': 'Отмена',
  'common.delete': 'Удалить',
  'common.edit': 'Изменить',
  'common.close': 'Закрыть',
  'common.loading': 'Загрузка...',
  'language.title': 'Язык',
  'language.russian': 'Русский',
  'language.english': 'English',
  'language.uzbek': 'O‘zbek',
  'language.turkish': 'Türkçe',
  'language.arabic': 'العربية',
  'client.saveBusiness': 'Сохранить бизнес',
  'client.slugError': 'Ссылка на бизнес не содержит slug.',
  'client.businessInactive': 'Этот бизнес сейчас не активен.',
  'client.businessNotFound': 'Бизнес не найден. Возможно, ссылка устарела или содержит неправильный slug.',
  'client.serverError': 'Ошибка сервера:',
  'client.businessDataError': 'Сервер не вернул данные бизнеса.',
  'client.businessLoadError': 'Не удалось загрузить бизнес',
  'client.saveLoginRequired': 'Откройте Bookly через Telegram, чтобы сохранять бизнесы.',
  'client.saveBusinessError': 'Не удалось изменить сохранённые бизнесы',
  'client.availabilityError': 'Не удалось загрузить свободное время',
  'client.enterName': 'Введите ваше имя.',
  'client.enterPhone': 'Введите номер телефона.',
  'client.bookingError': 'Не удалось забронировать время.',
  'client.bookingSuccess': '✅ Запись успешно создана!',
  'client.bookingRetry': 'Не удалось выполнить бронирование. Попробуйте ещё раз.',
  'client.loadingBusiness': 'Загрузка бизнеса...',
  'client.openError': 'Не удалось открыть страницу',
  'client.retry': 'Повторить',
  'client.removeSaved': 'Удалить из сохранённых',
  'client.chooseServiceHint': 'Выберите услугу ниже, чтобы записаться.',
  'client.noSavedBusinesses': 'Пока нет сохранённых бизнесов.',
  'client.noServices': 'У этого бизнеса пока нет доступных услуг.',
  'client.noSlots': 'На эту дату свободных мест нет.',
  'client.bookingLoading': 'Бронируем...',
  'client.savedBusiness': 'Сохранено',
  'client.location': 'Открыть локацию',
  'client.services': 'Услуги',
  'client.chooseService': 'Выбрать',
  'client.chooseDate': 'Выберите дату',
  'client.chooseTime': 'Выберите время',
  'client.yourData': 'Ваши данные',
  'client.name': 'Ваше имя',
  'client.phone': 'Номер телефона',
  'client.confirmBooking': 'Подтвердить запись',
  'client.myBookings': 'Мои записи',
  'client.savedBusinesses': 'Сохранённые бизнесы',
  'client.noBookings': 'У вас пока нет записей.',
  'client.bookingCancelled': 'Запись отменена',
  'client.cancelBooking': 'Отменить запись',
  'client.cancelBookingConfirm': 'Отменить эту запись?',
  'client.cancelBookingError': 'Не удалось отменить запись',
  'client.connectionError': 'Ошибка соединения',
  'days.mon': 'Пн','days.tue': 'Вт','days.wed': 'Ср','days.thu': 'Чт','days.fri': 'Пт','days.sat': 'Сб','days.sun': 'Вс',
  'owner.businessesLoadError': 'Не удалось загрузить бизнесы',
  'owner.enterBusinessName': 'Введите название бизнеса',
  'owner.creatingBusiness': 'Создание...',
  'owner.createBusiness': 'Создать бизнес',
  'owner.opened': 'Открыт',
  'owner.telegramOnlyTitle': 'Откройте Bookly из Telegram',
  'owner.telegramOnlyDescription': 'Админ-панель работает внутри Telegram Mini App.',
  'owner.paddleLoading': 'Paddle ещё загружается. Попробуйте ещё раз.',
  'owner.telegramUserError': 'Не удалось определить пользователя Telegram.',
  'owner.selectedBusinessError': 'Не удалось определить выбранный бизнес.',
  'owner.businessContacts': 'Контакты бизнеса',
  'owner.phonePlaceholder': 'Номер телефона бизнеса',
  'owner.addressPlaceholder': 'Адрес бизнеса',
  'owner.saveContacts': 'Сохранить контакты',
  'owner.saving': 'Сохранение...',
  'owner.editService': 'Изменить услугу',
  'owner.createBusinessError': 'Не удалось создать бизнес',
  'owner.telegramInitDataMissing': 'Telegram initData отсутствует. Откройте Bookly внутри Telegram Mini App.',
  'owner.serverError': 'Ошибка сервера:',
  'owner.monthlyPrice': '$7.99 / месяц',
  'owner.businessCreated': 'Новый бизнес создан',
  'owner.noBusiness': 'У вас пока нет бизнеса',
  'owner.addService': 'Добавить услугу',
  'owner.serviceName': 'Название',
  'owner.serviceDescription': 'Описание',
  'owner.price': 'Цена',
  'owner.searchCurrency': 'Поиск валюты',
  'owner.duration': 'Длительность',
  'owner.saveChanges': 'Сохранить изменения',
  'owner.addServiceButton': '+ Добавить услугу',
  'owner.minutes': 'мин',
  'owner.edit': 'Изменить',
  'owner.delete': 'Удалить',
  'owner.confirmDeleteService': 'Удалить эту услугу?',
  'owner.serviceAdded': '✅ Услуга добавлена',
  'owner.serviceUpdated': '✅ Услуга изменена',
  'owner.contactsSaved': '✅ Настройки сохранены',
  'owner.invalidServiceName': 'Введите название услуги',
  'owner.invalidPrice': 'Введите корректную цену',
  'owner.invalidDuration': 'Длительность должна быть от 1 до 480 минут',
  'owner.saveServiceError': 'Не удалось сохранить услугу',
  'owner.deleteServiceError': 'Не удалось удалить услугу',
  'owner.saveContactsError': 'Не удалось сохранить настройки',
  'home.title': 'Бронирование без звонков',
  'home.description': 'Bookly помогает бизнесу принимать записи прямо в Telegram.',
  'home.openAdmin': 'Открыть админ-панель',
  'home.openBusiness': 'Открыть страницу бизнеса',
  'home.slugPlaceholder': 'Ссылка или slug бизнеса',
  'home.emptySaved': 'Здесь появятся бизнесы, которые вы сохраните.',
  'home.greeting': 'С возвращением',
  'home.manage': 'Управлять',
'home.manageBusiness': 'Управляйте своим бизнесом в Bookly',
'home.createBusinessHint': 'Создайте свой бизнес в Bookly',
  'owner.today': 'Сегодня','owner.upcoming': 'Предстоящие','owner.past': 'Прошедшие','owner.addBooking': 'Новая запись','owner.addBusiness': 'Добавить бизнес','owner.currentBusiness': 'Текущий бизнес','owner.totalBookings': 'Всего записей','owner.noBookings': 'Записей пока нет.','owner.subscription': 'Подписка','owner.active': 'Активна','owner.inactive': 'Не активирована','owner.subscriptionActive': 'Активен','owner.subscriptionInactive': 'Не активирован','owner.paymentFailed': 'Оплата не прошла','owner.subscribeToActivate': 'Оплатите подписку, чтобы активировать Bookly.','owner.payMonthly': 'Оплатить $7.99 / месяц','owner.nextPayment': 'Следующее списание:','owner.cancelledActive': 'Подписка отменена и действует до конца оплаченного периода.','owner.booklyActivated': 'Bookly активирован','owner.unlimitedBookings': 'Неограниченные записи','owner.clientLink': 'Ссылка для клиентов','owner.telegramNotifications': 'Уведомления в Telegram','owner.workSchedule': 'Рабочий график','owner.scheduleDescription': 'Настройте обычные рабочие часы. Потом отдельные часы можно блокировать.','owner.addInterval': 'Добавить интервал','owner.dayOff': 'Выходной','owner.timeBlocks': 'Временные блокировки','owner.blocksDescription': 'Если нужно отойти, просто заблокируйте часы — клиент их не увидит.','owner.reasonOptional': 'Причина (необязательно)','owner.blockTime': 'Заблокировать время','owner.scheduleAndBlocks': 'Расписание и блокировки','owner.bookings': 'Записи','owner.close': 'Закрыть','owner.upcomingBookings': 'Предстоящие','owner.date': 'Дата','owner.all': 'Все','owner.newBooking': 'Новая запись','owner.chooseService': 'Выберите услугу','owner.chooseTime': 'Выберите время','owner.loadingSlots': 'Загружаем свободное время...','owner.noAvailableTime': 'Свободного времени нет.','owner.clientData': 'Данные клиента','owner.clientName': 'Имя клиента','owner.clientPhone': 'Номер телефона','owner.bookingHint': 'Выберите время выше — после этого запись будет создана.','owner.noBookingsInSection': 'Записей в выбранном разделе нет.','owner.businessLoadError': 'Не удалось получить бизнес','owner.availabilityError': 'Не удалось загрузить свободное время','owner.chooseServiceError': 'Выберите услугу','owner.enterClientName': 'Введите имя клиента','owner.createBookingError': 'Не удалось создать запись','owner.bookingAdded': '✅ Запись успешно добавлена','owner.bookingCancelled': '✅ Запись отменена','owner.cancelBookingError': 'Не удалось отменить запись','owner.cancelBookingConfirm': 'Отменить запись клиента','owner.phoneMissing': 'номер не передан','owner.confirmed': 'Подтверждено','owner.completed': 'Завершено','owner.cancelled': 'Отменено','owner.cancelling': 'Отмена...','owner.cancel': 'Отменить',
  'settings.businessInfo': 'Информация о бизнесе','settings.phone': 'Телефон бизнеса','settings.address': 'Адрес бизнеса','settings.description': 'Описание бизнеса','settings.share': 'Поделиться','settings.copyLink': 'Копировать ссылку','settings.qr': 'QR-код','settings.downloadQr': 'Сохранить QR-код','settings.language': 'Язык','settings.latitudeOptional': 'Широта — необязательно','settings.longitudeOptional': 'Долгота — необязательно'
  'common.ok': 'Понятно',
  'common.confirm': 'Подтвердить',

  'owner.serviceLimitAlreadySet': 'Лимит уже установлен на этом уровне',
  'owner.invalidServiceLimitValue': 'Недопустимый лимит',
  'owner.limitPriceCalculationError': 'Не удалось рассчитать стоимость',
  'owner.limitPreviewError': 'Не удалось рассчитать сумму',
  'owner.changeServiceLimitError': 'Не удалось изменить лимит услуг',
  'owner.serviceLimitChanged': 'Лимит услуг изменён',

  'info.howBooklyWorks': 'Как работает Bookly',
  'info.forBusinessOwner': 'Для владельца бизнеса',
  'info.rulesAndContacts': 'Правила и контакты',
  'info.termsOfUse': 'Правила использования',
  'info.contacts': 'Контакты',
  'info.contactDescription': 'По вопросам работы Bookly и для сообщений о нарушениях:',

  'info.stepCreateBusiness': '1. Создайте бизнес.',
  'info.stepAddInfo': '2. Добавьте информацию и фотографию.',
  'info.stepAddServices': '3. Добавьте услуги и цены.',
  'info.stepBookings': '6. Управляйте записями.',
  'info.activationDescription': 'Чтобы начать принимать записи от клиентов, активируйте подписку Bookly Pro. После активации вы получите клиентскую ссылку и сможете начать принимать записи.',
  'info.proUnlocksClientPart': 'Bookly Pro открывает клиентскую часть Bookly:',

  'info.clientPage': 'Клиентская страница',
  'info.clientLink': 'Персональная ссылка для клиентов',
  'info.clientQr': 'QR-код для клиентов',
  'info.onlineBookings': 'Онлайн-записи',
  'info.bookingNotifications': 'Уведомления о новых записях',
  'info.basePlanServices': 'До 10 услуг в базовом тарифе',

  'info.withoutSubscription': 'Без подписки вы можете создавать и настраивать бизнес, добавлять услуги, управлять графиком, блокировками и записями в админке. Подписка нужна для подключения клиентов и начала приёма онлайн-записей.',

  'info.rule1': '1. Bookly предназначен для законного использования и предоставления обычных товаров и услуг.',
  'info.rule2': '2. Запрещено использовать Bookly для незаконных товаров или услуг, наркотиков, оружия, мошенничества, порнографии, азартных игр и другой запрещённой деятельности.',
  'info.rule3': '3. Пользователь самостоятельно отвечает за законность своего бизнеса, товаров, услуг, рекламы и контента.',
  'info.rule4': '4. Запрещено использовать Bookly для обмана клиентов, спама, фиктивных записей и другого злоупотребления сервисом.',
  'info.rule5': '5. Пользователь обязан соблюдать применимое законодательство и требования по защите персональных данных.',
  'info.rule6': '6. Мы вправе временно ограничить или полностью заблокировать бизнес при нарушении настоящих правил.',
  'info.rule7': '7. Запрещено создавать новый бизнес или аккаунт для обхода ранее применённой блокировки.',
  'info.rule8': '8. Мы можем изменять функции Bookly, временно ограничивать работу сервиса или прекращать предоставление сервиса.',
  'info.rule9': '9. Мы не обещаем бесперебойную или безошибочную работу Bookly. Возможны технические сбои, обслуживание и недоступность сторонних сервисов.',
  'info.rule10': '10. Используя Bookly, пользователь подтверждает согласие соблюдать эти правила.',
};

const en: TranslationMap = {
  'app.name': 'Bookly', 'app.tagline': 'Booking inside Telegram', 'nav.home': 'Home','nav.more': 'More', 'nav.bookings': 'Bookings', 'nav.saved': 'Saved', 'nav.profile': 'Profile', 'nav.services': 'Services', 'nav.more': 'More', 'nav.schedule': 'Schedule', 'nav.blocks': 'Blocked times', 'nav.businesses': 'My businesses', 'nav.settings': 'Settings', 'nav.subscription': 'Subscription', 'nav.admin': 'Admin panel',
  'common.back': 'Back', 'common.open': 'Open', 'common.save': 'Save', 'common.cancel': 'Cancel', 'common.delete': 'Delete', 'common.edit': 'Edit', 'common.close': 'Close', 'common.loading': 'Loading...', 'language.title': 'Language', 'language.russian': 'Русский', 'language.english': 'English', 'language.uzbek': 'O‘zbek', 'language.turkish': 'Türkçe', 'language.arabic': 'العربية',
  'client.saveBusiness': 'Save business', 'client.slugError': 'The business link does not contain a slug.', 'client.businessInactive': 'This business is currently inactive.', 'client.businessNotFound': 'Business not found. The link may be outdated or contain an incorrect slug.', 'client.serverError': 'Server error:', 'client.businessDataError': 'The server did not return business data.', 'client.businessLoadError': 'Failed to load business', 'client.saveLoginRequired': 'Open Bookly through Telegram to save businesses.', 'client.saveBusinessError': 'Failed to update saved businesses', 'client.availabilityError': 'Failed to load available time', 'client.enterName': 'Enter your name.', 'client.enterPhone': 'Enter your phone number.', 'client.bookingError': 'Failed to book the selected time.', 'client.bookingSuccess': '✅ Booking created successfully!', 'client.bookingRetry': 'Booking failed. Please try again.', 'client.loadingBusiness': 'Loading business...', 'client.openError': 'Failed to open the page', 'client.retry': 'Retry', 'client.removeSaved': 'Remove from saved', 'client.chooseServiceHint': 'Choose a service below to book.', 'client.noSavedBusinesses': 'No saved businesses yet.', 'client.noServices': 'This business has no available services yet.', 'client.noSlots': 'No available slots for this date.', 'client.bookingLoading': 'Booking...', 'client.savedBusiness': 'Saved', 'client.location': 'Open location', 'client.services': 'Services', 'client.chooseService': 'Choose', 'client.chooseDate': 'Choose a date', 'client.chooseTime': 'Choose a time', 'client.yourData': 'Your details', 'client.name': 'Your name', 'client.phone': 'Phone number', 'client.confirmBooking': 'Confirm booking', 'client.myBookings': 'My bookings', 'client.savedBusinesses': 'Saved businesses', 'client.noBookings': 'You have no bookings yet.', 'client.bookingCancelled': 'Booking cancelled', 'client.cancelBooking': 'Cancel booking', 'client.cancelBookingConfirm': 'Cancel this booking?', 'client.cancelBookingError': 'Failed to cancel booking', 'client.connectionError': 'Connection error',
  'days.mon': 'Mon','days.tue': 'Tue','days.wed': 'Wed','days.thu': 'Thu','days.fri': 'Fri','days.sat': 'Sat','days.sun': 'Sun',
  'owner.businessesLoadError': 'Failed to load businesses','owner.enterBusinessName': 'Enter the business name','owner.creatingBusiness': 'Creating...','owner.createBusiness': 'Create business','owner.opened': 'Open','owner.telegramOnlyTitle': 'Open Bookly from Telegram','owner.telegramOnlyDescription': 'The admin panel works inside the Telegram Mini App.','owner.paddleLoading': 'Paddle is still loading. Try again.','owner.telegramUserError': 'Could not identify the Telegram user.','owner.selectedBusinessError': 'Could not identify the selected business.','owner.businessContacts': 'Business contacts','owner.phonePlaceholder': 'Business phone number','owner.addressPlaceholder': 'Business address','owner.saveContacts': 'Save contacts','owner.saving': 'Saving...','owner.editService': 'Edit service','owner.createBusinessError': 'Failed to create business','owner.telegramInitDataMissing': 'Telegram initData is missing. Open Bookly inside the Telegram Mini App.','owner.serverError': 'Server error:','owner.monthlyPrice': '$7.99 / month','owner.businessCreated': 'New business created','owner.noBusiness': 'You do not have a business yet',
  'owner.addService': 'Add service','owner.serviceName': 'Name','owner.serviceDescription': 'Description','owner.price': 'Price','owner.searchCurrency': 'Search currency','owner.duration': 'Duration in minutes','owner.saveChanges': 'Save changes','owner.addServiceButton': '+ Add service','owner.minutes': 'min','owner.edit': 'Edit','owner.delete': 'Delete','owner.confirmDeleteService': 'Delete this service?','owner.serviceAdded': '✅ Service added','owner.serviceUpdated': '✅ Service updated','owner.contactsSaved': '✅ Settings saved','owner.invalidServiceName': 'Enter the service name','owner.invalidPrice': 'Enter a valid price','owner.invalidDuration': 'Duration must be between 1 and 480 minutes','owner.saveServiceError': 'Failed to save service','owner.deleteServiceError': 'Failed to delete service','owner.saveContactsError': 'Failed to save settings',
  'home.title': 'Booking without calls',
'home.description': 'Bookly helps businesses accept bookings directly in Telegram.',
'home.openAdmin': 'Open admin panel',
'home.openBusiness': 'Open business page',
'home.slugPlaceholder': 'Business link or slug',
'home.emptySaved': 'Saved businesses will appear here.',
  'home.greeting': 'Welcome back',
'home.manageBusiness': 'Manage your business with Bookly',
'home.createBusinessHint': 'Create your business on Bookly',
  'home.manage': 'Manage',
'owner.today': 'Today','owner.upcoming': 'Upcoming','owner.past': 'Past','owner.addBooking': 'New booking','owner.addBusiness': 'Add business','owner.currentBusiness': 'Current business','owner.totalBookings': 'Total bookings','owner.noBookings': 'No bookings yet.','owner.subscription': 'Subscription','owner.active': 'Active','owner.inactive': 'Inactive','owner.subscriptionActive': 'Active','owner.subscriptionInactive': 'Inactive','owner.paymentFailed': 'Payment failed','owner.subscribeToActivate': 'Subscribe to activate Bookly.','owner.payMonthly': 'Pay $7.99 / month','owner.nextPayment': 'Next charge:','owner.cancelledActive': 'Subscription is cancelled and remains active until the end of the paid period.','owner.booklyActivated': 'Bookly is active','owner.unlimitedBookings': 'Unlimited bookings','owner.clientLink': 'Client link','owner.telegramNotifications': 'Telegram notifications','owner.workSchedule': 'Work schedule','owner.scheduleDescription': 'Set your regular working hours. You can block individual times later.','owner.addInterval': 'Add interval','owner.dayOff': 'Day off','owner.timeBlocks': 'Time blocks','owner.blocksDescription': 'Block times when you are unavailable so clients cannot book them.','owner.reasonOptional': 'Reason (optional)','owner.blockTime': 'Block time','owner.scheduleAndBlocks': 'Schedule and blocks','owner.bookings': 'Bookings','owner.close': 'Close','owner.upcomingBookings': 'Upcoming','owner.date': 'Date','owner.all': 'All','owner.newBooking': 'New booking','owner.chooseService': 'Choose a service','owner.chooseTime': 'Choose a time','owner.loadingSlots': 'Loading available time...','owner.noAvailableTime': 'No available time.','owner.clientData': 'Client details','owner.clientName': 'Client name','owner.clientPhone': 'Client phone number','owner.bookingHint': 'Choose a time above — the booking will be created after that.','owner.noBookingsInSection': 'There are no bookings in this section.','owner.businessLoadError': 'Failed to load business','owner.availabilityError': 'Failed to load available time','owner.chooseServiceError': 'Choose a service','owner.enterClientName': 'Enter the client name','owner.createBookingError': 'Failed to create booking','owner.bookingAdded': '✅ Booking added successfully','owner.bookingCancelled': '✅ Booking cancelled','owner.cancelBookingError': 'Failed to cancel booking','owner.cancelBookingConfirm': 'Cancel booking for client','owner.phoneMissing': 'phone not provided','owner.confirmed': 'Confirmed','owner.completed': 'Completed','owner.cancelled': 'Cancelled','owner.cancelling': 'Cancelling...','owner.cancel': 'Cancel',
  'settings.businessInfo': 'Business information','settings.phone': 'Business phone','settings.address': 'Business address','settings.description': 'Business description','settings.share': 'Share','settings.copyLink': 'Copy link','settings.qr': 'QR code','settings.downloadQr': 'Save QR code','settings.language': 'Language','settings.latitudeOptional': 'Latitude — optional','settings.longitudeOptional': 'Longitude — optional'
  'common.ok': 'Got it',
  'common.confirm': 'Confirm',

  'owner.serviceLimitAlreadySet': 'This service limit is already set',
  'owner.invalidServiceLimitValue': 'Invalid service limit',
  'owner.limitPriceCalculationError': 'Failed to calculate the price',
  'owner.limitPreviewError': 'Failed to calculate the amount',
  'owner.changeServiceLimitError': 'Failed to change the service limit',
  'owner.serviceLimitChanged': 'Service limit changed',

  'info.howBooklyWorks': 'How Bookly works',
  'info.forBusinessOwner': 'For business owners',
  'info.rulesAndContacts': 'Rules and contacts',
  'info.termsOfUse': 'Terms of use',
  'info.contacts': 'Contacts',
  'info.contactDescription': 'For questions about Bookly or to report violations:',

  'info.stepCreateBusiness': '1. Create your business.',
  'info.stepAddInfo': '2. Add information and a photo.',
  'info.stepAddServices': '3. Add services and prices.',
  'info.stepBookings': '6. Manage bookings.',
  'info.activationDescription': 'To start accepting bookings from clients, activate a Bookly Pro subscription. After activation, you will receive a client link and can start accepting bookings.',
  'info.proUnlocksClientPart': 'Bookly Pro unlocks the client side of Bookly:',

  'info.clientPage': 'Client page',
  'info.clientLink': 'Personal client link',
  'info.clientQr': 'Client QR code',
  'info.onlineBookings': 'Online bookings',
  'info.bookingNotifications': 'New booking notifications',
  'info.basePlanServices': 'Up to 10 services in the base plan',

  'info.withoutSubscription': 'Without a subscription, you can create and configure your business, add services, manage schedules, blocks and bookings in the admin panel. A subscription is required to connect clients and start accepting online bookings.',

  'info.rule1': '1. Bookly is intended for lawful use and the provision of ordinary goods and services.',
  'info.rule2': '2. It is prohibited to use Bookly for illegal goods or services, drugs, weapons, fraud, pornography, gambling and other prohibited activities.',
  'info.rule3': '3. The user is solely responsible for the legality of their business, goods, services, advertising and content.',
  'info.rule4': '4. Bookly may not be used to deceive clients, send spam, create fake bookings or otherwise abuse the service.',
  'info.rule5': '5. Users must comply with applicable laws and personal data protection requirements.',
  'info.rule6': '6. We may temporarily restrict or fully block a business for violating these rules.',
  'info.rule7': '7. Creating a new business or account to bypass a previous restriction is prohibited.',
  'info.rule8': '8. We may change Bookly features, temporarily restrict the service or stop providing the service.',
  'info.rule9': '9. We do not guarantee uninterrupted or error-free operation of Bookly. Technical failures, maintenance and third-party service outages may occur.',
  'info.rule10': '10. By using Bookly, the user agrees to comply with these rules.',
};

const uz: TranslationMap = {
  'app.name': 'Bookly', 'app.tagline': 'Telegram ichida bron qilish','nav.more': 'Yana', 'nav.home': 'Bosh sahifa', 'nav.bookings': 'Bronlar', 'nav.saved': 'Saqlanganlar', 'nav.profile': 'Profil', 'nav.services': 'Xizmatlar', 'nav.more': 'Yana', 'nav.schedule': 'Jadval', 'nav.blocks': 'Bloklangan vaqtlar', 'nav.businesses': 'Bizneslarim', 'nav.settings': 'Sozlamalar', 'nav.subscription': 'Obuna', 'nav.admin': 'Admin panel',
  'common.back': 'Orqaga', 'common.open': 'Ochish', 'common.save': 'Saqlash', 'common.cancel': 'Bekor qilish', 'common.delete': 'O‘chirish', 'common.edit': 'Tahrirlash', 'common.close': 'Yopish', 'common.loading': 'Yuklanmoqda...', 'language.title': 'Til', 'language.russian': 'Русский', 'language.english': 'English', 'language.uzbek': 'O‘zbek', 'language.turkish': 'Türkçe', 'language.arabic': 'العربية',
  'client.saveBusiness': 'Biznesni saqlash', 'client.slugError': 'Biznes havolasida slug mavjud emas.', 'client.businessInactive': 'Bu biznes hozir faol emas.', 'client.businessNotFound': 'Biznes topilmadi. Havola eskirgan yoki slug noto‘g‘ri bo‘lishi mumkin.', 'client.serverError': 'Server xatosi:', 'client.businessDataError': 'Server biznes ma’lumotlarini qaytarmadi.', 'client.businessLoadError': 'Biznesni yuklab bo‘lmadi', 'client.saveLoginRequired': 'Bizneslarni saqlash uchun Bookly’ni Telegram orqali oching.', 'client.saveBusinessError': 'Saqlangan bizneslarni o‘zgartirib bo‘lmadi', 'client.availabilityError': 'Bo‘sh vaqtni yuklab bo‘lmadi', 'client.enterName': 'Ismingizni kiriting.', 'client.enterPhone': 'Telefon raqamingizni kiriting.', 'client.bookingError': 'Tanlangan vaqtni bron qilib bo‘lmadi.', 'client.bookingSuccess': '✅ Bron muvaffaqiyatli yaratildi!', 'client.bookingRetry': 'Bronlash amalga oshmadi. Qayta urinib ko‘ring.', 'client.loadingBusiness': 'Biznes yuklanmoqda...', 'client.openError': 'Sahifani ochib bo‘lmadi', 'client.retry': 'Qayta urinish', 'client.removeSaved': 'Saqlanganlardan olib tashlash', 'client.chooseServiceHint': 'Bron qilish uchun quyidagi xizmatni tanlang.', 'client.noSavedBusinesses': 'Hali saqlangan bizneslar yo‘q.', 'client.noServices': 'Bu biznesda hozircha xizmatlar mavjud emas.', 'client.noSlots': 'Bu sana uchun bo‘sh vaqtlar yo‘q.', 'client.bookingLoading': 'Bron qilinmoqda...', 'client.savedBusiness': 'Saqlandi', 'client.location': 'Joylashuvni ochish', 'client.services': 'Xizmatlar', 'client.chooseService': 'Tanlash', 'client.chooseDate': 'Sanani tanlang', 'client.chooseTime': 'Vaqtni tanlang', 'client.yourData': 'Ma’lumotlaringiz', 'client.name': 'Ismingiz', 'client.phone': 'Telefon raqami', 'client.confirmBooking': 'Bronni tasdiqlash', 'client.myBookings': 'Bronlarim', 'client.savedBusinesses': 'Saqlangan bizneslar', 'client.noBookings': 'Hali bronlaringiz yo‘q.', 'client.bookingCancelled': 'Bron bekor qilindi', 'client.cancelBooking': 'Bronni bekor qilish', 'client.cancelBookingConfirm': 'Bu bron bekor qilinsinmi?', 'client.cancelBookingError': 'Bronni bekor qilib bo‘lmadi', 'client.connectionError': 'Ulanish xatosi',
  'days.mon': 'Du','days.tue': 'Se','days.wed': 'Cho','days.thu': 'Pa','days.fri': 'Ju','days.sat': 'Sha','days.sun': 'Ya',
  'owner.businessesLoadError': 'Bizneslarni yuklab bo‘lmadi','owner.enterBusinessName': 'Biznes nomini kiriting','owner.creatingBusiness': 'Yaratilmoqda...','owner.createBusiness': 'Biznes yaratish','owner.opened': 'Ochildi','owner.telegramOnlyTitle': 'Bookly’ni Telegram orqali oching','owner.telegramOnlyDescription': 'Admin panel Telegram Mini App ichida ishlaydi.','owner.paddleLoading': 'Paddle hali yuklanmoqda. Qayta urinib ko‘ring.','owner.telegramUserError': 'Telegram foydalanuvchisini aniqlab bo‘lmadi.','owner.selectedBusinessError': 'Tanlangan biznesni aniqlab bo‘lmadi.','owner.businessContacts': 'Biznes kontaktlari','owner.phonePlaceholder': 'Biznes telefon raqami','owner.addressPlaceholder': 'Biznes manzili','owner.saveContacts': 'Kontaktlarni saqlash','owner.saving': 'Saqlanmoqda...','owner.editService': 'Xizmatni tahrirlash','owner.createBusinessError': 'Biznesni yaratib bo‘lmadi','owner.telegramInitDataMissing': 'Telegram initData mavjud emas. Bookly’ni Telegram Mini App ichida oching.','owner.serverError': 'Server xatosi:','owner.monthlyPrice': '$7.99 / oy','owner.businessCreated': 'Yangi biznes yaratildi','owner.noBusiness': 'Hali biznesingiz yo‘q',
  'owner.addService': 'Xizmat qo‘shish','owner.serviceName': 'Nomi','owner.serviceDescription': 'Tavsif','owner.price': 'Narxi','owner.searchCurrency': 'Valyutani qidirish','owner.duration': 'Davomiylik (daqiqalarda)','owner.saveChanges': 'O‘zgarishlarni saqlash','owner.addServiceButton': '+ Xizmat qo‘shish','owner.minutes': 'daq','owner.edit': 'Tahrirlash','owner.delete': 'O‘chirish','owner.confirmDeleteService': 'Bu xizmat o‘chirilsinmi?','owner.serviceAdded': '✅ Xizmat qo‘shildi','owner.serviceUpdated': '✅ Xizmat o‘zgartirildi','owner.contactsSaved': '✅ Sozlamalar saqlandi','owner.invalidServiceName': 'Xizmat nomini kiriting','owner.invalidPrice': 'To‘g‘ri narx kiriting','owner.invalidDuration': 'Davomiylik 1 dan 480 daqiqagacha bo‘lishi kerak','owner.saveServiceError': 'Xizmatni saqlab bo‘lmadi','owner.deleteServiceError': 'Xizmatni o‘chirib bo‘lmadi','owner.saveContactsError': 'Sozlamalarni saqlab bo‘lmadi',
  'home.title': 'Qo‘ng‘iroqlarsiz bron','home.description': 'Bookly bizneslarga Telegram ichida to‘g‘ridan-to‘g‘ri bron qabul qilishga yordam beradi.','home.openAdmin': 'Admin panelni ochish','home.openBusiness': 'Biznes sahifasini ochish','home.title': 'Qo‘ng‘iroqlarsiz bron',
'home.description': 'Bookly bizneslarga Telegram ichida to‘g‘ridan-to‘g‘ri bron qabul qilishga yordam beradi.',
'home.openAdmin': 'Admin panelni ochish',
'home.openBusiness': 'Biznes sahifasini ochish',
'home.slugPlaceholder': 'Biznes havolasi yoki slug',
'home.emptySaved': 'Saqlangan bizneslaringiz shu yerda ko‘rinadi.',
'home.greeting': 'Qaytganingizdan xursandmiz',
'home.manageBusiness': 'Bookly’da biznesingizni boshqaring',
'home.slugPlaceholder': 'Biznes havolasi yoki slug',
'home.emptySaved': 'Saqlangan bizneslaringiz shu yerda ko‘rinadi.',
'home.greeting': 'Qaytganingizdan xursandmiz',
'home.manageBusiness': 'Bookly’da biznesingizni boshqaring',
'home.createBusinessHint': 'Bookly’da biznesingizni yarating',
  'home.manage': 'Boshqarish',
  'owner.today': 'Bugun','owner.upcoming': 'Kutilayotgan','owner.past': 'O‘tgan','owner.addBooking': 'Yangi bron','owner.addBusiness': 'Biznes qo‘shish','owner.currentBusiness': 'Joriy biznes','owner.totalBookings': 'Jami bronlar','owner.noBookings': 'Hali bronlar yo‘q.','owner.subscription': 'Obuna','owner.active': 'Faol','owner.inactive': 'Faol emas','owner.subscriptionActive': 'Faol','owner.subscriptionInactive': 'Faol emas','owner.paymentFailed': 'To‘lov amalga oshmadi','owner.subscribeToActivate': 'Bookly’ni faollashtirish uchun obuna bo‘ling.','owner.payMonthly': 'Oyiga $7.99 to‘lash','owner.nextPayment': 'Keyingi to‘lov:','owner.cancelledActive': 'Obuna bekor qilingan, lekin to‘langan davr oxirigacha faol.','owner.booklyActivated': 'Bookly faol','owner.unlimitedBookings': 'Cheksiz bronlar','owner.clientLink': 'Mijozlar havolasi','owner.telegramNotifications': 'Telegram bildirishnomalari','owner.workSchedule': 'Ish jadvali','owner.scheduleDescription': 'Oddiy ish vaqtlaringizni belgilang. Keyin alohida vaqtlarni bloklashingiz mumkin.','owner.addInterval': 'Interval qo‘shish','owner.dayOff': 'Dam olish kuni','owner.timeBlocks': 'Vaqt bloklari','owner.blocksDescription': 'Band bo‘lgan vaqtingizni bloklang, shunda mijozlar uni bron qila olmaydi.','owner.reasonOptional': 'Sabab (ixtiyoriy)','owner.blockTime': 'Vaqtni bloklash','owner.scheduleAndBlocks': 'Jadval va bloklar','owner.bookings': 'Bronlar','owner.close': 'Yopish','owner.upcomingBookings': 'Kutilayotgan','owner.date': 'Sana','owner.all': 'Barchasi','owner.newBooking': 'Yangi bron','owner.chooseService': 'Xizmatni tanlang','owner.chooseTime': 'Vaqtni tanlang','owner.loadingSlots': 'Bo‘sh vaqt yuklanmoqda...','owner.noAvailableTime': 'Bo‘sh vaqt yo‘q.','owner.clientData': 'Mijoz ma’lumotlari','owner.clientName': 'Mijoz ismi','owner.clientPhone': 'Mijoz telefoni','owner.bookingHint': 'Yuqoridan vaqtni tanlang — shundan keyin bron yaratiladi.','owner.noBookingsInSection': 'Tanlangan bo‘limda bronlar yo‘q.','owner.businessLoadError': 'Biznesni yuklab bo‘lmadi','owner.availabilityError': 'Bo‘sh vaqtni yuklab bo‘lmadi','owner.chooseServiceError': 'Xizmatni tanlang','owner.enterClientName': 'Mijoz ismini kiriting','owner.createBookingError': 'Bronni yaratib bo‘lmadi','owner.bookingAdded': '✅ Bron muvaffaqiyatli qo‘shildi','owner.bookingCancelled': '✅ Bron bekor qilindi','owner.cancelBookingError': 'Bronni bekor qilib bo‘lmadi','owner.cancelBookingConfirm': 'Mijoz bronini bekor qilish','owner.phoneMissing': 'telefon berilmagan','owner.confirmed': 'Tasdiqlangan','owner.completed': 'Tugallangan','owner.cancelled': 'Bekor qilingan','owner.cancelling': 'Bekor qilinmoqda...','owner.cancel': 'Bekor qilish',
  'settings.businessInfo': 'Biznes ma’lumotlari','settings.phone': 'Biznes telefoni','settings.address': 'Biznes manzili','settings.description': 'Biznes tavsifi','settings.share': 'Ulashish','settings.copyLink': 'Havolani nusxalash','settings.qr': 'QR-kod','settings.downloadQr': 'QR-kodni saqlash','settings.language': 'Til','settings.latitudeOptional': 'Kenglik — ixtiyoriy','settings.longitudeOptional': 'Uzunlik — ixtiyoriy'
  'common.ok': 'Tushunarli',
  'common.confirm': 'Tasdiqlash',

  'owner.serviceLimitAlreadySet': 'Bu xizmatlar limiti allaqachon o‘rnatilgan',
  'owner.invalidServiceLimitValue': 'Noto‘g‘ri xizmatlar limiti',
  'owner.limitPriceCalculationError': 'Narxni hisoblab bo‘lmadi',
  'owner.limitPreviewError': 'Summani hisoblab bo‘lmadi',
  'owner.changeServiceLimitError': 'Xizmatlar limitini o‘zgartirib bo‘lmadi',
  'owner.serviceLimitChanged': 'Xizmatlar limiti o‘zgartirildi',

  'info.howBooklyWorks': 'Bookly qanday ishlaydi',
  'info.forBusinessOwner': 'Biznes egasi uchun',
  'info.rulesAndContacts': 'Qoidalar va kontaktlar',
  'info.termsOfUse': 'Foydalanish qoidalari',
  'info.contacts': 'Kontaktlar',
  'info.contactDescription': 'Bookly ishlashi bo‘yicha savollar yoki qoidabuzarliklar haqida xabar berish uchun:',

  'info.stepCreateBusiness': '1. Biznesingizni yarating.',
  'info.stepAddInfo': '2. Ma’lumot va surat qo‘shing.',
  'info.stepAddServices': '3. Xizmatlar va narxlarni qo‘shing.',
  'info.stepBookings': '6. Bronlarni boshqaring.',
  'info.activationDescription': 'Mijozlardan bron qabul qilishni boshlash uchun Bookly Pro obunasini faollashtiring. Faollashtirgandan so‘ng mijozlar havolasini olasiz va bronlarni qabul qilishni boshlashingiz mumkin.',
  'info.proUnlocksClientPart': 'Bookly Pro Bookly’ning mijozlar qismini ochadi:',

  'info.clientPage': 'Mijoz sahifasi',
  'info.clientLink': 'Mijozlar uchun shaxsiy havola',
  'info.clientQr': 'Mijozlar uchun QR-kod',
  'info.onlineBookings': 'Onlayn bronlar',
  'info.bookingNotifications': 'Yangi bronlar bildirishnomalari',
  'info.basePlanServices': 'Asosiy tarifda 10 tagacha xizmat',

  'info.withoutSubscription': 'Obunasiz siz biznesni yaratishingiz va sozlashingiz, xizmatlar qo‘shishingiz, jadval, bloklar va bronlarni admin panelda boshqarishingiz mumkin. Obuna mijozlarni ulash va onlayn bronlarni qabul qilishni boshlash uchun kerak.',

  'info.rule1': '1. Bookly qonuniy foydalanish va oddiy tovarlar hamda xizmatlarni taqdim etish uchun mo‘ljallangan.',
  'info.rule2': '2. Bookly’dan noqonuniy tovarlar yoki xizmatlar, giyohvand moddalar, qurol, firibgarlik, pornografiya, qimor va boshqa taqiqlangan faoliyatlar uchun foydalanish taqiqlanadi.',
  'info.rule3': '3. Foydalanuvchi o‘z biznesi, tovarlari, xizmatlari, reklamasi va kontentining qonuniyligi uchun mustaqil javob beradi.',
  'info.rule4': '4. Bookly’dan mijozlarni aldash, spam yuborish, soxta bronlar yaratish yoki xizmatdan boshqa tarzda suiiste’mol qilish taqiqlanadi.',
  'info.rule5': '5. Foydalanuvchi amaldagi qonunlar va shaxsiy ma’lumotlarni himoya qilish talablariga rioya qilishi kerak.',
  'info.rule6': '6. Ushbu qoidalar buzilgan taqdirda biznesni vaqtincha cheklash yoki to‘liq bloklash huquqiga egamiz.',
  'info.rule7': '7. Avvalgi bloklashni chetlab o‘tish uchun yangi biznes yoki akkaunt yaratish taqiqlanadi.',
  'info.rule8': '8. Bookly funksiyalarini o‘zgartirishimiz, xizmatni vaqtincha cheklashimiz yoki xizmat ko‘rsatishni to‘xtatishimiz mumkin.',
  'info.rule9': '9. Bookly uzluksiz yoki xatosiz ishlashiga kafolat bermaymiz. Texnik nosozliklar, texnik xizmat va uchinchi tomon xizmatlarining ishlamasligi yuz berishi mumkin.',
  'info.rule10': '10. Bookly’dan foydalanish orqali foydalanuvchi ushbu qoidalarga rioya qilishga roziligini tasdiqlaydi.',
};

const tr: TranslationMap = {
  'app.name': 'Bookly', 'app.tagline': 'Telegram içinde rezervasyon','nav.more': 'Daha', 'nav.home': 'Ana sayfa', 'nav.bookings': 'Rezervasyonlar', 'nav.saved': 'Kaydedilenler', 'nav.profile': 'Profil', 'nav.services': 'Hizmetler', 'nav.more': 'Daha fazla', 'nav.schedule': 'Program', 'nav.blocks': 'Engellenen zamanlar', 'nav.businesses': 'İşletmelerim', 'nav.settings': 'Ayarlar', 'nav.subscription': 'Abonelik', 'nav.admin': 'Yönetim paneli',
  'common.back': 'Geri','common.open': 'Aç','common.save': 'Kaydet','common.cancel': 'İptal','common.delete': 'Sil','common.edit': 'Düzenle','common.close': 'Kapat','common.loading': 'Yükleniyor...','language.title': 'Dil','language.russian': 'Русский','language.english': 'English','language.uzbek': 'O‘zbek','language.turkish': 'Türkçe','language.arabic': 'العربية',
  'client.saveBusiness': 'İşletmeyi kaydet','client.slugError': 'İşletme bağlantısında slug yok.','client.businessInactive': 'Bu işletme şu anda aktif değil.','client.businessNotFound': 'İşletme bulunamadı. Bağlantı eski olabilir veya slug yanlış olabilir.','client.serverError': 'Sunucu hatası:','client.businessDataError': 'Sunucu işletme bilgilerini döndürmedi.','client.businessLoadError': 'İşletme yüklenemedi','client.saveLoginRequired': 'İşletmeleri kaydetmek için Bookly’yi Telegram üzerinden açın.','client.saveBusinessError': 'Kaydedilen işletmeler güncellenemedi','client.availabilityError': 'Uygun saatler yüklenemedi','client.enterName': 'Adınızı girin.','client.enterPhone': 'Telefon numaranızı girin.','client.bookingError': 'Seçilen saat rezerve edilemedi.','client.bookingSuccess': '✅ Rezervasyon başarıyla oluşturuldu!','client.bookingRetry': 'Rezervasyon başarısız oldu. Tekrar deneyin.','client.loadingBusiness': 'İşletme yükleniyor...','client.openError': 'Sayfa açılamadı','client.retry': 'Tekrar dene','client.removeSaved': 'Kaydedilenlerden kaldır','client.chooseServiceHint': 'Rezervasyon yapmak için aşağıdan bir hizmet seçin.','client.noSavedBusinesses': 'Henüz kaydedilmiş işletme yok.','client.noServices': 'Bu işletmede henüz kullanılabilir hizmet yok.','client.noSlots': 'Bu tarih için uygun saat yok.','client.bookingLoading': 'Rezervasyon yapılıyor...','client.savedBusiness': 'Kaydedildi','client.location': 'Konumu aç','client.services': 'Hizmetler','client.chooseService': 'Seç','client.chooseDate': 'Tarih seçin','client.chooseTime': 'Saat seçin','client.yourData': 'Bilgileriniz','client.name': 'Adınız','client.phone': 'Telefon numarası','client.confirmBooking': 'Rezervasyonu onayla','client.myBookings': 'Rezervasyonlarım','client.savedBusinesses': 'Kaydedilen işletmeler','client.noBookings': 'Henüz rezervasyonunuz yok.','client.bookingCancelled': 'Rezervasyon iptal edildi','client.cancelBooking': 'Rezervasyonu iptal et','client.cancelBookingConfirm': 'Bu rezervasyon iptal edilsin mi?','client.cancelBookingError': 'Rezervasyon iptal edilemedi','client.connectionError': 'Bağlantı hatası',
  'days.mon': 'Pzt','days.tue': 'Sal','days.wed': 'Çar','days.thu': 'Per','days.fri': 'Cum','days.sat': 'Cmt','days.sun': 'Paz',
  'owner.businessesLoadError': 'İşletmeler yüklenemedi','owner.enterBusinessName': 'İşletme adını girin','owner.creatingBusiness': 'Oluşturuluyor...','owner.createBusiness': 'İşletme oluştur','owner.opened': 'Açık','owner.telegramOnlyTitle': 'Bookly’yi Telegram üzerinden açın','owner.telegramOnlyDescription': 'Yönetim paneli Telegram Mini App içinde çalışır.','owner.paddleLoading': 'Paddle hâlâ yükleniyor. Tekrar deneyin.','owner.telegramUserError': 'Telegram kullanıcısı belirlenemedi.','owner.selectedBusinessError': 'Seçili işletme belirlenemedi.','owner.businessContacts': 'İşletme iletişim bilgileri','owner.phonePlaceholder': 'İşletme telefon numarası','owner.addressPlaceholder': 'İşletme adresi','owner.saveContacts': 'İletişim bilgilerini kaydet','owner.saving': 'Kaydediliyor...','owner.editService': 'Hizmeti düzenle','owner.createBusinessError': 'İşletme oluşturulamadı','owner.telegramInitDataMissing': 'Telegram initData yok. Bookly’yi Telegram Mini App içinde açın.','owner.serverError': 'Sunucu hatası:','owner.monthlyPrice': '$7.99 / ay','owner.businessCreated': 'Yeni işletme oluşturuldu','owner.noBusiness': 'Henüz işletmeniz yok',
  'owner.addService': 'Hizmet ekle','owner.serviceName': 'Ad','owner.serviceDescription': 'Açıklama','owner.price': 'Fiyat','owner.searchCurrency': 'Para birimi ara','owner.duration': 'Dakika cinsinden süre','owner.saveChanges': 'Değişiklikleri kaydet','owner.addServiceButton': '+ Hizmet ekle','owner.minutes': 'dk','owner.edit': 'Düzenle','owner.delete': 'Sil','owner.confirmDeleteService': 'Bu hizmet silinsin mi?','owner.serviceAdded': '✅ Hizmet eklendi','owner.serviceUpdated': '✅ Hizmet güncellendi','owner.contactsSaved': '✅ Ayarlar kaydedildi','owner.invalidServiceName': 'Hizmet adını girin','owner.invalidPrice': 'Geçerli bir fiyat girin','owner.invalidDuration': 'Süre 1 ile 480 dakika arasında olmalıdır','owner.saveServiceError': 'Hizmet kaydedilemedi','owner.deleteServiceError': 'Hizmet silinemedi','owner.saveContactsError': 'Ayarlar kaydedilemedi',
  'home.title': 'Arama olmadan rezervasyon','home.description': 'Bookly, işletmelerin Telegram içinde doğrudan rezervasyon almasına yardımcı olur.','home.openAdmin': 'Yönetim panelini aç','home.openBusiness': 'İşletme sayfasını aç','home.slugPlaceholder': 'İşletme bağlantısı veya slug','home.emptySaved': 'Kaydettiğiniz işletmeler burada görünecek.','home.greeting': 'Tekrar hoş geldiniz',
'home.manageBusiness': 'Bookly ile işletmenizi yönetin',
'home.createBusinessHint': 'Bookly ile işletmenizi oluşturun',
  'home.manage': 'Yönet',
  'owner.today': 'Bugün','owner.upcoming': 'Yaklaşan','owner.past': 'Geçmiş','owner.addBooking': 'Yeni rezervasyon','owner.addBusiness': 'İşletme ekle','owner.currentBusiness': 'Mevcut işletme','owner.totalBookings': 'Toplam rezervasyon','owner.noBookings': 'Henüz rezervasyon yok.','owner.subscription': 'Abonelik','owner.active': 'Aktif','owner.inactive': 'Aktif değil','owner.subscriptionActive': 'Aktif','owner.subscriptionInactive': 'Aktif değil','owner.paymentFailed': 'Ödeme başarısız','owner.subscribeToActivate': 'Bookly’yi etkinleştirmek için abone olun.','owner.payMonthly': 'Aylık $7.99 öde','owner.nextPayment': 'Sonraki ödeme:','owner.cancelledActive': 'Abonelik iptal edildi ve ücretli dönemin sonuna kadar aktif kalır.','owner.booklyActivated': 'Bookly aktif','owner.unlimitedBookings': 'Sınırsız rezervasyon','owner.clientLink': 'Müşteri bağlantısı','owner.telegramNotifications': 'Telegram bildirimleri','owner.workSchedule': 'Çalışma programı','owner.scheduleDescription': 'Düzenli çalışma saatlerinizi ayarlayın. Daha sonra belirli saatleri engelleyebilirsiniz.','owner.addInterval': 'Aralık ekle','owner.dayOff': 'İzin günü','owner.timeBlocks': 'Zaman blokları','owner.blocksDescription': 'Müsait olmadığınız saatleri engelleyin; müşteriler bu saatleri rezerve edemez.','owner.reasonOptional': 'Neden (isteğe bağlı)','owner.blockTime': 'Zamanı engelle','owner.scheduleAndBlocks': 'Program ve engeller','owner.bookings': 'Rezervasyonlar','owner.close': 'Kapat','owner.upcomingBookings': 'Yaklaşan','owner.date': 'Tarih','owner.all': 'Tümü','owner.newBooking': 'Yeni rezervasyon','owner.chooseService': 'Hizmet seçin','owner.chooseTime': 'Saat seçin','owner.loadingSlots': 'Uygun saatler yükleniyor...','owner.noAvailableTime': 'Uygun saat yok.','owner.clientData': 'Müşteri bilgileri','owner.clientName': 'Müşteri adı','owner.clientPhone': 'Müşteri telefonu','owner.bookingHint': 'Yukarıdan bir saat seçin — ardından rezervasyon oluşturulur.','owner.noBookingsInSection': 'Seçili bölümde rezervasyon yok.','owner.businessLoadError': 'İşletme yüklenemedi','owner.availabilityError': 'Uygun saatler yüklenemedi','owner.chooseServiceError': 'Hizmet seçin','owner.enterClientName': 'Müşteri adını girin','owner.createBookingError': 'Rezervasyon oluşturulamadı','owner.bookingAdded': '✅ Rezervasyon başarıyla eklendi','owner.bookingCancelled': '✅ Rezervasyon iptal edildi','owner.cancelBookingError': 'Rezervasyon iptal edilemedi','owner.cancelBookingConfirm': 'Müşteri rezervasyonu iptal edilsin','owner.phoneMissing': 'telefon verilmedi','owner.confirmed': 'Onaylandı','owner.completed': 'Tamamlandı','owner.cancelled': 'İptal edildi','owner.cancelling': 'İptal ediliyor...','owner.cancel': 'İptal et',
  'settings.businessInfo': 'İşletme bilgileri','settings.phone': 'İşletme telefonu','settings.address': 'İşletme adresi','settings.description': 'İşletme açıklaması','settings.share': 'Paylaş','settings.copyLink': 'Bağlantıyı kopyala','settings.qr': 'QR kodu','settings.downloadQr': 'QR kodunu kaydet','settings.language': 'Dil','settings.latitudeOptional': 'Enlem — isteğe bağlı','settings.longitudeOptional': 'Boylam — isteğe bağlı'
  'common.ok': 'Anladım',
  'common.confirm': 'Onayla',

  'owner.serviceLimitAlreadySet': 'Bu hizmet limiti zaten ayarlanmış',
  'owner.invalidServiceLimitValue': 'Geçersiz hizmet limiti',
  'owner.limitPriceCalculationError': 'Fiyat hesaplanamadı',
  'owner.limitPreviewError': 'Tutar hesaplanamadı',
  'owner.changeServiceLimitError': 'Hizmet limiti değiştirilemedi',
  'owner.serviceLimitChanged': 'Hizmet limiti değiştirildi',

  'info.howBooklyWorks': 'Bookly nasıl çalışır',
  'info.forBusinessOwner': 'İşletme sahibi için',
  'info.rulesAndContacts': 'Kurallar ve iletişim',
  'info.termsOfUse': 'Kullanım kuralları',
  'info.contacts': 'İletişim',
  'info.contactDescription': 'Bookly hakkında sorularınız veya ihlal bildirimleri için:',

  'info.stepCreateBusiness': '1. İşletmenizi oluşturun.',
  'info.stepAddInfo': '2. Bilgileri ve fotoğrafı ekleyin.',
  'info.stepAddServices': '3. Hizmetleri ve fiyatları ekleyin.',
  'info.stepBookings': '6. Rezervasyonları yönetin.',
  'info.activationDescription': 'Müşterilerden rezervasyon almaya başlamak için Bookly Pro aboneliğini etkinleştirin. Etkinleştirdikten sonra müşteri bağlantınızı alabilir ve rezervasyon kabul etmeye başlayabilirsiniz.',
  'info.proUnlocksClientPart': 'Bookly Pro, Bookly’nin müşteri tarafını açar:',

  'info.clientPage': 'Müşteri sayfası',
  'info.clientLink': 'Müşteriler için kişisel bağlantı',
  'info.clientQr': 'Müşteri QR kodu',
  'info.onlineBookings': 'Online rezervasyonlar',
  'info.bookingNotifications': 'Yeni rezervasyon bildirimleri',
  'info.basePlanServices': 'Temel planda en fazla 10 hizmet',

  'info.withoutSubscription': 'Abonelik olmadan işletmenizi oluşturabilir ve yapılandırabilir, hizmetler ekleyebilir, programı, engellenen zamanları ve rezervasyonları yönetim panelinden yönetebilirsiniz. Müşterileri bağlamak ve online rezervasyon almaya başlamak için abonelik gerekir.',

  'info.rule1': '1. Bookly, yasal kullanım ve normal mal ve hizmetlerin sunulması için tasarlanmıştır.',
  'info.rule2': '2. Bookly’yi yasa dışı mal veya hizmetler, uyuşturucu, silah, dolandırıcılık, pornografi, kumar ve diğer yasaklı faaliyetler için kullanmak yasaktır.',
  'info.rule3': '3. Kullanıcı, işletmesinin, mallarının, hizmetlerinin, reklamlarının ve içeriğinin yasallığından tamamen sorumludur.',
  'info.rule4': '4. Bookly’yi müşterileri kandırmak, spam göndermek, sahte rezervasyon oluşturmak veya hizmeti başka şekilde kötüye kullanmak için kullanmak yasaktır.',
  'info.rule5': '5. Kullanıcılar yürürlükteki yasalara ve kişisel verilerin korunması gerekliliklerine uymalıdır.',
  'info.rule6': '6. Bu kuralların ihlali durumunda işletmeyi geçici olarak kısıtlama veya tamamen engelleme hakkımız vardır.',
  'info.rule7': '7. Önceki bir kısıtlamayı aşmak amacıyla yeni bir işletme veya hesap oluşturmak yasaktır.',
  'info.rule8': '8. Bookly özelliklerini değiştirebilir, hizmeti geçici olarak kısıtlayabilir veya hizmet sunmayı durdurabiliriz.',
  'info.rule9': '9. Bookly’nin kesintisiz veya hatasız çalışacağını garanti etmiyoruz. Teknik arızalar, bakım ve üçüncü taraf hizmet kesintileri yaşanabilir.',
  'info.rule10': '10. Bookly’yi kullanarak kullanıcı bu kurallara uymayı kabul eder.',
};

const ar: TranslationMap = {
  'app.name': 'Bookly', 'app.tagline': 'الحجز داخل Telegram', 'nav.home': 'الرئيسية','nav.more': 'المزيد', 'nav.bookings': 'الحجوزات', 'nav.saved': 'المحفوظة', 'nav.profile': 'الملف الشخصي', 'nav.services': 'الخدمات', 'nav.more': 'المزيد', 'nav.schedule': 'الجدول', 'nav.blocks': 'الأوقات المحجوبة', 'nav.businesses': 'أعمالي', 'nav.settings': 'الإعدادات', 'nav.subscription': 'الاشتراك', 'nav.admin': 'لوحة الإدارة',
  'common.back': 'رجوع','common.open': 'فتح','common.save': 'حفظ','common.cancel': 'إلغاء','common.delete': 'حذف','common.edit': 'تعديل','common.close': 'إغلاق','common.loading': 'جارٍ التحميل...','language.title': 'اللغة','language.russian': 'Русский','language.english': 'English','language.uzbek': 'O‘zbek','language.turkish': 'Türkçe','language.arabic': 'العربية',
  'client.saveBusiness': 'حفظ النشاط','client.slugError': 'رابط النشاط لا يحتوي على slug.','client.businessInactive': 'هذا النشاط غير فعال حاليًا.','client.businessNotFound': 'لم يتم العثور على النشاط. قد يكون الرابط قديمًا أو يحتوي على slug غير صحيح.','client.serverError': 'خطأ في الخادم:','client.businessDataError': 'لم يُرجع الخادم بيانات النشاط.','client.businessLoadError': 'تعذر تحميل النشاط','client.saveLoginRequired': 'افتح Bookly عبر Telegram لحفظ الأنشطة.','client.saveBusinessError': 'تعذر تحديث الأنشطة المحفوظة','client.availabilityError': 'تعذر تحميل الأوقات المتاحة','client.enterName': 'أدخل اسمك.','client.enterPhone': 'أدخل رقم هاتفك.','client.bookingError': 'تعذر حجز الوقت المحدد.','client.bookingSuccess': '✅ تم إنشاء الحجز بنجاح!','client.bookingRetry': 'فشل الحجز. حاول مرة أخرى.','client.loadingBusiness': 'جارٍ تحميل النشاط...','client.openError': 'تعذر فتح الصفحة','client.retry': 'إعادة المحاولة','client.removeSaved': 'إزالة من المحفوظات','client.chooseServiceHint': 'اختر خدمة أدناه لإجراء الحجز.','client.noSavedBusinesses': 'لا توجد أنشطة محفوظة بعد.','client.noServices': 'لا توجد خدمات متاحة لهذا النشاط حاليًا.','client.noSlots': 'لا توجد أوقات متاحة لهذا التاريخ.','client.bookingLoading': 'جارٍ الحجز...','client.savedBusiness': 'تم الحفظ','client.location': 'فتح الموقع','client.services': 'الخدمات','client.chooseService': 'اختيار','client.chooseDate': 'اختر التاريخ','client.chooseTime': 'اختر الوقت','client.yourData': 'بياناتك','client.name': 'اسمك','client.phone': 'رقم الهاتف','client.confirmBooking': 'تأكيد الحجز','client.myBookings': 'حجوزاتي','client.savedBusinesses': 'الأنشطة المحفوظة','client.noBookings': 'لا توجد حجوزات بعد.','client.bookingCancelled': 'تم إلغاء الحجز','client.cancelBooking': 'إلغاء الحجز','client.cancelBookingConfirm': 'هل تريد إلغاء هذا الحجز؟','client.cancelBookingError': 'تعذر إلغاء الحجز','client.connectionError': 'خطأ في الاتصال',
  'days.mon': 'الإثنين','days.tue': 'الثلاثاء','days.wed': 'الأربعاء','days.thu': 'الخميس','days.fri': 'الجمعة','days.sat': 'السبت','days.sun': 'الأحد',
  'owner.businessesLoadError': 'تعذر تحميل الأنشطة','owner.enterBusinessName': 'أدخل اسم النشاط','owner.creatingBusiness': 'جارٍ الإنشاء...','owner.createBusiness': 'إنشاء نشاط','owner.opened': 'مفتوح','owner.telegramOnlyTitle': 'افتح Bookly من Telegram','owner.telegramOnlyDescription': 'تعمل لوحة الإدارة داخل Telegram Mini App.','owner.paddleLoading': 'لا يزال Paddle قيد التحميل. حاول مرة أخرى.','owner.telegramUserError': 'تعذر تحديد مستخدم Telegram.','owner.selectedBusinessError': 'تعذر تحديد النشاط المحدد.','owner.businessContacts': 'بيانات اتصال النشاط','owner.phonePlaceholder': 'رقم هاتف النشاط','owner.addressPlaceholder': 'عنوان النشاط','owner.saveContacts': 'حفظ بيانات الاتصال','owner.saving': 'جارٍ الحفظ...','owner.editService': 'تعديل الخدمة','owner.createBusinessError': 'تعذر إنشاء النشاط','owner.telegramInitDataMissing': 'بيانات Telegram initData غير موجودة. افتح Bookly داخل Telegram Mini App.','owner.serverError': 'خطأ في الخادم:','owner.monthlyPrice': '$7.99 / شهريًا','owner.businessCreated': 'تم إنشاء نشاط جديد','owner.noBusiness': 'لا يوجد لديك نشاط بعد',
  'owner.addService': 'إضافة خدمة','owner.serviceName': 'الاسم','owner.serviceDescription': 'الوصف','owner.price': 'السعر','owner.searchCurrency': 'البحث عن العملة','owner.duration': 'المدة بالدقائق','owner.saveChanges': 'حفظ التغييرات','owner.addServiceButton': '+ إضافة خدمة','owner.minutes': 'د','owner.edit': 'تعديل','owner.delete': 'حذف','owner.confirmDeleteService': 'هل تريد حذف هذه الخدمة؟','owner.serviceAdded': '✅ تمت إضافة الخدمة','owner.serviceUpdated': '✅ تم تعديل الخدمة','owner.contactsSaved': '✅ تم حفظ الإعدادات','owner.invalidServiceName': 'أدخل اسم الخدمة','owner.invalidPrice': 'أدخل سعراً صحيحاً','owner.invalidDuration': 'يجب أن تكون المدة بين دقيقة واحدة و480 دقيقة','owner.saveServiceError': 'تعذر حفظ الخدمة','owner.deleteServiceError': 'تعذر حذف الخدمة','owner.saveContactsError': 'تعذر حفظ الإعدادات',
  'home.title': 'حجز بدون مكالمات','home.description': 'يساعد Bookly الأنشطة التجارية على استقبال الحجوزات مباشرة داخل Telegram.','home.openAdmin': 'فتح لوحة الإدارة','home.openBusiness': 'فتح صفحة النشاط','home.slugPlaceholder': 'رابط النشاط أو slug','home.emptySaved': 'ستظهر هنا الأنشطة التي تحفظها.','home.greeting': 'مرحبًا بعودتك',
'home.manageBusiness': 'أدر نشاطك التجاري مع Bookly',
'home.createBusinessHint': 'أنشئ نشاطك التجاري مع Bookly',
  'home.manage': 'إدارة',
  'owner.today': 'اليوم','owner.upcoming': 'القادمة','owner.past': 'السابقة','owner.addBooking': 'حجز جديد','owner.addBusiness': 'إضافة نشاط','owner.currentBusiness': 'النشاط الحالي','owner.totalBookings': 'إجمالي الحجوزات','owner.noBookings': 'لا توجد حجوزات بعد.','owner.subscription': 'الاشتراك','owner.active': 'نشط','owner.inactive': 'غير نشط','owner.subscriptionActive': 'نشط','owner.subscriptionInactive': 'غير نشط','owner.paymentFailed': 'فشل الدفع','owner.subscribeToActivate': 'اشترك لتفعيل Bookly.','owner.payMonthly': 'ادفع $7,99 شهريًا','owner.nextPayment': 'الدفعة التالية:','owner.cancelledActive': 'تم إلغاء الاشتراك لكنه يظل نشطًا حتى نهاية الفترة المدفوعة.','owner.booklyActivated': 'Bookly نشط','owner.unlimitedBookings': 'حجوزات غير محدودة','owner.clientLink': 'رابط العملاء','owner.telegramNotifications': 'إشعارات Telegram','owner.workSchedule': 'جدول العمل','owner.scheduleDescription': 'حدد ساعات العمل المعتادة. يمكنك حظر أوقات محددة لاحقًا.','owner.addInterval': 'إضافة فترة','owner.dayOff': 'يوم إجازة','owner.timeBlocks': 'حظر الأوقات','owner.blocksDescription': 'احظر الأوقات التي لا تكون متاحًا فيها حتى لا يتمكن العملاء من حجزها.','owner.reasonOptional': 'السبب (اختياري)','owner.blockTime': 'حظر الوقت','owner.scheduleAndBlocks': 'الجدول والحظر','owner.bookings': 'الحجوزات','owner.close': 'إغلاق','owner.upcomingBookings': 'القادمة','owner.date': 'التاريخ','owner.all': 'الكل','owner.newBooking': 'حجز جديد','owner.chooseService': 'اختر خدمة','owner.chooseTime': 'اختر الوقت','owner.loadingSlots': 'جارٍ تحميل الأوقات المتاحة...','owner.noAvailableTime': 'لا يوجد وقت متاح.','owner.clientData': 'بيانات العميل','owner.clientName': 'اسم العميل','owner.clientPhone': 'رقم هاتف العميل','owner.bookingHint': 'اختر وقتًا أعلاه — سيتم إنشاء الحجز بعد ذلك.','owner.noBookingsInSection': 'لا توجد حجوزات في هذا القسم.','owner.businessLoadError': 'تعذر تحميل النشاط','owner.availabilityError': 'تعذر تحميل الأوقات المتاحة','owner.chooseServiceError': 'اختر خدمة','owner.enterClientName': 'أدخل اسم العميل','owner.createBookingError': 'تعذر إنشاء الحجز','owner.bookingAdded': '✅ تمت إضافة الحجز بنجاح','owner.bookingCancelled': '✅ تم إلغاء الحجز','owner.cancelBookingError': 'تعذر إلغاء الحجز','owner.cancelBookingConfirm': 'إلغاء حجز العميل','owner.phoneMissing': 'رقم الهاتف غير متوفر','owner.confirmed': 'مؤكد','owner.completed': 'مكتمل','owner.cancelled': 'ملغى','owner.cancelling': 'جارٍ الإلغاء...','owner.cancel': 'إلغاء',
  'settings.businessInfo': 'معلومات النشاط التجاري','settings.phone': 'هاتف النشاط','settings.address': 'عنوان النشاط','settings.description': 'وصف النشاط','settings.share': 'مشاركة','settings.copyLink': 'نسخ الرابط','settings.qr': 'رمز QR','settings.downloadQr': 'حفظ رمز QR','settings.language': 'اللغة','settings.latitudeOptional': 'خط العرض — اختياري','settings.longitudeOptional': 'خط الطول — اختياري'
  'common.ok': 'حسنًا',
  'common.confirm': 'تأكيد',

  'owner.serviceLimitAlreadySet': 'تم تعيين حد الخدمات هذا بالفعل',
  'owner.invalidServiceLimitValue': 'حد خدمات غير صالح',
  'owner.limitPriceCalculationError': 'تعذر حساب السعر',
  'owner.limitPreviewError': 'تعذر حساب المبلغ',
  'owner.changeServiceLimitError': 'تعذر تغيير حد الخدمات',
  'owner.serviceLimitChanged': 'تم تغيير حد الخدمات',

  'info.howBooklyWorks': 'كيف يعمل Bookly',
  'info.forBusinessOwner': 'لصاحب النشاط التجاري',
  'info.rulesAndContacts': 'القواعد وبيانات الاتصال',
  'info.termsOfUse': 'قواعد الاستخدام',
  'info.contacts': 'بيانات الاتصال',
  'info.contactDescription': 'للاستفسارات حول Bookly أو للإبلاغ عن المخالفات:',

  'info.stepCreateBusiness': '1. أنشئ نشاطك التجاري.',
  'info.stepAddInfo': '2. أضف المعلومات والصورة.',
  'info.stepAddServices': '3. أضف الخدمات والأسعار.',
  'info.stepBookings': '6. أدر الحجوزات.',
  'info.activationDescription': 'لبدء استقبال الحجوزات من العملاء، فعّل اشتراك Bookly Pro. بعد التفعيل ستحصل على رابط للعملاء ويمكنك البدء في استقبال الحجوزات.',
  'info.proUnlocksClientPart': 'يفتح Bookly Pro واجهة العملاء في Bookly:',

  'info.clientPage': 'صفحة العملاء',
  'info.clientLink': 'رابط شخصي للعملاء',
  'info.clientQr': 'رمز QR للعملاء',
  'info.onlineBookings': 'الحجوزات عبر الإنترنت',
  'info.bookingNotifications': 'إشعارات الحجوزات الجديدة',
  'info.basePlanServices': 'حتى 10 خدمات في الخطة الأساسية',

  'info.withoutSubscription': 'بدون اشتراك، يمكنك إنشاء النشاط التجاري وإعداده، وإضافة الخدمات، وإدارة الجدول والأوقات المحجوبة والحجوزات من لوحة الإدارة. يلزم الاشتراك لربط العملاء والبدء في استقبال الحجوزات عبر الإنترنت.',

  'info.rule1': '1. Bookly مخصص للاستخدام القانوني وتقديم السلع والخدمات العادية.',
  'info.rule2': '2. يُحظر استخدام Bookly للسلع أو الخدمات غير القانونية، أو المخدرات، أو الأسلحة، أو الاحتيال، أو المواد الإباحية، أو المقامرة، أو أي أنشطة محظورة أخرى.',
  'info.rule3': '3. يتحمل المستخدم وحده مسؤولية قانونية نشاطه التجاري وسلعه وخدماته وإعلاناته ومحتواه.',
  'info.rule4': '4. يُحظر استخدام Bookly لخداع العملاء أو إرسال الرسائل المزعجة أو إنشاء حجوزات وهمية أو إساءة استخدام الخدمة بأي شكل آخر.',
  'info.rule5': '5. يجب على المستخدمين الالتزام بالقوانين المعمول بها ومتطلبات حماية البيانات الشخصية.',
  'info.rule6': '6. يحق لنا تقييد النشاط التجاري مؤقتًا أو حظره بالكامل عند مخالفة هذه القواعد.',
  'info.rule7': '7. يُحظر إنشاء نشاط تجاري أو حساب جديد للتحايل على تقييد سابق.',
  'info.rule8': '8. يمكننا تغيير ميزات Bookly أو تقييد الخدمة مؤقتًا أو إيقاف تقديمها.',
  'info.rule9': '9. لا نضمن تشغيل Bookly بشكل مستمر أو خالٍ من الأخطاء. قد تحدث أعطال فنية أو صيانة أو انقطاعات في خدمات الجهات الخارجية.',
  'info.rule10': '10. باستخدام Bookly، يوافق المستخدم على الالتزام بهذه القواعد.',
};

export const translations: Record<Language, TranslationMap> = {ru,en,uz,tr,ar};
export const DEFAULT_LANGUAGE: Language = 'en';
export const LANGUAGE_STORAGE_KEY = 'bookly_language';

export function getStoredLanguage(): Language {
  try {
    const value = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
    if (value && SUPPORTED_LANGUAGES.some(item => item.code === value)) return value;
  } catch {}
  return DEFAULT_LANGUAGE;
}

export function detectLanguage(): Language {
  const stored = getStoredLanguage();
  if (stored) return stored;
  const browser = (navigator.language || '').toLowerCase();
  if (browser.startsWith('ru')) return 'ru';
  if (browser.startsWith('uz')) return 'uz';
  if (browser.startsWith('tr')) return 'tr';
  if (browser.startsWith('ar')) return 'ar';
  return 'en';
}

export function setStoredLanguage(language: Language): void {
  try { localStorage.setItem(LANGUAGE_STORAGE_KEY, language); } catch {}
}

export function createTranslator(language: Language) {
  const map = translations[language] || translations.en;
  return (key: string, fallback?: string) => map[key] ?? translations.en[key] ?? fallback ?? key;
}

export function applyLanguageDirection(language: Language): void {
  const item = SUPPORTED_LANGUAGES.find(entry => entry.code === language);
  document.documentElement.lang = language;
  document.documentElement.dir = item?.dir || 'ltr';
}

