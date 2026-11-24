import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceLoader } from './load-source.mjs';
const {createSpeechSession,appendDictation,recognitionConstructor,speechErrorMessage}=sourceLoader()('src/app/(main)/recipients/[id]/_components/KeywordInputForm/speechRecognition.ts');
function fixture({startError=false,stopError=false}={}) {
 const instances=[]; const states=[]; let value='원래 메모';
 class FakeRecognition {
  constructor(){ instances.push(this); }
  start(){if(startError)throw Error('start');}
  stop(){this.stops=(this.stops??0)+1;if(stopError)throw Error('stop');}
  abort(){this.aborts=(this.aborts??0)+1;}
 }
 const session=createSpeechSession(FakeRecognition,text=>{value=appendDictation(value,text);},s=>states.push(s));
 const result=(text,isFinal)=>Object.assign([{transcript:text}],{isFinal});
 return {session,engine:instances[0],states,result,get value(){return value;},edit(text){value=text;}};
}
test('browser recognition uses Korean and both standard and prefixed implementations',()=>{
 class Standard{} class Prefixed{}
 assert.equal(recognitionConstructor({SpeechRecognition:Standard,webkitSpeechRecognition:Prefixed}),Standard);
 assert.equal(recognitionConstructor({webkitSpeechRecognition:Prefixed}),Prefixed);
 assert.equal(recognitionConstructor({}),undefined);
 const f=fixture();assert.equal(f.engine.lang,'ko-KR');assert.equal(f.engine.interimResults,true);assert.equal(f.engine.continuous,true);
});
test('interim revisions never enter the field; final results commit once despite repeated cumulative events',()=>{
 const f=fixture();f.session.start();f.engine.onstart();
 f.engine.onresult({results:[f.result('식',false)]});f.engine.onresult({results:[f.result('식사 도움',false)]});assert.equal(f.value,'원래 메모');
 assert.equal(f.states.at(-1).interim,'식사 도움');
 const final=f.result('식사 도움',true);f.engine.onresult({results:[final]});
 f.engine.onresult({results:[final,f.result('산책',false)]});
 f.engine.onresult({results:[final,f.result('산책',true)]});
 assert.equal(f.value,'원래 메모 식사 도움 산책');
});
test('dictation appends to the latest typed edits and does not replace or trim existing content',()=>{
 const f=fixture();f.session.start();f.edit('직접 고친 글  ');f.engine.onresult({results:[f.result('함께 걸음',true)]});assert.equal(f.value,'직접 고친 글  함께 걸음');
 assert.equal(appendDictation('', '메모'),'메모');assert.equal(appendDictation('기록\n','메모'),'기록\n메모');
});
test('stop flushes a final result once, then allows a fresh session without automatically restarting',()=>{
 const f=fixture();f.session.start();f.engine.onstart();f.session.stop();f.session.stop();assert.equal(f.engine.stops,1);assert.equal(f.states.at(-1).phase,'stopping');
 f.engine.onresult({results:[f.result('마지막 말',true)]});f.engine.onend();assert.equal(f.value,'원래 메모 마지막 말');assert.equal(f.states.at(-1).phase,'idle');assert.equal(f.states.at(-1).message,'');assert.equal(f.engine.onresult,null);
 const next=fixture();next.session.start();assert.equal(next.states.at(-1).phase,'starting');
});
test('cancel on navigation/unmount detaches listeners and rejects even queued late callbacks',()=>{
 const f=fixture();f.session.start();const lateResult=f.engine.onresult,lateStart=f.engine.onstart,lateEnd=f.engine.onend;
 f.session.cancel();const count=f.states.length;
 lateResult({results:[f.result('늦은 결과',true)]});lateStart();lateEnd();assert.equal(f.value,'원래 메모');assert.equal(f.states.length,count);assert.equal(f.engine.onresult,null);assert.equal(f.engine.aborts,1);
});
test('permissions, microphone, network, silence and language errors preserve committed text with actionable guidance',()=>{
 for(const error of ['not-allowed','service-not-allowed','audio-capture','network','no-speech','language-not-supported','aborted','other']){
 const f=fixture();f.session.start();f.engine.onresult({results:[f.result('확정된 말',true)]});const late=f.engine.onresult;f.engine.onerror({error});
 late({results:[f.result('버려야 할 말',true)]});assert.equal(f.value,'원래 메모 확정된 말');assert.equal(f.states.at(-1).phase,'idle');assert.ok(f.states.at(-1).message);assert.equal(f.engine.onresult,null);
 }
});
test('start/stop exceptions and an empty natural end return to idle without losing text',()=>{
 for(const options of [{startError:true},{stopError:true},{}]){const f=fixture(options);f.session.start();if(options.stopError)f.session.stop();else if(!options.startError)f.engine.onend();assert.equal(f.states.at(-1).phase,'idle');assert.ok(f.states.at(-1).message);assert.equal(f.value,'원래 메모');}
});

test('normal completion and an explicit empty stop clear guidance; errors remain actionable',()=>{
 for(const withText of [false,true]){
  const f=fixture();f.session.start();f.engine.onstart();
  if(withText)f.engine.onresult({results:[f.result('완료한 말',true)]});
  else f.session.stop();
  f.engine.onend();assert.equal(f.states.at(-1).message,'');assert.equal(f.states.at(-1).interim,'');
 }
});
test('network errors preserve successful recognition without declaring a browser unsupported',()=>{
 const f=fixture();f.session.start();f.engine.onstart();
 f.engine.onresult({results:[f.result('확정된 말',true)]});f.engine.onerror({error:'network'});
 const state=f.states.at(-1);assert.equal(state.phase,'idle');assert.match(state.message,/연결.*문제/);
 assert.doesNotMatch(state.message,/Brave|Chrome|지원하지|마이크.*허용/);
 assert.equal(f.value,'원래 메모 확정된 말');
});

test('permission, service refusal and audio capture failures explain distinct problems without inventing causes',()=>{
 const permission=speechErrorMessage('not-allowed');
 const service=speechErrorMessage('service-not-allowed');
 const capture=speechErrorMessage('audio-capture');
 assert.match(permission,/권한.*설정/);assert.doesNotMatch(permission,/서비스.*지원하지/);
 assert.match(service,/서비스.*사용할 수 없/);assert.doesNotMatch(service,/마이크.*허용되지/);
 assert.match(capture,/소리를 가져오지 못/);assert.doesNotMatch(capture,/찾을 수 없/);
 assert.notEqual(service,permission);
});

test('insecure origins, missing API and Korean service support have separate guidance',()=>{
 assert.match(speechErrorMessage('insecure-context'),/HTTPS/);
 assert.match(speechErrorMessage('unsupported'),/환경.*사용할 수 없/);
 assert.doesNotMatch(speechErrorMessage('unsupported'),/HTTPS|Chrome|Brave/);
 assert.match(speechErrorMessage('language-not-supported'),/서비스.*한국어/);
});

test('unexpected aborts and unknown runtime errors do not misreport a start failure',()=>{
 for(const error of ['aborted','future-provider-error']){
  const f=fixture();f.session.start();f.engine.onstart();
  f.engine.onresult({results:[f.result('확정된 말',true)]});f.engine.onerror({error});
  assert.equal(f.states.at(-1).phase,'idle');assert.equal(f.value,'원래 메모 확정된 말');
  assert.doesNotMatch(f.states.at(-1).message,/시작하지 못|future-provider-error/);
  if(error==='aborted')assert.match(f.states.at(-1).message,/중단/);
 }
});

test('a stop exception reports finishing failure and preserves confirmed text',()=>{
 const f=fixture({stopError:true});f.session.start();f.engine.onstart();
 f.engine.onresult({results:[f.result('확정된 말',true)]});f.session.stop();
 assert.equal(f.states.at(-1).phase,'idle');assert.equal(f.value,'원래 메모 확정된 말');
 assert.match(f.states.at(-1).message,/마무리하지 못/);assert.doesNotMatch(f.states.at(-1).message,/시작/);
 assert.equal(f.engine.onresult,null);
});

test('explicit stop stays quiet for empty or aborted completion, but reports unrelated failures',()=>{
 for(const error of ['no-speech','aborted','network','service-not-allowed']){
  const f=fixture();f.session.start();f.engine.onstart();f.session.stop();
  const lateEnd=f.engine.onend;f.engine.onerror({error});const count=f.states.length;lateEnd();
  assert.equal(f.states.at(-1).phase,'idle');assert.equal(f.states.length,count);
  assert.equal(Boolean(f.states.at(-1).message),!['no-speech','aborted'].includes(error));
 }
});
