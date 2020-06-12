import { useState, useCallback, useRef } from 'react'
import layout from 'src/signed-out/layout';

export function useLayoutDimension(images:any) {
  const [dimension, setDimension] = useState<any>(null)
  const layoutCalls = useRef(0);
  const layoutDimension = { width: 0, height: 0 }
  const onLayout = useCallback(({ nativeEvent }) => {
    layoutDimension.width = nativeEvent.layout.width
    layoutDimension.height = nativeEvent.layout.height
    if (dimension !== layoutDimension.width && layoutDimension.width > 0) {
      layoutCalls.current++
      setDimension(layoutDimension)
     
    }
  }, [images.length])

  return {
    dimension,
    onLayout,
    layoutCalls
  }
}