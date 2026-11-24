import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceLoader } from './load-source.mjs';
const {createSpeechAudio}=sourceLoader()('src/app/(main)/recipients/[id]/_components/KeywordInputForm/speechAudio.ts');

function fixture(t,{blocked=false,failContext=false}={}){
 const oldAudio=Object.getOwnPropertyDescriptor(globalThis,'AudioContext');
 const oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 const contexts=[],analysers=[],constraints=[];let resolveMedia,rejectMedia;
 const media=new Promise((resolve,reject)=>{resolveMedia=resolve;rejectMedia=reject;});
 const track={stops:0,stop(){this.stops++}};
 const stream={getTracks:()=>[track]};
 function node(){return {connections:[],disconnected:false,connect(other){this.connections.push(other);return other;},disconnect(){this.disconnected=true}};}
 const param=()=>({setValueAtTime(){},exponentialRampToValueAtTime(){},linearRampToValueAtTime(){}});
 class Context{
  constructor(){if(failContext)throw Error('unsupported');this.state=blocked?'suspended':'running';this.currentTime=0;this.destination=node();this.tones=[];contexts.push(this);}
  resume(){return blocked?Promise.reject(Error('autoplay')):Promise.resolve();}
  close(){this.state='closed';return Promise.resolve();}
  createOscillator(){const oscillator={...node(),frequency:param(),start(){},stop(){}};this.tones.push(oscillator);return oscillator;}
  createGain(){return {...node(),gain:param()};}
  createMediaStreamSource(){return this.source=node();}
  createAnalyser(){return this.analyser=node();}
 }
 Object.defineProperty(globalThis,'AudioContext',{value:Context,writable:true,configurable:true});
 Object.defineProperty(globalThis,'navigator',{value:{mediaDevices:{getUserMedia(options){constraints.push(options);return media}}},configurable:true});
 t.after(()=>{if(oldAudio)Object.defineProperty(globalThis,'AudioContext',oldAudio);else delete globalThis.AudioContext;if(oldNavigator)Object.defineProperty(globalThis,'navigator',oldNavigator);else delete globalThis.navigator;});
 const audio=createSpeechAudio(analyser=>analysers.push(analyser));
 return {audio,contexts,analysers,constraints,track,stream,resolveMedia,rejectMedia};
}

test('audio feedback starts on recognition, never sends microphone audio to speakers, and releases all resources',async t=>{
 const f=fixture(t);assert.equal(f.constraints.length,0);assert.equal(f.contexts[0].tones.length,0);
 f.audio.start();f.audio.start();assert.equal(f.contexts[0].tones.length,1);assert.deepEqual(f.constraints,[{audio:true}]);
 f.resolveMedia(f.stream);await Promise.resolve();
 const context=f.contexts[0];assert.deepEqual(context.source.connections,[context.analyser]);assert.deepEqual(context.analyser.connections,[]);assert.equal(f.analysers.length,1);
 f.audio.stopMeter();assert.equal(f.track.stops,1);assert.ok(context.source.disconnected);
 f.audio.finish();f.audio.finish();assert.equal(context.tones.length,2);context.tones.at(-1).onended();assert.equal(context.state,'closed');assert.equal(f.track.stops,1);
});
test('navigation/cancel during pending permission releases a late stream without attaching it',async t=>{
 const f=fixture(t);f.audio.start();f.audio.dispose();f.resolveMedia(f.stream);await Promise.resolve();
 assert.equal(f.track.stops,1);assert.equal(f.analysers.length,0);assert.equal(f.contexts[0].state,'closed');assert.equal(f.contexts[0].tones.length,1);
});
test('stopping while permission is pending prevents a meter from reopening',async t=>{
 const f=fixture(t);f.audio.start();f.audio.stopMeter();f.resolveMedia(f.stream);await Promise.resolve();
 assert.equal(f.track.stops,1);assert.equal(f.analysers.length,0);f.audio.dispose();
});
test('missing/blocked Web Audio and denied meter access are optional, not dictation errors',async t=>{
 const f=fixture(t,{blocked:true});f.audio.start();f.rejectMedia(Error('denied'));await Promise.resolve();await Promise.resolve();f.audio.finish();
 assert.equal(f.analysers.length,0);assert.equal(f.contexts[0].tones.length,0);assert.equal(f.contexts[0].state,'closed');
});
test('unsupported audio initialization and recognition failure before start do not play cues or request a microphone',t=>{
 const f=fixture(t);f.audio.finish();assert.equal(f.contexts[0].state,'closed');assert.equal(f.contexts[0].tones.length,0);assert.equal(f.constraints.length,0);
 globalThis.AudioContext=class{constructor(){throw Error('unavailable')}};assert.equal(createSpeechAudio(()=>{}),null);
});
