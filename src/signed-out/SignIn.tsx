import React, { Fragment } from 'react';
import { StyleSheet, View, Dimensions, Text, Image } from 'react-native';
import { Button, Theme, withTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NavigationParams } from 'react-navigation';
import Hero from '../components/Hero';
import ProviderButton from '../components/ProviderButton';
import EmailPassword from '../providers/EmailPassword';
import Facebook from '../providers/Facebook';
import theme from '../theme'
import layout from './layout';
interface Props {
  navigation: NavigationParams;
}

function SignIn({ navigation }: Props) {
  return (
    <View style={layout.container}>
      <View style={layout.main}>
        {/* HEADING */}
        <View style={[layout.row, layout.header]}>
          <View style={layout.column}>
            <Text style={layout.heading}>

              Discover new people
            </Text>
            <Text style={layout.heading}>

              across the world.
            </Text>
          </View>
        </View>
        <View style={[styles.carousel, layout.column]}>
          <Image style={styles.image} resizeMode="contain" source={require('../../assets/images/card_poster.png')} />
        </View>
        {/*  Warning */}
        <View style={[layout.row,layout.warningBox]}>
          <View style={layout.column}>
            <Text style={layout.warning}>

              By tapping any button below, you agree to our Terms.
            </Text>
            <Text style={layout.warning}>

              Learn more about how we process your data in our Privacy Policy.
            </Text>
          </View>

        </View>
        {/* ACTION BUTTONS */}

        <View style={[layout.column, layout.full, layout.cta]}>
          <Facebook />
          <ProviderButton
            type="phone"
            onPress={() => navigation.navigate('PhoneSignIn')}>
            Sign in with phone number
        </ProviderButton>
        </View>

      </View>
    </View>



  );
}
let deviceHeight = Dimensions.get('window').height
const styles = StyleSheet.create({

  carousel: {
    // alignItems:'center'
    marginVertical: 30
  },

  image: {
    // width:300
    height: deviceHeight * .32,
    marginRight: 30
  }

});

export default SignIn;
