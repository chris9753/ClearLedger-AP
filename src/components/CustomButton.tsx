import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

import LottieView from 'lottie-react-native';

interface Props {
  icon?: () => JSX.Element
  onPress: () => void;
  loading?: boolean;
  children: string;
  color: string;
  textColor: string;
  solid: boolean;
  customStyles?: ViewStyle
  disabled?:boolean
}


function CustomButton({ customStyles, icon, onPress, loading, children, color, solid, textColor,disabled=false }: Props) {

  return (
    <TouchableOpacity disabled={loading || disabled} style={[styles(color, solid, textColor,disabled).button, customStyles,disabled]} onPress={onPress}>
      {!icon ? (
        <View style={stylesdefault.row}>
          <Text style={[styles(color, solid, textColor,disabled).content,{marginRight:8}]}>{children}</Text>
          {loading &&
           <LottieView
           autoPlay 
           loop
           style={{alignContent:'center',position:'relative',height:20,width:20}}
            source={require('../animations/loadingspinner.json')}
          />
          }
        </View>

      ) : (
          <View style={stylesdefault.row}>
            {!loading && icon()}
            <Text style={[styles(color, solid, textColor,disabled).content, stylesdefault.withIcon]}>{children}</Text>
          </View>
        )}

    </TouchableOpacity>
  );
}

const stylesdefault = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems:'center'
  },
  withIcon: {
    marginLeft: 10
  }
})
const styles = (color: string, solid: boolean, textColor: string,disabled:boolean) => {
  let style = {

    button: {

      alignItems: 'center',
      marginVertical: 10,
      padding: 11,
      flexGrow: 1,
      borderWidth: 1,
      borderColor: color,
      backgroundColor: color,
      borderRadius: 150,
      // marginHorizontal:20,
      overflow:'visible'
    },
    content: {
      fontFamily: 'Montserrat',
      fontSize: 13,
      color: textColor
    }
  } as any
  if (!solid || disabled) style.button = { ...style.button, backgroundColor: 'transparent' }
  if (solid) style.button = { ...style.button, shadowColor: color,borderWidth:2,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.00,
  
    elevation: 10 }
  if(disabled) {
    style.content = {...style.content,color:color}
  }

  return StyleSheet.create(style)
}



export default CustomButton;