import React, {useEffect, useState} from 'react';
import auth from '@react-native-firebase/auth';
import {Alert, ScrollView, StyleSheet, View, Text} from 'react-native';
import {Button, HelperText, Paragraph, TextInput} from 'react-native-paper';
import layout from '../../signed-out/layout';
import ProviderButton from '../../components/ProviderButton';
import { NavigationParams } from 'react-navigation';
import CustomButton from '../../components/CustomButton';

interface Props {
  navigation: NavigationParams;
}

function CompleteAccountCreation({ navigation }: Props) {
  const [loading, setLoading] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirm, setConfirm] = useState<string>('');

  const [help, setHelp] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (error) {
      Alert.alert('Create Account - Error', error);
    }
  }, [error]);

  useEffect(() => {
    if (password === confirm) {
      setHelp('');
    } else if (password && confirm && password !== confirm) {
      setHelp('Passwords do not match.');
    }
  }, [password, confirm]);

  async function handleCreate() {
    try {
      setLoading(true);
      setError('');
      await auth().createUserWithEmailAndPassword(email, password);
    } catch (e) {
      switch (e.code) {
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        case 'auth/user-disabled':
          setError('This account has been disabled.');
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError('No user found or wrong password.');
          break;
        default:
          console.error(e);
          break;
      }

      setLoading(false);
    }
  }

  return (
    <View style={layout.container}>
    <View style={layout.main}>
    <View style={[layout.row, layout.header]}>
          <View style={layout.column}>
            <Text style={layout.heading}>
              Just a few more details...
            </Text>
          </View>
        </View>
      <Paragraph>
        Create an account with your email and password. Once created you will be
        automatically logged in to your profile:
      </Paragraph>
      {/* <TextInput
        style={styles.input}
        mode="outlined"
        label="Email Address"
        value={email}
        onChangeText={setEmail}
        theme={inputTheme}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextInput
        secureTextEntry
        style={styles.input}
        mode="outlined"
        label="Password"
        value={password}
        onChangeText={setPassword}
        theme={inputTheme}
      />
      <TextInput
        secureTextEntry
        style={styles.input}
        mode="outlined"
        label="Confirm Password"
        value={confirm}
        onChangeText={setConfirm}
        theme={inputTheme}
      /> */}
      <HelperText type="error" visible={!!help}>
        {help}
      </HelperText>
      <View style={[layout.full,layout.cta]}>
      <CustomButton
             textColor={'#fff'}
             color={'#F11856'}
             solid={true}
            loading={loading}
            onPress={() => (loading ? null : handleCreate())}
            disabled={!email || !password || !confirm || !!help}
            >
            {loading ? 'Creating Account' : 'Create Account'}
        </CustomButton>
        </View>
      
    </View>
    </View>
  );
}

const inputTheme = {
  colors: {
    background: '#fff',
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  input: {
    marginVertical: 10,
  },
});

export default CompleteAccountCreation;
