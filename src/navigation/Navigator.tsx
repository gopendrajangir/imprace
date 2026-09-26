import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import {
  InterviewAnalysisScreen,
  InterviewScreen,
  InterviewStarterScreen,
  ModelsDownloadScreen,
  ModelsLoaderScreen,
  SplashScreen,
} from '../screens';
import { RootStackParamsList } from './navigation.types';
import ProfilerScreen from '@/screens/profiler.screen';

const Stack = createNativeStackNavigator<RootStackParamsList>();

function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="ModelsDownload" component={ModelsDownloadScreen} />
      <Stack.Screen name="Interview" component={InterviewScreen} />
      <Stack.Screen
        name="InterviewStarter"
        component={InterviewStarterScreen}
      />
      <Stack.Screen name="ModelsLoader" component={ModelsLoaderScreen} />
      <Stack.Screen
        name="InterviewAnalysis"
        component={InterviewAnalysisScreen}
      />
      <Stack.Screen name="Profiler" component={ProfilerScreen} />
    </Stack.Navigator>
  );
}

export default function RootNavigation() {
  return (
    <NavigationContainer>
      <RootStack />
    </NavigationContainer>
  );
}
