import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
admin.initializeApp()
const db = admin.firestore();

/****************************
Connection management
 ****************************/


export const like = functions.https.onCall(async (data, context) => {
  const { user, match } = data
  console.log(user, match, "users and match")
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Endpoint requires authentication!');
  }
  const userRef = db.doc(`user-profiles/${user}`);
  const myUserRef = db.doc(`user-profiles/${context.auth.uid}`)
  const userConnectionRef = db.doc(`user-connections/${user}`);
  const myConnectionRef = db.doc(`user-connections/${context.auth.uid}`);
  const timeOf = admin.firestore.Timestamp.now()
  try {
    if (match) {

      //* make connection
      //* send out notification to other 'user'

      let newChat = {
        author: context.auth.uid,
        messages: [],
        users: [context.auth.uid, user],
        opened: false

      }
      let ref = await db.collection('connection-chats').add(newChat)
      // * must get location metadata
      let userDoc = await userRef.get()
      let myUserDoc = await myUserRef.get()
      let myUserPlaces = [...myUserDoc.data()!.placesToGo,myUserDoc.data()!.homeLocation].reduce((l,n)=>{
        l[n['formatted_address']] = n
        return l
      },{})
      let places = [...userDoc.data()!.top1]
      console.log('users',myUserPlaces)
      let matchedPlaces = places.filter((place:any) => place && myUserPlaces[place]).map((place) => myUserPlaces[place])
      console.log('matchedPlaces',matchedPlaces)
      await userConnectionRef.update({
        connections: admin.firestore.FieldValue.arrayUnion({ user: context.auth.uid, at: timeOf, chat: ref.id, matchedPlaces })
      })
      await myConnectionRef.update({
        connections: admin.firestore.FieldValue.arrayUnion({ user, at: timeOf, chat: ref.id, matchedPlaces })

      })
    }
    //*update likedBy field on liked user

    await userRef.update({
      likedBy: admin.firestore.FieldValue.arrayUnion({ user: context.auth.uid, at: timeOf })
    });
    await myUserRef.update({
      liked: admin.firestore.FieldValue.arrayUnion({ user, at: timeOf })
    });
    return {'status':'ok'}
  } catch (e) {
    throw (e)
  }



})

export const dislike = functions.https.onCall(async (data, context) => {
  const { user } = data
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Endpoint requires authentication!');
  }
  const userConnectionRef = db.doc(`user-connections/${context.auth.uid}`);
  // const myUserRef = db.doc(`user-profiles/${context.auth.uid}`)

  return await userConnectionRef.update({
    disliked: admin.firestore.FieldValue.arrayUnion(user)
  });


})

export const unmatch = functions.https.onCall(async (data, context) => {
  const { user, connection } = data
  const { at } = connection
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Endpoint requires authentication!');
  }
  try {
    const userConnectionRef = db.doc(`user-connections/${user}`);
    const myConnectionRef = db.doc(`user-connections/${context.auth.uid}`);
    const timeOf = admin.firestore.Timestamp.now()

    //!make rematching impossible
    await userConnectionRef.update({
      connections: admin.firestore.FieldValue.arrayRemove({ user: context.auth.uid, at, chat: connection.chat }),
      unmatched: admin.firestore.FieldValue.arrayUnion({ user: context.auth.uid, at: timeOf })
    })

    await myConnectionRef.update({
      connections: admin.firestore.FieldValue.arrayRemove(connection),
      unmatched: admin.firestore.FieldValue.arrayUnion({ user, at: timeOf })
    })

    //?clean up likedBy and liked fields and chat collections
    const userRef = db.doc(`user-profiles/${user}`);
    const myUserRef = db.doc(`user-profiles/${context.auth.uid}`);
    let userDoc = await userRef.get()
    let myUserDoc = await myUserRef.get()
    let userLikedBy = userDoc.data()!.likedBy.find((x: any) => x.user == context.auth!.uid)
    let myLikedBy = myUserDoc.data()!.likedBy.find((x: any) => x.user == user)
    await userRef.update({
      likedBy: admin.firestore.FieldValue.arrayRemove(userLikedBy)
    });
    await myUserRef.update({
      likedBy: admin.firestore.FieldValue.arrayRemove(myLikedBy)
    })
    await db.doc(`connection-chats/${connection.chat}`).delete()
    return {"status":'ok'}
  } catch (e) {
    throw new Error(e)
  }


})


/*******************
 * CHAT MANAGEMENT *
 *******************/

export const sendMessage = functions.https.onCall(async (data, context) => {
  const { id, text } = data;
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Endpoint requires authentication!');
  }
  try {
    const chatRef = db.doc(`connection-chats/${id}`);
    const timeOf = admin.firestore.Timestamp.now()
    let message = {
      at: timeOf,
      author: context.auth.uid,
      seen: false,
      text
    }
    return await chatRef.update({
      messages: admin.firestore.FieldValue.arrayUnion(message)
    })
  } catch (e) {
    throw new Error(e)
  }

})