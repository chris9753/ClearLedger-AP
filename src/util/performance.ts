import { useRef } from "react";

export  const useCountRenders = (name:string) => {
    const renders = useRef(0);
        console.log("current renders from ",name," :", renders.current++)
}