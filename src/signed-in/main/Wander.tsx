import dayjs from 'dayjs';
import React, { useContext, Fragment, useEffect, useState, useRef } from 'react';
import { StyleSheet, View, SafeAreaView,Text, Modal } from 'react-native';
import * as Animatable from 'react-native-animatable';
import LottieView from 'lottie-react-native';
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
import { NavigationParams } from 'react-navigation';
import { UserContext } from '../../App';
import Hero from '../../components/Hero';
import Provider from '../../components/Provider';
import Facebook from '../../providers/Facebook';
import { getProviders, useProfile, useConnections } from '../../util/helpers';
import GlobalTheme from '../../theme'
import { TouchableOpacity } from 'react-native-gesture-handler';
import SwipeableCard from '../../components/SwipeableCard'
import Match from '../../components/Match'
import { useCountRenders } from '../../util/performance';
import { useProfilePagination } from '../../util/firebase';
import { Profile } from '../../entities/profiles/model';
import { ConnectionService } from '../../entities/connections/service';

interface Props {
  theme: Theme;
  navigation: NavigationParams;
}

function Wander({ theme, navigation }: Props) {
  const [wanderers, setWanderers] = useState([] as any)
  const profile = useProfile()
  const connections = useConnections()
  const [matched,setMatched] = useState(false);
  const [noWander,setNoWander] = useState(false);
  const {next, ready} = useProfilePagination(50)
  const user = useContext(UserContext);
  if (!user) {
    return null;
  }
  useEffect(() => {
   
      loadWanderers()

  
  
  }, [ready,profile,connections])
  useEffect(()=> {
    console.log('changed?')
  },[profile])
//  useEffect(() => {
//   //  profile exists/ or necessary information to refresh search has been altered.
//     loadWanderers()
//  },[profile, profile && profile!.top1])
// !loading wanderers first time!
  const loadWanderers = async () => {
    if(ready && wanderers.length == 0 && profile && connections) {
     let x = await  next()
        let profiles = x.map( doc => { return {uid:doc.id,...doc.data()} as Profile })
       
        let connector = new ConnectionService(connections!,profile!)
        let validConnections = profiles.filter(profile => connector!.shouldDisplay(profile.uid!))
        console.log(validConnections,"the connections",profiles)
        if(validConnections.length == 0) { setNoWander(true)} else{
          setNoWander(false)
          setWanderers(validConnections)
        }
          
      }
    }

  const noMorePeople = () => {

  }
  const showProfile = (user: Profile) => {
    navigation.navigate('PublicProfile', { user })
  }
  const onRejected = (user: Profile) => {
    //add user to disliked property  of connection manager
    console.log("disliked?",user.uid)
  }
  const onAccepted = async (user: Profile) => {
    // mark likedBy field on other user.
    // if current user likedBy contains this user =>
    // => add user to connections property of connection manager
    // => display match ui!
    let connector = new ConnectionService(connections!,profile!)
    try {
      let results = await connector!.likeUser(user.uid!)
      if(results.matched){
        setMatched(true)
        setTimeout(x => {
          setMatched(false)
        },3000)
      }
    } catch(e) {
      console.log(e)
    }
    

  }
  // Array of providers the the user is linked with
  const providers = getProviders(user);

  return (
    <View style={styles.container}>
     
      <Hero colors={['#15212B', '#15212B']} >
        <TouchableOpacity onPress={() =>  
        requestAnimationFrame(() => {
          navigation.navigate('Profile')
        })
        }>
          <Icon name="user" color={GlobalTheme.colors.light.text.warning} solid size={24} />
        </TouchableOpacity>
        <TouchableOpacity
        onPress={() =>  
          requestAnimationFrame(() => {
            navigation.navigate('Dashboard')
          })
          }
        >
          <Icon name="comment-alt" color={GlobalTheme.colors.light.text.warning} solid size={24} />
        </TouchableOpacity>

      </Hero>
      <Modal
                animationType="slide"
                transparent={true}
                visible={matched}
                
            >
                <Match></Match>
            </Modal>
      { wanderers.length ?
        <SafeAreaView style={styles.content}>
 
          <SwipeableCard onComplete={noMorePeople} onSwipeUp={showProfile} onSwipeLeft={onRejected} onSwipeRight={onAccepted} items={wanderers} />

        </SafeAreaView>

        :

        <SafeAreaView style={styles.loadingContent}>
          
          { noWander ? <Headline> No wanderers here. Try adding more places in <Text onPress={() => {
             requestAnimationFrame(() => {
              navigation.navigate('Profile')
            })
          }}>settings</Text></Headline>
        :  
        <LottieView
           autoPlay 
           loop
           
           style={{aspectRatio:undefined,justifyContent:'center',alignItems:'center'}}
            source={require('../../animations/ripple_flat.json')}
          />
        }
        
        </SafeAreaView>

      }
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
    justifyContent: 'center'
  },
  loadingContent: {
    position: 'relative',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  content: {
    marginTop: 10,
    paddingTop:30,
    marginHorizontal:10,
    position: 'relative',
    flex: 1,
    // overflow: 'hidden', paddingBottom: 30 
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

export default Wander
