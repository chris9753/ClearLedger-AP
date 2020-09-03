import React from 'react';
import {StyleSheet, View, Dimensions} from 'react-native';
import Email from '../providers/EmailPassword';
import layout from './layout';

function EmailSignIn() {
  return (
    <View style={layout.container}>
      <View style={layout.main}>
      <Email />
      </View>
      
    </View>
  );
}
let deviceHeight = Dimensions.get('window').height
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:'#fff'
    // justifyContent:'flex-start'

  },
  main: {
    overflow: 'visible',
    // backgroundColor: 'blue',
    alignItems: 'center',
    marginTop: deviceHeight * .09,
    marginHorizontal: deviceHeight * .05,
  }
});

export default EmailSignIn;