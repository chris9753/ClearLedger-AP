import auth from '@react-native-firebase/auth';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { GoogleSignin } from 'react-native-google-signin';
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
import { useProfile } from '../../util/helpers';
import { updateProfile } from '../../util/firebase';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import DropDownPicker from 'react-native-dropdown-picker';
interface Props {
  navigation: any
}
function Settings({ navigation }: Props) {
  const user = auth().currentUser;
  const profile = useProfile()
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [choosingLanguage, setChoosingLanguage] = useState(false);
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

  //initialize inputs
  useEffect(() => {
    // if (profile) {
    //     console.log('attempting parse', profile.homeLocation)

    //     updateCurrentProfile({ ...profile })
    // }

  }, [profile])

  async function signOut() {

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
  const  updateLanguage = async (language:any) => {
      setChoosingLanguage(false);
    await updateProfile({defaultLanguage:language.value} as any)
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
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      <Hero colors={['#15212B', '#15212B']} >
        <TouchableOpacity onPress={() => navigation.navigate('Wander')}>
          <Icon name="dot-circle" color={GlobalTheme.colors.light.secondary} solid size={26} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { navigation.navigate('Settings') }}>
          <Icon name="ellipsis-v" color={GlobalTheme.colors.light.text.warning} solid size={24} />
        </TouchableOpacity>

      </Hero>
      <View style={[layout.row, layout.header, { marginBottom: 30, alignItems: 'center', justifyContent: 'center', alignContent: 'center', marginTop: 20 }]}>
        <View style={[layout.column, layout.full]}>
          <Text style={[layout.heading]}>
            Settings
      </Text>
          <View style={[layout.full, { width: 300, justifyContent: 'center', flex: 1, alignContent: 'center', alignSelf: 'center', marginTop: 25 }]}>
            <CustomButton
              textColor={'#fff'}
              color={'#0A0F3D'}
              solid={true}
              loading={false}
              onPress={() => { }}
              disabled={false}
            >
              Account Details
    </CustomButton>
          </View>
        </View>


      </View>
      <View style={[layout.row, layout.firstItemSection, { justifyContent: 'space-between', alignContent: 'center', alignItems: 'center', paddingHorizontal: 50 }]}>

        <Text style={[layout.heading, { fontSize: 14 }]}>
          Hosting Preference
      </Text>
        <ToggleSwitch
          isOn={profile && profile.hosting}
          onColor="#0F29AC"
          offColor="grey"
          label=""
          labelStyle={{ color: "black", fontWeight: "300" }}
          size="medium"
          onToggle={async (isOn: any) => await updateProfile({ hosting: isOn } as any)}
        />
      </View>
      <View style={[layout.row, layout.itemSection, { justifyContent: 'space-between', alignContent: 'center', alignItems: 'center', paddingHorizontal: 50 }]}>

        <Text style={[layout.heading, { fontSize: 14 }]}>
          Connects with
     </Text>
        {profile && profile.desiredSex ? profile.desiredSex.map((gender: any) => {
          if (gender == 'M') {
            return <>
              <Icon name="mars" size={20} color="#6026BC" />
            </>
          } else if (gender == "F") {
            return <Icon name="venus" size={20} color="#6026BC" />
          }
          return <Icon name="genderless" size={20} color="#6026BC" />
        }) : null}
        <FloatingOptionSelector desiredSex={profile?.desiredSex} style={[styles.messageIconWrapper, { position: 'relative' }]}></FloatingOptionSelector>
      </View>
      <View style={[layout.row, layout.itemSection, { justifyContent: 'center', alignContent: 'center', alignItems: 'center', paddingHorizontal: 50, paddingTop: 40 }]}>

        <View style={[layout.column]}>
          <View style={[layout.row, { justifyContent: 'space-between' }]}>
            <Text style={[styles.text, { color: '#082246' }]}>
              Age Range
        </Text>
            <Text style={[styles.text]}>
              {profile != null ? `${profile.ageRange.start} - ${profile.ageRange.end}` : ''}
            </Text>
          </View>
          <RangeSlider
            //@ts-ignore
            style={{ width: 300, height: 80, marginLeft: -10, marginTop: -35 }}
            gravity={'center'}
            min={18}
            max={120}
            step={1}
            selectionColor="#1B1464"
            blankColor="#A6A6A6"
            initialHighValue={profile && profile.ageRange.end || 18}
            initialLowValue={profile && profile.ageRange.start || 120}
            onValueChanged={async (low: any, high: any, fromUser: any) => {
                await updateProfile({ageRange:{start:low,end:high}} as any)
            }} />

        </View>
      </View>

      <View style={[layout.row, layout.itemSection, { justifyContent: 'center', alignContent: 'center', alignItems: 'center', paddingHorizontal: 50, paddingTop: 40 }]}>

        <View style={[layout.column]}>
          <View style={[layout.row, { justifyContent: 'space-between' }]}>
            <Text style={[styles.text, { color: '#082246' }]}>
              Maximum Distance
       </Text>
            <Text style={[styles.text]}>
              {profile != null ? `${profile.maximumDistance} (km)` : ''
              }
            </Text>
          </View>
          <RangeSlider
            //@ts-ignore
            style={{ width: 300, height: 80, marginLeft: -10, marginTop: -35 }}
            gravity={'center'}
            min={20}
            max={50}
            step={1}
            selectionColor="#1B1464"
            blankColor="#A6A6A6"
            rangeEnabled={false}
            initialLowValue={profile && profile.ageRange.start || 20}
              onValueChanged={async (low: any, high: any, fromUser: any) => {
                await updateProfile({maximumDistance:low} as any)
            }}
            />

        </View>

      </View>
      <TouchableWithoutFeedback onPress={() => { }} style={[layout.row, layout.itemSection, { justifyContent: 'space-between', alignContent: 'center', alignItems: 'center', paddingHorizontal: 50 }]}>

        <Text style={[layout.heading, { fontSize: 14 }]}>
          Notifications
     </Text>
        <Icon name="arrow-right" color={"#52575D"} solid size={18} />
      </TouchableWithoutFeedback>
      <View style={[layout.row, layout.itemSection, { justifyContent: 'space-between', alignContent: 'center', alignItems: 'center', paddingHorizontal: 50 }]}>
       {!choosingLanguage ? <TouchableWithoutFeedback onPress={() => setChoosingLanguage(!choosingLanguage)}> 
       <Text style={[layout.heading, { fontSize: 14 }]}>
            Languages {profile && profile.defaultLanguage ? `(${profile.defaultLanguage})` : `(English)`}
          </Text>
        </TouchableWithoutFeedback>
       : 
       <DropDownPicker
    items={[
        {label: 'English', value: 'English'},
        {label: 'French', value: 'French'},
    ]}
    defaultValue={profile && profile.defaultLanguage}
    containerStyle={{height: 40,width:270}}
    style={{backgroundColor: '#fafafa'}}
    itemStyle={{
        justifyContent: 'flex-start'
    }}
    dropDownStyle={{backgroundColor: '#fafafa'}}
    onChangeItem={updateLanguage}
/>
       }
          

        {!choosingLanguage ? <TouchableOpacity onPress={() => setChoosingLanguage(true)}>
          <Icon name="angle-down" color={"#52575D"} solid size={24} />
        </TouchableOpacity> : <TouchableOpacity onPress={() => setChoosingLanguage(false)}><Icon name="angle-up" color={"#52575D"} solid size={24} /></TouchableOpacity>
        }
      </View>

      {/* Subscription Users */}
      <View style={[layout.row, layout.header, { marginTop: 35, marginBottom: 35, alignItems: 'center', justifyContent: 'center', alignContent: 'center' }]}>
        <View style={[layout.column, layout.full]}>
          <Text style={[layout.heading, styles.text, { fontSize: 18 }]}>
            Subscription Users
      </Text>

        </View>


      </View>
      <View style={[layout.row, layout.firstItemSection, { justifyContent: 'space-between', alignContent: 'center', alignItems: 'center', paddingHorizontal: 50 }]}>

        <Text style={[layout.heading, { fontSize: 14 }]}>
          Hide my profile to the community
     </Text>
        <ToggleSwitch
          isOn={profile && profile.showProfile}
          onColor="#0F29AC"
          offColor="grey"
          label=""
          labelStyle={{ color: "black", fontWeight: "300" }}
          size="medium"
          onToggle={async (isOn: any) => await updateProfile({ showProfile: isOn } as any)}
        />
      </View>
      <View style={[layout.row, layout.itemSection, { justifyContent: 'space-between', alignContent: 'center', alignItems: 'center', paddingHorizontal: 50 }]}>

        <Text style={[layout.heading, { fontSize: 14 }]}>
          Hide my age
     </Text>
        <ToggleSwitch
          isOn={profile && profile.showAge}
          onColor="#0F29AC"
          offColor="grey"
          label=""
          labelStyle={{ color: "black", fontWeight: "300" }}
          size="medium"
          onToggle={async (isOn: any) => await updateProfile({ showAge: isOn } as any)}
        />
      </View>
      {/*  Action list */}
      <View style={[layout.row, layout.header, { marginBottom: 30, alignItems: 'center', justifyContent: 'center', alignContent: 'center', marginTop: 50 }]}>
        <View style={[layout.column, layout.full]}>

          <View style={[layout.full, { width: 300, justifyContent: 'center', flex: 1, alignContent: 'center', alignSelf: 'center', marginTop: 2 }]}>
            <CustomButton
              textColor={'#0A0F3D'}
              color={'#0A0F3D'}
              solid={false}
              loading={false}
              onPress={() => { }}
              disabled={false}
            >
              Suspend Account
    </CustomButton>
          </View>
          <View style={[layout.full, { width: 300, justifyContent: 'center', flex: 1, alignContent: 'center', alignSelf: 'center', marginTop: 2 }]}>
            <CustomButton
              textColor={'#0A0F3D'}
              color={'#0A0F3D'}
              solid={false}
              loading={false}
              onPress={() => { }}
              disabled={false}
            >
              Delete Account
    </CustomButton>
          </View>
          <View style={[layout.full, { width: 300, justifyContent: 'center', flex: 1, alignContent: 'center', alignSelf: 'center', marginTop: 2 }]}>
            <CustomButton
              textColor={'#fff'}
              color={'#0F29AC'}
              solid={true}
              loading={false}
              onPress={signOut}
              disabled={false}
            >
              Log Out
    </CustomButton>
          </View>
        </View>


      </View>

      {/* Terms and Conditions */}
      <View style={[layout.row, layout.header, { paddingHorizontal: 50, marginTop: 30 }]}>
        <View style={[layout.column, layout.full]}>
          <Text style={[styles.text, { fontSize: 14, marginBottom: 10 }]}>
            Help / Support
      </Text>
          <Text style={[styles.text, { fontSize: 14, marginBottom: 5 }]}>
            Terms of Service
      </Text>
          <Text style={[styles.text, { fontSize: 14, marginBottom: 5 }]}>
            Legal
      </Text>
          <Text style={[styles.text, { fontSize: 14, marginBottom: 5 }]}>
            Licenses
      </Text>
          <Text style={[styles.text, { fontSize: 14, marginBottom: 5 }]}>
            Policy
      </Text>
        </View>


      </View>
      {/* Build information */}
      <View style={[layout.row, layout.firstItemSection, { justifyContent: 'space-between', alignContent: 'center', alignItems: 'center', paddingHorizontal: 50, borderBottomWidth: 0, marginTop: 30 }]}>

        <Text style={[styles.text, { fontSize: 14 }]}>
          Version
     </Text>
        <Text style={[styles.text, { fontSize: 14 }]}>
          1.0.1 ( BETA )
     </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messageIconWrapper: {
    backgroundColor: '#6026BC',
    width: 40,
    height: 40,
    borderRadius: 40 / 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
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
