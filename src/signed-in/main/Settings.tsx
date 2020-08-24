import auth from '@react-native-firebase/auth';
import React, {useEffect, useState} from 'react';
import {Alert, ScrollView, StyleSheet, View,Text,TouchableOpacity} from 'react-native';
import {GoogleSignin} from 'react-native-google-signin';
import RangeSlider from 'rn-range-slider'
import {
  Banner,
  Button,
  Divider,
  Paragraph,
  TextInput,
  Title,
} from 'react-native-paper';
import Icon from "react-native-vector-icons/FontAwesome5";
import layout from '../../signed-out/layout';
import Hero from '../../components/Hero';
import GlobalTheme from '../../theme'
//@ts-ignore
import ToggleSwitch from 'toggle-switch-react-native'
import CustomButton from '../../components/CustomButton';
import FloatingOptionSelector from '../../components/FloatingOptionSelector'
interface Props {
  navigation:any
}
function Settings({navigation}:Props) {
  const user = auth().currentUser;
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [displayName, setDisplayName] = useState(
    user ? user.displayName || '' : '',
  );
  const [savingPassword, setSavingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (error) {
      Alert.alert('Create Account - Error', error);
    }
  }, [error]);

  async function signOut() {
    setSigningOut(true);
    await GoogleSignin.signOut();
    await auth().signOut();
  }

  async function handleDisplayName() {
    if (!user) {
      return;
    }

    if (!savingName) {
      try {
        setSavingName(true);
        await user.updateProfile({
          displayName,
        });
      } catch (e) {
        setError(e.message);
      } finally {
        setSavingName(false);
      }
    }
  }

  async function handlePassword() {
    if (!user || !user.email) {
      return;
    }
    if (!savingPassword) {
      try {
        setSavingPassword(true);
        await auth().signInWithEmailAndPassword(user.email, currentPassword);
        await user.updatePassword(newPassword);
      } catch (e) {
        setError(e.message);
      } finally {
        setSavingPassword(false);
      }
    }
  }

  if (!user) {
    return null;
  }

  return (
    <ScrollView style={styles.container}>
          <Hero colors={['#15212B', '#15212B']} >
                <TouchableOpacity onPress={() => navigation.navigate('Wander')}>
                    <Icon name="dot-circle" color={GlobalTheme.colors.light.secondary} solid size={26} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { navigation.navigate('Settings')}}>
                    <Icon name="ellipsis-v" color={GlobalTheme.colors.light.text.warning} solid size={24} />
                </TouchableOpacity>

            </Hero>
       <View style={[layout.row, layout.header,{marginBottom:30,alignItems:'center',justifyContent:'center',alignContent:'center',marginTop:20}]}>
    <View style={[layout.column,layout.full]}>
      <Text style={[layout.heading]}>
        Settings
      </Text>
      <View style={[layout.full,{width:300,justifyContent:'center',flex:1,alignContent:'center',alignSelf:'center',marginTop:25}]}>
    <CustomButton
      textColor={'#fff'}
      color={'#0A0F3D'}
      solid={true}
      loading={false}
      onPress={()=>{}}
      disabled={false}
    >
     Account Details
    </CustomButton>
    </View>
    </View>
    
   
  </View>
  <View style={[layout.row, layout.firstItemSection,{justifyContent:'space-between',alignContent:'center',alignItems:'center',paddingHorizontal:50}]}>
   
    <Text style={[layout.heading,{fontSize:14}]}>
      Hosting Preference
      </Text>
      <ToggleSwitch
  isOn={false}
  onColor="green"
  offColor="grey"
  label=""
  labelStyle={{ color: "black", fontWeight: "300" }}
  size="medium"
  onToggle={(isOn:any) => console.log("changed to : ", isOn)}
/>
    </View>
    <View style={[layout.row, layout.itemSection,{justifyContent:'space-between',alignContent:'center',alignItems:'center',paddingHorizontal:50}]}>
   
   <Text style={[layout.heading,{fontSize:14}]}>
     Connect with
     </Text>
    <FloatingOptionSelector style={[styles.messageIconWrapper,{position:'relative'}]}></FloatingOptionSelector>
   </View>
    <View style={[layout.row, layout.itemSection,{justifyContent:'center',alignContent:'center',alignItems:'center',paddingHorizontal:50,paddingTop:40}]}>
   
    <View style={[layout.column]}>
      <View style={[layout.row,{justifyContent:'space-between'}]}>
      <Text style={[styles.text,{color:'#082246'}]}>
          Age Range
        </Text>
        <Text style={[styles.text]}>
          50 - 70
        </Text>
      </View>
      <RangeSlider
      //@ts-ignore
        style={{width: 300, height: 80,marginLeft:-10,marginTop:-35}}
        gravity={'center'}
        min={200}
        max={1000}
        step={20}
        selectionColor="#1B1464"
        blankColor="#A6A6A6"
        onValueChanged={(low:any, high:any, fromUser:any) => {
            // this.setState({rangeLow: low, rangeHigh: high})
    }}/>

    </View>
   </View>

   <View style={[layout.row, layout.itemSection,{justifyContent:'center',alignContent:'center',alignItems:'center',paddingHorizontal:50,paddingTop:40}]}>
  
   <View style={[layout.column]}>
     <View style={[layout.row,{justifyContent:'space-between'}]}>
       <Text style={[styles.text,{color:'#082246'}]}>
         Maximum Distance
       </Text>
       <Text style={[styles.text]}>
         50 - 70
       </Text>
     </View>
     <RangeSlider
     //@ts-ignore
       style={{width: 300, height: 80,marginLeft:-10,marginTop:-35}}
       gravity={'center'}
       min={200}
       max={1000}
       step={20}
       selectionColor="#1B1464"
       blankColor="#A6A6A6"
       onValueChanged={(low:any, high:any, fromUser:any) => {
           // this.setState({rangeLow: low, rangeHigh: high})
   }}/>

   </View>
  </View>
   
  
  
  
 

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messageIconWrapper : {
    backgroundColor : '#6026BC',
    width : 38,
    height : 38,
    borderRadius : 38/2,
    justifyContent : 'center',
    alignItems : 'center',
    elevation : 4,
  },
  maxWidth: {
    width: '100%',
  },
  content: {
    padding: 16,
  },
  banner: {
    backgroundColor: '#ffebee',
  },
  input: {
    marginTop: 20,
  },
  text: {
    fontFamily: "Open Sans",
    color: "#52575D"
},
  button: {
    alignSelf: 'center',
    marginVertical: 20,
  },
  actions: {
    backgroundColor: '#F6F7F8',
  },
});

export default Settings;
