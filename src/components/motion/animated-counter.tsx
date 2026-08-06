"use client";
import { useEffect, useState } from "react";
export function AnimatedCounter({value,suffix=""}:{value:number;suffix?:string}){const[count,setCount]=useState(0);useEffect(()=>{if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){const reducedFrame=requestAnimationFrame(()=>setCount(value));return()=>cancelAnimationFrame(reducedFrame);}let frame=0;const total=40;const id=setInterval(()=>{frame+=1;setCount(Math.round(value*Math.min(frame/total,1)));if(frame>=total)clearInterval(id);},25);return()=>clearInterval(id);},[value]);return <span>{count}{suffix}</span>;}
