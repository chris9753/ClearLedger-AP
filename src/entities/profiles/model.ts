import { userAt } from "../connections/model"

export interface Location {
    formatted_address:string;
    location:any
}
export interface Image {
    preview:any;
    uri:string;

}
export interface Settings {
    ageRange:Range,
    desiredSex:DesiredSex
}
export type sex = 'M' | 'F'

export type DesiredSex = sex[]

export interface Range {
    start:number,
    end:number,
    
}
export interface Profile {
    desiredSex:DesiredSex;
    ageRange:Range;
    uid?:string;
    age: number;
    name:string;
    email:string;
    bio?:string;
    liked?:userAt[]
    likedBy?:userAt[]
    homeLocation:Location;
    placesToGo:Location[];
    placesBeen:Location[];
    images?:Image[];
    top1:string[];
}