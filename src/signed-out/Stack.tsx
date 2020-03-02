import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {Theme, withTheme} from 'react-native-paper';
import CreateAccount from './CreateAccount';
import ForgotPassword from './ForgotPassword';
import PhoneSignIn from './PhoneSignIn';
import SignIn from './SignIn';

interface Props {
  theme: Theme;
}

const Stack = createStackNavigator();

function SignedOutStack({theme}: Props) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          // headerShown: false,
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: theme.colors.accent,
        }}>
        <Stack.Screen
          name="SignIn"
          component={SignIn}
        />
        <Stack.Screen
          name="CreateAccount"
          options={{title: 'Create Account'}}
          component={CreateAccount}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPassword}
          options={{title: 'Forgot Password'}}
        />
        <Stack.Screen name="PhoneSignIn" component={PhoneSignIn} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default withTheme(SignedOutStack);
