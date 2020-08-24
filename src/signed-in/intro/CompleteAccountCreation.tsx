import React, { useEffect, useState, useContext, useRef } from 'react';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { Alert, ScrollView, StyleSheet, View, Text, TextInput, TouchableOpacity, Picker } from 'react-native';
import { Button, HelperText, Paragraph, } from 'react-native-paper';
import layout from '../../signed-out/layout';
import ProviderButton from '../../components/ProviderButton';
import { NavigationParams } from 'react-navigation';
import CustomButton from '../../components/CustomButton';
import theme from '../../theme';
import Hero from '../../components/Hero'
import GlobalTheme from '../../theme'
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {AuthCredential, ProfileSetup} from '../../contexts/auth'
import { UserContext } from '../../App';
import AnimatedToggle, { selectedOptions } from '../../components/AnimatedToggle';
import NumberSlider from '../../components/NumberSlider';
import { useCountRenders } from '../../util/performance';
import BasicInfo from './BasicInfo';
import Interests from './Interests';
import { ProfileComplete } from '../../contexts/profile'
import UserInfo from './Info';
import { useProfile } from '../../util/helpers';
import { ProfileService } from '../../entities/profiles/service';
import { updateProfile } from '../../util/firebase';

interface Props {
  navigation: NavigationParams;
}
enum stages {
  link,
  info,
  profile,
  interests,

}
const NAVSPACETOCENTER = 35
function CompleteAccountCreation({ navigation }: Props) {

  const user = useContext(UserContext);
  const profile = useProfile();
  const [initializing,setInitializing] = useState(true)
  const [loading, setLoading] = useState<boolean>(false);
  const [authCredential,_] = AuthCredential.useData();
  const [profileStep,setProfileStep] = ProfileSetup.useData()
  const [email, setEmail] = useState<string>('');
  const [requireEmailVerification,setRequireEmailVerification] = useState(true)
  const [password, setPassword] = useState<string>('');
  const [confirm, setConfirm] = useState<string>('');
  const [currentStage,setCurrentStage] = useState(stages.link)
  const [help, setHelp] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [focused,setFocused] = useState<boolean>(false);
  useCountRenders("complete account")
  useEffect(() => {

    let profileservice = new ProfileService(profile as any)
    console.log("oooh",profileservice.profileSetupStage())
    setCurrentStage(profileservice.profileSetupStage())
  },[profile,user])

  //verification auth state listener
  useEffect(() => {
    const authListener = auth().onAuthStateChanged( async result => {
    
      if (initializing && result) {
        setRequireEmailVerification(!result!.emailVerified)
        setInitializing(false);
      }
    });
    return () => {
      if (authListener) {
        authListener();
      }
    };
   
  }, [initializing]);

useEffect(()=> {
  let inter:number;
  if(user && user.email){
    inter = setInterval(()=> {
      auth().currentUser?.reload()
     },1000)
  }
  
   return () => {
    clearInterval(inter)
   }
},[user])
  useEffect(() => {
    if (error) {
      Alert.alert('Create Account - Error', error);
    }
  }, [error]);

  useEffect(() => {
    if (password === confirm) {
      setHelp('');
    } else if (password && confirm && password !== confirm) {
      setHelp('Passwords do not match.');
    }
  }, [password, confirm]);
async function performProfileUpdate(partial:any){
  await updateProfile(partial)
}
  async function handleCreate() {
    setLoading(true);
    // await new Promise((res:any,rej:any) => setTimeout(() => res(),50000))

    try {
      setLoading(true);
      setError('');
       //retrieve auth credential for email account
      let credential = await auth.EmailAuthProvider.credential(email,password)
      //complete account link with currently signed in Provider // i.e Phone / Facebook
     let userCred = await completeLink(credential)
     
     //link successful 
     if(userCred) {
      //create user profile
      //update user email
      await createUserProfile(userCred)
      
      auth().currentUser?.updateEmail(email)
     auth().currentUser?.sendEmailVerification().then(val =>{},err => {console.log("error ?",err)})
   
     
      console.log("operation complete stack value should change")
     }

    } catch (e) {
      switch (e.code) {
        case 'auth/invalid-email':
          setError('Please enter a valid email address.');
          break;
        case 'auth/user-disabled':
          setError('This account has been disabled.');
          break;
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError('No user found or wrong password.');
          break;
        default:
          console.error(e);
          break;
  }
    }
      setLoading(false);
  }



  
  async function completeLink (credential:FirebaseAuthTypes.AuthCredential) {
    try {
     let userCred = await auth().currentUser?.linkWithCredential(credential)
     return userCred
    } catch (e) {
      if (e.code == 'auth/requires-recent-login') { 
        try {
         let userCred = await auth().currentUser?.reauthenticateWithCredential(authCredential);
         return userCred
        } catch (e) {
          if(e.code == 'auth/invalid-credential') {
            auth().signOut()
            return
          }
        }
          return null
      }
    }
  
  }

  async function createUserProfile(userCred:FirebaseAuthTypes.UserCredential) {
    try {
      let transaction = await firestore().collection('user-profiles').doc(userCred.user.uid).set({
        email:email,
        ageRange:{end:60,start:18},
        liked:[],
        images:[],
        interests:[],
        placesToGo:[],
        placesBeen:[],
        languages:[],
        height:150
      })
      await firestore().collection('user-connections').doc(userCred.user.uid).set({
       unmatched:[],
       disliked:[],
       connections:[]
      })
      return transaction
    } catch (e) {
      throw(e)

    }
  }
  function* range( start:number, end:number, step = 1 ){
    if( end === undefined ) [end, start] = [start, 0];
    for( let n = start; n < end; n += step ) yield n;
  }
function link() {
 return <View style={[layout.main, styles.contentArea,{justifyContent:'flex-start'}]}>
  <View style={[layout.row, layout.header]}>
    <View style={layout.column}>
      <Text style={layout.heading}>
       {requireEmailVerification && !user?.email ? "Let's get your account setup." : " You're almost set! "} 
      </Text>
    </View>
  </View>
  <View style={[layout.wordBox]}>


<View style={layout.column}>
  <Text style={layout.info}>

  {requireEmailVerification && !user?.email ? "You will need to link your account with an email and password." : "We sent you an email verification link. Please follow the steps in the email to continue." }

  </Text>
</View>
</View>
{requireEmailVerification && !user?.email ? <>

<View style={[layout.full]}>
  <TextInput
    style={styles.input}
    // mode="outlined"
    // label="Email Address"
    placeholder={"Email Address"}
    value={email}
    onChangeText={setEmail}
    // theme={inputTheme}
    keyboardType="email-address"
    autoCapitalize="none"
    autoCorrect={false}
  />
  <TextInput
    secureTextEntry
    style={styles.input}
    // mode="outlined"
    // label="Password"
    placeholder={"Password"}
    value={password}
    onChangeText={setPassword}
  // theme={inputTheme}
  />
  <TextInput
    secureTextEntry
    style={styles.input}
    // mode="outlined"
    placeholder={"Confirm Password"}
    // label="Confirm Password"
    value={confirm}
    onChangeText={setConfirm}
  // theme={inputTheme}
  />
</View>

<HelperText type="error" visible={!!help}>
  {help}
</HelperText>
<View style={[layout.full, layout.cta]}>
  
  <CustomButton
    textColor={'#fff'}
    color={'#1B1464'}
    solid={true}
    loading={loading}
    onPress={() => (loading ? null : handleCreate())}
    disabled={!email || !password || !confirm || !!help}
  >
    {loading ? 'Creating Account' : 'Create Account'}
  </CustomButton>
</View>
</>
: 
<View style={[layout.full, layout.cta]}>
<CustomButton
textColor={'#fff'}
color={'#1B1464'}
solid={true}
loading={loading}
onPress={() => {auth().currentUser?.sendEmailVerification().then(val =>{},err => {console.log("error ?",err)})}}

>
{loading ? 'resend email' : 'resend email'}
</CustomButton>
</View>
}


</View>
}
const handleFocus = () => setFocused(true)

const handleBlur = () =>setFocused(false)


  return (
    <View style={[layout.container, { justifyContent: 'flex-start' }]}>
      <Hero colors={['#15212B', '#15212B']} style={{ zIndex: 9999, marginTop: NAVSPACETOCENTER }} centered>
        <View style={layout.row}>
          <Text style={[styles.navText,currentStage == stages.link && styles.navTextActive]}>
            Account
          </Text>
          <Text style={[styles.navText,currentStage == stages.info && styles.navTextActive]}>
            Basic Info
          </Text>
          
        </View>


        {/* <TouchableOpacity>
          <Icon name="comment-alt" color={GlobalTheme.colors.light.text.warning} solid size={24} />
        </TouchableOpacity> */}

      </Hero>
        {currentStage == stages.link ? 
        link()  :
        currentStage == stages.info ? <UserInfo finished={performProfileUpdate}></UserInfo> : currentStage == stages.profile ? <BasicInfo finished={performProfileUpdate}></BasicInfo>
        : <Interests finished={performProfileUpdate}></Interests>

      }
    </View>
  );
}

const inputTheme = {
  colors: {
    background: '#fff',
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  hFour: {
    fontSize: 14,
    // marginHorizontal:28,
    fontFamily: 'Montserrat',
    color: 'grey'
  },
  navText: {
    fontSize: 14,
    marginHorizontal:20,
    fontFamily: 'Montserrat',
    color: 'grey'
  },
  navTextActive: {
    color:GlobalTheme.colors.light.accent
  },
  contentArea: {
    marginTop: 30,
    // overflow: 'hidden',
    // marginBottom: 0,
    // position:'relative',
    flex: 1,
    // alignContent:'center',
    // alignItems:'center',
    // justifyContent: 'center'
    // justifySelf
    // flexDirection:'column',
    // alignSelf:'center',

  },
  input: {
    borderTopColor: 'transparent',
    borderLeftWidth: 0,
    borderRightWidth: 0,
    marginVertical: 20,
    fontSize: 14,
    padding: 10,
    paddingHorizontal: 5,
    fontFamily: 'Open Sans',
    // backgroundColor:'white',
    borderBottomColor: '#888888',
    borderBottomWidth: .3
    // overflow:'hidden'
  },
});

export default CompleteAccountCreation;
