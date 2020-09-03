import React, { useState, useEffect, Fragment, useRef } from 'react';
import { View, Dimensions, Platform, TouchableOpacity, Text,Alert, StyleSheet } from 'react-native';
import { sample } from 'lodash';
import layout from '../signed-out/layout';

interface Props {
    onSelect:() => void;
    heading:string;
    children:JSX.Element | any;
}

function BubbleTag ({onSelect,heading,children}:Props) {
    let colors = ["#0F29AC","#6026BC","#0A0F3D","#4527B4","#2A28AE","#0C1862"]
    let color = sample(colors)
    const [show,setShow] = useState(false);
    const toggle = () => {
        setShow(!show)
    }

    return <TouchableOpacity onLongPress={onSelect} onPress={toggle} key={heading} style={{ paddingHorizontal: 25, paddingVertical: 10, backgroundColor: color, borderRadius: 20, marginLeft: 5, marginVertical: 5 }}>
    <Text style={[styles.text, { fontSize: 14, color: 'white' }]}>
        {heading}
    </Text>
    {show ? <View style={[layout.row]}>
    {children}
    </View>
    : null}
</TouchableOpacity>
}

const styles = StyleSheet.create({
    text: {
        fontFamily: "Open Sans",
        color: "#52575D"
    },
})
export default BubbleTag