import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

export default function OAuthRedirectScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/backup');
  }, [router]);

  return <View />;
}
