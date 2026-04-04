export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
  Chat: { chatId: number; fromScan?: boolean };
  ScanDetail: { scanId: number };
  Paywall: undefined;
  AIPreferences: undefined;
  NotificationPrefs: undefined;
  MonthlyReport: { year: number; month: number };
  History: undefined;
  Analytics: undefined;
  MyPlan: undefined;
};

export type TabParamList = {
  Home: undefined;
  Closet: undefined;
  Analyze: undefined;
  Settings: undefined;
  Profile: undefined;
};
