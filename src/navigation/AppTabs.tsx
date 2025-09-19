import * as React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { FloatingTabBar } from "../components/FloatingTabBar";
import { RH } from "../design/tokens";
import { Ionicons } from "@expo/vector-icons";

// Import your existing screen components
import OpportunitiesList from "../../components/OpportunitiesList";
import ConnectionsScreen from "../../components/ConnectionsScreen";
import ListenScreen from "../../components/ListenScreen";

// Example: provide a way to "dock" when a mini-player is showing
function useMiniPlayerVisible() {
  // Replace with your actual player state
  const [visible] = React.useState(false);
  return visible;
}

const Tab = createBottomTabNavigator();

export default function AppTabs() {
  const miniPlayerVisible = useMiniPlayerVisible();

  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: RH.color.active,
        tabBarInactiveTintColor: RH.color.textSecondary,
        // We provide our own bar, so hide RN's styling:
        tabBarStyle: { position: "absolute", height: 0 }, // effectively unused
      }}
      tabBar={(props) => (
        <FloatingTabBar {...props} docked={miniPlayerVisible} />
      )}
    >
      <Tab.Screen
        name="Opportunities"
        component={OpportunitiesList}
        options={{
          tabBarLabel: "Opportunities",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Connections"
        component={ConnectionsScreen}
        options={{
          tabBarLabel: "Connections",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Listen"
        component={ListenScreen}
        options={{
          tabBarLabel: "Listen",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="musical-notes-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
