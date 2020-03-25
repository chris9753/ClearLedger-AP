import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useContext } from 'react';
import { Theme, withTheme } from 'react-native-paper';
import Wander from './main/Wander';
import Settings from './main/Settings';
import { UserContext } from '../App';
import theme from '../theme';
import CompleteAccountCreation from './intro/CompleteAccountCreation';

interface Props {
  theme: Theme;
}

const Stack = createStackNavigator();

function SignedInStack() {
  const user = useContext(UserContext);

  function main() {
    return <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          headerStyle: {
            backgroundColor: theme.colors.light.primary,
          },
          headerTintColor: theme.colors.light.accent,
        }}>
        <Stack.Screen
          name="Wander"
          component={Wander}
        />
        <Stack.Screen name="Settings" component={Settings} />
      </Stack.Navigator>
    </NavigationContainer>
  }
  function intro() {
    return <NavigationContainer>
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
      headerTintColor: theme.colors.light.text.heading,
    }}
      >
      <Stack.Screen
        name="CompleteAccountCreation"
        component={CompleteAccountCreation}
      />
    </Stack.Navigator>
  </NavigationContainer>
  }

  return !user?.email ? main() : intro()
}

export default SignedInStack
