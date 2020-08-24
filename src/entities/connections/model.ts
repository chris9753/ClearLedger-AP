import { Location } from "../profiles/model";

export type userAt = { 'at':any,'user':string} 
export interface connection {
    at:any;
    user:string;
    chat:string;
    matchedPlaces:Location[]
}
export interface Connection {
    id?:string;
    connections:connection[];
    unmatched:userAt[];
    disliked:userAt[];

}



