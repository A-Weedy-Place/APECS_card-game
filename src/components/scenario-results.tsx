"use client";
import { useEffect,useRef,useState } from "react";
import { X,ExternalLink } from "lucide-react";
export function ScenarioResults({url,onClose}:{url:string;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [frameVersion,setFrameVersion]=useState(0);
 useEffect(()=>{dialog.current?.showModal();},[]);
 useEffect(()=>{
  const element=dialog.current;if(!element)return;let width=element.getBoundingClientRect().width,timer:ReturnType<typeof setTimeout>;
  // The official tool computes its chart scale on load. Refresh on orientation/width
  // changes, but leave height-only virtual-keyboard changes alone.
  const observer=new ResizeObserver(entries=>{const next=entries[0].contentRect.width;if(Math.abs(next-width)<16)return;width=next;clearTimeout(timer);timer=setTimeout(()=>setFrameVersion(value=>value+1),200);});
  observer.observe(element);return()=>{observer.disconnect();clearTimeout(timer);};
 },[]);
 return <dialog ref={dialog} className="scenario-dialog" aria-label="En-ROADS scenario results" onCancel={onClose}>
  <header><h2>APECS · Your scenario</h2><a href={url} target="_blank" rel="noreferrer">Open En-ROADS <ExternalLink size={14}/></a><button className="icon-button" aria-label="Close scenario results" onClick={onClose}><X size={22}/></button></header>
  <iframe key={frameVersion} src={url} title="Official En-ROADS simulator: your policy scenario" referrerPolicy="no-referrer" allow="fullscreen"/>
  <footer>En-ROADS is a tool created by <a href="https://www.climateinteractive.org/" target="_blank" rel="noreferrer">Climate Interactive</a> and <a href="https://mitsloan.mit.edu/" target="_blank" rel="noreferrer">MIT Sloan</a>. Exploring here does not change the submitted score.</footer>
 </dialog>;
}
