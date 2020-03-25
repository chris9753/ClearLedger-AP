import React, { Fragment } from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import ForgotPassword from './ForgotPassword';
import PhoneSignIn from './PhoneSignIn';
import SignIn from './SignIn';
import theme from '../theme'
import { StyleSheet, TouchableWithoutFeedback, Button, View,TouchableOpacity,Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
const Stack = createStackNavigator();

function SignedOutStack() {

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
         
          headerTitle:"",
          headerBackTitle:"",            
          headerBackTitleVisible:false,
          headerTransparent:true,
          headerStyle: {
            height: 100,
            backgroundColor: theme.colors.light.background,
          },
          headerLeft: ({onPress,canGoBack}) => {
            
            return  canGoBack ? ( <TouchableOpacity 
            style={styles.back}
                 onPress={onPress} >
                <Icon name="long-arrow-left" size={24} color="#000" /> 
            </TouchableOpacity> ) : null
          }  ,
          headerTintColor: theme.colors.light.text.heading,
        }}>
        <Stack.Screen
          name="SignIn"
          component={SignIn}
        />
  
        <Stack.Screen name="PhoneSignIn" component={PhoneSignIn} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
const styles = StyleSheet.create({

  back: {
    marginLeft:22,
    padding:14
  }
});

export default SignedOutStack;
