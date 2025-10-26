// Turkish translations
export const tr = {
  // Navigation
  nav: {
    title: 'Bütçe Yönetimi',
    analytics: 'Analiz',
    auditLogs: 'Denetim Kayıtları',
    admin: 'Yönetim',
    logout: 'Çıkış Yap',
  },

  // Login Page
  login: {
    title: 'Bütçe Yönetimi',
    subtitle: 'Harcamalarınızı AI yardımıyla takip edin',
    signInGoogle: 'Google ile Giriş Yap',
    termsText: 'Giriş yaparak Hizmet Şartlarımızı ve Gizlilik Politikamızı kabul etmiş olursunuz',
  },

  // Auth Callback
  authCallback: {
    completing: 'Giriş tamamlanıyor...',
  },

  // Home Page
  home: {
    title: 'Harcama Ekle',
    selectGroup: 'Grup Seç',
    noGroups: 'Grup bulunamadı',
    noGroupsContact: 'Lütfen grup oluşturmak için yöneticiyle iletişime geçin.',
    uploadInvoice: '📷 Fatura Fotoğrafı Yükle',
    chatWithAI: '💬 AI Asistanı ile Sohbet',
    chatSubtitle: 'Harcamanızı anlatın, sizin için ekleyeyim!',
  },

  // Admin Page
  admin: {
    title: 'Yönetim Paneli',
    stats: {
      totalGroups: 'Toplam Grup',
      totalUsers: 'Toplam Kullanıcı',
      activeMembers: 'Aktif Üye',
      totalExpenses: 'Toplam Harcama',
    },
    groups: {
      title: 'Grupları Yönet',
      newGroup: '+ Yeni Grup',
      cancel: 'İptal',
      namePlaceholder: 'Grup adı',
      descriptionPlaceholder: 'Açıklama (isteğe bağlı)',
      create: 'Oluştur',
      members: 'üye',
      expenses: 'harcama',
      details: 'Detaylar →',
      noGroups: 'Henüz grup oluşturulmamış',
    },
    users: {
      title: 'Kullanıcıları Yönet',
      googleOAuthOnly: 'Kullanıcılar Google OAuth ile otomatik oluşturulur',
      expenses: 'harcama',
      noUsers: 'Henüz kullanıcı yok',
      manageRoles: 'Rolleri Yönet',
    },
  },

  // User Role Management Page
  userRoles: {
    title: 'Kullanıcı Rolü Yönetimi',
    subtitle: 'Kullanıcı izinlerini ve erişim seviyelerini yönetin',
    backToAdmin: '← Yönetim Paneline Dön',
    loadingUsers: 'Kullanıcılar yükleniyor...',
    successMessage: 'Kullanıcı rolü başarıyla güncellendi!',
    errorMessage: 'Kullanıcı rolü güncellenemedi',
    confirmChange: 'Bu kullanıcının rolünü {role} olarak değiştirmek istediğinizden emin misiniz?',
    table: {
      user: 'Kullanıcı',
      email: 'E-posta',
      currentRole: 'Mevcut Rol',
      actions: 'İşlemler',
      you: '(Siz)',
      cannotModify: 'Kendi rolünüzü değiştiremezsiniz',
      makeAdmin: 'Yönetici Yap',
      removeAdmin: 'Yönetici Kaldır',
    },
    roles: {
      user: 'kullanıcı',
      admin: 'yönetici',
    },
    about: {
      title: 'Roller Hakkında',
      userDescription: 'Üye oldukları gruplarda harcama oluşturabilir ve yönetebilir',
      adminDescription: 'Yönetim paneline erişebilir, tüm kullanıcıları, grupları ve rolleri yönetebilir',
    },
  },

  // Group Page
  group: {
    backToHome: '← Ana Sayfaya Dön',
    expenseHistory: 'Harcama Geçmişi',
    loading: 'Yükleniyor...',
    edit: {
      title: 'Grubu Düzenle',
      nameLabel: 'Grup Adı',
      namePlaceholder: 'Grup adını girin',
      descriptionLabel: 'Açıklama (İsteğe Bağlı)',
      descriptionPlaceholder: 'Grup açıklaması girin',
      save: 'Kaydet',
      saving: 'Kaydediliyor...',
      cancel: 'İptal',
      nameRequired: 'Grup adı gereklidir',
      editButton: 'Grubu düzenle',
    },
  },

  // Group Summary
  summary: {
    title: 'Grup Özeti',
    totalSpending: 'Toplam Harcama',
    totalExpenses: 'Toplam Harcama Sayısı',
    spendingByMember: 'Üyelere Göre Harcama',
    expense: 'harcama',
    expenses: 'harcama',
    loading: 'Özet yükleniyor...',
  },

  // Spending Summary (HomePage)
  spending: {
    title: 'Grup Harcama Özeti',
    totalGroupSpending: 'Toplam Grup Harcaması',
    expense: 'harcama',
    expenses: 'harcama',
    spendingByMember: 'Üyelere Göre Harcama',
    noExpenses: 'Henüz harcama yok',
    noExpensesThisMonth: 'Bu ay henüz harcama yok',
    uncategorized: 'Kategorisiz',
    categoryBreakdown: 'Kategori Dağılımı',
    expenseDetails: 'Harcama Detayları',
    timePeriods: {
      currentMonth: 'Bu Ay',
      last2Months: 'Son 2 Ay',
      last3Months: 'Son 3 Ay',
      allTime: 'Tüm Zamanlar',
    },
  },

  // Group Members
  members: {
    title: 'Grup Üyeleri',
    addMember: '+ Üye Ekle',
    cancel: 'İptal',
    selectUser: 'Kullanıcı Seç',
    chooseUser: 'Bir kullanıcı seçin...',
    role: 'Rol',
    roleMember: 'Üye',
    roleAdmin: 'Yönetici',
    add: 'Üye Ekle',
    adding: 'Ekleniyor...',
    noMembers: 'Bu grupta henüz üye yok.',
    noMembersHelp: 'Harcamaları takip etmeye başlamak için üye ekleyin!',
    error: 'Hata',
  },

  // Expense List
  expenses: {
    title: 'Harcamalar',
    date: 'Tarih',
    description: 'Açıklama',
    category: 'Kategori',
    user: 'Kullanıcı',
    amount: 'Tutar',
    actions: 'İşlemler',
    save: '✓ Kaydet',
    cancelEdit: '✕ İptal',
    edit: '✏️',
    delete: '🗑️',
    total: 'Toplam',
    noExpenses: 'Henüz harcama yok. Eklemeye başlayın!',
    deleteConfirm: 'silmek istediğinizden emin misiniz?',
    viewInvoice: 'Faturayı görüntüle',
    categoryPlaceholder: 'Kategori',
    filters: {
      currentMonth: 'Bu Ay',
      lastMonth: 'Geçen Ay',
      all: 'Tümü',
      category: 'Kategori',
      allCategories: 'Tüm Kategoriler',
      person: 'Kişi',
      allPeople: 'Tüm Kişiler',
      startDate: 'Başlangıç Tarihi',
      endDate: 'Bitiş Tarihi',
      showing: 'Gösterilen',
      of: '/',
      expenses: 'harcama',
      clearFilters: 'Filtreleri Temizle',
      noResults: 'Filtrelere uygun harcama bulunamadı. Filtreleri değiştirmeyi deneyin.',
    },
  },

  // Invoice Upload
  invoice: {
    title: 'Fatura Yükle',
    chooseFile: '📁 Dosya Seç',
    useCamera: '📷 Kamera Kullan',
    stopCamera: 'Kamerayı Durdur',
    capturePhoto: '📸 Fotoğraf Çek',
    upload: '✅ Yükle ve İşle',
    uploading: '⏳ İşleniyor...',
    cancel: 'İptal',
    tip: '💡 İpucu: Fişinizin veya faturanızın fotoğrafını yükleyin, AI detayları otomatik olarak çıkaracaktır!',
    success: 'Fatura başarıyla yüklendi ve işlendi!',
    error: 'Fatura yüklenemedi',
    cameraError: 'Kameraya erişilemedi',
  },

  // Chat Interface
  chat: {
    title: 'AI Asistanı ile Sohbet',
    connected: 'Bağlandı',
    disconnected: 'Bağlantı Kesildi',
    placeholder: 'Bir mesaj yazın... (örn: öğle yemeğine 20 TL harcadım)',
    send: 'Gönder',
    thinking: 'Düşünüyor...',
    emptyState: 'AI asistanı ile sohbete başlayın!',
    emptyStateTip: 'Deneyin: "market alışverişine 50 TL harcadım" veya "akşam yemeğine 30 TL ödedim"',
    expenseCreated: '✅ Harcama oluşturuldu',
    error: '❌',
    imageMessage: 'Fatura fotoğrafı gönderildi',
    exampleMessage: '💬 "Market alışverişine 50 TL harcadım"',
    exampleUpload: '📸 Fatura fotoğrafı yükle',
    exampleCamera: '📷 Fiş taramak için kamera kullan',
  },

  // Analytics Page
  analytics: {
    title: 'Harcama Analizi',
    subtitle: 'Detaylı harcama analizi ve raporlama',
    backToHome: '← Ana Sayfaya Dön',
    selectGroup: 'Analiz için grup seçin',
    noGroups: 'Grup bulunamadı',
    
    // Summary Cards
    summary: {
      totalSpending: 'Toplam Harcama',
      averageExpense: 'Ortalama Harcama',
      totalTransactions: 'Toplam İşlem',
      topCategory: 'En Çok Harcanan Kategori',
    },
    
    // Charts
    charts: {
      spendingTrend: 'Harcama Trendi',
      categoryDistribution: 'Kategori Dağılımı',
      memberSpending: 'Üyelere Göre Harcama',
      dailyAverage: 'Günlük Ortalama',
      amount: 'Tutar',
      date: 'Tarih',
      total: 'Toplam',
    },
    
    // Filters
    filters: {
      title: 'Filtreler',
      dateRange: 'Tarih Aralığı',
      startDate: 'Başlangıç Tarihi',
      endDate: 'Bitiş Tarihi',
      category: 'Kategori',
      allCategories: 'Tüm Kategoriler',
      member: 'Üye',
      allMembers: 'Tüm Üyeler',
      minAmount: 'Min Tutar',
      maxAmount: 'Max Tutar',
      search: 'Açıklama Ara',
      searchPlaceholder: 'Harcama açıklaması ara...',
      applyFilters: 'Filtreleri Uygula',
      clearFilters: 'Filtreleri Temizle',
      quickFilters: 'Hızlı Filtreler',
      allTime: 'Tüm Zamanlar',
      today: 'Bugün',
      thisWeek: 'Bu Hafta',
      thisMonth: 'Bu Ay',
      lastMonth: 'Geçen Ay',
      last3Months: 'Son 3 Ay',
      last6Months: 'Son 6 Ay',
      thisYear: 'Bu Yıl',
      customRange: 'Özel Aralık',
    },
    
    // Export
    export: {
      title: 'Dışa Aktar',
      excel: '📊 Excel\'e Aktar',
      exporting: 'Dışa aktarılıyor...',
      success: 'Excel dosyası başarıyla indirildi!',
      error: 'Dışa aktarma başarısız',
      filename: 'harcama-analizi',
    },
    
    // Table
    table: {
      title: 'Detaylı Harcama Listesi',
      date: 'Tarih',
      description: 'Açıklama',
      category: 'Kategori',
      member: 'Üye',
      amount: 'Tutar',
      noResults: 'Filtrelere uygun harcama bulunamadı',
      showing: 'Gösterilen',
      of: '/',
      expenses: 'harcama',
    },
    
    // Insights
    insights: {
      title: 'Öngörüler',
      highestSpendingDay: 'En Yüksek Harcama Günü',
      mostFrequentCategory: 'En Sık Harcama Kategorisi',
      averageDailySpending: 'Günlük Ortalama Harcama',
      spendingIncrease: 'Önceki Döneme Göre Artış',
      spendingDecrease: 'Önceki Döneme Göre Azalma',
      noChange: 'Değişiklik Yok',
    },
    
    // Loading & Errors
    loading: 'Analiz verileri yükleniyor...',
    error: 'Veriler yüklenirken hata oluştu',
    noData: 'Seçili filtrelerde veri bulunamadı',
    noExpenses: 'Bu grupta henüz harcama yok',
  },

  // Audit Logs Page
  auditLogs: {
    title: 'Denetim Kayıtları',
    subtitle: 'Gruplarınızdaki tüm aktiviteleri ve değişiklikleri görüntüleyin',
    subtitleAdmin: 'Sistemdeki tüm aktiviteleri ve değişiklikleri görüntüleyin',
    accessDenied: 'Erişim Reddedildi',
    accessDeniedMessage: 'Denetim kayıtlarını görüntülemek için grup yöneticisi olmanız gerekir.',
    
    // Filters
    filters: {
      group: 'Grup',
      allGroups: 'Tüm Gruplar',
      action: 'İşlem',
      allActions: 'Tüm İşlemler',
      entityType: 'Varlık Türü',
      allTypes: 'Tüm Türler',
    },
    
    // Actions
    actions: {
      CREATE: 'Oluştur',
      UPDATE: 'Güncelle',
      DELETE: 'Sil',
    },
    
    // Entity Types
    entityTypes: {
      User: 'Kullanıcı',
      Group: 'Grup',
      GroupMember: 'Grup Üyesi',
      Expense: 'Harcama',
    },
    
    // Table
    table: {
      timestamp: 'Zaman',
      action: 'İşlem',
      entityType: 'Varlık Türü',
      user: 'Kullanıcı',
      details: 'Detaylar',
      hideDetails: '▼ Detayları Gizle',
      showDetails: '▶ Detayları Göster',
      entityId: 'Varlık ID',
      ipAddress: 'IP Adresi',
      createdValues: 'Oluşturulan Değerler',
      deletedValues: 'Silinen Değerler',
      changes: 'Değişiklikler',
      oldValue: 'Eski',
      newValue: 'Yeni',
      system: 'Sistem',
    },
    
    // States
    loading: 'Denetim kayıtları yükleniyor...',
    error: 'Kayıtlar yüklenemedi',
    noResults: 'Filtrelerinize uygun denetim kaydı bulunamadı.',
  },

  // Common
  common: {
    loading: 'Yükleniyor...',
    error: 'Hata',
    success: 'Başarılı',
    cancel: 'İptal',
    save: 'Kaydet',
    delete: 'Sil',
    edit: 'Düzenle',
    create: 'Oluştur',
    close: 'Kapat',
    back: 'Geri',
  },
};

export type TranslationKeys = typeof tr;
