
import * as Permissions from 'expo-permissions';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useEffect, Fragment, useRef } from 'react';

import { Camera } from 'expo-camera';
import { View, Dimensions, Platform, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';

interface Props {
    onPictureTaken : (photo:any) => void;
}

function PictureTaker({onPictureTaken}:Props) {
    const [hasPermission, setHasPermission] = useState(false);
    const [type, setType] = useState(Camera.Constants.Type.back)
    //mount implementation
    const [bestRatio, setBestRatio] = useState('4:3')
    const cameraRef = useRef(null)
    const wantedRatio = Dimensions.get('screen').height / Dimensions.get('screen').width
    // get devices best ratio
    const getRatio = async () => {
        if (cameraRef.current && Platform.OS == 'android') {
            const ratios = await (cameraRef.current as any)?.getSupportedRatiosAsync();

            let bestRatio = 0;
            let bestRatioError = 100000;
            for (let i in ratios) {
                const r = ratios[i].split(":")
                if (Math.abs(wantedRatio - r[0] / r[1]) < bestRatioError) {
                    bestRatioError = Math.abs(wantedRatio - r[0] / r[1])
                    bestRatio = ratios[i]
                }
            }
            setBestRatio(bestRatio.toString())
        }
    }

    useEffect(() => {
        let asyncTask = async () => {
            try {
                // Camera roll Permission 
                if (Platform.OS === 'ios') {
                    const { status } = await Permissions.askAsync(Permissions.CAMERA_ROLL);
                    if (status !== 'granted') {
                        Alert.alert('Sorry, we need camera roll permissions to make this work!');
                    }
                }
                const { status } = await Camera.requestPermissionsAsync()
                setHasPermission(status == 'granted')
            } catch (e) {
                console.log(e)
            }
        }


        asyncTask()
    }, [])
    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            base64:true
          });
          onPictureTaken(result)
    }
    const handleCameraType = () => {

        setType(
            type === Camera.Constants.Type.back
                ? Camera.Constants.Type.front
                : Camera.Constants.Type.back
        )
    }
    const takePicture = async () => {
        if (cameraRef.current) {
            let photo = await (cameraRef.current as any)!.takePictureAsync({base64: true,quality:.5});
            onPictureTaken(photo)
          }
    }

    return <Fragment>
        {!hasPermission ?
            <View />
            :
            (
                <View style={{ flex: 1 }}>
                    <Camera onCameraReady={getRatio} ref={cameraRef} ratio={bestRatio} style={{ flex: 1 }} type={type}>
                        <View style={{ flex: 1, flexDirection: "row", margin: 30 }}>
                            <View style={{ alignSelf: 'flex-end', flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: "space-between" }}>
                                <TouchableOpacity
                                    style={{
                                        // alignSelf: 'flex-end',
                                        alignItems: 'center',
                                        backgroundColor: 'transparent'
                                    }}
                                    onPress={pickImage}>
                                    <Icon name="clone" color={'white'} solid size={36} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{
                                        // alignSelf: 'flex-end',
                                        alignItems: 'center',
                                        backgroundColor: 'transparent',
                                    }}
                                    onPress={takePicture}
                                >
                                    <Icon name="circle" color={'white'} size={64} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{
                                        // alignSelf: 'flex-end',
                                        alignItems: 'center',
                                        backgroundColor: 'transparent',
                                    }}
                                    onPress={handleCameraType}
                                >
                                    <Icon name="undo" color={'white'} solid size={36} />
                                </TouchableOpacity>
                            </View>

                        </View>
                    </Camera>
                </View>
            )
        }
    </Fragment>



}

export default PictureTaker