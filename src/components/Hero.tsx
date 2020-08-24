import React from 'react';
import {Image, SafeAreaView, StyleSheet, View, ViewStyle, Platform, StatusBar} from 'react-native';
import { getStatusBarHeight } from 'react-native-status-bar-height';

interface Props {
  children?: React.ReactNode | React.ReactNode[];
  colors?: string[];
  image?: string;
  style?: ViewStyle;
  centered?:boolean;
}

function InAppHeader({colors,style,children,centered = false}: Props) {
  return (
    // <View style={[style]}>
      
      <SafeAreaView style={styles.AndroidSafeArea}>
       {!centered ?
      <View style={styles.content}>

      {children}
      </View>
      : 
      <View style={styles.contentCentered}>

      {children}
      </View>
      } 

          
        
      </SafeAreaView>
    // </View>
  );
}

const styles = StyleSheet.create({
  content : {
    // backgroundColor:'purple',
    marginHorizontal:25,
    flexDirection:'row',
    justifyContent:'space-between',
    alignItems:'center',
    // alignContent:'center',
 
  },
  contentCentered: {
    flexDirection:'row',
    justifyContent:'center',
    alignItems:'center',
  },
  AndroidSafeArea: {
    flex: 0,
    zIndex:99999,
    height:Platform.OS === 'ios' ? 100 : 50,
    backgroundColor: "transparent",
    justifyContent:'center',
    shadowColor: "transparent",
    overflow:'visible',
shadowOffset: {
	width: 0,
	height: 1,
},
shadowOpacity: 0.18,
shadowRadius: 2.00,

elevation: 1,
    marginTop: Platform.OS === 'ios' ? 0 : 0
  },

});

export default InAppHeader;
