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
    viewRemindersPrompt: 'Grup sayfasına git ve hatırlatıcıları yönet',
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
    viewModes: {
      summary: '📊 Özet',
      monthly: '📅 Aylık Detay',
      settlement: '💰 Hesaplaşma',
    },
    monthly: {
      title: '📅 Aylık Harcama Detayları',
      average: 'Ortalama',
      noData: 'Henüz aylık veri yok',
      percentageOfMonth: "of month's total",
    },
    settlement: {
      title: '💰 Kim Kime Ne Kadar Borçlu?',
      subtitle: 'Grup harcamalarını eşit paylaştırmak için gerekli ödemeler',
      paymentInstruction: '{from} → {to} için {amount} ödemeli',
      balanced: 'Hesaplar Dengede!',
      balancedDesc: 'Herkes eşit miktarda harcama yapmış',
      howItWorks: {
        title: 'Nasıl çalışır?',
        description: 'Tüm grup harcamaları üye sayısına bölünür. Ortalamanın üzerinde harcayan kişiler, az harcayanlardan para almalıdır. Bu liste, en az işlem sayısı ile herkesin eşit paylaşımını sağlar.',
      },
    },
  },

  // Group Members
  members: {
    title: 'Grup Üyeleri',
    addMember: '+ Üye Ekle',
    invite: '🔗 Davet Linki',
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
    errorRemovingMember: 'Üye kaldırılırken hata',
    errorUpdatingRole: 'Rol güncellenirken hata',
    remove: 'Kaldır',
    confirmRemove: '{name} kullanıcısını bu gruptan kaldırmak istediğinizden emin misiniz?',
  },

  // Group Invites
  invites: {
    title: 'Grup Davetleri',
    createNew: 'Yeni Davet Oluştur',
    expiresIn: 'Son Kullanma Süresi (Gün)',
    expiresInPlaceholder: '0 = Süresiz',
    expiresInHelp: '0 girerseniz davet süresi dolmaz',
    maxUses: 'Maksimum Kullanım Sayısı',
    maxUsesPlaceholder: 'Boş bırakın = Sınırsız',
    maxUsesHelp: 'Boş bırakırsanız sınırsız kullanılabilir',
    createButton: 'Davet Linki Oluştur',
    creating: 'Oluşturuluyor...',
    activeInvites: 'Aktif Davetler',
    activeCount: 'Aktif Davetler ({count})',
    noInvites: 'Henüz aktif davet bulunmuyor. Yukarıdan yeni bir davet oluşturabilirsiniz.',
    copyLink: '📋 Linki Kopyala',
    copied: '✓ Kopyalandı',
    shareWhatsApp: 'WhatsApp\'ta Paylaş',
    revoke: '🗑️',
    invitedBy: 'Oluşturan',
    createdAt: 'Oluşturulma',
    expiresAt: 'Son Kullanma',
    usage: 'Kullanım',
    unlimited: 'Sınırsız',
    expiringSoon: 'Yakında Sona Erecek',
    nearLimit: 'Limite Yakın',
    whatsappMessage: 'Merhaba! Seni "{groupName}" grubuna davet ediyorum. Bu bağlantıya tıklayarak katılabilirsin:\n{url}',
  },

  // Invite Accept Page
  inviteAccept: {
    loading: 'Davet yükleniyor...',
    invalidTitle: 'Davet Geçersiz',
    invalidMessage: 'Bu davet bulunamadı veya artık geçerli değil',
    backHome: 'Ana Sayfaya Dön',
    invitationTitle: 'Grup Davetiyesi',
    invitedBy: '{name} sizi davet ediyor',
    members: 'üye',
    expiresOn: 'Geçerlilik',
    usesRemaining: 'Kalan Kullanım',
    acceptButton: '✓ Gruba Katıl',
    accepting: 'Katılınıyor...',
    cancelButton: 'İptal',
    alreadyMember: 'Bu grubun zaten bir üyesisiniz.',
    successMessage: 'Gruba başarıyla katıldınız! 🎉',
    infoText: 'Bu gruba katılarak grup üyeleriyle harcama takibinde bulunabilirsiniz.',
    loginRequired: 'Gruba katılmak için giriş yapmanız gerekiyor',
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
      headers: {
        date: 'Tarih',
        description: 'Açıklama',
        category: 'Kategori',
        member: 'Üye',
        amount: 'Tutar',
        total: 'TOPLAM',
        from: 'Gönderen',
        to: 'Alan',
        status: 'Durum',
        createdAt: 'Oluşturulma',
        completedAt: 'Tamamlanma',
        title: 'Başlık',
        frequency: 'Sıklık',
        nextDue: 'Sonraki Vade',
        isActive: 'Aktif',
      },
      summarySheet: {
        name: 'Özet',
        expenseSheet: 'Harcamalar',
        paymentSheet: 'Ödemeler',
        reminderSheet: 'Hatırlatıcılar',
        metric: 'Metrik',
        value: 'Değer',
        totalSpending: 'Toplam Harcama',
        averageSpending: 'Ortalama Harcama',
        totalTransactions: 'Toplam İşlem',
        topCategory: 'En Çok Harcanan Kategori',
        totalPayments: 'Toplam Ödeme Tutarı',
        paymentCount: 'Toplam Ödeme Sayısı',
        completedPayments: 'Tamamlanan Ödemeler',
        pendingPayments: 'Bekleyen Ödemeler',
        activeReminders: 'Aktif Hatırlatıcılar',
        totalProjected: 'Tahmini Gelecek Harcamalar (30 gün)',
      },
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
    
    // Monthly Analysis
    monthlyAnalysis: {
      title: 'Aylık Harcama Analizi',
      expenseCount: 'harcama',
      average: 'Ortalama',
      byMembers: 'Üyelere Göre',
      byCategories: 'Kategorilere Göre',
      ofMonth: 'of month',
    },
    
    // Debt Settlement
    debtSettlement: {
      title: 'Hesaplaşma Önerileri',
      fairSharePerPerson: 'Adil paylaşım için kişi başı:',
      totalSpent: 'Toplam harcama:',
      creditor: 'alacaklı',
      debtor: 'borçlu',
      balanced: 'Dengede',
      recommendedPayments: 'Önerilen Ödemeler',
      shouldPay: '{from}, {to} kişisine {amount} ödeme yapmalı',
      helpText: 'Bu öneriler, grup harcamalarının üyeler arasında eşit paylaşılması için gereken minimum işlem sayısını gösterir.',
    },
    
    // Day of Week
    dayOfWeek: {
      title: 'Haftanın Günlerine Göre',
      totalSpending: 'Toplam Harcama',
      expenseCount: 'Harcama Sayısı',
      days: {
        sunday: 'Pazar',
        monday: 'Pazartesi',
        tuesday: 'Salı',
        wednesday: 'Çarşamba',
        thursday: 'Perşembe',
        friday: 'Cuma',
        saturday: 'Cumartesi',
      },
    },
    
    // Top Expenses
    topExpenses: {
      title: 'En Yüksek 10 Harcama',
    },
    
    // Category Averages
    categoryAverages: {
      title: 'Kategori Bazlı Ortalamalar',
      total: 'Toplam:',
      count: 'Harcama sayısı:',
      average: 'Ortalama:',
      percentageOfTotal: 'Toplam içinde:',
    },
    
    // Misc
    groupsAvailable: '{count} grup mevcut',
    noExpensesInGroup: 'Seçili grupta henüz harcama bulunmuyor. Ana sayfadan harcama ekleyebilirsiniz.',
    noMatchingExpenses: 'harcama var ama seçili filtrelere uymuyor.',
    
    // Loading & Errors
    loading: 'Analiz verileri yükleniyor...',
    error: 'Veriler yüklenirken hata oluştu',
    noData: 'Seçili filtrelerde veri bulunamadı',
    noExpenses: 'Bu grupta henüz harcama yok',
    
    // Payment Analytics
    paymentAnalytics: {
      title: 'Ödeme Analizi',
      totalPayments: 'Toplam Ödeme Tutarı',
      paymentCount: 'Toplam Ödeme Sayısı',
      completedPayments: 'Tamamlanan Ödemeler',
      pendingPayments: 'Bekleyen Ödemeler',
      statusDistribution: 'Ödeme Durumu Dağılımı',
      paymentTimeline: 'Ödeme Zaman Çizelgesi',
      paymentVsExpense: 'Ödeme vs Harcama Karşılaştırması',
      topPayers: 'En Çok Ödeme Yapanlar',
      topReceivers: 'En Çok Ödeme Alanlar',
      averagePayment: 'Ortalama Ödeme',
      noPayments: 'Henüz ödeme kaydı yok',
      paymentsByMember: 'Üyelere Göre Ödemeler',
      paymentStatus: {
        PENDING: 'Beklemede',
        COMPLETED: 'Tamamlandı',
        CANCELLED: 'İptal Edildi',
      },
    },
    
    // Reminder Analytics
    reminderAnalytics: {
      title: 'Hatırlatıcı ve Gelecek Harcamalar',
      upcomingExpenses: 'Yaklaşan Harcamalar',
      totalProjected: 'Toplam Tahmini Tutar',
      activeReminders: 'Aktif Hatırlatıcılar',
      overdueReminders: 'Gecikmiş Hatırlatıcılar',
      remindersByFrequency: 'Sıklığa Göre Hatırlatıcılar',
      next30Days: 'Önümüzdeki 30 Gün',
      next60Days: 'Önümüzdeki 60 Gün',
      next90Days: 'Önümüzdeki 90 Gün',
      projectedSpending: 'Tahmini Harcamalar',
      noReminders: 'Henüz hatırlatıcı yok',
      nextDueDate: 'Sonraki Vade',
      frequency: 'Sıklık',
      status: 'Durum',
      active: 'Aktif',
      inactive: 'Pasif',
      daysUntilDue: 'Kalan Gün',
      overdue: 'Gecikmiş',
    },
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

  // Payments (Debt Settlement)
  payments: {
    title: 'Borç Ödemeleri',
    createPayment: 'Ödeme Oluştur',
    editPayment: 'Ödeme Düzenle',
    markAsCompleted: 'Tamamlandı Olarak İşaretle',
    cancel: 'İptal Et',
    from: 'Gönderen',
    to: 'Alan',
    amount: 'Tutar',
    description: 'Açıklama',
    createdAt: 'Oluşturulma',
    completedAt: 'Tamamlanma',
    noPayments: 'Henüz ödeme kaydı yok',
    confirmComplete: 'Bu ödemeyi tamamlandı olarak işaretlemek istediğinizden emin misiniz?',
    confirmCancel: 'Bu ödemeyi iptal etmek istediğinizden emin misiniz?',
    confirmEdit: 'Bu ödemeyi düzenlemek istediğinizden emin misiniz?',
    createSuccess: 'Ödeme başarıyla oluşturuldu',
    updateSuccess: 'Ödeme durumu güncellendi',
    editSuccess: 'Ödeme başarıyla güncellendi',
    deleteSuccess: 'Ödeme silindi',
    createError: 'Ödeme oluşturulamadı',
    updateError: 'Ödeme güncellenemedi',
    deleteError: 'Ödeme silinemedi',
    validation: {
      fillRequired: 'Lütfen tüm gerekli alanları doldurun',
      amountPositive: 'Tutar 0\'dan büyük olmalıdır',
      differentUsers: 'Gönderen ve alan kişiler farklı olmalıdır',
    },
    placeholders: {
      selectUser: 'Kullanıcı seçin...',
      amount: '0.00',
      description: 'İsteğe bağlı açıklama...',
    },
    manualPayment: 'Manuel ödeme',
    status: {
      PENDING: 'Beklemede',
      COMPLETED: 'Tamamlandı',
      CANCELLED: 'İptal Edildi',
    },
    settlements: {
      title: 'Hesaplaşma Önerileri',
      subtitle: 'Grup harcamalarını dengelemek için önerilen ödemeler',
      createFromSuggestion: 'Bu ödemeyi kaydet',
      paymentInstruction: '{from} → {to} kişisine {amount} ödemeli',
    },
    history: {
      title: 'Ödeme Geçmişi',
      noHistory: 'Henüz ödeme geçmişi yok',
    },
    filters: {
      title: 'Filtreler',
      status: 'Durum',
      allStatuses: 'Tüm Durumlar',
      fromUser: 'Gönderen',
      toUser: 'Alan',
      allUsers: 'Tüm Kullanıcılar',
      payments: 'ödeme',
    },
  },

  // Recurring Reminders
  reminders: {
    title: 'Düzenli Hatırlatıcılar',
    createReminder: 'Hatırlatıcı Oluştur',
    editReminder: 'Hatırlatıcı Düzenle',
    active: 'Aktif',
    inactive: 'Pasif',
    toggleActive: 'Aktifliği Değiştir',
    upcomingReminders: 'Yaklaşan Hatırlatıcılar',
    dueIn: 'Kalan süre',
    overdue: 'Gecikmiş',
    dueToday: 'Bugün',
    dueTomorrow: 'Yarın',
    noReminders: 'Henüz hatırlatıcı yok',
    noActiveReminders: 'Aktif hatırlatıcı bulunamadı',
    createSuccess: 'Hatırlatıcı başarıyla oluşturuldu',
    updateSuccess: 'Hatırlatıcı güncellendi',
    deleteSuccess: 'Hatırlatıcı silindi',
    createError: 'Hatırlatıcı oluşturulamadı',
    updateError: 'Hatırlatıcı güncellenemedi',
    deleteError: 'Hatırlatıcı silinemedi',
    confirmDelete: 'Bu hatırlatıcıyı silmek istediğinizden emin misiniz?',
    frequency: {
      WEEKLY: 'Haftalık',
      MONTHLY: 'Aylık',
      YEARLY: 'Yıllık',
      EVERY_6_MONTHS: '6 Ayda Bir',
    },
    fields: {
      title: 'Başlık',
      description: 'Açıklama',
      amount: 'Tutar',
      frequency: 'Sıklık',
      startDate: 'Başlangıç Tarihi',
      nextDue: 'Sonraki Vade',
      titlePlaceholder: 'Örn: Kira ödemesi',
      descriptionPlaceholder: 'Ek notlar (isteğe bağlı)',
      amountPlaceholder: '0.00',
    },
    daysRemaining: {
      today: 'Bugün',
      tomorrow: 'Yarın',
      days: '{count} gün içinde',
      overdue: '{count} gün gecikmiş',
    },
    notifications: {
      title: 'Hatırlatıcı Bildirimleri',
      noNotifications: 'Bildirim yok',
      viewAll: 'Tümünü Gör',
    },
  },

  // Calendar
  calendar: {
    title: 'Takvim',
    today: 'Bugün',
    expense: 'Harcama',
    payment: 'Ödeme',
    reminder: 'Hatırlatıcı',
    by: 'Tarafından',
    more: 'daha fazla',
    totalForDay: 'Gün Toplamı',
    totalExpenses: 'Toplam Harcamalar',
    totalPayments: 'Toplam Ödemeler',
    upcomingReminders: 'Yaklaşan Hatırlatıcılar',
    items: 'işlem',
    days: {
      sun: 'Paz',
      mon: 'Pzt',
      tue: 'Sal',
      wed: 'Çar',
      thu: 'Per',
      fri: 'Cum',
      sat: 'Cmt',
    },
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
