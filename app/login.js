import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react'; // <--- useEffect ADICIONADO AQUI
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import { supabase } from '@/lib/supabase';
import { colors } from '../styles/global';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
    const router = useRouter();
    const { signIn, isBiometricSupport, loginWithBiometrics, getBiometricCredentials } = useAuth();

    useEffect(() => {
        const checkBiometrics = async () => {
            const supported = await isBiometricSupport();
            const credentials = await getBiometricCredentials();
            setIsBiometricEnabled(supported && !!credentials);
        };
        checkBiometrics();
    }, []);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Erro', 'Por favor, preencha todos os campos');
            return;
        }

        setIsLoading(true);
        
        const { data, error } = await signIn(email, password);
            
        if (error) {
            Alert.alert('Erro de Login', error.message);
            setIsLoading(false);
            return;
        }

        if (data?.user) {
            const { data: memberships, error: membershipError } = await supabase
                .from('membros_empresa')
                .select('empresa_id, empresas ( nome )')
                .eq('user_id', data.user.id);

            if (membershipError) {
                Alert.alert('Erro', 'Não foi possível verificar as suas empresas.');
                setIsLoading(false);
                return;
            }

            if (!memberships || memberships.length === 0) {
                Alert.alert('Acesso Negado', 'Você não é membro de nenhuma empresa.');
                setIsLoading(false);
                return;
            }

            if (memberships.length === 1) {
                router.replace('/(tabs)');
            } 
            else {
                router.replace({
                    pathname: '/select-company',
                    params: { userId: data.user.id }
                });
            }
        } else {
            Alert.alert('Erro', 'Não foi possível obter dados do usuário.');
        }
        
        setIsLoading(false);
    };

    const handleBiometricLogin = async () => {
        setIsLoading(true);
        const success = await loginWithBiometrics();
        
        if (!success) {
            Alert.alert('Erro', 'Não foi possível autenticar com biometria.');
            setIsLoading(false);
            return;
        }
        
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            Alert.alert('Erro', 'Não foi possível obter dados do usuário.');
            setIsLoading(false);
            return;
        }

        const { data: memberships, error: membershipError } = await supabase
            .from('membros_empresa')
            .select('empresa_id, empresas ( nome )')
            .eq('user_id', user.id);

        if (membershipError) {
            Alert.alert('Erro', 'Não foi possível verificar as suas empresas.');
            setIsLoading(false);
            return;
        }
        if (!memberships || memberships.length === 0) {
            Alert.alert('Acesso Negado', 'Você não é membro de nenhuma empresa.');
            setIsLoading(false);
            return;
        }
        if (memberships.length === 1) {
            router.replace('/(tabs)');
        } else {
            router.replace({
                pathname: '/select-company',
                params: { userId: user.id }
            });
        }
        setIsLoading(false);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingContainer}
        >
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.content}>
                    <View style={{ alignItems: 'center', marginBottom: 10 }}>
                        <Image
                            source={require('../assets/images/icon.png')}
                            style={{ width: 240, height: 60 }}
                            resizeMode="contain"
                        />
                    </View>
                    
                    <View style={styles.form}>
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            autoComplete="email"
                            placeholderTextColor={colors.textLight}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Senha"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoComplete="password"
                            placeholderTextColor={colors.textLight}
                        />
                        
                        {isLoading ? (
                            <View style={styles.loaderContainer}>
                                <ActivityIndicator size="large" color={colors.primary} />
                                <Text style={styles.loaderText}>Entrando...</Text>
                            </View>
                        ) : (
                            <View style={styles.buttonContainer}>
                                {isBiometricEnabled && (
                                    <TouchableOpacity 
                                        style={[styles.button, styles.biometricButton]} 
                                        onPress={handleBiometricLogin}
                                    >
                                        <Text style={styles.biometricButtonText}>🔐 Entrar com Digital</Text>
                                    </TouchableOpacity>
                                )}
                                
                                <TouchableOpacity 
                                    style={[styles.button, styles.loginButton]} 
                                    onPress={handleLogin}
                                >
                                    <Text style={styles.loginButtonText}>Entrar</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                    
                    <TouchableOpacity 
                        style={styles.linkContainer}
                        onPress={() => router.replace('/signup')}
                    >
                        <Text style={styles.link}>Não tem uma conta? Cadastre-se</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    keyboardAvoidingContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },
    container: {
        flexGrow: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    content: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 32,
        width: '100%',
        maxWidth: 420,
        elevation: 4,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    form: {
        marginBottom: 24,
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        fontSize: 16,
        backgroundColor: colors.white,
    },
    loaderContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    loaderText: {
        marginTop: 12,
        fontSize: 16,
        color: colors.textLight,
    },
    buttonContainer: {
        gap: 12,
    },
    button: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    biometricButton: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.border,
    },
    loginButton: {
        backgroundColor: colors.primary,
    },
    biometricButtonText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    loginButtonText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    linkContainer: {
        alignItems: 'center',
        marginTop: 16,
    },
    link: {
        color: colors.primary,
        fontSize: 16,
        textDecorationLine: 'underline',
    },
});