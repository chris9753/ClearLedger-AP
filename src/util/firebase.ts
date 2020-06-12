import { useState, useEffect, useRef } from "react"
import firestore, { FirebaseFirestoreTypes } from "@react-native-firebase/firestore"
import { useSession } from "./helpers"
import auth from '@react-native-firebase/auth'
import storage from '@react-native-firebase/storage'
import { useDocumentData, useCollectionData } from 'react-firebase-hooks/firestore';
import { Profile } from '../entities/profiles/model'
import {Connection} from '../entities/connections/model'
import * as ImageManipulator from 'expo-image-manipulator';
import { useProfile as useProfileContext } from '../util/helpers'
import { Chat } from "src/entities/chats/model"

export const useProfile = () => {
    // type profile = Profile | null
    const user = auth().currentUser


    const [profile, loading, error] = useDocumentData(firestore().collection('user-profiles').doc(user?.uid))

    return {
        profile: (profile as Profile),
        loading,
        error
    }

}


export const useConnections = () => {
    // type profile = Profile | null
    const user = auth().currentUser


    const [connection, loading, error] = useDocumentData(firestore().collection('user-connections').doc(user?.uid))

    return {
        connection: (connection as Connection),
        loading,
        error
    }

}


export const useChats = () => {
    const user = auth().currentUser

    const [chats, loading, error] = useCollectionData(firestore().collection('connection-chats').where('users','array-contains',user!.uid)
     ,{idField:'id'}
    )

    return {
       chats: (chats as Chat[]),
        loading,
        error
    }

  

}





export const addPhoto = async (uri: string) => {
    //use compressed version of image due to firestore limits

    const preview = (await ImageManipulator.manipulateAsync(uri, [], { base64: true, compress: .1 })).base64
    const user = auth().currentUser
    const remoteURI = await uploadPhoto(uri) as string
    return new Promise((res, rej) => {
        const newImage = { preview: `data:image/jpeg;base64,${preview}`, uri: remoteURI }
        console.log(newImage.uri, newImage.preview!.charAt(0))
        firestore().collection('user-profiles').doc(user?.uid).update({ images: firestore.FieldValue.arrayUnion(newImage) })
            .then(ref => res(ref))
            .catch(err => {
                rej(err)
            })
    })
}

export const useProfilePagination = (limit: number = 50) => {
    const lastVisible = useRef<FirebaseFirestoreTypes.DocumentSnapshot | null>(null)
    const [ready, setReady] = useState(false)
    let myProfile = useProfileContext();
    useEffect(() => {
        if (myProfile) {
            setReady(true)
        }
    }, [myProfile])

    const runTransaction = async () => {
        let query;
        const profileTopMatchNames = [...myProfile!.placesToGo.map(l => l.formatted_address),myProfile!.homeLocation.formatted_address]
        if (lastVisible.current) {
            query = firestore().collection('user-profiles').where('top1', 'array-contains-any',
            profileTopMatchNames)
                .orderBy('age', 'desc')
                .where('age','<=',myProfile?.ageRange.end)
                .where('age','>=',myProfile?.ageRange.start)
               
                .startAfter(lastVisible.current)
                .limit(limit)
        } else {
            query = firestore().collection('user-profiles').where('top1', 'array-contains-any',
            profileTopMatchNames)
                .where('age','<=',myProfile?.ageRange.end)
                .where('age','>=',myProfile?.ageRange.start)
                .orderBy('age', 'desc')
                .limit(limit)
        }

        let results = (await query.get()).docs
        lastVisible.current = results.length ? results[results.length - 1] : null
        //add preference filter here
        return results.filter(doc => doc.id !== auth().currentUser!.uid)
    }


    return {
        next: runTransaction,
        ready
    }

}
export const updateProfile = async ({ bio, placesToGo, placesBeen, homeLocation }: Profile) => {
    const user = auth().currentUser
    return new Promise((res, rej) => {
        firestore().collection('user-profiles').doc(user?.uid).update({ bio, placesToGo, placesBeen, homeLocation })
            .then(ref => res(ref))
            .catch(err => {
                rej(err)
            })
    })
}
export const getProfile = async (uid:string) => {
    return new Promise((res, rej) => {
        firestore().collection('user-profiles').doc(uid).get()
            .then(ref => res({uid,...ref.data()} as Profile))
            .catch(err => {
                rej(err)
            })
    })
}
export const uploadPhoto = async (uri: string) => {
    console.log("should only be caled once..")
    const user = auth().currentUser
    const path = `profiles/${user?.uid}/images/${Date.now()}.jpg`
    return new Promise(async (res, rej) => {
        const response = await fetch(uri);
        const file = await response.blob()

        const ref = storage().ref(path)
        let upload = ref.put(file)

        upload.on('state_changed', _ => { }, err => rej(err), async () => {
            const url = await upload.snapshot?.ref.getDownloadURL()
            res(url)
        })
    })
}