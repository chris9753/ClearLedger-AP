import { useRef } from "react";

export  const useCountRenders = () => {
    const renders = useRef(0);
        console.log("current renders:", renders.current++)
}