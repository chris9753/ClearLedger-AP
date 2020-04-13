import React from 'react';
import {Text, StatusBar} from 'react-native';
import {createContext, ReactNode, useEffect, useState} from 'react';
import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import {Provider} from 'react-native-paper';

import {paperTheme} from './theme';
import SignedInStack from './signed-in/Stack';
import SignedOutStack from './signed-out/Stack';
import Splash from './SplashScreen';


/**
 * Types
 */
export type User = FirebaseAuthTypes.User | null;

/**
 * Context
 */
export const UserContext = createContext<User>(null);
const wait = (time: any) => new Promise((resolve) => setTimeout(resolve, time));
function App() {
  const [initializing, setInitializing] = useState(true);
  const [listenUser, setListenUser] = useState(false);
  const [user, setUser] = useState<User>(null);

  /** Listen for auth state changes */
  useEffect(() => {
    const authListener = auth().onAuthStateChanged( async result => {
      setUser(result);
      if (initializing && !listenUser) {
        //2 second animation
        await wait(4500)
        setInitializing(false);
        setListenUser(true);
      }
    });
    return () => {
      if (authListener) {
        authListener();
      }
    };
   
  }, [initializing, listenUser]);

  /** Listen for user changes */
  useEffect(() => {
    let userListener: () => void;

    if (listenUser) {
      userListener = auth().onUserChanged(result => {
        setUser(result);
      });
    }

    return () => {
      if (userListener) {
        userListener();
      }
    };
  }, [listenUser]);

  if (initializing) {
    return <Splash></Splash>
  }
 
  function container(children: ReactNode | ReactNode[]) {
    return <Provider theme={paperTheme}>{children}</Provider>;
  }

  return container(
    user ? (
      <UserContext.Provider value={user}>
        <SignedInStack />
      </UserContext.Provider>
    ) : (
      <SignedOutStack />
    ),
  );
}

export default App;
