import dayjs from 'dayjs';
import React, {useContext,Fragment} from 'react';
import {StyleSheet, View, SafeAreaView} from 'react-native';
import {
  Avatar,
  Caption,
  FAB,
  Headline,
  Subheading,
  Theme,
  Title,
  withTheme,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {NavigationParams} from 'react-navigation';
import {UserContext} from '../../App';
import Hero from '../../components/Hero';
import Provider from '../../components/Provider';
import Facebook from '../../providers/Facebook';
import {getProviders} from '../../util/helpers';
import GlobalTheme from '../../theme'
import { TouchableOpacity } from 'react-native-gesture-handler';
import SwipeableCard from '../../components/SwipeableCard'
import { useCountRenders } from '../../util/performance';
interface Props {
  theme: Theme;
  navigation: NavigationParams;
}

function Profile({theme, navigation}: Props) {
  const user = useContext(UserContext);
  if (!user) {
    return null;
  }

  // Array of providers the the user is linked with
  const providers = getProviders(user);
  const people = [
    {id:"1",name:'Renee',age:29,image:'https://www.rd.com/wp-content/uploads/2017/09/01-shutterstock_476340928-Irina-Bg.jpg'},
    {id:"2",name:'Larissa',age:24,image:'https://i.pinimg.com/originals/de/37/12/de3712f462935f8ff575163b49a873e4.jpg'},
    {id:"3",name:'Jessica',age:27,image:'https://media1.popsugar-assets.com/files/thumbor/wEGOPo0a79UtVVUmjw4RAwgWHCQ/fit-in/2048xorig/filters:format_auto-!!-:strip_icc-!!-/2017/10/11/729/n/1922153/62782e360d300357_PS17_Q3_Brand_Day02_Scene01_177/i/Your-Online-Dating-Profile-Pictures.jpg'},
    {id:"4",name:'Tammy',age:24,image:'https://i.pinimg.com/originals/de/37/12/de3712f462935f8ff575163b49a873e4.jpg'},
    {id:"5",name:'Lenor',age:27,image:'https://media1.popsugar-assets.com/files/thumbor/wEGOPo0a79UtVVUmjw4RAwgWHCQ/fit-in/2048xorig/filters:format_auto-!!-:strip_icc-!!-/2017/10/11/729/n/1922153/62782e360d300357_PS17_Q3_Brand_Day02_Scene01_177/i/Your-Online-Dating-Profile-Pictures.jpg'}
  ] as any[]
  return (
    <View style={styles.container}>
      <Hero colors={['#15212B', '#15212B']} >
        <TouchableOpacity>
        <Icon name="circle-notch" color={GlobalTheme.colors.light.text.warning} size={32} />
        </TouchableOpacity>
        <TouchableOpacity>
        <Icon name="comment-alt" color={GlobalTheme.colors.light.text.warning} size={32} />
        </TouchableOpacity>
        
      </Hero>
      <SafeAreaView style={styles.content}>
      <SwipeableCard items={people} />
      </SafeAreaView>
      
      {/* <View style={[styles.content, styles.profile]}>
        {user.photoURL ? (
          <Avatar.Image size={80} source={{uri: user.photoURL}} />
        ) : (
          <Avatar.Text
            size={80}
            label={user.email ? user.email.substring(0, 2).toUpperCase() : 'A'}
            style={styles.avatar}
          />
        )}
      </View> */}
      {/* <View style={styles.content}>
        <Headline>
          {user.displayName ? user.displayName : user.email}{' '}
          {user.emailVerified && (
            <Icon name="check-decagram" color="#2196f3" size={26} />
          )}
        </Headline>
        {!!user.displayName && <Title>{user.email}</Title>}
        {!!user.phoneNumber && <Subheading>{user.phoneNumber}</Subheading>}
        {!!user.metadata.lastSignInTime && (
          <Caption>
            {`Last sign-in: ${dayjs(user.metadata.lastSignInTime).format(
              'DD/MM/YYYY HH:mm',
            )}`}
          </Caption>
        )}
      </View> */}
      {/* <View style={styles.providers}>
        <Provider type="password" active={providers.includes('password')} />
        <Provider type="facebook" active={providers.includes('facebook.com')} />
        <Provider type="phone" active={providers.includes('phone')} />
      </View>
      <FAB
        color="#fff"
        style={[styles.fab, {backgroundColor: theme.colors.primary}]}
        icon="settings"
        onPress={() => navigation.navigate('Settings')}
      /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // position: 'relative',
    // backgroundColor: 'white',
  },
  content: {
    marginTop:10,
    position:'relative',
    flex:1,
  },
  avatar: {
    borderColor: '#fff',
    borderWidth: 5,
    elevation: 4,
  },
  providers: {
    // backgroundColor: '#F6F7F8',
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginVertical: 30,
    padding: 20,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  center: {
    width: '100%',
    alignItems: 'center',
  },
});

export default withTheme(Profile);
