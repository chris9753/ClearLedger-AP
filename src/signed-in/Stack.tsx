import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import React, { useContext } from 'react';
import { Theme, withTheme } from 'react-native-paper';
import Wander from './main/Wander';
import Settings from './main/Settings';
import { UserContext } from '../App';
import theme from '../theme';
import CompleteAccountCreation from './intro/CompleteAccountCreation';
import PublicProfile from './main/PublicProfile';
import Profile from './main/Profile';
import User from '../entities/users/model'
import {ProfileComplete} from '../contexts/profile'
import { forFade } from '../animations/stack';
// Before rendering any navigation stack
import { enableScreens } from 'react-native-screens';
import { TransitionSpec } from '@react-navigation/stack/lib/typescript/src/types';
enableScreens();
interface Props {
  theme: Theme;
}

const Stack = createStackNavigator();
function SignedInStack() {
  const user = useContext(UserContext);
  const config = {
    animation: 'spring',
    config: {
      stiffness: 1000,
      damping: 500,
      mass: 3,
      overshootClamping: true,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
      useNativeDriver:true
    }
  } as TransitionSpec
  const [profileCompleted, _] = ProfileComplete.useData()
  function main() {
    return <NavigationContainer>
      <Stack.Navigator
      
        screenOptions={{
          headerShown: false,
          headerStyle: {
            backgroundColor: theme.colors.light.primary,
          },
          headerTintColor: theme.colors.light.accent,
        }
        }

        >
        <Stack.Screen
          name="Wander"
          component={Wander}
  
        />
          <Stack.Screen
          name="Profile"
          component={Profile}
          options={{
            transitionSpec: {
              open: config,
              close: config,
            },
            animationEnabled:true
          }}
  
        />
           <Stack.Screen
          name="PublicProfile"
          component={PublicProfile}
          options={{ cardStyleInterpolator: forFade }}
      
          
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

  return User()?.isUserComplete() && !profileCompleted ? intro() :  main()
}

export default SignedInStack
