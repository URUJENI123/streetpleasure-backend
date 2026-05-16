import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import useStore from '../store/useStore';

// Import Screens
import Splash from '../screens/Splash';
import Login from '../screens/Login';
import VerifyId from '../screens/VerifyId';
import HomeFeed from '../screens/HomeFeed';
import CreatePost from '../screens/CreatePost';
import ActivityDetail from '../screens/ActivityDetail';
import EventDetail from '../screens/EventDetail';
import Chat from '../screens/Chat';
import Profile from '../screens/Profile';
import Destinations from '../screens/Destinations';
import PoliceReport from '../screens/PoliceReport';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: '#FF5A5F' }}>
      <Tab.Screen name="Home" component={HomeFeed} />
      <Tab.Screen name="Destinations" component={Destinations} />
      <Tab.Screen name="Create" component={CreatePost} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { token, isAppReady } = useStore();

  if (!isAppReady) {
    return <Splash />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <>
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="VerifyId" component={VerifyId} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen name="ActivityDetail" component={ActivityDetail} />
            <Stack.Screen name="EventDetail" component={EventDetail} />
            <Stack.Screen name="Chat" component={Chat} />
            <Stack.Screen name="PoliceReport" component={PoliceReport} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
