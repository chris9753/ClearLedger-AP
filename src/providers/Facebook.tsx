import auth from '@react-native-firebase/auth';
import React, {useContext, useState} from 'react';
import {Alert,StyleSheet,StyleSheetProperties, ViewStyle} from 'react-native';
import {AccessToken, LoginManager} from 'react-native-fbsdk';
import {UserContext} from '../App';
import ProviderButton from '../components/ProviderButton';
import {getProviderButtonTitle} from '../util/helpers';

const PROVIDER_ID = 'facebook.com';
interface Props {
  style?: ViewStyle;
}
function Facebook({style}:Props) {
  const [loading, setLoading] = useState(false);
  const user = useContext(UserContext);

  const {isOnlyProvider, title, variant} = getProviderButtonTitle(
    user,
    PROVIDER_ID,
  );

  async function handleFacebook() {
    if (!loading) {
      setLoading(true);

      try {
        if (variant === 'UNLINK' && user) {
          await user.unlink(PROVIDER_ID);
        } else {
          const {isCancelled} = await LoginManager.logInWithPermissions([
            'public_profile',
            'email'
          ]);

          if (isCancelled) {
            Alert.alert('Facebook Auth Canceled');
          } else {
            const result = await AccessToken.getCurrentAccessToken();
            if (!result) {
              throw new Error(
                'No Access Token was returned from Facebook SDK.',
              );
            }

            const {accessToken} = result;

            const credential = auth.FacebookAuthProvider.credential(
              accessToken,
            );

            if (variant === 'LINK' && user) {
              await user.linkWithCredential(credential);
            } else if (variant === 'SIGN_IN') {
              await auth().signInWithCredential(credential);
            }
          }
        }
      } catch (error) {
        Alert.alert('Facebook Auth Error', error.message);
      } finally {
        setLoading(false);
      }
    }
  }

  if (isOnlyProvider) {
    return null;
  }

  return (
    <ProviderButton style={style} loading={loading} type="facebook" onPress={handleFacebook}>
      {title}
    </ProviderButton>
  );
}

export default Facebook;
