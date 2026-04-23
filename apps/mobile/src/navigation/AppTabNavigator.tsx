import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, LineChart, PieChart, User, Repeat } from 'lucide-react-native';
import type { AppStackParamList, TabParamList } from './types';
import { useTranslation } from 'react-i18next';

import { HomeDashboardScreen } from '../screens/app/HomeDashboardScreen';
import { MarketsScreen } from '../screens/app/MarketsScreen';
import { PortfolioScreen } from '../screens/app/PortfolioScreen';
import { ProfileScreen } from '../screens/app/ProfileScreen';
import { AddTransactionScreen } from '../screens/app/AddTransactionScreen';
import { AssetDetailScreen } from '../screens/app/AssetDetailScreen';
import { AlertsScreen } from '../screens/app/AlertsScreen';
import { AlertHistoryScreen } from '../screens/app/AlertHistoryScreen';
import { WatchlistScreen } from '../screens/app/WatchlistScreen';
import { InsightsScreen } from '../screens/app/InsightsScreen';
import { ConverterScreen } from '../screens/app/ConverterScreen';
import { EditProfileScreen } from '../screens/app/EditProfileScreen';
import { CompareAssetsScreen } from '../screens/app/CompareAssetsScreen';
import { MarketNewsScreen } from '../screens/app/MarketNewsScreen';
import { FifoSummaryScreen } from '../screens/app/FifoSummaryScreen';
import { StrategyHubScreen } from '../screens/app/StrategyHubScreen';
import { AcademyScreen } from '../screens/app/AcademyScreen';
import { AcademyArticleScreen } from '../screens/app/AcademyArticleScreen';
import { WeeklyRecapScreen } from '../screens/app/WeeklyRecapScreen';
import { MonthlyWrappedScreen } from '../screens/app/MonthlyWrappedScreen';
import { SharedWatchlistScreen } from '../screens/app/SharedWatchlistScreen';
import { TwoFactorScreen } from '../screens/app/TwoFactorScreen';
import { IntelligenceHubScreen } from '../screens/app/IntelligenceHubScreen';
import { PortfolioPowersHubScreen } from '../screens/app/PortfolioPowersHubScreen';
import { PortfolioDenominationScreen } from '../screens/app/PortfolioDenominationScreen';
import { PortfolioRebalancerScreen } from '../screens/app/PortfolioRebalancerScreen';
import { PortfolioDcaSimulatorScreen } from '../screens/app/PortfolioDcaSimulatorScreen';
import { PaperOrdersScreen } from '../screens/app/PaperOrdersScreen';
import { PortfolioTaxLotsScreen } from '../screens/app/PortfolioTaxLotsScreen';
import { PortfolioMultiGoalsScreen } from '../screens/app/PortfolioMultiGoalsScreen';
import { PortfolioSharedScreen } from '../screens/app/PortfolioSharedScreen';
import { PortfolioStressTestScreen } from '../screens/app/PortfolioStressTestScreen';
import { SocialHubScreen } from '../screens/app/SocialHubScreen';
import { ShareCardStudioScreen } from '../screens/app/ShareCardStudioScreen';
import { CommunityListsScreen } from '../screens/app/CommunityListsScreen';
import { CommunityListDetailScreen } from '../screens/app/CommunityListDetailScreen';
import { CopyStrategyScreen } from '../screens/app/CopyStrategyScreen';
import { LeaderboardScreen } from '../screens/app/LeaderboardScreen';
import { ReferralScreen } from '../screens/app/ReferralScreen';
import { LiveEventsScreen } from '../screens/app/LiveEventsScreen';
import { ProToolsHubScreen } from '../screens/app/ProToolsHubScreen';
import { TechnicalAnalysisScreen } from '../screens/app/TechnicalAnalysisScreen';
import { FormulaAlertsScreen } from '../screens/app/FormulaAlertsScreen';
import { SpreadDetectorScreen } from '../screens/app/SpreadDetectorScreen';
import { VolatilityConeScreen } from '../screens/app/VolatilityConeScreen';
import { PositionSlicingScreen } from '../screens/app/PositionSlicingScreen';
import { TaxReportScreen } from '../screens/app/TaxReportScreen';
import { StrategyPlaygroundScreen } from '../screens/app/StrategyPlaygroundScreen';
import { TransparencyScreen } from '../screens/app/TransparencyScreen';

import { colors } from '../theme/tokens';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

// ── Tab-level Navigator (main bottom tabs) ──
const TabNavigator = () => {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background.elevated,
          borderTopWidth: 1,
          borderTopColor: colors.border.stronger,
          paddingBottom: 5,
        },
        tabBarActiveTintColor: colors.accent.primary_blue,
        tabBarInactiveTintColor: colors.text.muted,
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={HomeDashboardScreen} 
        options={{
          tabBarLabel: t('common.overview'),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />
        }} 
      />
      <Tab.Screen 
        name="Markets" 
        component={MarketsScreen} 
        options={{
          tabBarLabel: t('common.markets'),
          tabBarIcon: ({ color, size }) => <LineChart color={color} size={size} />
        }} 
      />
      <Tab.Screen
        name="Convert"
        component={ConverterScreen}
        options={{
          tabBarLabel: t('common.convert'),
          tabBarIcon: ({ color, size }) => <Repeat color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="Portfolio" 
        component={PortfolioScreen} 
        options={{
          tabBarLabel: t('common.portfolio'),
          tabBarIcon: ({ color, size }) => <PieChart color={color} size={size} />
        }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{
          tabBarLabel: t('common.profile'),
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />
        }} 
      />
    </Tab.Navigator>
  );
};

// ── App-level Stack Navigator (wraps tabs + modals) ──
export const AppTabNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_bottom',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} />
      <Stack.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="AssetDetail"
        component={AssetDetailScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="AlertHistory"
        component={AlertHistoryScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="Watchlist"
        component={WatchlistScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="Insights"
        component={InsightsScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="CompareAssets"
        component={CompareAssetsScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="MarketNews"
        component={MarketNewsScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="FifoSummary"
        component={FifoSummaryScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="StrategyHub"
        component={StrategyHubScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="Academy"
        component={AcademyScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="AcademyArticle"
        component={AcademyArticleScreen as any}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="WeeklyRecap"
        component={WeeklyRecapScreen}
        options={{ presentation: 'card', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="MonthlyWrapped"
        component={MonthlyWrappedScreen}
        options={{ presentation: 'fullScreenModal', animation: 'fade' }}
      />
      <Stack.Screen
        name="SharedWatchlist"
        component={SharedWatchlistScreen as any}
        options={{ presentation: 'card', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="TwoFactor"
        component={TwoFactorScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="IntelligenceHub"
        component={IntelligenceHubScreen}
        options={{ presentation: 'card', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="PortfolioPowersHub"
        component={PortfolioPowersHubScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PortfolioDenomination"
        component={PortfolioDenominationScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PortfolioRebalancer"
        component={PortfolioRebalancerScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PortfolioDcaSimulator"
        component={PortfolioDcaSimulatorScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PaperOrders"
        component={PaperOrdersScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PortfolioTaxLots"
        component={PortfolioTaxLotsScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PortfolioMultiGoals"
        component={PortfolioMultiGoalsScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PortfolioShared"
        component={PortfolioSharedScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PortfolioStressTest"
        component={PortfolioStressTestScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="SocialHub"
        component={SocialHubScreen}
        options={{ presentation: 'card', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="ShareCardStudio"
        component={ShareCardStudioScreen as any}
        options={{ presentation: 'card', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="CommunityLists"
        component={CommunityListsScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="CommunityListDetail"
        component={CommunityListDetailScreen as any}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="CopyStrategy"
        component={CopyStrategyScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Referral"
        component={ReferralScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="LiveEvents"
        component={LiveEventsScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ProToolsHub"
        component={ProToolsHubScreen}
        options={{ presentation: 'card', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="TechnicalAnalysis"
        component={TechnicalAnalysisScreen as any}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="FormulaAlerts"
        component={FormulaAlertsScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="SpreadDetector"
        component={SpreadDetectorScreen as any}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="VolatilityCone"
        component={VolatilityConeScreen as any}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PositionSlicing"
        component={PositionSlicingScreen as any}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="TaxReport"
        component={TaxReportScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="StrategyPlayground"
        component={StrategyPlaygroundScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Transparency"
        component={TransparencyScreen}
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
};
