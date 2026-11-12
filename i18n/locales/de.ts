export default {
  app: {
    title: 'Heute · Familienstartseite'
  },
  login: {
    title: 'Anmeldung bei Heute',
    message: 'Die Pocket-ID-Anmeldung wurde beendet oder das Konto hat keinen Zugriff auf die Familienstartseite.',
    action: 'Mit Pocket ID anmelden'
  },
  logout: {
    title: 'Von Heute abgemeldet',
    message: 'Deine Anmeldung bei Pocket ID kann weiterhin aktiv sein.',
    action: 'Wieder anmelden'
  },
  greeting: {
    morning: 'Guten Morgen',
    noon: 'Guten Mittag',
    afternoon: 'Guten Tag',
    evening: 'Guten Abend'
  },
  toolbar: {
    search: 'Suchen',
    searchHint: 'Suchen (⌘K)',
    edit: 'Bearbeiten',
    done: 'Fertig'
  },
  dashboard: {
    loadError: 'Dashboard konnte nicht geladen werden',
    quickAccess: 'Meine Schnellzugriffe',
    overview: 'Tagesübersicht',
    savedReload: 'Die Änderung wurde gespeichert. Lade die Startseite neu, um sie anzuzeigen.',
    saveFailed: 'Die Änderung konnte nicht gespeichert werden.',
    invalidUrl: 'Gib eine gültige HTTP- oder HTTPS-Adresse ein.',
    logoutFailed: 'Abmelden war nicht möglich.',
    favoriteHint: 'Hefte einen Link aus einer anderen Sektion als Favorit an.',
    emptySection: 'Diese Sektion ist leer.',
    addSection: 'Sektion hinzufügen',
    addLink: 'Link hinzufügen',
    editSection: 'Sektion bearbeiten: {title}',
    widgetsManage: 'Widgets verwalten',
    widgetsEmpty: 'Noch keine Widgets. Füge über „Widgets verwalten“ welche hinzu.',
    widgetPageEmpty: 'Diese Widget-Seite ist leer. Füge über „Widgets verwalten“ Widgets hinzu.',
    fullscreenEmpty: 'Diese Vollbild-Seite zeigt ein einzelnes Widget. Füge über „Widgets verwalten“ eines hinzu.'
  },
  colors: {
    blue: 'Blau',
    purple: 'Violett',
    pink: 'Rosa',
    green: 'Grün',
    orange: 'Orange',
    slate: 'Schiefer'
  },
  scope: {
    personal: 'Persönlich',
    family: 'Für die Familie'
  },
  pageType: {
    normal: 'Normale Seite (Links + Widgets)',
    widget: 'Widget-Seite (Widget-Raster)',
    fullscreen: 'Vollbild-Widget'
  },
  linkMenu: {
    unfavorite: 'Aus Schnellzugriffen entfernen',
    favorite: 'Als Favorit anheften',
    forward: 'Nach vorne',
    backward: 'Nach hinten',
    edit: 'Bearbeiten',
    moveTo: 'Verschieben nach {title}',
    actionsFor: 'Aktionen für {title}'
  },
  linkDialog: {
    add: 'Link hinzufügen',
    edit: 'Link bearbeiten',
    demo: 'Der Link bleibt für diese Vorschau im aktuellen Tab gespeichert.',
    family: 'Dieser Link ist für die ganze Familie sichtbar.',
    personal: 'Dieser Link ist nur für dich sichtbar.'
  },
  sectionDialog: {
    add: 'Sektion hinzufügen',
    edit: 'Sektion bearbeiten',
    description: 'Gruppiere Links in einer persönlichen oder gemeinsamen Sektion.',
    delete: 'Sektion löschen'
  },
  pageDialog: {
    add: 'Neue Seite',
    edit: 'Seite bearbeiten',
    addDescription: 'Lege eine neue Seite für deine Startseite an.',
    editDescription: 'Passe Name und Typ dieser Seite an.',
    newTitle: 'Neue Seite'
  },
  imported: {
    none: 'Die ausgewählten Apps sind bereits vorhanden.',
    apps: 'Eine App wurde übernommen | {count} Apps wurden übernommen'
  },
  weather: {
    label: 'Wetter',
    clear: 'Klar',
    partlyCloudy: 'Teilweise bewölkt',
    cloudy: 'Bewölkt',
    fog: 'Nebel',
    snow: 'Schnee',
    thunderstorm: 'Gewitter',
    rain: 'Regen',
    loading: 'Wetter lädt …',
    unavailable: 'Wetter gerade nicht verfügbar.',
    notConfigured: 'Noch kein Wetterort eingerichtet.',
    creditTitle: 'Wetterdaten von Open-Meteo; Temperaturen gerundet.',
    source: 'Wetter',
    rounded: 'Temperaturen gerundet'
  },
  rss: {
    title: 'Nachrichten',
    loading: 'Nachrichten laden …',
    unavailable: 'Nachrichten gerade nicht verfügbar.',
    empty: 'Noch keine Beiträge vorhanden.'
  },
  calendar: {
    family: 'Familienkalender',
    label: 'Kalender',
    settings: 'Kalender-Einstellungen',
    openIcloud: 'iCloud-Kalender öffnen',
    unavailable: 'Termine gerade nicht verfügbar.',
    retry: 'Erneut versuchen',
    loading: 'Termine laden …',
    openIcloudHint: 'Kalender in iCloud öffnen.',
    noneSelected: 'Noch keine Kalender ausgewählt.',
    selectCalendars: 'Kalender auswählen',
    noEvents: 'Keine Termine im gewählten Zeitraum.',
    running: 'läuft',
    partial: 'Einige Kalender sind gerade nicht erreichbar. ',
    stale: 'Der Stand kann veraltet sein.',
    event: 'Termin',
    settingsDescriptionWidget: 'Wähle die Kalender, die im Widget erscheinen.',
    settingsDescriptionCalendar: 'Wähle die Kalender, die im Kalender erscheinen.',
    settingsLoading: 'Einstellungen laden …',
    settingsError: 'Einstellungen konnten nicht geladen werden.',
    noHomeAssistant: 'Keine Kalender in Home Assistant gefunden.',
    groupByDay: 'Nach Tagen gruppieren',
    iconFor: 'Symbol für {name}',
    saveFailed: 'Speichern fehlgeschlagen.',
    month: 'Monat',
    week: 'Woche',
    prev: 'Zurück',
    next: 'Weiter',
    today: 'Heute',
    allDayPrefix: 'Ganztägig'
  },
  common: {
    today: 'Heute',
    tomorrow: 'Morgen',
    allDay: 'ganztägig'
  },
  widgets: {
    title: 'Widgets',
    description: 'Füge Widgets hinzu oder sortiere sie für diese Seite.',
    onPage: 'Auf dieser Seite',
    empty: 'Noch keine Widgets. Füge unten eines hinzu.',
    moveForward: 'Widget nach vorne',
    moveBackward: 'Widget nach hinten',
    remove: 'Widget entfernen: {label}',
    available: 'Verfügbar',
    noneAvailable: 'Keine weiteren Widgets verfügbar.',
    add: 'Hinzufügen'
  },
  widget: {
    weather: {
      label: 'Wetter',
      description: 'Aktuelles Wetter, Höchst- und Tiefstwerte für deinen Ort.'
    },
    calendar: {
      label: 'Familienkalender',
      description: 'Termine aus Home Assistant, gruppiert nach Tagen.'
    },
    calendarFull: {
      label: 'Kalender (Vollbild)',
      description: 'Ganzseitiger Kalender mit Monats- und Wochenansicht.'
    },
    rss: {
      label: 'Nachrichten',
      description: 'Aktuelle Schlagzeilen aus euren RSS-Feeds.'
    }
  },
  wallpaper: {
    'rose-waves': 'Roséwellen',
    'blue-waves': 'Blaue Wellen',
    cool: 'Kühles Grau',
    warm: 'Warmes Grau',
    blue: 'Blauer Himmel'
  },
  appearance: {
    appIcons: 'App-Icons',
    appNames: 'App-Namen',
    widgetColumn: 'Widget-Spalte',
    changeFailed: 'Der Hintergrund konnte nicht geändert werden. Prüfe deine Anmeldung und die Bildgröße.',
    overlayFailed: 'Die Stärke der Überlagerung konnte nicht gespeichert werden.',
    sizeFailed: 'Die Größe konnte nicht gespeichert werden.',
    invalidFile: 'Wähle ein Bild (JPEG, PNG, WebP) bis 8 MiB oder ein Video (MP4, WebM) bis 64 MiB.',
    videoUnsupported: 'Dieses Video kann der Browser nicht abspielen. Verwende MP4 mit H.264 oder kompatibles WebM.',
    uploadFailed: 'Upload fehlgeschlagen. Prüfe Dateiformat, Größenlimit und Upload-Limit des Reverse-Proxys.',
    logout: 'Abmelden',
    background: 'Hintergrund',
    backgroundMotives: 'Hintergrundmotive',
    customVideo: 'Eigenes Video',
    customImage: 'Eigenes Bild',
    libraryError: 'Gemeinsame Hintergründe konnten nicht geladen werden. Öffne die Einstellungen erneut.',
    replace: 'Bild oder Video ersetzen',
    add: 'Bild oder Video hinzufügen',
    removeCustom: 'Eigenen Hintergrund entfernen',
    uploadHint: 'Bilder bis 8 MiB · Videos bis 64 MiB. MP4 mit H.264 empfohlen. Ein persönlicher Upload pro Konto.',
    addLibrary: 'Gemeinsames Bild oder Video hinzufügen',
    libraryHint: 'Gemeinsame Medien sind für alle Konten sichtbar. Dateien lassen sich auch direkt in den Ordner {code} legen.',
    librarySavedFailed: 'Das gemeinsame Medium konnte nicht gespeichert werden.',
    libraryRemovedFailed: 'Das gemeinsame Medium konnte nicht entfernt werden.',
    libraryReplaceConfirm: '„{label}“ ist bereits in der gemeinsamen Bibliothek und wird ersetzt. Fortfahren?',
    libraryRemoveConfirm: '„{label}“ aus der gemeinsamen Bibliothek entfernen?',
    removeLabel: '{label} entfernen',
    overlayStrength: 'Stärke der Überlagerung',
    sizes: 'Größen',
    checkingVideo: 'Video wird geprüft …',
    saving: 'Einstellungen werden gespeichert …',
    settings: 'Einstellungen',
    settingsDescription: 'Hintergrund und Größen der Startseite'
  },
  pocketId: {
    existing: 'Bereits vorhanden',
    invalidUrl: 'Gültige „Client Launch URL“ in Pocket ID hinterlegen.',
    invalidName: 'Der App-Name muss 1 bis 60 Zeichen lang sein.',
    loginRequired: 'Melde dich mit einem Admin-Konto an.',
    notConfigured: 'Der Pocket-ID-Import ist nicht eingerichtet.',
    loadFailed: 'Pocket ID konnte nicht geladen werden. Prüfe die Verbindung und den API-Schlüssel.',
    changed: 'Die Apps in Pocket ID haben sich geändert. Lade die Auswahl neu.',
    sectionMissing: 'Die Familiensektion ist nicht mehr verfügbar. Lade die Startseite neu.',
    noSpace: 'In dieser Familiensektion ist kein Platz für die ausgewählten Apps.',
    title: 'Aus Pocket ID übernehmen',
    description: 'Wähle Apps für „{title}“. Die Links sind für die ganze Familie sichtbar.',
    close: 'Schließen',
    loading: 'Apps aus Pocket ID werden geladen …',
    reload: 'Auswahl neu laden',
    none: 'In Pocket ID sind keine Apps angelegt.',
    listLabel: 'Apps in Pocket ID',
    unnamed: 'App ohne Namen',
    importCount: '{count} übernehmen',
    import: 'Übernehmen'
  },
  icons: {
    house: 'Haus',
    photos: 'Fotos',
    cloud: 'Cloud',
    media: 'Medien',
    calendar: 'Kalender',
    notes: 'Notizen',
    folder: 'Ordner',
    link: 'Link',
    title: 'App-Icon',
    symbols: 'Symbole',
    selfhst: 'selfh.st',
    symbol: 'Symbol',
    choose: 'Symbol auswählen',
    search: 'selfh.st-Icons suchen',
    searchPlaceholder: 'Dienst suchen, z. B. Nextcloud',
    selected: 'Ausgewählt: {name}',
    loadFailed: 'Der Katalog konnte nicht geladen werden.',
    noResults: 'Keine passenden Icons gefunden.',
    loading: 'Katalog lädt …'
  },
  pages: {
    label: 'Seiten',
    new: 'Neue Seite',
    moveLeft: 'Nach links',
    moveLeftLabel: 'Seite verschieben nach links',
    edit: 'Seite bearbeiten',
    moveRight: 'Nach rechts',
    moveRightLabel: 'Seite verschieben nach rechts',
    delete: 'Seite löschen'
  },
  nextcloud: {
    statusFailed: 'Der Nextcloud-Verbindungsstatus konnte nicht geladen werden.',
    disconnectNote: 'Hier getrennt. Entferne das App-Passwort zusätzlich in Nextcloud unter Einstellungen → Sicherheit.',
    disconnectFailed: 'Nextcloud konnte nicht getrennt werden. Versuche es erneut.',
    title: 'Nextcloud',
    checking: 'Verbindung wird geprüft …',
    connected: 'Dein Konto ist verbunden.',
    disconnect: 'Nextcloud trennen',
    notConnected: 'Du kannst dein Konto über die Dateisuche verbinden.'
  },
  cloud: {
    searchOnly: 'Nur {label} durchsuchen',
    searchGoogle: 'Mit Google suchen',
    serverNotConfigured: 'Die Nextcloud-Verbindung ist auf dem Server nicht vollständig konfiguriert.',
    searchUnavailable: 'Die Dateisuche ist gerade nicht erreichbar.',
    connectFailed: 'Nextcloud konnte die Verbindung nicht starten.',
    confirmFirst: 'Bestätige zuerst die Verbindung im Nextcloud-Tab.',
    finishFailed: 'Die Verbindung konnte nicht abgeschlossen werden. Starte sie erneut.',
    title: 'Suchen',
    description: 'Suche im Web oder in deinem Nextcloud-Konto.',
    ariaLabel: 'Suchen',
    placeholder: 'Suchen …',
    placeholderIn: 'In {label} suchen …',
    removeFilter: '{label}-Filter entfernen',
    searching: 'Nextcloud wird durchsucht …',
    checking: 'Nextcloud-Verbindung wird geprüft …',
    moreResults: 'Weitere Treffer sind möglich. Gib zusätzlich einen Teil des Dateinamens ein.',
    noFiles: 'Keine Dateien in Nextcloud gefunden.',
    filterHint: 'Nextcloud nach Dateityp filtern, etwa mit .pdf Rechnung.',
    connectHint: 'Verbinde Nextcloud, um deine Dateien zu durchsuchen.',
    googleHint: 'Suchbegriff eingeben, um mit Google zu suchen.',
    confirmTitle: 'Zugriff in Nextcloud bestätigen',
    connectTitle: 'Nextcloud verbinden',
    confirmText: 'Öffne Nextcloud, erteile die Freigabe und prüfe danach hier die Verbindung.',
    connectText: 'Erteile einmalig Zugriff auf deine Dateien. Du kannst dich bei Nextcloud wie gewohnt mit Pocket ID anmelden.',
    connectButton: 'Nextcloud verbinden',
    openNextcloud: 'Nextcloud öffnen',
    checkConnection: 'Verbindung prüfen'
  },
  field: {
    name: 'Name',
    url: 'URL',
    color: 'Farbe',
    position: 'Position',
    type: 'Typ',
    visibility: 'Sichtbarkeit'
  },
  action: {
    save: 'Speichern',
    cancel: 'Abbrechen',
    remove: 'Entfernen'
  }
}
