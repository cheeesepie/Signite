// ═══════════════════════════════════════════════════════════
//  SIGNITE v5 — Thai Sign Language Recognition
//  app.js
// ═══════════════════════════════════════════════════════════

const GESTURES = [
  { id:'zero',     label:'เลข 0',    type:'static',  video:'zero.mp4'     },
  { id:'one',      label:'เลข 1',    type:'static',  video:'one.mp4'      },
  { id:'two',      label:'เลข 2',    type:'static',  video:'two.mp4'      },
  { id:'three',    label:'เลข 3',    type:'static',  video:'three.mp4'    },
  { id:'four',     label:'เลข 4',    type:'static',  video:'four.mp4'     },
  { id:'five',     label:'เลข 5',    type:'static',  video:'five.mp4'     },
  { id:'six',      label:'เลข 6',    type:'static',  video:'six.mp4'      },
  { id:'seven',    label:'เลข 7',    type:'static',  video:'seven.mp4'    },
  { id:'eight',    label:'เลข 8',    type:'static',  video:'eight.mp4'    },
  { id:'nine',     label:'เลข 9',    type:'static',  video:'nine.mp4'     },
  { id:'chan',     label:'ฉัน',      type:'static',  video:'chan.mp4'     },
  { id:'rak',      label:'รัก',      type:'static',  video:'rak.mp4'      },
  { id:'khobkhun', label:'ขอบคุณ',   type:'dynamic', video:'khobkhun.mp4',
    steps:['ประนมมือไม่ชิดกัน','แบมือออก'] },
  { id:'mairepen', label:'ไม่เป็นไร', type:'dynamic', video:'maipenrai.mp4',
    steps:['แบมือทั้ง 2 ข้างแบบในวิดีโอ','ขยับมือเข้าออก'] },
  { id:'sabaidee', label:'สบายดี',   type:'dynamic', video:'sabaidee.mp4',
    steps:['แบมือทั้ง 2 ข้าง (โป้งพับ)','ท่าเยี่ยมทั้ง 2 ข้าง'] },
];

const GESTURE_LABELS = Object.fromEntries(GESTURES.map(g => [g.id, g.label]));

const videoEl        = document.getElementById('video');
const canvasEl       = document.getElementById('canvas');
const ctx            = canvasEl.getContext('2d');
const gestureLabelEl = document.getElementById('gesture-label');
const statusDot      = document.getElementById('statusDot');
const statusTxt      = document.getElementById('statusText');
const placeholder    = document.getElementById('placeholder');
const btnPractice    = document.getElementById('btnPractice');
const btnNext        = document.getElementById('btnNext');
const taskNameEl     = document.getElementById('taskName');
const successFlash   = document.getElementById('successFlash');
const checklistEl    = document.getElementById('checklist');
const learnModal     = document.getElementById('learnModal');
const modalTitle     = document.getElementById('modalTitle');
const modalVideoWrap = document.getElementById('modalVideoWrap');

const progressState = GESTURES.map((_, i) => i === 0 ? 'active' : 'locked');

function buildChecklist() {
  checklistEl.innerHTML = '';
  GESTURES.forEach((g, idx) => {
    const row = document.createElement('div');
    row.id = `row-${g.id}`;
    row.className = `gest-row ${progressState[idx]}`;
    row.textContent = g.label;
    row.addEventListener('click', () => handleRowClick(idx));
    checklistEl.appendChild(row);
    if (g.type === 'dynamic') {
      g.steps.forEach((_, si) => {
        const sub = document.createElement('div');
        sub.className = 'gest-sub';
        sub.id = `sub-${g.id}-${si}`;
        sub.innerHTML = `<span class="dot"></span>${si === 0 ? 'ขั้นตอนที่ 1' : 'ขั้นตอนที่ 2'}`;
        checklistEl.appendChild(sub);
      });
    }
    if (idx === 9 || idx === 11) {
      const div = document.createElement('div');
      div.className = 'gest-divider';
      checklistEl.appendChild(div);
    }
  });
  updateTaskLabel();
}

function handleRowClick(idx) {
  if (progressState[idx] !== 'done') return;
  if (cameraActive) stopCamera();
  const prevActive = progressState.findIndex(s => s === 'active');
  if (prevActive !== -1) progressState[prevActive] = 'locked';
  progressState[idx] = 'active';
  updateChecklist();
}

function updateChecklist() {
  GESTURES.forEach((g, idx) => {
    const row = document.getElementById(`row-${g.id}`);
    if (!row) return;
    row.className = `gest-row ${progressState[idx]}`;
    row.textContent = g.label;
  });
  updateSubSteps(null);
  updateTaskLabel();
}

function updateTaskLabel() {
  const ai = progressState.findIndex(s => s === 'active');
  if (ai === -1) {
    taskNameEl.textContent = '🎉 ครบทุกท่าแล้ว!';
    btnPractice.disabled = true;
    if (btnNext) btnNext.disabled = true;
  } else {
    taskNameEl.textContent = `โจทย์ : ${GESTURES[ai].label}`;
    btnPractice.disabled = false;
  }
}

const LM = {
  WRIST:0, THUMB_CMC:1,THUMB_MCP:2,THUMB_IP:3,THUMB_TIP:4,
  INDEX_MCP:5,INDEX_PIP:6,INDEX_DIP:7,INDEX_TIP:8,
  MID_MCP:9,MID_PIP:10,MID_DIP:11,MID_TIP:12,
  RING_MCP:13,RING_PIP:14,RING_DIP:15,RING_TIP:16,
  PINKY_MCP:17,PINKY_PIP:18,PINKY_DIP:19,PINKY_TIP:20,
};
function dist2D(a,b){ return Math.hypot(a.x-b.x, a.y-b.y); }
function getFingersUp(lm){
  return {
    thumb:  dist2D(lm[LM.THUMB_TIP],lm[LM.INDEX_MCP])>dist2D(lm[LM.THUMB_MCP],lm[LM.INDEX_MCP]),
    index:  lm[LM.INDEX_TIP].y<lm[LM.INDEX_PIP].y,
    middle: lm[LM.MID_TIP].y<lm[LM.MID_PIP].y,
    ring:   lm[LM.RING_TIP].y<lm[LM.RING_PIP].y,
    pinky:  lm[LM.PINKY_TIP].y<lm[LM.PINKY_PIP].y,
  };
}

function classifyOneHand(lm) {
  const f=getFingersUp(lm);
  if (!f.thumb&&!f.index&&!f.middle&&!f.ring&&!f.pinky) return 'zero';
  if (!f.thumb&&f.index&&!f.middle&&!f.ring&&!f.pinky) {
    const dx=Math.abs(lm[LM.INDEX_TIP].x-lm[LM.INDEX_MCP].x);
    const dy=lm[LM.INDEX_MCP].y-lm[LM.INDEX_TIP].y;
    if (dx>0.06&&dx>dy*0.8) return 'chan';
    return 'one';
  }
  if (!f.thumb&&f.index&&f.middle&&!f.ring&&!f.pinky) return 'two';
  if (f.thumb&&f.index&&f.middle&&!f.ring&&!f.pinky)  return 'three';
  if (!f.thumb&&f.index&&f.middle&&f.ring&&f.pinky)   return 'four';
  if (f.thumb&&f.index&&f.middle&&f.ring&&f.pinky)    return 'five';
  if (!f.thumb&&f.index&&f.middle&&f.ring&&!f.pinky&&dist2D(lm[LM.THUMB_TIP],lm[LM.PINKY_TIP])<0.12) return 'six';
  if (!f.thumb&&f.index&&f.middle&&!f.ring&&f.pinky&&dist2D(lm[LM.THUMB_TIP],lm[LM.RING_TIP])<0.12)  return 'seven';
  if (!f.thumb&&f.index&&!f.middle&&f.ring&&f.pinky&&dist2D(lm[LM.THUMB_TIP],lm[LM.MID_TIP])<0.12)   return 'eight';
  if (!f.thumb&&!f.index&&f.middle&&f.ring&&f.pinky&&dist2D(lm[LM.THUMB_TIP],lm[LM.INDEX_TIP])<0.12) return 'nine';
  return null;
}

function classifyRak(hands) {
  if (hands.length<2) return false;
  const lm1=hands[0].landmarks,lm2=hands[1].landmarks;
  const f1=getFingersUp(lm1),f2=getFingersUp(lm2);
  return f1.index&&f1.middle&&f1.ring&&f1.pinky&&f2.index&&f2.middle&&f2.ring&&f2.pinky
    &&dist2D(lm1[LM.WRIST],lm2[LM.WRIST])<0.18;
}

const TIMEOUT_MS=4000;
function fourFingersUp(lm){ const f=getFingersUp(lm); return f.index&&f.middle&&f.ring&&f.pinky; }
function isThumbsUp(lm) {
  const FOLD=0.10;
  return lm[LM.THUMB_TIP].y<lm[LM.THUMB_IP].y&&lm[LM.THUMB_TIP].y<lm[LM.THUMB_MCP].y
    &&dist2D(lm[LM.INDEX_TIP],lm[LM.INDEX_MCP])<FOLD&&dist2D(lm[LM.MID_TIP],lm[LM.MID_MCP])<FOLD
    &&dist2D(lm[LM.RING_TIP],lm[LM.RING_MCP])<FOLD&&dist2D(lm[LM.PINKY_TIP],lm[LM.PINKY_MCP])<FOLD;
}

const khobkhunSM={state:0,stateTime:0,reset(){this.state=0;this.stateTime=0;}};
function processKhobkhun(hands,now){
  if(hands.length<2){khobkhunSM.reset();return{step:-1};}
  const sm=khobkhunSM,lm1=hands[0].landmarks,lm2=hands[1].landmarks;
  const w1=lm1[LM.WRIST],w2=lm2[LM.WRIST],wDist=dist2D(w1,w2),yDiff=Math.abs(w1.y-w2.y);
  if(sm.state===0){if(fourFingersUp(lm1)&&fourFingersUp(lm2)&&wDist>0.07&&wDist<0.38&&yDiff<0.14){sm.state=1;sm.stateTime=now;}return{step:-1};}
  if(sm.state===1){if(now-sm.stateTime>TIMEOUT_MS){sm.reset();return{step:-1};}if(fourFingersUp(lm1)&&fourFingersUp(lm2)&&Math.abs(w1.x-w2.x)>0.42){sm.reset();return{gesture:'khobkhun',done:true};}return{step:1};}
  return{step:-1};
}

const maiRepenSM={state:0,stateTime:0,lastDist:null,oscillateDir:0,oscillateCount:0,reset(){this.state=0;this.stateTime=0;this.lastDist=null;this.oscillateDir=0;this.oscillateCount=0;}};
function processMairepen(hands,now){
  if(hands.length<2){maiRepenSM.reset();return{step:-1};}
  const sm=maiRepenSM,lm1=hands[0].landmarks,lm2=hands[1].landmarks,f1=getFingersUp(lm1),f2=getFingersUp(lm2);
  if(sm.state===0){const allUp1=f1.thumb&&f1.index&&f1.middle&&f1.ring&&f1.pinky,allUp2=f2.thumb&&f2.index&&f2.middle&&f2.ring&&f2.pinky,iDist=dist2D(lm1[LM.INDEX_TIP],lm2[LM.INDEX_TIP]),wDist=dist2D(lm1[LM.WRIST],lm2[LM.WRIST]);if(allUp1&&allUp2&&iDist<0.45&&iDist>0.05&&wDist>0.10){sm.state=1;sm.stateTime=now;sm.lastDist=iDist;sm.oscillateCount=0;sm.oscillateDir=0;}return{step:-1};}
  if(sm.state===1){if(now-sm.stateTime>TIMEOUT_MS){sm.reset();return{step:-1};}const iDist=dist2D(lm1[LM.INDEX_TIP],lm2[LM.INDEX_TIP]),delta=iDist-sm.lastDist;if(Math.abs(delta)>0.03){const dir=delta>0?1:-1;if(dir!==sm.oscillateDir){sm.oscillateDir=dir;sm.oscillateCount++;}sm.lastDist=iDist;}if(sm.oscillateCount>=4){sm.reset();return{gesture:'mairepen',done:true};}return{step:1};}
  return{step:-1};
}

const sabadeeSM={state:0,stateTime:0,reset(){this.state=0;this.stateTime=0;}};
function processSabaidee(hands,now){
  if(hands.length<2){sabadeeSM.reset();return{step:-1};}
  const sm=sabadeeSM,lm1=hands[0].landmarks,lm2=hands[1].landmarks;
  if(sm.state===0){if(fourFingersUp(lm1)&&!getFingersUp(lm1).thumb&&fourFingersUp(lm2)&&!getFingersUp(lm2).thumb){sm.state=1;sm.stateTime=now;}return{step:-1};}
  if(sm.state===1){if(now-sm.stateTime>TIMEOUT_MS){sm.reset();return{step:-1};}if(isThumbsUp(lm1)&&isThumbsUp(lm2)){sm.reset();return{gesture:'sabaidee',done:true};}return{step:1};}
  return{step:-1};
}

let pendingConfirm=null,pendingConfirmTime=0;
const CONFIRM_MS=400;
function getActiveIdx(){return progressState.findIndex(s=>s==='active');}

function recognize(hands,now){
  const kkR=processKhobkhun(hands,now),mrR=processMairepen(hands,now),sdR=processSabaidee(hands,now);
  if(kkR?.done) return{raw:'khobkhun',confirmed:'khobkhun',step:null};
  if(mrR?.done) return{raw:'mairepen',confirmed:'mairepen',step:null};
  if(sdR?.done) return{raw:'sabaidee',confirmed:'sabaidee',step:null};
  if(kkR?.step===1) return{raw:'khobkhun',confirmed:null,step:'khobkhun:1'};
  if(mrR?.step===1) return{raw:'mairepen',confirmed:null,step:'mairepen:1'};
  if(sdR?.step===1) return{raw:'sabaidee',confirmed:null,step:'sabaidee:1'};
  if(classifyRak(hands)){if(pendingConfirm!=='rak'){pendingConfirm='rak';pendingConfirmTime=now;}return{raw:'rak',confirmed:(now-pendingConfirmTime>=CONFIRM_MS?'rak':null),step:null};}
  const dynamicBusy=khobkhunSM.state>0||maiRepenSM.state>0||sabadeeSM.state>0;
  if(!dynamicBusy&&hands.length>=1){const s=classifyOneHand(hands[0].landmarks);if(s){if(pendingConfirm!==s){pendingConfirm=s;pendingConfirmTime=now;}return{raw:s,confirmed:(now-pendingConfirmTime>=CONFIRM_MS?s:null),step:null};}}
  pendingConfirm=null;
  return{raw:null,confirmed:null,step:null};
}

let successTimeout=null,justCompleted=false;
function onGestureConfirmed(gestureId){
  if(justCompleted)return;const ai=getActiveIdx();if(ai===-1)return;if(GESTURES[ai].id!==gestureId)return;
  justCompleted=true;progressState[ai]='done';updateChecklist();
  successFlash.classList.add('show');clearTimeout(successTimeout);
  successTimeout=setTimeout(()=>{successFlash.classList.remove('show');stopCamera();if(ai+1<GESTURES.length)progressState[ai+1]='active';updateChecklist();justCompleted=false;},1000);
}

function updateSubSteps(stepKey){
  document.querySelectorAll('.gest-sub').forEach(el=>el.classList.remove('active-step','done-step'));
  if(!stepKey)return;
  const[gid,sRaw]=stepKey.split(':'),si=parseInt(sRaw)-1;
  const sub0=document.getElementById(`sub-${gid}-0`),sub1=document.getElementById(`sub-${gid}-1`);
  if(si===0&&sub0)sub0.classList.add('active-step');
  else if(si===1){if(sub0)sub0.classList.add('done-step');if(sub1)sub1.classList.add('active-step');}
}

// ═══ MODAL ════════════════════════════════════════════════
window.openLearnModal=function(){
  const ai=getActiveIdx();
  const g=ai!==-1?GESTURES[ai]:null;
  if(!g)return;
  modalTitle.textContent=`สาธิตท่า: ${g.label}`;
  if(g.video){
    modalVideoWrap.innerHTML=`<video controls autoplay muted playsinline><source src="VDO/${g.video}" type="video/mp4"/>เบราว์เซอร์ไม่รองรับวิดีโอ</video>`;
  } else {
    modalVideoWrap.innerHTML=`<div class="no-video-msg">ขณะนี้ยังไม่มีวิดีโอสาธิต<br>ขออภัยในความไม่สะดวก</div>`;
  }
  learnModal.classList.add('open');
};
window.closeLearnModal=function(e){if(e.target===learnModal)_closeModal();};
window.closeLearnModalBtn=function(){_closeModal();};
function _closeModal(){learnModal.classList.remove('open');const v=modalVideoWrap.querySelector('video');if(v){v.pause();v.currentTime=0;}modalVideoWrap.innerHTML='';}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&learnModal.classList.contains('open'))_closeModal();});

// ═══ DRAW ═════════════════════════════════════════════════
const HC=[[LM.WRIST,LM.THUMB_CMC],[LM.THUMB_CMC,LM.THUMB_MCP],[LM.THUMB_MCP,LM.THUMB_IP],[LM.THUMB_IP,LM.THUMB_TIP],[LM.WRIST,LM.INDEX_MCP],[LM.INDEX_MCP,LM.INDEX_PIP],[LM.INDEX_PIP,LM.INDEX_DIP],[LM.INDEX_DIP,LM.INDEX_TIP],[LM.WRIST,LM.MID_MCP],[LM.MID_MCP,LM.MID_PIP],[LM.MID_PIP,LM.MID_DIP],[LM.MID_DIP,LM.MID_TIP],[LM.WRIST,LM.RING_MCP],[LM.RING_MCP,LM.RING_PIP],[LM.RING_PIP,LM.RING_DIP],[LM.RING_DIP,LM.RING_TIP],[LM.WRIST,LM.PINKY_MCP],[LM.PINKY_MCP,LM.PINKY_PIP],[LM.PINKY_PIP,LM.PINKY_DIP],[LM.PINKY_DIP,LM.PINKY_TIP],[LM.INDEX_MCP,LM.MID_MCP],[LM.MID_MCP,LM.RING_MCP],[LM.RING_MCP,LM.PINKY_MCP]];
function drawHand(lm,W,H){ctx.strokeStyle='rgba(255,255,255,0.52)';ctx.lineWidth=1.5;ctx.lineCap='round';for(const[a,b]of HC){ctx.beginPath();ctx.moveTo(lm[a].x*W,lm[a].y*H);ctx.lineTo(lm[b].x*W,lm[b].y*H);ctx.stroke();}for(let i=0;i<lm.length;i++){const x=lm[i].x*W,y=lm[i].y*H,isTip=[4,8,12,16,20].includes(i),r=isTip?4:(i===0?5:2.8);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,0.82)';ctx.fill();if(isTip){ctx.strokeStyle='rgba(168,85,247,0.8)';ctx.lineWidth=1.2;ctx.stroke();}}}

function onResults(results){
  const W=canvasEl.width,H=canvasEl.height;ctx.save();ctx.clearRect(0,0,W,H);ctx.drawImage(results.image,0,0,W,H);ctx.restore();
  const now=performance.now(),handsData=(results.multiHandLandmarks||[]).map(lm=>({landmarks:lm}));
  for(const h of handsData)drawHand(h.landmarks,W,H);
  const{raw,confirmed,step}=recognize(handsData,now),ai=getActiveIdx();
  if(raw){const ok=ai!==-1&&GESTURES[ai].id===raw;gestureLabelEl.textContent=GESTURE_LABELS[raw]||raw;gestureLabelEl.classList.add('visible');gestureLabelEl.classList.toggle('correct',ok);}
  else{gestureLabelEl.textContent='';gestureLabelEl.classList.remove('visible','correct');}
  updateSubSteps(step||null);if(confirmed)onGestureConfirmed(confirmed);
}

let cameraActive=false,mpCamera=null,handsModel=null;
window.toggleCamera=async function(){if(!cameraActive)await startCamera();else stopCamera();};

async function startCamera(){
  btnPractice.disabled=true;statusTxt.textContent='กำลังโหลด…';
  handsModel=new Hands({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${f}`});
  handsModel.setOptions({maxNumHands:2,modelComplexity:1,minDetectionConfidence:0.72,minTrackingConfidence:0.65});
  handsModel.onResults(onResults);
  try{
    const stream=await navigator.mediaDevices.getUserMedia({video:{width:1280,height:960,facingMode:'user'}});
    videoEl.srcObject=stream;await new Promise(res=>{videoEl.onloadedmetadata=res;});
    canvasEl.width=videoEl.videoWidth||1280;canvasEl.height=videoEl.videoHeight||960;
    mpCamera=new Camera(videoEl,{onFrame:async()=>{await handsModel.send({image:videoEl});},width:canvasEl.width,height:canvasEl.height});
    mpCamera.start();
    cameraActive=true;justCompleted=false;placeholder.classList.add('hidden');
    btnPractice.textContent='⏹ หยุด';btnPractice.classList.add('active');btnNext.disabled=false;
    statusDot.classList.add('active');statusTxt.textContent='กล้องทำงานอยู่';
  }catch(err){console.error(err);statusTxt.textContent='ไม่สามารถเข้าถึงกล้องได้';handsModel=null;}
  btnPractice.disabled=false;
}

function stopCamera(){
  if(mpCamera){mpCamera.stop();mpCamera=null;}
  if(videoEl.srcObject){videoEl.srcObject.getTracks().forEach(t=>t.stop());videoEl.srcObject=null;}
  if(handsModel){handsModel.close();handsModel=null;}
  ctx.clearRect(0,0,canvasEl.width,canvasEl.height);gestureLabelEl.classList.remove('visible','correct');
  placeholder.classList.remove('hidden');btnPractice.textContent='ฝึกทำ';btnPractice.classList.remove('active');
  btnNext.disabled=true;statusDot.classList.remove('active');statusTxt.textContent='รอการเชื่อมต่อ';
  cameraActive=false;khobkhunSM.reset();maiRepenSM.reset();sabadeeSM.reset();pendingConfirm=null;updateSubSteps(null);
}

window.skipToNext=function(){
  const ai=getActiveIdx();if(ai===-1)return;progressState[ai]='done';updateChecklist();
  successFlash.classList.add('show');clearTimeout(successTimeout);
  successTimeout=setTimeout(()=>{successFlash.classList.remove('show');stopCamera();if(ai+1<GESTURES.length)progressState[ai+1]='active';updateChecklist();},800);
};

buildChecklist();
