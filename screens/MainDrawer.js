import { Ionicons } from '@expo/vector-icons';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem, DrawerItemList } from '@react-navigation/drawer';
import { Alert, StyleSheet, Text, View } from 'react-native';
import DashboardScreen from './DashboardScreen';

const Drawer = createDrawerNavigator();

// Dummy Screens for placing in Drawer
const DummyScreen = ({ name }) => (
    <View style={styles.dummyContainer}>
        <Ionicons name="construct-outline" size={48} color="#ccc" />
        <Text style={styles.dummyText}>{name} Screen coming soon...</Text>
    </View>
);

const CustomDrawerContent = (props) => {
    return (
        <DrawerContentScrollView {...props} contentContainerStyle={{ flex: 1, paddingTop: 40 }}>
            <View style={styles.drawerHeader}>
                <View style={styles.logoCircle}>
                    <Text style={styles.logoText}>AI</Text>
                </View>
                <Text style={styles.appName}>AI Stylist</Text>
            </View>
            <View style={{ flex: 1 }}>
                <DrawerItemList {...props} />
            </View>
            <View style={styles.logoutSection}>
                <DrawerItem
                    label="Logout"
                    icon={({ color, size }) => <Ionicons name="log-out-outline" size={size} color={color} />}
                    labelStyle={{ fontSize: 16, marginLeft: -10 }}
                    onPress={() => {
                        Alert.alert("Logout", "Are you sure you want to log out?", [
                            { text: "Cancel", style: "cancel" },
                            { text: "Logout", style: 'destructive', onPress: () => props.navigation.replace('Landing') }
                        ]);
                    }}
                />
            </View>
        </DrawerContentScrollView>
    );
};

export default function MainDrawer() {
    return (
        <Drawer.Navigator
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                headerShown: false,
                drawerActiveBackgroundColor: '#632024',
                drawerActiveTintColor: '#fff',
                drawerInactiveTintColor: '#6F4D38',
                drawerLabelStyle: { fontSize: 16, marginLeft: -10 },
                drawerItemStyle: { borderRadius: 12, marginHorizontal: 12, marginVertical: 4 },
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
                component={() => <DummyScreen name="My Style Profile" />}
                options={{
                    title: 'My Style Profile',
                    drawerIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />
                }}
            />
            <Drawer.Screen
                name="GenerateOutfit"
                component={() => <DummyScreen name="Generate Outfit" />}
                options={{
                    title: 'Generate Outfit',
                    drawerIcon: ({ color, size }) => <Ionicons name="color-wand-outline" size={size} color={color} />
                }}
            />
            <Drawer.Screen
                name="History"
                component={() => <DummyScreen name="History" />}
                options={{
                    title: 'History',
                    drawerIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />
                }}
            />
            <Drawer.Screen
                name="Settings"
                component={() => <DummyScreen name="Settings" />}
                options={{
                    title: 'Settings',
                    drawerIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />
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
    dummyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#D5B893'
    },
    dummyText: {
        fontSize: 18,
        color: '#6F4D38',
        marginTop: 16,
    },
    logoutSection: {
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingBottom: 20,
        paddingTop: 10,
    }
});
