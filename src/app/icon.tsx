import { ImageResponse } from "next/og";
export const size={width:64,height:64};export const contentType="image/png";
export default function Icon(){return new ImageResponse(<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",background:"#26352B",color:"#C8A96B",fontSize:30,fontWeight:700}}>N</div>,size);}
