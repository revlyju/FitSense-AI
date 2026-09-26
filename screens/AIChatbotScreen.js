import React, { useState, useRef, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    TextInput, 
    FlatList, 
    KeyboardAvoidingView, 
    Platform, 
    ActivityIndicator,
    Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import { useTheme } from '../contexts/ThemeContext';

export default function AIChatbotScreen({ navigation }) {
    const { theme, isDark } = useTheme();
    const [messages, setMessages] = useState([
        { id: '1', text: "Hello! I'm your AI Stylist. How can I help you with your look today?", sender: 'ai' }
    ]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState(null);
    const flatListRef = useRef(null);

    useEffect(() => {
        const getUid = async () => {
            const uid = await AsyncStorage.getItem('userId');
            setUserId(uid);
        };
        getUid();
    }, []);

    const sendMessage = async () => {
        if (inputText.trim() === '' || loading) return;

        const userMsg = { id: Date.now().toString(), text: inputText, sender: 'user' };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInputText('');
        setLoading(true);

        try {
            // Prepare messages for Groq format
            const apiMessages = newMessages.map(m => ({
                role: m.sender === 'user' ? 'user' : 'assistant',
                content: m.text
            }));

            const response = await axios.post(`${API_BASE_URL}/api/chat`, {
                messages: apiMessages,
                userId: userId
            });

            if (response.data && response.data.content) {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    text: response.data.content,
                    sender: 'ai'
                }]);
            }
        } catch (error) {
            console.error("Chat Error:", error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                text: "Sorry, I'm having trouble connecting right now. Please try again later.",
                sender: 'ai'
            }]);
        } finally {
            setLoading(false);
            Keyboard.dismiss();
        }
    };

    const renderMessage = ({ item }) => (
        <View style={[
            styles.messageBubble, 
            item.sender === 'user' ? styles.userBubble : styles.aiBubble
        ]}>
            <Text style={[
                styles.messageText,
                item.sender === 'user' ? styles.userText : styles.aiText
            ]}>
                {item.text}
            </Text>
        </View>
    );

    return (
        <KeyboardAvoidingView 
            style={[styles.container, { backgroundColor: theme.background }]} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={styles.menuButton}>
                    <Ionicons name="menu-outline" size={28} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>AI Stylist Chat</Text>
                <TouchableOpacity onPress={() => setMessages([{ id: '1', text: "Hello! I'm your AI Stylist. How can I help you today?", sender: 'ai' }])}>
                    <Ionicons name="trash-outline" size={22} color={theme.accent} />
                </TouchableOpacity>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.chatList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            {loading && (
                <View style={styles.typingContainer}>
                    <ActivityIndicator size="small" color="#632024" />
                    <Text style={styles.typingText}>Stylist is thinking...</Text>
                </View>
            )}

            <View style={[styles.inputArea, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
                    placeholder="Type your fashion question..."
                    placeholderTextColor={theme.textSecondary}
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                />
                <TouchableOpacity 
                    style={[styles.sendButton, { backgroundColor: theme.accent }, !inputText.trim() && styles.sendButtonDisabled]} 
                    onPress={sendMessage}
                    disabled={!inputText.trim() || loading}
                >
                    <Ionicons name="send" size={20} color="#fff" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF9F6' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    menuButton: { marginRight: 15 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#25344F' },
    chatList: { padding: 20, paddingBottom: 40 },
    messageBubble: {
        maxWidth: '85%',
        padding: 14,
        borderRadius: 20,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        elevation: 1
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#632024',
        borderBottomRightRadius: 4
    },
    aiBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#eee'
    },
    messageText: { fontSize: 15, lineHeight: 22 },
    userText: { color: '#fff' },
    aiText: { color: '#25344F' },
    inputArea: {
        flexDirection: 'row',
        padding: 15,
        paddingBottom: Platform.OS === 'ios' ? 35 : 15,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        alignItems: 'center'
    },
    input: {
        flex: 1,
        backgroundColor: '#f8f8f8',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 10,
        fontSize: 15,
        maxHeight: 100,
        marginRight: 10,
        color: '#25344F'
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#632024',
        justifyContent: 'center',
        alignItems: 'center'
    },
    sendButtonDisabled: {
        backgroundColor: '#ccc'
    },
    typingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 10
    },
    typingText: {
        marginLeft: 8,
        fontSize: 12,
        color: '#6F4D38',
        fontStyle: 'italic'
    }
});
