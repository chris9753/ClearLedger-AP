import React from 'react';
import {Image, SafeAreaView, StyleSheet, View, ViewStyle, Platform, StatusBar} from 'react-native';
import { getStatusBarHeight } from 'react-native-status-bar-height';

interface Props {
  children?: React.ReactNode | React.ReactNode[];
  colors: string[];
  image?: string;
  style?: ViewStyle;
}

function InAppHeader({colors,style,children}: Props) {
  return (
    <View style={[style]}>
      
      <SafeAreaView style={styles.AndroidSafeArea}>
        <View style={styles.content}>

        {children}
        </View>

          
        
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  content : {
    // backgroundColor:'purple',
    marginHorizontal:25,
    flexDirection:'row',
    justifyContent:'space-between',
  },
  AndroidSafeArea: {
    flex: 0,
    backgroundColor: "transparent",
    marginTop: getStatusBarHeight() + 10
  },

});

export default InAppHeader;
