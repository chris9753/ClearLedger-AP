import { createPersistContext } from 'react-native-use-persist-storage';
import {FirebaseAuthTypes } from '@react-native-firebase/auth'
import { Profile } from 'src/entities/profiles/model';
interface ProfileSetupType {
  stage:number
}
export const AuthCredential = createPersistContext({
  storageKey: '@AuthCredential',
  defaultData: {
  } as FirebaseAuthTypes.AuthCredential,
  //sensitive auth data
  options: { sensitive: true as any }
});

export const ProfileSetup = createPersistContext({
  storageKey: '@ProfileSetup',
  defaultData: {
  } as ProfileSetupType,
  //sensitive auth data
  options: { sensitive: true as any }
});
