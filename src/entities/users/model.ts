import auth,{FirebaseAuthTypes} from '@react-native-firebase/auth'

export interface User extends FirebaseAuthTypes.User {
    isUserComplete:() => boolean;
}


//static proxy
export default (FirebaseUser:FirebaseAuthTypes.User | null = auth().currentUser):User | null => {
    //static user
if(FirebaseUser) {
   //proxied method
   const _isUserComplete = ():boolean => {
    if (!FirebaseUser?.displayName && FirebaseUser?.email) return true
    return false;
}


return {...FirebaseUser ,isUserComplete:_isUserComplete}
} else {
    return null
}
 


}  

