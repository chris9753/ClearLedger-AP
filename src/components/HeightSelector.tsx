import React, { useState, useEffect, Fragment, useRef } from 'react';
import { View, Dimensions, Platform, TouchableOpacity, Text,Alert, StyleSheet } from 'react-native';
import { sample } from 'lodash';
import layout from '../signed-out/layout';
import SmoothPicker from "react-native-smooth-picker";
import {range} from 'lodash'
import { NumberFormat } from 'libphonenumber-js';
interface Props {
    onSelect:(num:number) => void;
}
function toFeet( cm:number ) 
{           let totalInches = (cm * 0.393700);  
           let inches = Math.round(totalInches % 12);         
             let feet = Math.floor(totalInches / 12);           
             
             if (inches === 12) {             
                 feet += 1;               inches = 0;         
                  }          
                   return `${feet}'${inches}`;        
 }
const dataCity = range(50 ,300).map( cm => cm + " (" + toFeet(cm) + ")")
const cmMap = range(50 ,300)
  
  const opacities = {
    0: 1,
    1: 1,
    2: 0.6,
    3: 0.3,
    4: 0.1,
  } as any;

  const sizeText = {
    0: 20,
    1: 15,
    2: 10,
  } as any

function HeightSelector ({onSelect}:Props) {
    const [ selected, setSelected ] = useState(0);
    const smoothRef = React.useRef(null) 
    function handleChange(index:number) {
        setSelected(index);
        onSelect(cmMap[index])
      }

      function pressToChange(item:any, index:any) {
          if(smoothRef) {
            (smoothRef.current as any)._handleSelection(item, index, null);
          }
       
      }

      const Item = React.memo(({opacity, selected, vertical, fontSize, name, handlePress}:any) => {
        let colors = ["#0F29AC","#6026BC","#0A0F3D","#4527B4","#2A28AE","#0C1862"]
        let color = sample(colors)
        return (
            <TouchableOpacity onPress={handlePress}>
 <View
            style={[styles.OptionWrapper, { borderWidth:0,opacity, borderBottomColor: selected ? color : 'transparent', width: vertical ? 190 : 'auto',borderBottomWidth:1}]}
          >
          <Text style={{fontSize}}>
            {name}
          </Text>
        </View>
            </TouchableOpacity>
         
        );
      });
      
      
      
      
      const ItemToRender = ({item, index}: any, indexSelected: number, vertical: any,pressToChange:any) => {
        const selected = index == indexSelected;
        const gap:number = Math.abs(index - indexSelected);
        
        function handlePress() {
            pressToChange(item, index);
          }
        let opacity = opacities[gap];
        if (gap > 3) {
          opacity = opacities[4];
        }
        let fontSize = sizeText[gap];
        if (gap > 1) {
          fontSize = sizeText[2];
        }
      
        return <Item opacity={opacity} selected={selected} vertical={vertical} fontSize={fontSize} name={item} handlePress={handlePress}/>;
      };

  
    return <View style={styles.container}>
 <View style={styles.wrapperVertical}>
    <SmoothPicker
        ref={smoothRef}
      initialScrollToIndex={selected}
      onScrollToIndexFailed={() => {}}
      keyExtractor={(_, index) => index.toString()}
      showsVerticalScrollIndicator={false}
      data={dataCity}
      scrollAnimation
      onSelected={({ item, index }) => handleChange(index)}
      renderItem={option => ItemToRender(option, selected, true,pressToChange)}
      magnet
    />
  </View>
    </View>
   

}

const styles = StyleSheet.create({
    text: {
        fontFamily: "Open Sans",
        color: "#52575D"
    },
    container: {
        paddingBottom: 30,
        flex: 0,
        height:350,
        width:250,
        flexDirection: 'column',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        backgroundColor:'white'
      },
    wrapperVertical: {
        width: 250,
        height: 350,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 'auto',
        color: 'black',
        zIndex:9999
      },
      OptionWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 10,
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 30,
        paddingRight: 30,
        height: 50,
        borderWidth: 3,
        borderRadius: 10,
      },
})
export default HeightSelector