import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import libPhoneNumber, {parsePhoneNumberFromString} from 'libphonenumber-js';
import React, {Fragment, useRef, useState} from 'react';
import {Alert, StyleSheet, View, Text} from 'react-native';
import CountryPicker, {
  Country,
  getAllCountries,
} from 'react-native-country-picker-modal';
import {Button, Paragraph, TextInput } from 'react-native-paper';
import CustomButton from '../components/CustomButton';
import layout from '../signed-out/layout';

type ConfirmationRef =
  | ((verificationCode: string) => Promise<FirebaseAuthTypes.User | null>)
  | null;

const countryKeys = getAllCountries().map(country => country.cca2);

function Phone() {
  const [loading, setLoading] = useState(false);
  const pickerRef = useRef<CountryPicker>(null);
  const confirmationRef = useRef<ConfirmationRef>(null);
  const [number, setNumber] = useState('+1');
  const [verification, setVerification] = useState('');

  // @ts-ignore
  const [country, setCountry] = useState<Country>({
    cca2: 'US',
    callingCode: '1',
    name: 'United States',
  });

  async function handlePhoneAuth() {
    if (!loading && confirmationRef) {
      setLoading(true);
      try {
        const result = await auth().signInWithPhoneNumber(number);
        confirmationRef.current = result.confirm.bind(result);
      } catch (error) {
        confirmationRef.current = null;
        Alert.alert('Phone Auth Error', error.message);
      } finally {
        setLoading(false);
      }
    }
  }

  function handleModal() {
    if (pickerRef && pickerRef.current) {
      pickerRef.current.openModal();
    }
  }

  function handleNumber(text: string) {
    const parsed = new libPhoneNumber.AsYouType().input(text);
    setNumber(parsed);
  }

  function isValid() {
    const phoneNumber = parsePhoneNumberFromString(number, country.cca2);
    if (phoneNumber) {
      return phoneNumber.isValid();
    }

    return false;
  }

  async function handleVerification() {
    if (!loading && confirmationRef.current) {
      setLoading(true);
      try {
        await confirmationRef.current(verification);
        confirmationRef.current = null;
      } catch (error) {
        Alert.alert('Phone Verification Error', error.message);
      } finally {
        setLoading(false);
      }
    }
  }

  return confirmationRef.current ? (
    <Fragment>
      <TextInput
        keyboardType="number-pad"
        mode="outlined"
        label="Verification Code"
        value={verification}
        onChangeText={setVerification}
      />

      <Button
        style={styles.submit}
        loading={loading}
        disabled={!verification}
        mode="contained"
        onPress={handleVerification}>
        Confirm
      </Button>
    </Fragment>
  ) : (
    <Fragment>
       {/* HEADING */}
       <View style={[layout.row, layout.header]}>
          <View style={layout.column}>
            <Text style={layout.heading}>
              What's your number ?
            </Text>
          </View>
        </View>
        {/* WORD BOX - GUIDE */}
        <View style={[layout.row, layout.wordBox]}>
          <View style={layout.column}>
            <Text style={layout.info}>
            Whether you’re creating an account or 
            </Text>
            <Text style={layout.info}>
            signing back, let’s start with your number.
            </Text>
            
          </View>
        </View>
      <View style={styles.picker} pointerEvents="none">
        <CountryPicker
          ref={pickerRef}
          filterable
          hideAlphabetFilter
          countryList={countryKeys}
          cca2={country.cca2}
          onChange={value => {
            setCountry(value);
            setNumber(`+${value.callingCode}`);
          }}
          closeable
          onClose={() => null}
        />
      </View>

      <Paragraph style={styles.paragraph}>
        Select phone number country:
      </Paragraph>
      <Button style={styles.button} mode="outlined" onPress={handleModal}>
        {`${country.name} ( +${country.callingCode} )`}
      </Button>

      <Paragraph style={styles.paragraph}>Enter your phone number:</Paragraph>
      <View style={[layout.full]}>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        mode="flat"
        // label="Phone Number"
        selectionColor={'#888888'}
        value={number}
        onChangeText={handleNumber}
      />

      </View>
   
      {/* <Button
        style={styles.submit}
        loading={loading}
        disabled={!isValid()}
        mode="contained"
        onPress={handlePhoneAuth}>
        Submit
      </Button> */}
      <View style={[layout.full,layout.cta]}>
          <CustomButton  
        textColor={'#fff'}
        color={'#F11856'}
        solid={true}
        loading={loading}
        onPress={() => (loading ? null : handlePhoneAuth())}>
          Submit
        </CustomButton>
      </View>

    </Fragment>
  );
}

const styles = StyleSheet.create({
  phoneCountry: {
    flexDirection: 'row',
    marginRight: 10,
    position: 'relative',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'red',
    borderRadius: 5,
  },
  input: {
    borderTopColor:'transparent',
    borderLeftWidth:0,
    borderRightWidth:0,
    backgroundColor:'white',
    borderBottomColor:'#888888',
    overflow:'hidden'
  },
  phoneCountryCode: {
    marginTop: 5,
    marginLeft: 5,
  },
  paragraph: {
    fontFamily: 'OpenSans',
    marginBottom: 5,
  },
  button: {
    marginBottom: 20,
  },
  picker: {
    height: 0,
    opacity: 0,
  },
  submit: {
    marginTop: 20,
  },
});

export default Phone;
