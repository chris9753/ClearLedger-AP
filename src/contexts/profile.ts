import { createPersistContext } from 'react-native-use-persist-storage';
import {FirebaseAuthTypes } from '@react-native-firebase/auth'
import {Settings as ProfileSettings} from '../entities/profiles/model'
export const ProfileComplete = createPersistContext({
  storageKey: '@ProfileCompletedStage',
  defaultData: {stage:0} as any
});

export const Settings = createPersistContext({
  storageKey: '@ProfileSettings',
  defaultData: {
    
  } as ProfileSettings ,
});