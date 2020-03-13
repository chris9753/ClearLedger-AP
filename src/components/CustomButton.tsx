import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';



interface Props {
  icon?: () => JSX.Element
  onPress: () => void;
  loading?: boolean;
  children: string;
  color: string;
  textColor: string;
  solid: boolean;
  customStyles?: ViewStyle
}


function CustomButton({ customStyles, icon, onPress, loading, children, color, solid, textColor }: Props) {

  return (
    <TouchableOpacity style={[styles(color, solid, textColor).button, customStyles]} onPress={onPress}>
      {!icon ? (
        <View style={stylesdefault.row}>
          <Text style={styles(color, solid, textColor).content}>{children}</Text>
        </View>

      ) : (
          <View style={stylesdefault.row}>
            {!loading && icon()}
            <Text style={[styles(color, solid, textColor).content, stylesdefault.withIcon]}>{children}</Text>
          </View>
        )}

    </TouchableOpacity>
  );
}

const stylesdefault = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  withIcon: {
    marginLeft: 10
  }
})
const styles = (color: string, solid: boolean, textColor: string) => {
  let style = {

    button: {

      alignItems: 'center',
      marginVertical: 10,
      padding: 11,
      flexGrow: 1,
      borderWidth: 2,
      borderColor: color,
      backgroundColor: color,
      borderRadius: 150,
      marginHorizontal:20,
      overflow:'visible'
    },
    content: {
      fontFamily: 'Montserrat',
      fontSize: 13,
      color: textColor
    }
  } as any
  if (!solid) style.button = { ...style.button, backgroundColor: 'transparent' }
  if (solid) style.button = { ...style.button, shadowColor: color,borderWidth:2,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.00,
  
    elevation: 10 }
  

  return StyleSheet.create(style)
}



export default CustomButton;