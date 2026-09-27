import { Ionicons } from '@expo/vector-icons';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem, DrawerItemList } from '@react-navigation/drawer';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import AIChatbotScreen from './AIChatbotScreen';
import DashboardScreen from './DashboardScreen';
import GenerateOutfitScreen from './GenerateOutfitScreen';
import HistoryScreen from './HistoryScreen';
import MyStyleProfileScreen from './MyStyleProfileScreen';
import SettingsScreen from './SettingsScreen';
import VirtualTryonScreen from './VirtualTryonScreen';

const Drawer = createDrawerNavigator();


import AsyncStorage from '@react-native-async-storage/async-storage';
import useRequireAuth from '../hooks/useRequireAuth';

const CustomDrawerContent = (props) => {
    const { theme, isDark } = useTheme();
    return (
        <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1, paddingTop: 40, backgroundColor: theme.background }}>
            <View style={[styles.drawerHeader, { borderBottomColor: theme.border }]}>
                <View style={[styles.logoCircle, { backgroundColor: theme.accent }]}>
                    <Text style={styles.logoText}>AI</Text>
                </View>
                <Text style={[styles.appName, { color: theme.text }]}>AI Stylist</Text>
            </View>
            <View style={{ flex: 1 }}>
                <DrawerItemList {...props} />
            </View>
            <View style={[styles.logoutSection, { borderTopColor: theme.border }]}>
                <DrawerItem
                    label="Logout"
                    icon={({ color, size }) => <Ionicons name="log-out-outline" size={size} color={color} />}
                    labelStyle={{ fontSize: 16, marginLeft: -10 }}
                    onPress={() => {
                        Alert.alert("Logout", "Are you sure you want to log out?", [
                            { text: "Cancel", style: "cancel" },
                            {
                                text: "Logout",
                                style: 'destructive',
                                onPress: async () => {
                                    try {
                                        await AsyncStorage.removeItem('userId');
                                        await AsyncStorage.removeItem('@latest_analysis');
                                    } catch (e) {
                                        console.error("Logout error:", e);
                                    }
                                    const rootNav = props.navigation.getParent() || props.navigation;
                                    rootNav.reset({
                                        index: 0,
                                        routes: [{ name: 'Login' }],
                                    });
                                }
                            }
                        ]);
                    }}
                />
            </View>
        </DrawerContentScrollView>
    );
};

export default function MainDrawer() {
    const { theme, isDark } = useTheme();
    const { isAuthenticated, isVerifying } = useRequireAuth();

    if (isVerifying || !isAuthenticated) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: theme.textSecondary, marginTop: 10 }}>Verifying security...</Text>
            </View>
        );
    }

    return (
        <Drawer.Navigator
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                headerShown: false,
                drawerActiveBackgroundColor: theme.accent,
                drawerActiveTintColor: '#fff',
                drawerInactiveTintColor: theme.textSecondary,
                drawerLabelStyle: { fontSize: 16, marginLeft: -10 },
                drawerItemStyle: { borderRadius: 12, marginHorizontal: 12, marginVertical: 4 },
                drawerStyle: { backgroundColor: theme.background },
            }}
        >
            <Drawer.Screen
                name="DashboardRoot"
                component={DashboardScreen}
                options={{
                    title: 'Dashboard',
                    drawerIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />
                }}
            />
            <Drawer.Screen
                name="MyStyleProfile"
                component={MyStyleProfileScreen}
                options={{
                    title: 'Liked Outfits',
                    drawerIcon: ({ color, size }) => <Ionicons name="heart-outline" size={size} color={color} />
                }}
            />
            <Drawer.Screen
                name="History"
                component={HistoryScreen}
                options={{
                    title: 'Analysis History',
                    drawerIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />
                }}
            />
            <Drawer.Screen
                name="GenerateOutfit"
                component={GenerateOutfitScreen}
                options={{
                    title: 'Style Anything',
                    drawerIcon: ({ color, size }) => <Ionicons name="sparkles-outline" size={size} color={color} />
                }}
            />
            <Drawer.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    title: 'Settings',
                    drawerIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />
                }}
            />
            <Drawer.Screen
                name="AIChatbot"
                component={AIChatbotScreen}
                options={{
                    title: 'AI Chatbot',
                    drawerIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size} color={color} />
                }}
            />
            <Drawer.Screen
                name="VirtualTryon"
                component={VirtualTryonScreen}
                options={{
                    title: 'Virtual Tryon',
                    drawerIcon: ({ color, size }) => <Ionicons name="shirt-outline" size={size} color={color} />
                }}
            />
        </Drawer.Navigator>
    );
}

const styles = StyleSheet.create({
    drawerHeader: {
        padding: 20,
        paddingBottom: 30,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        marginBottom: 10,
        alignItems: 'center',
        flexDirection: 'row',
    },
    logoCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#25344F',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    logoText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 16,
    },
    appName: {
        fontSize: 22,
        fontWeight: '700',
        color: '#25344F'
    },
    logoutSection: {
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingBottom: 20,
        paddingTop: 10,
    }
});
