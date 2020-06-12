import { Connection } from "./model";
import { Profile } from "../profiles/model";
import { firebase } from '@react-native-firebase/functions';

export class ConnectionService {
    connections: Connection
    myProfile:Profile
    constructor(connections: Connection,profile:Profile) {

        this.connections = connections
        this.myProfile = profile
     
    }

    public isValidConnection(uid:string){
        console.log(this.connections,"whatt")
        const {connections,unmatched,disliked} = this.connections
     
        let condition = (user:string) => {
           return user == uid
        }
       return (unmatched.map(x => x.user).filter(condition).length +
       disliked.map(x => x.user).filter(condition).length) === 0
    }
    public existingConnections(){
        return this.connections.connections.filter(userAt => this.isValidConnection(userAt.user ))
    }
    public shouldDisplay(uid:string){
        const {liked} = this.myProfile
        // !already liked or invalid connection
        console.log("not alraedy liked",!liked!.map(x => x.user).find(user => user == uid),this.isValidConnection(uid))
        return this.isValidConnection(uid) && !liked!.map(x => x.user).find(user => user == uid)
    }
    public async likeUser(uid:string) {
        const {likedBy} = this.myProfile
        let match = false
        //*this user liked you already.
        console.log('notmatching???',likedBy)
        try {
        if(likedBy!.map(x => x.user).find(user => user == uid)) match = true;
        
         
           let result = await firebase.functions().httpsCallable('like')({
                match,
                user:uid,
              });
              return {result,matched:match}
        } catch (e) {
            throw(e)
        }
      
    }
    public async dislikeUser(uid:string) {
        return await firebase.functions().httpsCallable('dislike')({
           user:uid
          });
    }
    public async unmatchUser(uid:string) {
       let connection = this.connections.connections.find(userAt => userAt.user == uid)
       console.log('the connection',connection)
       try {
        return await firebase.functions().httpsCallable('unmatch')({
            user:uid,
            connection
          });
       }catch (e) {
           throw new Error(e)
       }
       
    }
    public potentialConnections(){
        const {likedBy} = this.myProfile
       return likedBy?.map(x => x.user).filter((user:string) => {
            return this.shouldDisplay(user)
        })
    }
}