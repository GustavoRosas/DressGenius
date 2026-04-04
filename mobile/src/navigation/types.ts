export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
  Chat: { chatId: number };
  Paywall: undefined;
  AIPreferences: undefined;
  NotificationPrefs: undefined;
  MonthlyReport: { year: number; month: number };
  History: undefined;
  Analytics: undefined;
};

export type TabParamList = {
  Home: undefined;
  Closet: undefined;
  Analyze: undefined;
  Settings: undefined;
  Profile: undefined;
};
