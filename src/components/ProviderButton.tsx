import React from 'react';
import {StyleSheet, ViewStyle, Text} from 'react-native';
import {Button} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CustomButton from './CustomButton';

type SocialType = 'facebook' | 'google' | 'phone';

interface Props {
  style?: ViewStyle;
  type: SocialType;
  onPress: () => void;
  loading?: boolean;
  children: string;
}

function getSocialColor(type: SocialType): string {
  switch (type) {
    case 'facebook':
      return '#F11856';
    case 'google':
      return '#F96458';
    case 'phone':
      return '#4DD7C4';
  }
}

function ProviderButton({style, type, onPress, loading, children}: Props) {
  if(type === 'phone' ) {
    return (
    <CustomButton  
    // icon={() => <Icon name={type} color="#fff" size={17} />}
    customStyles={style}
    textColor={'#9D9D9D'}
    color={getSocialColor(type)}
    solid={false}
    loading={loading}
    onPress={() => (loading ? null : onPress())}>
      {children}
    </CustomButton>
    );
  }
  return (
    <CustomButton  
    icon={() => <Icon name={type} color="#fff" size={17} />}
    textColor={'#fff'}
    color={getSocialColor(type)}
    solid={true}
    loading={loading}
    onPress={() => (loading ? null : onPress())}>
      {children}
    </CustomButton>
  );
}

export default ProviderButton;

// const styles = StyleSheet.create({
//   button: {
//     // fontFamily:'MontserratRegular',
//     marginVertical: 5,
   
//     width: 300,
//   },
//   buttonWithBorder:{
//     backgroundColor:'transparent',
//     marginVertical: 5,
//    borderColor:'#4DD7C4',
//    borderRadius:50,
//    borderWidth:2,
//     width: 300,
//   },
//   content: {
//      fontFamily:'Montserrat'
//   }
// });
