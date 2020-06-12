import React, { useEffect,useState, useRef,Fragment } from 'react';


const withLoading = (Wrapped:any, Loading:any, loader:()=> any) => {

    return () => {
        //on mount and on reload
        const [loading,setLoading] = useState(true)
        const dataRef = useRef(null)
        const reloadTask = async () => {
            setLoading(true)
            let data = await loader()
            dataRef.current = data
            setLoading(false)
        }
        //once on mount
        useEffect(()=> {
          
            reloadTask()
           
        },[])

        return <Fragment>
            {loading ? 
            <Loading />
            : 
            <Wrapped reload={reloadTask} payload={dataRef.current}></Wrapped>
         }
        </Fragment>
        
      
       
        
    }
  
};

export default withLoading;
