import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAppState } from '@/contexts/AppStateContext';

export default function Index() {
  const { profile, isLoading } = useAppState();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#ff0080" />
      </View>
    );
  }

  if (!profile.isAuthenticated || profile.role === null) {
    return <Redirect href="/welcome" />;
  }

  return <Redirect href="/feed" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0f',
  },
});
