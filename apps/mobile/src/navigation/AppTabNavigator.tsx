import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, LineChart, PieChart, User, Repeat } from 'lucide-react-native';

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

import { colors } from '../theme/tokens';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Tab-level Navigator (main bottom tabs) ──
const TabNavigator = () => {
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
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />
        }} 
      />
      <Tab.Screen 
        name="Markets" 
        component={MarketsScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <LineChart color={color} size={size} />
        }} 
      />
      <Tab.Screen
        name="Convert"
        component={ConverterScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Repeat color={color} size={size} />
        }}
      />
      <Tab.Screen 
        name="Portfolio" 
        component={PortfolioScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <PieChart color={color} size={size} />
        }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{
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
    </Stack.Navigator>
  );
};
