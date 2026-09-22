// src/i18n.ts — Centralized translation system for MALAI VIZHI
// 11 Indian languages + English, ~100 keys covering all major UI text.
// Usage: import { useTranslation } from 'react-i18next'; const { t } = useTranslation();
// Keys: t('nav.dashboard'), t('dashboard.title'), t('alerts.active'), etc.

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const en = {
  // --- Navigation ---
  nav: {
    dashboard: 'Dashboard',
    alerts: 'Alerts',
    reports: 'Reports',
    floodRisk: 'Flood Risk',
    analytics: 'Analytics',
    howItWorks: 'How It Works',
    adminPortal: 'Admin Portal',
  },

  // --- Common ---
  common: {
    loading: 'Loading…',
    error: 'Error',
    retry: 'Retry',
    refresh: 'Refresh',
    submit: 'Submit',
    cancel: 'Cancel',
    close: 'Close',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    back: 'Back',
    next: 'Next',
    search: 'Search',
    noData: 'No data available',
    unavailable: 'UNAVAILABLE',
    limited: 'LIMITED',
    live: 'LIVE',
    demo: 'DEMO',
    synthetic: 'SYNTHETIC',
    source: 'Source',
    updatedAt: 'Updated at',
  },

  // --- Status ---
  status: {
    systemOperational: 'SYSTEM OPERATIONAL',
    backendOffline: 'BACKEND OFFLINE',
    synced: 'Synced',
    offline: 'Offline / Queued',
    online: 'Online',
    high: 'HIGH',
    critical: 'CRITICAL',
    moderate: 'MODERATE',
    low: 'LOW',
  },

  // --- Auth ---
  auth: {
    login: 'Login',
    logout: 'Logout',
    username: 'User ID',
    password: 'Password',
    loginButton: 'Sign In',
    adminPortal: 'Admin Portal',
    forgotPassword: 'Forgot Password?',
  },

  // --- Dashboard ---
  dashboard: {
    title: 'Live Risk Dashboard',
    subtitle: 'Real-time landslide risk monitoring across Northeast India',
    selectLocation: 'Select a location to view detailed risk analysis',
    riskScore: 'Risk Score',
    riskLevel: 'Risk Level',
    rainfall: 'Rainfall',
    soilMoisture: 'Soil Moisture',
    slope: 'Slope',
    loading: 'Loading risk data…',
    noData: 'No risk data available',
    highRisk: 'High Risk Locations',
    simulation: 'Simulate Rain Event',
    lastUpdated: 'Last updated',
    stationsOnline: 'Stations Online',
    activeAlerts: 'Active Alerts',
    modelAccuracy: 'Model Accuracy',
  },

  // --- Alerts ---
  alerts: {
    title: 'Early Warning Alerts',
    subtitle: 'Monitor and manage landslide risk alerts across the Northeast India sensor network.',
    active: 'Active Alerts',
    acknowledged: 'Acknowledged',
    resolved: 'Resolved',
    enableAlerts: 'Enable Device Alerts',
    alertsActive: 'Alerts Active',
    testFeedback: 'Test Feedback',
    acknowledge: 'Acknowledge',
    resolve: 'Resolve',
    noAlerts: 'No active alerts at this time.',
    severity: 'Severity',
    location: 'Location',
    triggeredAt: 'Triggered',
  },

  // --- Analytics ---
  analytics: {
    title: 'Climate & Risk Analytics',
    subtitle: 'Regional intelligence and system performance metrics from the MALAI VIZHI monitoring network.',
    stationsMonitored: 'Stations Monitored',
    alertsIssued: 'Alerts Issued',
    modelAccuracy: 'Model Accuracy',
    avgLeadTime: 'Avg Lead Time',
    regionalComparison: 'Regional Comparison',
    regionalSubtitle: 'Average rainfall and soil moisture by state',
    riskDistribution: 'Risk Distribution',
    riskDistSubtitle: 'Current station risk levels',
    rainfallByRegion: 'Rainfall by Region',
    rainfallSubtitle: 'Sorted by highest average daily precipitation',
    highRiskStations: 'High Risk Stations',
    highRiskSubtitle: 'Locations exceeding critical thresholds',
    noHighRisk: 'No high-risk stations currently detected.',
    currentConditions: 'Current Conditions',
    weatherForecast: '7-Day Rainfall Forecast',
    dataSources: 'Data Sources',
    weatherMap: 'Regional Weather Map',
    layerRainfall: 'Rainfall',
    layerTemp: 'Temp',
    layerHumidity: 'Humidity',
    layerWind: 'Wind',
    layerAqi: 'AQI',
    aqiUnavailable: 'AQI — NOT CONFIGURED',
    aqiDesc: 'Air quality index provider not connected.',
    noDataPoints: 'No data points available',
  },

  // --- Weather ---
  weather: {
    temperature: 'Temperature',
    humidity: 'Humidity',
    wind: 'Wind',
    rainfall24h: '24h Rainfall',
    condition: 'Condition',
    source: 'Source',
    unavailable: 'Weather data unavailable',
    provider: 'Open-Meteo ERA5 Reanalysis',
    loading: 'Loading weather data…',
  },

  // --- Citizen Reports ---
  reports: {
    title: 'Report a Landslide Risk',
    subtitle: 'Your observation can help identify emerging hazards.',
    communityReports: 'Community Reports',
    communitySubtitle: 'Recent field observations from the monitoring network.',
    submit: 'Submit Report',
    submitting: 'Submitting…',
    success: 'Report Submitted',
    successMsg: 'Your hazard report has been received for verification.',
    error: 'Submission Failed',
    noReports: 'No reports yet. Be the first to report a hazard.',
    status: {
      submitted: 'Submitted',
      verified: 'Verified',
      resolved: 'Resolved',
    },
  },

  // --- Sensors ---
  sensors: {
    title: 'Sensor Network',
    live: 'Live Telemetry',
    demo: 'Demo Sensor',
    rainfall: 'Rainfall Sensor',
    soilMoisture: 'Soil Moisture',
    inclination: 'Inclination',
  },

  // --- Historical ---
  historical: {
    title: 'Historical Landslide Events',
    subtitle: 'Past events provide context for current risk assessment.',
    demoLabel: 'DEMO / SYNTHETIC — Not official records',
  },

  // --- Emergency Priority ---
  priority: {
    title: 'Emergency Priority',
    subtitle: 'Locations ranked by combined risk and impact score.',
    highest: 'Highest Priority',
    rank: 'Priority Rank',
  },

  // --- Flood Risk ---
  flood: {
    title: 'Flood Risk Assessment',
    subtitle: 'Dynamic flood risk evaluation for locations across India.',
    search: 'Search any location in India…',
    searching: 'Searching…',
    notFound: 'Location not found',
    riskScore: 'Flood Risk Score',
    level: 'Risk Level',
  },

  // --- How It Works ---
  howItWorks: {
    title: 'How MALAI VIZHI Works',
    subtitle: 'Architecture, data sources, and AI model overview.',
  },

  // --- Language ---
  language: {
    label: 'Language',
    select: 'Select Language',
  },
};

// Helper: create partial override (missing keys fall back to English)
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : string };

function lang(overrides: DeepPartial<typeof en>): typeof en {
  return deepMerge(en, overrides) as typeof en;
}

function deepMerge(base: any, override: any): any {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    if (override[key] !== null && typeof override[key] === 'object' && !Array.isArray(override[key])) {
      result[key] = deepMerge(base[key] ?? {}, override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

const hi = lang({
  nav: { dashboard: 'डैशबोर्ड', alerts: 'चेतावनी', reports: 'रिपोर्ट', floodRisk: 'बाढ़ का खतरा', analytics: 'विश्लेषण', howItWorks: 'यह कैसे काम करता है', adminPortal: 'एडमिन पोर्टल' },
  common: { loading: 'लोड हो रहा है…', error: 'त्रुटि', retry: 'पुनः प्रयास', refresh: 'रिफ्रेश', submit: 'सबमिट', cancel: 'रद्द करें', close: 'बंद करें', search: 'खोजें', noData: 'कोई डेटा उपलब्ध नहीं', demo: 'डेमो', source: 'स्रोत' },
  status: { systemOperational: 'सिस्टम चालू है', backendOffline: 'बैकएंड ऑफ़लाइन', synced: 'सिंक किया गया', offline: 'ऑफ़लाइन / कतारबद्ध', high: 'उच्च', critical: 'संकट', moderate: 'मध्यम', low: 'निम्न' },
  auth: { login: 'लॉग इन', logout: 'लॉग आउट', username: 'यूज़र आईडी', password: 'पासवर्ड', loginButton: 'साइन इन', adminPortal: 'एडमिन पोर्टल', forgotPassword: 'पासवर्ड भूल गए?' },
  dashboard: { title: 'लाइव जोखिम डैशबोर्ड', subtitle: 'पूर्वोत्तर भारत में वास्तविक समय भूस्खलन निगरानी', riskScore: 'जोखिम स्कोर', riskLevel: 'जोखिम स्तर', rainfall: 'वर्षा', soilMoisture: 'मिट्टी नमी', loading: 'डेटा लोड हो रहा है…', highRisk: 'उच्च जोखिम स्थान', simulation: 'बारिश सिमुलेशन', activeAlerts: 'सक्रिय अलर्ट' },
  alerts: { title: 'प्रारंभिक चेतावनी अलर्ट', subtitle: 'पूर्वोत्तर भारत सेंसर नेटवर्क में भूस्खलन अलर्ट।', active: 'सक्रिय अलर्ट', acknowledged: 'स्वीकृत', resolved: 'हल किया गया', enableAlerts: 'डिवाइस अलर्ट सक्षम करें', testFeedback: 'परीक्षण', acknowledge: 'स्वीकार करें', resolve: 'हल करें', noAlerts: 'अभी कोई सक्रिय अलर्ट नहीं।', severity: 'गंभीरता', location: 'स्थान', triggeredAt: 'ट्रिगर किया गया' },
  analytics: { title: 'जलवायु और जोखिम विश्लेषण', subtitle: 'MALAI VIZHI नेटवर्क से क्षेत्रीय डेटा।', stationsMonitored: 'निगरानी स्टेशन', alertsIssued: 'अलर्ट जारी', modelAccuracy: 'मॉडल सटीकता', currentConditions: 'वर्तमान स्थितियाँ', weatherForecast: '7-दिवसीय वर्षा पूर्वानुमान', weatherMap: 'क्षेत्रीय मौसम मानचित्र', highRiskStations: 'उच्च जोखिम स्टेशन', noHighRisk: 'अभी कोई उच्च जोखिम स्टेशन नहीं।' },
  weather: { temperature: 'तापमान', humidity: 'आर्द्रता', wind: 'हवा', rainfall24h: '24 घंटे वर्षा', unavailable: 'मौसम डेटा अनुपलब्ध', loading: 'मौसम डेटा लोड हो रहा है…' },
  reports: { title: 'भूस्खलन जोखिम रिपोर्ट करें', subtitle: 'आपका अवलोकन उभरते खतरों की पहचान करने में मदद कर सकता है।', communityReports: 'समुदाय रिपोर्ट', submit: 'रिपोर्ट सबमिट करें', success: 'रिपोर्ट सबमिट हुई', noReports: 'अभी कोई रिपोर्ट नहीं।', status: { submitted: 'सबमिट', verified: 'सत्यापित', resolved: 'हल' } },
  language: { label: 'भाषा', select: 'भाषा चुनें' },
});

const ta = lang({
  nav: { dashboard: 'முகப்பு', alerts: 'எச்சரிக்கைகள்', reports: 'அறிக்கைகள்', floodRisk: 'வெள்ள ஆபத்து', analytics: 'பகுப்பாய்வு', howItWorks: 'எப்படி செயல்படுகிறது', adminPortal: 'நிர்வாக போர்டல்' },
  common: { loading: 'ஏற்றுகிறது…', error: 'பிழை', retry: 'மீண்டும் முயற்சி', refresh: 'புதுப்பி', submit: 'சமர்ப்பி', cancel: 'ரத்து', close: 'மூடு', search: 'தேடு', noData: 'தரவு இல்லை', demo: 'டெமோ', source: 'ஆதாரம்' },
  status: { systemOperational: 'கணினி இயங்குகிறது', backendOffline: 'பின்தளம் ஆஃப்லைன்', synced: 'ஒத்திசைக்கப்பட்டது', offline: 'ஆஃப்லைன் / வரிசையில்', high: 'அதிக', critical: 'அபாயகர', moderate: 'மிதமான', low: 'குறைந்த' },
  auth: { login: 'உள்நுழை', logout: 'வெளியேறு', username: 'பயனர் ஐடி', password: 'கடவுச்சொல்', loginButton: 'உள்நுழை', adminPortal: 'நிர்வாக போர்டல்', forgotPassword: 'கடவுச்சொல் மறந்துவிட்டதா?' },
  dashboard: { title: 'நேரடி ஆபத்து டாஷ்போர்டு', subtitle: 'வடகிழக்கு இந்தியாவில் மண்சரிவு கண்காணிப்பு', riskScore: 'ஆபத்து மதிப்பெண்', riskLevel: 'ஆபத்து நிலை', rainfall: 'மழை', soilMoisture: 'மண் ஈரப்பதம்', loading: 'தரவு ஏற்றுகிறது…', highRisk: 'அதிக ஆபத்து இடங்கள்', simulation: 'மழை சிமுலேஷன்', activeAlerts: 'செயலில் உள்ள எச்சரிக்கைகள்' },
  alerts: { title: 'ஆரம்ப எச்சரிக்கை அலர்ட்கள்', subtitle: 'வடகிழக்கு இந்தியா சென்சார் நெட்வொர்க்கில் மண்சரிவு அலர்ட்கள்.', active: 'செயலில் அலர்ட்கள்', acknowledged: 'ஒப்புக்கொள்ளப்பட்டது', resolved: 'தீர்க்கப்பட்டது', enableAlerts: 'சாதன அலர்ட்களை இயக்கு', testFeedback: 'சோதனை', acknowledge: 'ஒப்புக்கொள்', resolve: 'தீர்க்க', noAlerts: 'தற்போது செயலில் அலர்ட்கள் இல்லை.', severity: 'தீவிரம்', location: 'இடம்', triggeredAt: 'தூண்டப்பட்டது' },
  analytics: { title: 'காலநிலை மற்றும் ஆபத்து பகுப்பாய்வு', subtitle: 'MALAI VIZHI நெட்வொர்க்கில் இருந்து பிராந்திய தரவு.', stationsMonitored: 'கண்காணிக்கப்பட்ட நிலையங்கள்', alertsIssued: 'வெளியிடப்பட்ட அலர்ட்கள்', modelAccuracy: 'மாடல் துல்லியம்', currentConditions: 'தற்போதைய நிலைமைகள்', weatherForecast: '7-நாள் மழை முன்னறிவிப்பு', weatherMap: 'பிராந்திய வானிலை வரைபடம்', highRiskStations: 'அதிக ஆபத்து நிலையங்கள்', noHighRisk: 'தற்போது அதிக ஆபத்து நிலையங்கள் இல்லை.' },
  weather: { temperature: 'வெப்பநிலை', humidity: 'ஈரப்பதம்', wind: 'காற்று', rainfall24h: '24மணி நேர மழை', unavailable: 'வானிலை தரவு கிடைக்கவில்லை', loading: 'வானிலை தரவு ஏற்றுகிறது…' },
  reports: { title: 'மண்சரிவு ஆபத்தை புகாரளிக்கவும்', subtitle: 'உங்கள் அவதானிப்பு உதவலாம்.', communityReports: 'சமுதாய அறிக்கைகள்', submit: 'அறிக்கை சமர்ப்பி', success: 'அறிக்கை சமர்ப்பிக்கப்பட்டது', noReports: 'இன்னும் அறிக்கைகள் இல்லை.', status: { submitted: 'சமர்ப்பிக்கப்பட்டது', verified: 'சரிபார்க்கப்பட்டது', resolved: 'தீர்க்கப்பட்டது' } },
  language: { label: 'மொழி', select: 'மொழி தேர்வு' },
});

const te = lang({
  nav: { dashboard: 'డాష్‌బోర్డ్', alerts: 'హెచ్చరికలు', reports: 'నివేదికలు', floodRisk: 'వరద ప్రమాదం', analytics: 'విశ్లేషణలు', howItWorks: 'ఇది ఎలా పనిచేస్తుంది', adminPortal: 'అడ్మిన్ పోర్టల్' },
  common: { loading: 'లోడవుతోంది…', error: 'లోపం', retry: 'మళ్ళీ ప్రయత్నించు', search: 'వెతకండి', noData: 'డేటా అందుబాటులో లేదు', demo: 'డెమో' },
  status: { systemOperational: 'సిస్టమ్ పనిచేస్తుంది', backendOffline: 'బ్యాకెండ్ ఆఫ్‌లైన్', synced: 'సమకాలీకరించబడింది', offline: 'ఆఫ్‌లైన్ / క్యూలో ఉంది', high: 'అధిక', critical: 'అత్యంత ప్రమాదకర', moderate: 'మితమైన', low: 'తక్కువ' },
  auth: { login: 'లాగిన్', logout: 'లాగౌట్', username: 'వినియోగదారు ID', password: 'పాస్‌వర్డ్', loginButton: 'సైన్ ఇన్', adminPortal: 'అడ్మిన్ పోర్టల్', forgotPassword: 'పాస్‌వర్డ్ మర్చిపోయారా?' },
  dashboard: { title: 'లైవ్ రిస్క్ డాష్‌బోర్డ్', subtitle: 'ఈశాన్య భారతదేశంలో నిజ సమయ పర్యవేక్షణ', riskScore: 'రిస్క్ స్కోర్', riskLevel: 'రిస్క్ స్థాయి', rainfall: 'వర్షపాతం', loading: 'డేటా లోడవుతోంది…', activeAlerts: 'సక్రియ హెచ్చరికలు' },
  alerts: { title: 'ముందస్తు హెచ్చరిక అలర్ట్‌లు', active: 'సక్రియ అలర్ట్‌లు', acknowledged: 'గుర్తించబడింది', resolved: 'పరిష్కరించబడింది', noAlerts: 'ప్రస్తుతం అలర్ట్‌లు లేవు.' },
  analytics: { title: 'వాతావరణ మరియు రిస్క్ విశ్లేషణ', stationsMonitored: 'పర్యవేక్షణ కేంద్రాలు', alertsIssued: 'జారీ చేసిన హెచ్చరికలు', currentConditions: 'ప్రస్తుత పరిస్థితులు', weatherMap: 'ప్రాంతీయ వాతావరణ మ్యాప్', highRiskStations: 'అధిక రిస్క్ కేంద్రాలు', noHighRisk: 'ప్రస్తుతం అధిక రిస్క్ కేంద్రాలు లేవు.' },
  weather: { temperature: 'ఉష్ణోగ్రత', humidity: 'తేమ', wind: 'గాలి', rainfall24h: '24గం వర్షపాతం', unavailable: 'వాతావరణ డేటా అందుబాటులో లేదు' },
  reports: { title: 'కొండచరియ ప్రమాదాన్ని నివేదించండి', submit: 'నివేదిక సమర్పించు', noReports: 'నివేదికలు లేవు.', status: { submitted: 'సమర్పించబడింది', verified: 'ధృవీకరించబడింది', resolved: 'పరిష్కరించబడింది' } },
  language: { label: 'భాష', select: 'భాష ఎంచుకోండి' },
});

const bn = lang({
  nav: { dashboard: 'ড্যাশবোর্ড', alerts: 'সতর্কতা', reports: 'রিপোর্ট', floodRisk: 'বন্যার ঝুঁকি', analytics: 'বিশ্লেষণ', howItWorks: 'কীভাবে কাজ করে', adminPortal: 'অ্যাডমিন পোর্টাল' },
  common: { loading: 'লোড হচ্ছে…', error: 'ত্রুটি', retry: 'আবার চেষ্টা করুন', search: 'অনুসন্ধান', noData: 'কোনো ডেটা নেই', demo: 'ডেমো' },
  status: { systemOperational: 'সিস্টেম চালু আছে', backendOffline: 'ব্যাকএন্ড অফলাইন', synced: 'সিঙ্ক হয়েছে', offline: 'অফলাইন / সারিবদ্ধ', high: 'উচ্চ', critical: 'সংকটজনক', moderate: 'মাঝারি', low: 'কম' },
  auth: { login: 'লগইন', logout: 'লগআউট', username: 'ব্যবহারকারী আইডি', password: 'পাসওয়ার্ড', loginButton: 'সাইন ইন', adminPortal: 'অ্যাডমিন পোর্টাল', forgotPassword: 'পাসওয়ার্ড ভুলে গেছেন?' },
  dashboard: { title: 'লাইভ রিস্ক ড্যাশবোর্ড', subtitle: 'উত্তর-পূর্ব ভারতে রিয়েল-টাইম পর্যবেক্ষণ', riskScore: 'ঝুঁকি স্কোর', riskLevel: 'ঝুঁকির স্তর', rainfall: 'বৃষ্টিপাত', loading: 'ডেটা লোড হচ্ছে…', activeAlerts: 'সক্রিয় সতর্কতা' },
  alerts: { title: 'প্রাথমিক সতর্কতা', active: 'সক্রিয় সতর্কতা', acknowledged: 'স্বীকৃত', resolved: 'সমাধান করা হয়েছে', noAlerts: 'এখন কোনো সক্রিয় সতর্কতা নেই।' },
  analytics: { title: 'জলবায়ু ও ঝুঁকি বিশ্লেষণ', stationsMonitored: 'পর্যবেক্ষণ কেন্দ্র', alertsIssued: 'সতর্কতা জারি', currentConditions: 'বর্তমান অবস্থা', weatherMap: 'আঞ্চলিক আবহাওয়া মানচিত্র', highRiskStations: 'উচ্চ ঝুঁকি কেন্দ্র', noHighRisk: 'বর্তমানে উচ্চ ঝুঁকি কেন্দ্র নেই।' },
  weather: { temperature: 'তাপমাত্রা', humidity: 'আর্দ্রতা', wind: 'বাতাস', rainfall24h: '২৪ঘণ্টা বৃষ্টিপাত', unavailable: 'আবহাওয়া ডেটা অনুপলব্ধ' },
  reports: { title: 'ভূমিধস ঝুঁকি রিপোর্ট করুন', submit: 'রিপোর্ট জমা দিন', noReports: 'এখনো কোনো রিপোর্ট নেই।', status: { submitted: 'জমা দেওয়া হয়েছে', verified: 'যাচাই করা হয়েছে', resolved: 'সমাধান হয়েছে' } },
  language: { label: 'ভাষা', select: 'ভাষা নির্বাচন করুন' },
});

const mr = lang({
  nav: { dashboard: 'डॅशबोर्ड', alerts: 'सतर्कता', reports: 'अहवाल', floodRisk: 'पुराचा धोका', analytics: 'विश्लेषण', howItWorks: 'हे कसे कार्य करते', adminPortal: 'प्रशासन पोर्टल' },
  common: { loading: 'लोड होत आहे…', error: 'त्रुटी', retry: 'पुन्हा प्रयत्न करा', search: 'शोधा', noData: 'डेटा उपलब्ध नाही', demo: 'डेमो' },
  status: { systemOperational: 'प्रणाली कार्यरत आहे', backendOffline: 'बॅकएंड ऑफलाइन', synced: 'समक्रमित', offline: 'ऑफलाइन / रांगेत', high: 'उच्च', critical: 'गंभीर', moderate: 'मध्यम', low: 'कमी' },
  auth: { login: 'लॉगिन', logout: 'लॉगआउट', loginButton: 'साइन इन', adminPortal: 'प्रशासन पोर्टल', forgotPassword: 'पासवर्ड विसरलात?' },
  dashboard: { title: 'लाइव्ह जोखीम डॅशबोर्ड', subtitle: 'ईशान्य भारतात रिअल-टाइम देखरेख', riskScore: 'जोखीम गुण', riskLevel: 'जोखीम पातळी', rainfall: 'पाऊस', loading: 'डेटा लोड होत आहे…', activeAlerts: 'सक्रिय सतर्कता' },
  alerts: { title: 'प्रारंभिक चेतावणी सतर्कता', active: 'सक्रिय सतर्कता', acknowledged: 'मान्य', resolved: 'निराकरण', noAlerts: 'सध्या कोणतीही सक्रिय सतर्कता नाही.' },
  analytics: { title: 'हवामान आणि जोखीम विश्लेषण', stationsMonitored: 'देखरेख केंद्रे', alertsIssued: 'सतर्कता जारी', currentConditions: 'सद्य परिस्थिती', highRiskStations: 'उच्च जोखीम केंद्रे', noHighRisk: 'सध्या उच्च जोखीम केंद्रे नाहीत.' },
  weather: { temperature: 'तापमान', humidity: 'आर्द्रता', wind: 'वारा', rainfall24h: '24तास पाऊस', unavailable: 'हवामान डेटा अनुपलब्ध' },
  reports: { title: 'भूस्खलन धोका नोंदवा', submit: 'अहवाल सादर करा', noReports: 'अजून अहवाल नाही.', status: { submitted: 'सादर', verified: 'सत्यापित', resolved: 'निराकरण' } },
  language: { label: 'भाषा', select: 'भाषा निवडा' },
});

const gu = lang({
  nav: { dashboard: 'ડેશબોર્ડ', alerts: 'ચેતવણીઓ', reports: 'અહેવાલો', floodRisk: 'પૂરનું જોખમ', analytics: 'વિશ્લેષણ', howItWorks: 'આ કેવી રીતે કામ કરે', adminPortal: 'એડમિન પોર્ટલ' },
  common: { loading: 'લોડ થઈ રહ્યું છે…', error: 'ભૂલ', retry: 'ફરી પ્રયાસ', search: 'શોધો', noData: 'ડેટા ઉપલબ્ધ નથી', demo: 'ડેમો' },
  status: { systemOperational: 'સિસ્ટમ કાર્યરત છે', backendOffline: 'બેકએન્ડ ઑફલાઇન', synced: 'સિંક કરેલ', offline: 'ઑફલાઇન / કતારમાં', high: 'ઊંચ', critical: 'ગંભીર', moderate: 'મધ્યમ', low: 'ઓછ' },
  auth: { login: 'લૉગિન', logout: 'લૉગઆઉટ', loginButton: 'સાઇન ઇન', adminPortal: 'એડમિન પોર્ટલ', forgotPassword: 'પાસવર્ડ ભૂલ્યા?' },
  dashboard: { title: 'લાઇવ જોખમ ડેશબોર્ડ', riskScore: 'જોખમ સ્કોર', rainfall: 'વરસાદ', loading: 'ડેટા લોડ થઈ રહ્યો છે…', activeAlerts: 'સક્રિય ચેતવણીઓ' },
  alerts: { title: 'પ્રારંભિક ચેતવણી', active: 'સક્રિય ચેતવણીઓ', acknowledged: 'સ્વીકૃત', resolved: 'ઉકેલ', noAlerts: 'હાલ કોઈ ચેતવણી નથી.' },
  analytics: { title: 'આબોહવા અને જોખમ વિશ્લેષણ', stationsMonitored: 'દેખરેખ કેન્દ્રો', currentConditions: 'વર્તમાન સ્થિતિ', highRiskStations: 'ઉચ્ચ જોખમ કેન્દ્રો', noHighRisk: 'હાલ ઉચ્ચ જોખમ કેન્દ્રો નથી.' },
  weather: { temperature: 'તાપમાન', humidity: 'ભેજ', wind: 'પવન', rainfall24h: '24ક. વરસાદ', unavailable: 'હવામાન ડેટા અનુપલબ્ધ' },
  reports: { title: 'ભૂ-પ્રવાહ જોખમ નોંધો', submit: 'અહેવાલ સ​મ​ર્પ​ણ', noReports: 'હજ સુધી કોઈ અહેવાલ નથી.', status: { submitted: 'સ​મ​ર્પ​ણ', verified: 'ચ​ક​વ​ણ', resolved: 'ઉ​કે​લ' } },
  language: { label: 'ભાષા', select: 'ભાષા પસંદ કરો' },
});

const kn = lang({
  nav: { dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', alerts: 'ಎಚ್ಚರಿಕೆಗಳು', reports: 'ವರದಿಗಳು', floodRisk: 'ಪ್ರವಾಹದ ಅಪಾಯ', analytics: 'ವಿಶ್ಲೇಷಣೆ', howItWorks: 'ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ', adminPortal: 'ಆಡಳಿತ ಪೋರ್ಟಲ್' },
  common: { loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ…', error: 'ದೋಷ', retry: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ', search: 'ಹುಡುಕಿ', noData: 'ಡೇಟಾ ಲಭ್ಯವಿಲ್ಲ', demo: 'ಡೆಮೊ' },
  status: { systemOperational: 'ಸಿಸ್ಟಮ್ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತಿದೆ', backendOffline: 'ಬ್ಯಾಕೆಂಡ್ ಆಫ್‌ಲೈನ್', synced: 'ಸಿಂಕ್ ಆಗಿದೆ', offline: 'ಆಫ್‌ಲೈನ್ / ಸರದಿಯಲ್ಲಿದೆ', high: 'ಹೆಚ್ಚು', critical: 'ಅಪಾಯಕಾರಿ', moderate: 'ಮಧ್ಯಮ', low: 'ಕಡಿಮೆ' },
  auth: { login: 'ಲಾಗಿನ್', logout: 'ಲಾಗ್ ಔಟ್', loginButton: 'ಸೈನ್ ಇನ್', adminPortal: 'ಆಡಳಿತ ಪೋರ್ಟಲ್', forgotPassword: 'ಪಾಸ್‌ವರ್ಡ್ ಮರೆತಿರಾ?' },
  dashboard: { title: 'ನೇರ ಅಪಾಯ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', riskScore: 'ಅಪಾಯ ಸ್ಕೋರ್', rainfall: 'ಮಳೆ', loading: 'ಡೇಟಾ ಲೋಡ್ ಆಗುತ್ತಿದೆ…', activeAlerts: 'ಸಕ್ರಿಯ ಎಚ್ಚರಿಕೆಗಳು' },
  alerts: { title: 'ಪ್ರಾರಂಭಿಕ ಎಚ್ಚರಿಕೆ', active: 'ಸಕ್ರಿಯ ಎಚ್ಚರಿಕೆಗಳು', acknowledged: 'ಗುರುತಿಸಲಾಗಿದೆ', resolved: 'ಪರಿಹಾರಗೊಂಡಿದೆ', noAlerts: 'ಪ್ರಸ್ತುತ ಯಾವುದೇ ಎಚ್ಚರಿಕೆ ಇಲ್ಲ.' },
  analytics: { title: 'ಹವಾಮಾನ ಮತ್ತು ಅಪಾಯ ವಿಶ್ಲೇಷಣೆ', stationsMonitored: 'ಮೇಲ್ವಿಚಾರಣಾ ಕೇಂದ್ರಗಳು', currentConditions: 'ಪ್ರಸ್ತುತ ಪರಿಸ್ಥಿತಿ', highRiskStations: 'ಹೆಚ್ಚಿನ ಅಪಾಯ ಕೇಂದ್ರಗಳು', noHighRisk: 'ಪ್ರಸ್ತುತ ಹೆಚ್ಚಿನ ಅಪಾಯ ಕೇಂದ್ರಗಳಿಲ್ಲ.' },
  weather: { temperature: 'ತಾಪಮಾನ', humidity: 'ತೇವಾಂಶ', wind: 'ಗಾಳಿ', rainfall24h: '24ಗಂ ಮಳೆ', unavailable: 'ಹವಾಮಾನ ಡೇಟಾ ಲಭ್ಯವಿಲ್ಲ' },
  reports: { title: 'ಭೂಕುಸಿತ ಅಪಾಯ ವರದಿ ಮಾಡಿ', submit: 'ವರದಿ ಸಲ್ಲಿಸಿ', noReports: 'ಇನ್ನೂ ವರದಿಗಳಿಲ್ಲ.', status: { submitted: 'ಸಲ್ಲಿಸಲಾಗಿದೆ', verified: 'ಪರಿಶೀಲಿಸಲಾಗಿದೆ', resolved: 'ಪರಿಹಾರ' } },
  language: { label: 'ಭಾಷೆ', select: 'ಭಾಷೆ ಆಯ್ಕೆ ಮಾಡಿ' },
});

const ml = lang({
  nav: { dashboard: 'ഡാഷ്ബോർഡ്', alerts: 'മുന്നറിയിപ്പുകൾ', reports: 'റിപ്പോർട്ടുകൾ', floodRisk: 'വെള്ളപ്പൊക്ക അപകടം', analytics: 'വിശകലനം', howItWorks: 'ഇത് എങ്ങനെ പ്രവർത്തിക്കുന്നു', adminPortal: 'അഡ്മിൻ പോർട്ടൽ' },
  common: { loading: 'ലോഡ് ആകുന്നു…', error: 'പിശക്', retry: 'വീണ്ടും ശ്രമിക്കുക', search: 'തിരയുക', noData: 'ഡേറ്റ ലഭ്യമല്ല', demo: 'ഡെമോ' },
  status: { systemOperational: 'സിസ്റ്റം പ്രവർത്തിക്കുന്നു', backendOffline: 'ബാക്കൻഡ് ഓഫ്‌ലൈൻ', synced: 'സമന്വയിക്കപ്പെട്ടു', offline: 'ഓഫ്‌ലൈൻ / ക്യൂ', high: 'ഉയർന്ന', critical: 'ഗുരുതര', moderate: 'മിതമായ', low: 'കുറഞ്ഞ' },
  auth: { login: 'ലോഗിൻ', logout: 'ലോഗൗട്ട്', loginButton: 'സൈൻ ഇൻ', adminPortal: 'അഡ്മിൻ പോർട്ടൽ', forgotPassword: 'പാസ്‌വേഡ് മറന്നോ?' },
  dashboard: { title: 'തത്സമയ അപകട ഡാഷ്ബോർഡ്', riskScore: 'അപകട സ്കോർ', rainfall: 'മഴ', loading: 'ഡേറ്റ ലോഡ് ആകുന്നു…', activeAlerts: 'സജീവ മുന്നറിയിപ്പുകൾ' },
  alerts: { title: 'മുൻകൂർ മുന്നറിയിപ്പ്', active: 'സജീവ മുന്നറിയിപ്പുകൾ', acknowledged: 'അംഗീകരിച്ചു', resolved: 'പരിഹരിച്ചു', noAlerts: 'ഇപ്പോൾ മുന്നറിയിപ്പുകൾ ഇല്ല.' },
  analytics: { title: 'കാലാവസ്ഥ & അപകട വിശകലനം', stationsMonitored: 'നിരീക്ഷണ കേന്ദ്രങ്ങൾ', currentConditions: 'നിലവിലെ അവസ്ഥ', highRiskStations: 'ഉയർന്ന അപകട കേന്ദ്രങ്ങൾ', noHighRisk: 'ഇപ്പോൾ ഉയർന്ന അപകട കേന്ദ്രങ്ങൾ ഇല്ല.' },
  weather: { temperature: 'താപനില', humidity: 'ഈർപ്പം', wind: 'കാറ്റ്', rainfall24h: '24മ. മഴ', unavailable: 'കാലാവസ്ഥ ഡേറ്റ ലഭ്യമല്ല' },
  reports: { title: 'ഭൂസ്ഖലന അപകടം റിപ്പോർട്ട് ചെയ്യുക', submit: 'റിപ്പോർട്ട് സമർപ്പിക്കുക', noReports: 'ഇതുവരെ റിപ്പോർട്ടുകൾ ഇല്ല.', status: { submitted: 'സമർപ്പിച്ചു', verified: 'സ്ഥിരീകരിച്ചു', resolved: 'പരിഹരിച്ചു' } },
  language: { label: 'ഭാഷ', select: 'ഭാഷ തിരഞ്ഞെടുക്കുക' },
});

const pa = lang({
  nav: { dashboard: 'ਡੈਸ਼ਬੋਰਡ', alerts: 'ਚੇਤਾਵਨੀਆਂ', reports: 'ਰਿਪੋਰਟਾਂ', floodRisk: 'ਹੜ੍ਹ ਦਾ ਖਤਰਾ', analytics: 'ਵਿਸ਼ਲੇਸ਼ਣ', howItWorks: 'ਇਹ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ', adminPortal: 'ਐਡਮਿਨ ਪੋਰਟਲ' },
  common: { loading: 'ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…', error: 'ਗਲਤੀ', retry: 'ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ', search: 'ਖੋਜੋ', noData: 'ਕੋਈ ਡੇਟਾ ਨਹੀਂ', demo: 'ਡੈਮੋ' },
  status: { systemOperational: 'ਸਿਸਟਮ ਚਾਲੂ ਹੈ', backendOffline: 'ਬੈਕਐਂਡ ਔਫਲਾਈਨ', synced: 'ਸਿੰਕ ਕੀਤਾ ਗਿਆ', offline: 'ਔਫਲਾਈਨ / ਕਤਾਰ', high: 'ਉੱਚ', critical: 'ਗੰਭੀਰ', moderate: 'ਦਰਮਿਆਨਾ', low: 'ਘੱਟ' },
  auth: { login: 'ਲੌਗਇਨ', logout: 'ਲੌਗਆਉਟ', loginButton: 'ਸਾਈਨ ਇਨ', adminPortal: 'ਐਡਮਿਨ ਪੋਰਟਲ', forgotPassword: 'ਪਾਸਵਰਡ ਭੁੱਲ ਗਏ?' },
  dashboard: { title: 'ਲਾਈਵ ਖਤਰਾ ਡੈਸ਼ਬੋਰਡ', riskScore: 'ਖਤਰਾ ਸਕੋਰ', rainfall: 'ਬਾਰਿਸ਼', loading: 'ਡੇਟਾ ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…', activeAlerts: 'ਸਰਗਰਮ ਚੇਤਾਵਨੀਆਂ' },
  alerts: { title: 'ਮੁਢਲੀ ਚੇਤਾਵਨੀ', active: 'ਸਰਗਰਮ ਚੇਤਾਵਨੀਆਂ', acknowledged: 'ਮਾਨਤਾ ਦਿੱਤੀ', resolved: 'ਹੱਲ ਕੀਤਾ', noAlerts: 'ਹੁਣ ਕੋਈ ਚੇਤਾਵਨੀ ਨਹੀਂ।' },
  analytics: { title: 'ਮੌਸਮ ਅਤੇ ਖਤਰਾ ਵਿਸ਼ਲੇਸ਼ਣ', stationsMonitored: 'ਨਿਗਰਾਨੀ ਕੇਂਦਰ', currentConditions: 'ਮੌਜੂਦਾ ਸਥਿਤੀਆਂ', highRiskStations: 'ਉੱਚ ਖਤਰਾ ਕੇਂਦਰ', noHighRisk: 'ਹੁਣ ਉੱਚ ਖਤਰਾ ਕੇਂਦਰ ਨਹੀਂ।' },
  weather: { temperature: 'ਤਾਪਮਾਨ', humidity: 'ਨਮੀ', wind: 'ਹਵਾ', rainfall24h: '24ਘੰ ਬਾਰਿਸ਼', unavailable: 'ਮੌਸਮ ਡੇਟਾ ਅਣਉਪਲਬਧ' },
  reports: { title: 'ਭੂਸਖਲਨ ਖਤਰਾ ਰਿਪੋਰਟ ਕਰੋ', submit: 'ਰਿਪੋਰਟ ਜਮ੍ਹਾ ਕਰੋ', noReports: 'ਹਾਲੇ ਕੋਈ ਰਿਪੋਰਟ ਨਹੀਂ।', status: { submitted: 'ਜਮ੍ਹਾ', verified: 'ਤਸਦੀਕ', resolved: 'ਹੱਲ' } },
  language: { label: 'ਭਾਸ਼ਾ', select: 'ਭਾਸ਼ਾ ਚੁਣੋ' },
});

const ur = lang({
  nav: { dashboard: 'ڈیش بورڈ', alerts: 'الرٹس', reports: 'رپورٹس', floodRisk: 'سیلاب کا خطرہ', analytics: 'تجزیات', howItWorks: 'یہ کیسے کام کرتا ہے', adminPortal: 'ایڈمن پورٹل' },
  common: { loading: 'لوڈ ہو رہا ہے…', error: 'خرابی', retry: 'دوبارہ کوشش', search: 'تلاش', noData: 'کوئی ڈیٹا نہیں', demo: 'ڈیمو' },
  status: { systemOperational: 'نظام کام کر رہا ہے', backendOffline: 'بیک اینڈ آف لائن', synced: 'ہم آہنگ', offline: 'آف لائن / قطار میں', high: 'بلند', critical: 'سنگین', moderate: 'معتدل', low: 'کم' },
  auth: { login: 'لاگ ان', logout: 'لاگ آؤٹ', loginButton: 'سائن ان', adminPortal: 'ایڈمن پورٹل', forgotPassword: 'پاسورڈ بھول گئے؟' },
  dashboard: { title: 'لائیو خطرہ ڈیش بورڈ', riskScore: 'خطرہ اسکور', rainfall: 'بارش', loading: 'ڈیٹا لوڈ ہو رہا ہے…', activeAlerts: 'فعال الرٹس' },
  alerts: { title: 'ابتدائی انتباہ الرٹس', active: 'فعال الرٹس', acknowledged: 'تسلیم شدہ', resolved: 'حل شدہ', noAlerts: 'ابھی کوئی الرٹ نہیں۔' },
  analytics: { title: 'موسم اور خطرہ تجزیہ', stationsMonitored: 'نگرانی مراکز', currentConditions: 'موجودہ حالات', highRiskStations: 'اعلی خطرہ مراکز', noHighRisk: 'ابھی اعلی خطرہ مراکز نہیں۔' },
  weather: { temperature: 'درجہ حرارت', humidity: 'نمی', wind: 'ہوا', rainfall24h: '24گھ بارش', unavailable: 'موسم ڈیٹا دستیاب نہیں' },
  reports: { title: 'لینڈ سلائیڈ خطرہ رپورٹ کریں', submit: 'رپورٹ جمع کریں', noReports: 'ابھی کوئی رپورٹ نہیں۔', status: { submitted: 'جمع', verified: 'تصدیق شدہ', resolved: 'حل' } },
  language: { label: 'زبان', select: 'زبان منتخب کریں' },
});

const savedLanguage = (() => {
  try { return localStorage.getItem('mv_language') || 'en'; } catch { return 'en'; }
})();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      ta: { translation: ta },
      te: { translation: te },
      bn: { translation: bn },
      mr: { translation: mr },
      gu: { translation: gu },
      kn: { translation: kn },
      ml: { translation: ml },
      pa: { translation: pa },
      ur: { translation: ur },
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
