import React, { Fragment, useState, Ref, forwardRef, useImperativeHandle, useRef, MutableRefObject, useLayoutEffect, useEffect, useMemo } from 'react';
import {StyleSheet, View, ImageStyle,Text } from 'react-native';
import { TouchableWithoutFeedback } from 'react-native-gesture-handler';
import FastImage from 'react-native-fast-image'
import { useLayoutDimension } from '../util/layout'
import LinearGradient from 'react-native-linear-gradient';
import { prefetchImages } from '../util/helpers';
import {Image} from "react-native-expo-image-cache";

interface Props {
    images: any[]
    imageStyle?: ImageStyle
    id?:string,
    onIndexChange?:(i:number) => void

}

function TappableImageGallery({ images, imageStyle, id, onIndexChange = () => {} }: Props, ref?: Ref<{ parentGesture: MutableRefObject<boolean>, setGalleryIndex:React.Dispatch<React.SetStateAction<number>> }>) {
    const [galleryIndex, setGalleryIndex] = useState(0)
    // const lastID = useRef()
    const { dimension, onLayout,layoutCalls } = useLayoutDimension(images)
    const parentGesture = useRef(false)
    // const containerWidth = useRef(null);
    useEffect(()=>{
       
    },[dimension])

    useEffect(()=> {
        let asyncTask = async () => { 
           let res = await prefetchImages(images.map(x => x.uri)) 
           if(res.complete) {

           }
        }
        asyncTask()
       
    },[images])
    const leftGallery = () => {
       
        if (parentGesture.current) return
        if (galleryIndex > 0) {
             setGalleryIndex(galleryIndex - 1)
             onIndexChange(galleryIndex - 1)
        }
    }

    const slits = () => {
        const MARGIN_SPACER = 8
        if (dimension) {
           
            const divisions = images.length
            const width = (dimension.width - (divisions * MARGIN_SPACER)) / divisions
            
            let elements = [...Array(divisions).keys()].map((i,index) => {
                return <View key={i} style={{
                    width:width,
                    height: 3,
                    zIndex:5,
                    marginHorizontal:2,
                    borderRadius:1.5,
                    opacity:index == galleryIndex ? 1 : 0.4,
                    backgroundColor: index == galleryIndex ? 'white' : 'grey'
                }} />
            })
            return elements.length > 1 ? elements : null




        }
        return null
    }

    const rightGallery = () => {
        if (parentGesture.current) return

        if (galleryIndex < (images.length - 1)) {
            setGalleryIndex(galleryIndex + 1)
            onIndexChange(galleryIndex + 1)
        }
    }

    useImperativeHandle(ref, () => ({ parentGesture,setGalleryIndex }))

    return <Fragment>
        <View onLayout={onLayout} style={{ flexDirection: 'row', height: '100%', width: '100%', backgroundColor: 'transparent', position: 'absolute', zIndex: 2 }}>
            <View style={{ flexDirection: 'column', flex: .5, backgroundColor: 'transparent' }}>
                <TouchableWithoutFeedback  onPress={leftGallery} style={{ height: '100%', width: '100%' }} />
            </View>
            <View style={{ flexDirection: 'column', flex: .5, backgroundColor: 'transparent' }}>
                <TouchableWithoutFeedback onPress={rightGallery} style={{ height: '100%', width: '100%' }} />
            </View>
        </View>
        <LinearGradient colors={['rgba(0,0,0,0.0)','rgba(0,0,0,0.05)', 'rgba(0,0,0,0.0)']} style={
                                {flexDirection:'row',width:'100%',height:20,position: 'absolute', zIndex: 1}
                            }/>
                         
                      
        <View style={{flexDirection:'row',justifyContent:'center',width:'100%',height:20,position: 'absolute', zIndex: 3,top:6}}> 
   
        {slits()}
                            
        </View>
{images.length > 0 ? 
    <Image
    key={images[galleryIndex].uri}
    style={imageStyle ? imageStyle : styles.image}
    preview={images[galleryIndex].preview ? images[galleryIndex].preview : null }
    uri={images[galleryIndex].uri}

/>
:
null
}
    

    </Fragment>
}

const styles = StyleSheet.create({
    image: {
        flex: 1,
        alignSelf: 'stretch',
        height: undefined,
        width: undefined,
        borderRadius: 8,
        // overflow:'hidden',
        resizeMode: 'cover'
    }

});

export default React.memo(forwardRef(TappableImageGallery),(prevProps, nextProps) => {
 return prevProps.id !== nextProps.id
});
