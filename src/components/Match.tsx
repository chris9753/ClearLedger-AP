
import * as Permissions from 'expo-permissions';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useEffect, Fragment, useRef } from 'react';

import { Camera } from 'expo-camera';
import { View, Dimensions, Platform, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { Text } from 'react-native-animatable';



function MatchScreen() {
    

    return      <View style={{ flex: 1,backgroundColor:'rgba(0,0,0.2,0.8)',justifyContent:'center',alignItems:'center' }}>
        <Text style={styles.text}>It's a Match</Text>
        {/* <View style={{ flex: 1,backgroundColor:'black',opacity:.5 }}></View> */}
                
                   </View>



}

export default MatchScreen
const styles = StyleSheet.create({
    text:{
        color: "white",
        fontFamily: 'Open Sans',
        fontSize: 52
    }
})