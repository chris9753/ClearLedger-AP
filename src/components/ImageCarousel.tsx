import React, { Fragment, useState, Ref, forwardRef, useImperativeHandle, useRef, MutableRefObject, useLayoutEffect, useEffect, useMemo, useCallback } from 'react';
import {StyleSheet, View, ImageStyle, SectionList, SectionListData } from 'react-native';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import FastImage from 'react-native-fast-image'
import { useLayoutDimension } from '../util/layout'
import LinearGradient from 'react-native-linear-gradient';
import { prefetchImages } from '../util/helpers';
import {Image} from "react-native-expo-image-cache"
import { useCountRenders } from '../util/performance';

interface Props {
    sections:any[];
    viewToRender:({item,index}:any) => JSX.Element | null
}

function ImageCarousel({sections,viewToRender}:Props,ref?: Ref<{setCarouselIndex:React.Dispatch<React.SetStateAction<number>>, selectedCarouselIndex:number }>) {
    const [selectedCarouselIndex,setCarouselIndex] = useState(1)
    const [reload,setReload] = useState(false)
    useEffect(()=>{
        console.log(selectedCarouselIndex,"changed")
        setReload(!reload)
    },[selectedCarouselIndex])
    useCountRenders('image carousel')
    const newviewToRender = ({item,index}:any) => {
        return viewToRender
    }
    useImperativeHandle(ref, () => ({ setCarouselIndex,selectedCarouselIndex }))
return <SectionList 
                horizontal={true} 
                showsHorizontalScrollIndicator={false}
                sections={sections}
                keyExtractor={(item: string, index: number) => item as string + index}
                renderItem={viewToRender}
                extraData={reload}
                /> 

}

export default forwardRef(ImageCarousel)