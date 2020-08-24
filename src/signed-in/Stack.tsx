import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import React, { useContext, createContext } from 'react';
import { Theme, withTheme } from 'react-native-paper';
import Wander from './main/Wander';
import Settings from './main/Settings';
import { UserContext } from '../App';
import theme from '../theme';
import CompleteAccountCreation from './intro/CompleteAccountCreation';
import PublicProfile from './main/PublicProfile';
import Profile from './main/Profile';
import User from '../entities/users/model'
import { ProfileSetup } from '../contexts/auth'
import { forFade } from '../animations/stack';
// Before rendering any navigation stack
import { enableScreens } from 'react-native-screens';
import { TransitionSpec } from '@react-navigation/stack/lib/typescript/src/types';
import { Profile as ProfileModel } from '../entities/profiles/model';
import {ProfileService} from '../entities/profiles/service'
import { Connection as ConnectionModel } from '../entities/connections/model'
import { Chat as ChatModel } from '../entities/chats/model'
import { useProfile, useConnections, useChats } from '../util/firebase';
import Dashboard from './main/connections/Dashboard';
import ChatScreen from './main/connections/ChatScreen';
enableScreens();
interface Props {
  theme: Theme;
}
/**
 * Context
 */
export const ProfileContext = createContext<ProfileModel | null>(null);
export const ConnectionsContext = createContext<ConnectionModel | null>(null);
export const ChatContext = createContext<ChatModel[] | null>(null)
const Stack = createStackNavigator();
function SignedInStack() {
  //spring takes too long to resolve blocks pan guesture on sibling screen
  const { profile, loading, error } = useProfile()
  const { connection } = useConnections()
  const { chats } = useChats()
  const config = {
    animation: 'timing',
    config: {
      stiffness: 1000,
      damping: 500,
      mass: 3,
      overshootClamping: true,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
      duration: 200,
      useNativeDriver: true
    }
  } as TransitionSpec
  
  function main() {
    return <ProfileContext.Provider value={profile}>
      <ConnectionsContext.Provider value={connection}>
        <ChatContext.Provider value={chats}>

          <NavigationContainer>
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
                  animationEnabled: true
                }}

              />

              <Stack.Screen
                name="Dashboard"
                component={Dashboard}
                options={{
                  transitionSpec: {
                    open: config,
                    close: config,
                  },
                  animationEnabled: true
                }}

              />
              <Stack.Screen
                name="PublicProfile"
                component={PublicProfile}
                options={{ cardStyleInterpolator: forFade }}


              />
              <Stack.Screen
                name="ChatScreen"
                component={ChatScreen}
                options={{ cardStyleInterpolator: forFade }}


              />
              <Stack.Screen name="Settings" component={Settings} />
            </Stack.Navigator>
          </NavigationContainer>
        </ChatContext.Provider>
      </ConnectionsContext.Provider>
    </ProfileContext.Provider>


  }
  function intro() {
    return <ProfileContext.Provider value={profile}>
      <NavigationContainer>
      <Stack.Navigator
        screenOptions={{

          headerTitle: "",
          headerBackTitle: "",
          headerBackTitleVisible: false,
          headerTransparent: true,
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
    </ProfileContext.Provider>
  }
      const profileservice = new ProfileService(profile as any)
  return !User()?.isUserComplete() || profileservice.profileSetupStage() < 2 ? intro() : main()
}

export default SignedInStack
