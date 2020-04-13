import {FirebaseAuthTypes} from '@react-native-firebase/auth';
import { useContext } from 'react';
import {UserContext,User} from '../App'
import {Image} from 'react-native'

type ProviderID = 'google.com' | 'facebook.com';

const providerNames = {
  'google.com': 'Google',
  'facebook.com': 'Facebook',
};

const providerTitles: {[key: string]: string} = {
  SIGN_IN: 'Sign in with',
  LINK: 'Link',
  UNLINK: 'Unlink',
};

/**
 * Return array of user auth providers
 */
export function getProviders(user: FirebaseAuthTypes.User | null) {
  if (user) {
    console.log(user.providerData,"what?")
    return user.providerData.map(provider => provider.providerId);
  }

  return [];
}
export const useSession = () => {
  const user  = useContext(UserContext) as User;
  return user;
};

export function getProviderButtonTitle(
  user: FirebaseAuthTypes.User | null,
  providerID: ProviderID,
) {
  const providers = getProviders(user);
  const isProvider = providers.includes(providerID);
  const isOnlyProvider = providers.length === 1 && isProvider;
  let variant = 'SIGN_IN';

  if (user) {
    variant = isProvider ? 'UNLINK' : 'LINK';
  }

  return {
    variant,
    title: `${providerTitles[variant]} ${providerNames[providerID]}`,
    isOnlyProvider,
  };
}

export async function prefetchImages(urls:string[]){
  let error = false
  let complete = false;
    const tasks = urls.map(url => Image.prefetch(url))
    try {
      await Promise.all(tasks)
      complete = true
    } catch(e) {
      error = true;
    }
    return {error, complete}
   
}
