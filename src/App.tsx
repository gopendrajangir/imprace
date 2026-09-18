/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigation from './navigation/Navigator';
import { InterviewSetupContextProvider, ThemeProvider } from './contexts';
import { PaperProvider } from 'react-native-paper';

function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  return (
    <PaperProvider>
      <ThemeProvider>
        <InterviewSetupContextProvider>
          <RootNavigation />
        </InterviewSetupContextProvider>
      </ThemeProvider>
    </PaperProvider>
  );
}

export default App;
