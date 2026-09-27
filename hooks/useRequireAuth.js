import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

/**
 * useRequireAuth
 * Security hook to protect screens that require authentication.
 * If no valid userId is found, it immediately blocks rendering and resets
 * the navigation stack to the Login screen.
 */
export function useRequireAuth() {
  const navigation = useNavigation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isVerifying, setIsVerifying] = useState(true);

  const verifyAuthentication = useCallback(async () => {
    try {
      const storedId = await AsyncStorage.getItem('userId');
      if (!storedId || typeof storedId !== 'string' || storedId.trim() === '') {
        setIsAuthenticated(false);
        setUserId(null);
        setIsVerifying(false);

        // Security redirect: Reset navigation stack so no back-navigation can access this screen
        const rootNav = navigation.getParent() || navigation;
        rootNav.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return;
      }

      setUserId(storedId);
      setIsAuthenticated(true);
      setIsVerifying(false);
    } catch (err) {
      console.error('Security auth verification error:', err);
      setIsAuthenticated(false);
      setIsVerifying(false);
      const rootNav = navigation.getParent() || navigation;
      rootNav.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  }, [navigation]);

  useEffect(() => {
    verifyAuthentication();
  }, [verifyAuthentication]);

  useFocusEffect(
    useCallback(() => {
      verifyAuthentication();
    }, [verifyAuthentication])
  );

  return { isAuthenticated, userId, isVerifying };
}

export default useRequireAuth;
