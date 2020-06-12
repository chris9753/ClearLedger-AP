import { createPersistContext } from 'react-native-use-persist-storage';
import {FirebaseAuthTypes } from '@react-native-firebase/auth'

export const AuthCredential = createPersistContext({
  storageKey: '@AuthCredential',
  defaultData: {
  } as FirebaseAuthTypes.AuthCredential,
  //sensitive auth data
  options: { sensitive: true as any }
});
