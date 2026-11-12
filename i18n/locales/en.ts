export default {
  app: {
    title: 'Heute · Family start page'
  },
  login: {
    title: 'Sign in to Heute',
    message: 'The Pocket ID sign-in was ended or the account does not have access to the family start page.',
    action: 'Sign in with Pocket ID'
  },
  logout: {
    title: 'Signed out of Heute',
    message: 'Your Pocket ID session may still be active.',
    action: 'Sign in again'
  },
  greeting: {
    morning: 'Good morning',
    noon: 'Good day',
    afternoon: 'Good afternoon',
    evening: 'Good evening'
  },
  toolbar: {
    search: 'Search',
    searchHint: 'Search (⌘K)',
    edit: 'Edit',
    done: 'Done'
  },
  dashboard: {
    loadError: 'The dashboard could not be loaded',
    quickAccess: 'My quick access',
    overview: 'Daily overview',
    savedReload: 'The change was saved. Reload the start page to see it.',
    saveFailed: 'The change could not be saved.',
    invalidUrl: 'Enter a valid HTTP or HTTPS address.',
    logoutFailed: 'Signing out was not possible.',
    favoriteHint: 'Pin a link from another section as a favorite.',
    emptySection: 'This section is empty.',
    addSection: 'Add section',
    addLink: 'Add link',
    editSection: 'Edit section: {title}',
    widgetsManage: 'Manage widgets',
    widgetsEmpty: 'No widgets yet. Add some via "Manage widgets".',
    widgetPageEmpty: 'This widget page is empty. Add widgets via "Manage widgets".',
    fullscreenEmpty: 'This fullscreen page shows a single widget. Add one via "Manage widgets".'
  },
  colors: {
    blue: 'Blue',
    purple: 'Purple',
    pink: 'Pink',
    green: 'Green',
    orange: 'Orange',
    slate: 'Slate'
  },
  scope: {
    personal: 'Personal',
    family: 'For the family'
  },
  pageType: {
    normal: 'Normal page (links + widgets)',
    widget: 'Widget page (widget grid)',
    fullscreen: 'Fullscreen widget'
  },
  linkMenu: {
    unfavorite: 'Remove from quick access',
    favorite: 'Pin as favorite',
    forward: 'Move forward',
    backward: 'Move back',
    edit: 'Edit',
    moveTo: 'Move to {title}',
    actionsFor: 'Actions for {title}'
  },
  linkDialog: {
    add: 'Add link',
    edit: 'Edit link',
    demo: 'The link stays saved in this tab for this preview.',
    family: 'This link is visible to the whole family.',
    personal: 'This link is only visible to you.'
  },
  sectionDialog: {
    add: 'Add section',
    edit: 'Edit section',
    description: 'Group links in a personal or shared section.',
    delete: 'Delete section'
  },
  pageDialog: {
    add: 'New page',
    edit: 'Edit page',
    addDescription: 'Create a new page for your start page.',
    editDescription: 'Adjust the name and type of this page.',
    newTitle: 'New page'
  },
  imported: {
    none: 'The selected apps are already present.',
    apps: 'One app was imported | {count} apps were imported'
  },
  weather: {
    label: 'Weather',
    clear: 'Clear',
    partlyCloudy: 'Partly cloudy',
    cloudy: 'Cloudy',
    fog: 'Fog',
    snow: 'Snow',
    thunderstorm: 'Thunderstorm',
    rain: 'Rain',
    loading: 'Loading weather …',
    unavailable: 'Weather is currently unavailable.',
    notConfigured: 'No weather location configured yet.',
    creditTitle: 'Weather data by Open-Meteo; temperatures rounded.',
    source: 'Weather',
    rounded: 'Temperatures rounded'
  },
  rss: {
    title: 'News',
    loading: 'Loading news …',
    unavailable: 'News are currently unavailable.',
    empty: 'No posts yet.'
  },
  calendar: {
    family: 'Family calendar',
    label: 'Calendar',
    settings: 'Calendar settings',
    openIcloud: 'Open iCloud calendar',
    unavailable: 'Events are currently unavailable.',
    retry: 'Try again',
    loading: 'Loading events …',
    openIcloudHint: 'Open the calendar in iCloud.',
    noneSelected: 'No calendars selected yet.',
    selectCalendars: 'Select calendars',
    noEvents: 'No events in the selected period.',
    running: 'ongoing',
    partial: 'Some calendars are currently unreachable. ',
    stale: 'The data may be out of date.',
    event: 'Event',
    settingsDescriptionWidget: 'Choose the calendars that appear in the widget.',
    settingsDescriptionCalendar: 'Choose the calendars that appear in the calendar.',
    settingsLoading: 'Loading settings …',
    settingsError: 'Settings could not be loaded.',
    noHomeAssistant: 'No calendars found in Home Assistant.',
    groupByDay: 'Group by day',
    iconFor: 'Icon for {name}',
    saveFailed: 'Saving failed.',
    month: 'Month',
    week: 'Week',
    prev: 'Back',
    next: 'Forward',
    today: 'Today',
    allDayPrefix: 'All day'
  },
  common: {
    today: 'Today',
    tomorrow: 'Tomorrow',
    allDay: 'all day'
  },
  widgets: {
    title: 'Widgets',
    description: 'Add widgets or reorder them for this page.',
    onPage: 'On this page',
    empty: 'No widgets yet. Add one below.',
    moveForward: 'Move widget forward',
    moveBackward: 'Move widget back',
    remove: 'Remove widget: {label}',
    available: 'Available',
    noneAvailable: 'No further widgets available.',
    add: 'Add'
  },
  widget: {
    weather: {
      label: 'Weather',
      description: 'Current weather, highs and lows for your location.'
    },
    calendar: {
      label: 'Family calendar',
      description: 'Events from Home Assistant, grouped by day.'
    },
    calendarFull: {
      label: 'Calendar (fullscreen)',
      description: 'Full-page calendar with month and week view.'
    },
    rss: {
      label: 'News',
      description: 'Current headlines from your RSS feeds.'
    }
  },
  wallpaper: {
    'rose-waves': 'Rose waves',
    'blue-waves': 'Blue waves',
    cool: 'Cool gray',
    warm: 'Warm gray',
    blue: 'Blue sky'
  },
  appearance: {
    appIcons: 'App icons',
    appNames: 'App names',
    widgetColumn: 'Widget column',
    changeFailed: 'The background could not be changed. Check your sign-in and the image size.',
    overlayFailed: 'The overlay strength could not be saved.',
    sizeFailed: 'The size could not be saved.',
    invalidFile: 'Choose an image (JPEG, PNG, WebP) up to 8 MiB or a video (MP4, WebM) up to 64 MiB.',
    videoUnsupported: 'This video cannot be played by the browser. Use MP4 with H.264 or a compatible WebM.',
    uploadFailed: 'Upload failed. Check the file format, the size limit and the reverse proxy upload limit.',
    logout: 'Sign out',
    background: 'Background',
    backgroundMotives: 'Background motives',
    customVideo: 'Own video',
    customImage: 'Own image',
    libraryError: 'Shared backgrounds could not be loaded. Open the settings again.',
    replace: 'Replace image or video',
    add: 'Add image or video',
    removeCustom: 'Remove own background',
    uploadHint: 'Images up to 8 MiB · videos up to 64 MiB. MP4 with H.264 recommended. One personal upload per account.',
    addLibrary: 'Add shared image or video',
    libraryHint: 'Shared media is visible to all accounts. Files can also be placed directly in the {code} folder.',
    librarySavedFailed: 'The shared media could not be saved.',
    libraryRemovedFailed: 'The shared media could not be removed.',
    libraryReplaceConfirm: '"{label}" already exists in the shared library and will be replaced. Continue?',
    libraryRemoveConfirm: 'Remove "{label}" from the shared library?',
    removeLabel: 'Remove {label}',
    overlayStrength: 'Overlay strength',
    sizes: 'Sizes',
    checkingVideo: 'Checking video …',
    saving: 'Saving settings …',
    settings: 'Settings',
    settingsDescription: 'Background and sizes of the start page'
  },
  pocketId: {
    existing: 'Already present',
    invalidUrl: 'Set a valid "Client Launch URL" in Pocket ID.',
    invalidName: 'The app name must be 1 to 60 characters long.',
    loginRequired: 'Sign in with an admin account.',
    notConfigured: 'The Pocket ID import is not configured.',
    loadFailed: 'Pocket ID could not be loaded. Check the connection and the API key.',
    changed: 'The apps in Pocket ID have changed. Reload the selection.',
    sectionMissing: 'The family section is no longer available. Reload the start page.',
    noSpace: 'There is no room in this family section for the selected apps.',
    title: 'Import from Pocket ID',
    description: 'Choose apps for "{title}". The links are visible to the whole family.',
    close: 'Close',
    loading: 'Loading apps from Pocket ID …',
    reload: 'Reload selection',
    none: 'There are no apps in Pocket ID.',
    listLabel: 'Apps in Pocket ID',
    unnamed: 'Unnamed app',
    importCount: 'Import {count}',
    import: 'Import'
  },
  icons: {
    house: 'Home',
    photos: 'Photos',
    cloud: 'Cloud',
    media: 'Media',
    calendar: 'Calendar',
    notes: 'Notes',
    folder: 'Folder',
    link: 'Link',
    title: 'App icon',
    symbols: 'Symbols',
    selfhst: 'selfh.st',
    symbol: 'Symbol',
    choose: 'Choose symbol',
    search: 'Search selfh.st icons',
    searchPlaceholder: 'Search service, e.g. Nextcloud',
    selected: 'Selected: {name}',
    loadFailed: 'The catalog could not be loaded.',
    noResults: 'No matching icons found.',
    loading: 'Catalog is loading …'
  },
  pages: {
    label: 'Pages',
    new: 'New page',
    moveLeft: 'Move left',
    moveLeftLabel: 'Move page left',
    edit: 'Edit page',
    moveRight: 'Move right',
    moveRightLabel: 'Move page right',
    delete: 'Delete page'
  },
  nextcloud: {
    statusFailed: 'The Nextcloud connection status could not be loaded.',
    disconnectNote: 'Disconnected here. Additionally remove the app password in Nextcloud under Settings → Security.',
    disconnectFailed: 'Nextcloud could not be disconnected. Try again.',
    title: 'Nextcloud',
    checking: 'Checking connection …',
    connected: 'Your account is connected.',
    disconnect: 'Disconnect Nextcloud',
    notConnected: 'You can connect your account via the file search.'
  },
  cloud: {
    searchOnly: 'Search only {label}',
    searchGoogle: 'Search with Google',
    serverNotConfigured: 'The Nextcloud connection is not fully configured on the server.',
    searchUnavailable: 'The file search is currently unreachable.',
    connectFailed: 'Nextcloud could not start the connection.',
    confirmFirst: 'First confirm the connection in the Nextcloud tab.',
    finishFailed: 'The connection could not be completed. Start it again.',
    title: 'Search',
    description: 'Search the web or your Nextcloud account.',
    ariaLabel: 'Search',
    placeholder: 'Search …',
    placeholderIn: 'Search in {label} …',
    removeFilter: 'Remove {label} filter',
    searching: 'Searching Nextcloud …',
    checking: 'Checking Nextcloud connection …',
    moreResults: 'More results are possible. Enter part of the file name as well.',
    noFiles: 'No files found in Nextcloud.',
    filterHint: 'Filter Nextcloud by file type, e.g. with .pdf invoice.',
    connectHint: 'Connect Nextcloud to search your files.',
    googleHint: 'Enter a search term to search with Google.',
    confirmTitle: 'Confirm access in Nextcloud',
    connectTitle: 'Connect Nextcloud',
    confirmText: 'Open Nextcloud, grant access and then check the connection here.',
    connectText: 'Grant one-time access to your files. You can sign in to Nextcloud with Pocket ID as usual.',
    connectButton: 'Connect Nextcloud',
    openNextcloud: 'Open Nextcloud',
    checkConnection: 'Check connection'
  },
  field: {
    name: 'Name',
    url: 'URL',
    color: 'Color',
    position: 'Position',
    type: 'Type',
    visibility: 'Visibility'
  },
  action: {
    save: 'Save',
    cancel: 'Cancel',
    remove: 'Remove'
  }
}
