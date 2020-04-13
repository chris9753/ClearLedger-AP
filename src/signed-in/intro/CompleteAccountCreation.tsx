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
import {AuthCredential} from '../../contexts/auth'
import { UserContext } from '../../App';
import AnimatedToggle, { selectedOptions } from '../../components/AnimatedToggle';
import NumberSlider from '../../components/NumberSlider';
import { useCountRenders } from '../../util/performance';

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
  const [loading, setLoading] = useState<boolean>(false);
  const [authCredential,_] = AuthCredential.useData();
  const [name,setName] = useState<string>('');
  const [age,setAge] = useState<number>(25);
  const [gender,setGender] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirm, setConfirm] = useState<string>('');
  const currentStage = useRef(stages.link)
  const [help, setHelp] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [focused,setFocused] = useState<boolean>(false);
  useCountRenders("complete account")
  useEffect(() => {
    // on component mount check stage of profile linking/completion
    if(user?.email) {
      currentStage.current = stages.info
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
      // setLoading(false);
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
 return <View style={[layout.main, styles.contentArea,{marginTop:100,justifyContent:'flex-start'}]}>
  <View style={[layout.row, layout.header]}>
    <View style={layout.column}>
      <Text style={layout.heading}>
        Let's get your account setup.
      </Text>
    </View>
  </View>

  <View style={[layout.wordBox]}>


             <View style={layout.column}>
      <Text style={layout.info}>

      You will need to link your account with an email and password.
      </Text>
    </View>
</View>
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
      color={'#F11856'}
      solid={true}
      loading={loading}
      onPress={() => (loading ? null : handleCreate())}
      disabled={!email || !password || !confirm || !!help}
    >
      {loading ? 'Creating Account' : 'Create Account'}
    </CustomButton>
  </View>

</View>
}
const handleFocus = () => setFocused(true)

const handleBlur = () =>setFocused(false)
const genderSelected = (selectedOption:selectedOptions) => {
  console.log(selectedOption,"boom!")
  if(selectedOption == selectedOptions.option1) {
    // setGender('male')
  } else {
    // setGender('female')
  }
}
function info(){
  return <View style={[layout.main, styles.contentArea,{marginTop:100,justifyContent:'flex-start'}]}>
  <View style={[layout.row, layout.header,{marginBottom:30}]}>
    <View style={layout.column}>
      <Text style={layout.heading}>
        Just a few more details...
      </Text>
    </View>
  </View>
  <View style={[layout.full]}>

    <View style={[layout.column,{marginVertical:20}]}>
    <Text style={styles.hFour}>
      Tell us your name
    </Text>
    <TextInput
    //  onFocus={handleFocus}
    //  onBlur={handleBlur}
      style={[styles.input,{borderBottomColor : focused ? GlobalTheme.colors.light.primary :'#888888' }]}
      // mode="outlined"
      // label="Email Address"
      placeholder={"Johnny Cash"}
      value={name}

      onChangeText={setName}
      // theme={inputTheme}
      keyboardType="email-address"
      autoCapitalize="none"
      autoCorrect={false}
    />
    </View>
    <View style={[layout.column,{marginVertical:20}]}>
    <Text style={styles.hFour}>
      How old are you ?
    </Text>

    <TextInput
      // onFocus={handleFocus}
      // onBlur={handleBlur}
      value={age.toString()}
      style={[styles.input,{borderBottomColor : focused ? GlobalTheme.colors.light.primary :'#888888' }]}
      keyboardType="numeric"
      onChangeText={(val) => setAge(Number(val))}
    />
    
   
    </View>
   
    <View style={[layout.column,{marginVertical:20}]}>
    <Text style={styles.hFour}>
      What do you identify as?
    </Text>
      <AnimatedToggle optionSelected={genderSelected} ></AnimatedToggle>
      </View>
      {/* sdas */}
      <View style={[layout.column,{marginVertical:20}]}>
      {/* <CustomButton
      textColor={'#fff'}
      color={'#F11856'}
      solid={true}
      loading={loading}
      onPress={() => (loading ? null : handleCreate())}
      disabled={!email || !password || !confirm || !!help}
    >
      {loading ? 'Creating Account' : 'Create Profile'}
    </CustomButton> */}
    </View>
    </View>
</View>
}
  return (
    <View style={[layout.container, { justifyContent: 'flex-start' }]}>
      <Hero colors={['#15212B', '#15212B']} style={{ zIndex: 9999, marginTop: NAVSPACETOCENTER }} centered>
        <View style={layout.row}>
          <Text style={[styles.navText,currentStage.current == stages.link && styles.navTextActive]}>
            Account
          </Text>
          <Text style={[styles.navText,currentStage.current == stages.info && styles.navTextActive]}>
            Basic Info
          </Text>
          <Text style={[styles.navText,currentStage.current == stages.profile && styles.navTextActive]}>
            Profile
          </Text>
          <Text style={[styles.navText,currentStage.current == stages.interests && styles.navTextActive]}>
            Interests
          </Text>
        </View>


        {/* <TouchableOpacity>
          <Icon name="comment-alt" color={GlobalTheme.colors.light.text.warning} solid size={24} />
        </TouchableOpacity> */}

      </Hero>
        {currentStage.current == stages.link ? 
        link()  :
        currentStage.current == stages.info ? info() : null

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
    marginTop: -100,
    overflow: 'hidden',
    marginBottom: 0,
    // position:'relative',
    flex: 1,
    // alignContent:'center',
    // alignItems:'center',
    justifyContent: 'center'
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
