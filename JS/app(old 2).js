// ═══════════════════════════════════════════════════════════
//  SIGNITE v6 — Thai Sign Language Recognition (free-order)
//  app.js
// ═══════════════════════════════════════════════════════════

// ── ข้อมูลหมวดหมู่คำศัพท์ ──────────────────────────────────
const CATEGORIES = [
  { id:'numbers',           title:'ตัวเลข',
    words:['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twenty','twenty_one'] },
  { id:'greetings_people',  title:'คำทักทายและบุคคล',
    words:['chan','kun','sawaddee','sabaidee','khobkun'] },
  { id:'opposites',         title:'คำตรงข้าม',
    words:['dee','maidee','perd','pid','san','yao'] },
  { id:'verbs',             title:'คำกริยา',
    words:['noan','yuen','rak','tum'] },
];

const STATIC_WORDS = [
  'zero','one','two','three','four','five','six','seven','eight','nine',
  'chan','kun','sawaddee','dee','maidee','noan','yuen','rak','tum',
];
const TWO_DYNAMIC_WORDS   = ['ten','twenty','sabaidee','khobkun','perd','pid','san','yao'];
const THREE_DYNAMIC_WORDS = ['eleven','twenty_one'];

const WORD_LABELS = {
  zero:'เลข 0', one:'เลข 1', two:'เลข 2', three:'เลข 3', four:'เลข 4',
  five:'เลข 5', six:'เลข 6', seven:'เลข 7', eight:'เลข 8', nine:'เลข 9',
  ten:'เลข 10', eleven:'เลข 11', twenty:'เลข 20', twenty_one:'เลข 21',
  chan:'ฉัน', kun:'คุณ', sawaddee:'สวัสดี', sabaidee:'สบายดี', khobkun:'ขอบคุณ',
  dee:'ดี', maidee:'ไม่ดี', perd:'เปิด', pid:'ปิด', san:'สั้น', yao:'ยาว',
  noan:'นอน', yuen:'ยืน', rak:'รัก', tum:'ทำ',
};

// ข้อความคำสั่งของแต่ละขั้นตอน (แสดงใต้ชื่อคำ) — ของ khobkun/sabaidee มี logic จริงแล้ว
// คำอื่นยังเป็น TODO รอกำหนดท่าจริง จึงใส่ข้อความชั่วคราวไว้ก่อน
const DYNAMIC_STEPS = {
  khobkun:    ['ประนมมือไม่ชิดกัน','แบมือออก'],
  sabaidee:   ['แบมือทั้ง 2 ข้าง (โป้งพับ)','ท่าเยี่ยมทั้ง 2 ข้าง'],
  ten:        ['ท่าที่ 1 (ยังไม่กำหนด)','ท่าที่ 2 (ยังไม่กำหนด)'],
  twenty:     ['ท่าที่ 1 (ยังไม่กำหนด)','ท่าที่ 2 (ยังไม่กำหนด)'],
  perd:       ['ท่าที่ 1 (ยังไม่กำหนด)','ท่าที่ 2 (ยังไม่กำหนด)'],
  pid:        ['ท่าที่ 1 (ยังไม่กำหนด)','ท่าที่ 2 (ยังไม่กำหนด)'],
  san:        ['ท่าที่ 1 (ยังไม่กำหนด)','ท่าที่ 2 (ยังไม่กำหนด)'],
  yao:        ['ท่าที่ 1 (ยังไม่กำหนด)','ท่าที่ 2 (ยังไม่กำหนด)'],
  eleven:     ['ท่าที่ 1 (ยังไม่กำหนด)','ท่าที่ 2 (ยังไม่กำหนด)','ท่าที่ 3 (ยังไม่กำหนด)'],
  twenty_one: ['ท่าที่ 1 (ยังไม่กำหนด)','ท่าที่ 2 (ยังไม่กำหนด)','ท่าที่ 3 (ยังไม่กำหนด)'],
};

// ── หมวดที่ถูกเลือกจาก URL (?cat=...) ─────────────────────
const urlParams   = new URLSearchParams(location.search);
const categoryId  = urlParams.get('cat') || CATEGORIES[0].id;
const activeCategory = CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[0];
const WORDS = activeCategory.words;

// ── DOM refs ───────────────────────────────────────────────
const videoEl        = document.getElementById('video');
const canvasEl       = document.getElementById('canvas');
const ctx            = canvasEl.getContext('2d');
const gestureLabelEl = document.getElementById('gesture-label');
const dynInstructionEl = document.getElementById('dynInstruction');
const dynPillEl      = document.getElementById('dynPill');
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

// ── APP STATE ──────────────────────────────────────────────
let selectedWordId          = WORDS[0] || null;
let currentDynamicStep      = 0;
let isCurrentWordCompleted  = false;
const completedWords        = new Set();

// ═══ CHECKLIST (คลิกคำไหนก่อนก็ได้ ไม่ล็อกลำดับ) ═══════════
function buildChecklist() {
  checklistEl.innerHTML = '';
  WORDS.forEach(wordId => {
    const row = document.createElement('div');
    row.id = `row-${wordId}`;
    row.className = 'gest-row';
    row.textContent = WORD_LABELS[wordId] || wordId;
    row.addEventListener('click', () => selectWord(wordId));
    checklistEl.appendChild(row);
  });
  updateChecklistUI();
}

function updateChecklistUI() {
  WORDS.forEach(wordId => {
    const row = document.getElementById(`row-${wordId}`);
    if (!row) return;
    row.classList.remove('active', 'done');
    if (completedWords.has(wordId)) row.classList.add('done');
    else if (wordId === selectedWordId) row.classList.add('active');
  });
  updateTaskLabel();
}

function updateTaskLabel() {
  if (!selectedWordId) { taskNameEl.textContent = 'เลือกคำศัพท์ที่ต้องการฝึก'; return; }
  taskNameEl.textContent = `โจทย์ : ${WORD_LABELS[selectedWordId] || selectedWordId}`;
}

// ═══ เลือกคำศัพท์ ═══════════════════════════════════════════
function selectWord(wordId) {
  selectedWordId          = wordId;
  currentDynamicStep      = 0;
  isCurrentWordCompleted  = false;
  staticPendingWord       = null;
  khobkhunSM.reset();
  sabadeeSM.reset();

  gestureLabelEl.textContent = WORD_LABELS[wordId] || wordId;
  gestureLabelEl.classList.add('visible');
  gestureLabelEl.classList.remove('correct');

  if (STATIC_WORDS.includes(wordId)) {
    dynInstructionEl.textContent = '';
    dynInstructionEl.classList.remove('visible', 'correct');
    dynPillEl.innerHTML = '';
    dynPillEl.classList.remove('visible');
  } else {
    const totalSteps = THREE_DYNAMIC_WORDS.includes(wordId) ? 3 : 2;
    renderPill(totalSteps);
    const steps = DYNAMIC_STEPS[wordId] || [];
    dynInstructionEl.textContent = steps[0] || '';
    dynInstructionEl.classList.add('visible');
    dynInstructionEl.classList.remove('correct');
  }

  updateChecklistUI();
}

function renderPill(totalSteps) {
  dynPillEl.innerHTML = '';
  for (let i = 0; i < totalSteps; i++) {
    const seg = document.createElement('span');
    seg.className = 'pill-seg';
    seg.id = `pill-seg-${i}`;
    dynPillEl.appendChild(seg);
  }
  dynPillEl.classList.add('visible');
}
function fillPillSegment(i) {
  const seg = document.getElementById(`pill-seg-${i}`);
  if (seg) seg.classList.add('filled');
}

// ═══ LANDMARK HELPERS ═══════════════════════════════════════
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

// ── การจำแนกท่ามือทางเดียว: ใช้กับ 0-9 และ "chan" (คงไว้ตามเดิม ไม่แก้) ──
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

// ── "rak" ใช้สองมือ (คงไว้ตามเดิม ไม่แก้) ──
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

// ── "khobkun" (สองมือ, state machine เดิม — คงไว้ ไม่แก้) ──
const khobkhunSM={state:0,stateTime:0,reset(){this.state=0;this.stateTime=0;}};
function processKhobkhun(hands,now){
  if(hands.length<2){khobkhunSM.reset();return{step:-1};}
  const sm=khobkhunSM,lm1=hands[0].landmarks,lm2=hands[1].landmarks;
  const w1=lm1[LM.WRIST],w2=lm2[LM.WRIST],wDist=dist2D(w1,w2),yDiff=Math.abs(w1.y-w2.y);
  if(sm.state===0){if(fourFingersUp(lm1)&&fourFingersUp(lm2)&&wDist>0.07&&wDist<0.38&&yDiff<0.14){sm.state=1;sm.stateTime=now;}return{step:-1};}
  if(sm.state===1){if(now-sm.stateTime>TIMEOUT_MS){sm.reset();return{step:-1};}if(fourFingersUp(lm1)&&fourFingersUp(lm2)&&Math.abs(w1.x-w2.x)>0.42){sm.reset();return{done:true};}return{step:1};}
  return{step:-1};
}

// ── "sabaidee" (สองมือ, state machine เดิม — คงไว้ ไม่แก้) ──
const sabadeeSM={state:0,stateTime:0,reset(){this.state=0;this.stateTime=0;}};
function processSabaidee(hands,now){
  if(hands.length<2){sabadeeSM.reset();return{step:-1};}
  const sm=sabadeeSM,lm1=hands[0].landmarks,lm2=hands[1].landmarks;
  if(sm.state===0){if(fourFingersUp(lm1)&&!getFingersUp(lm1).thumb&&fourFingersUp(lm2)&&!getFingersUp(lm2).thumb){sm.state=1;sm.stateTime=now;}return{step:-1};}
  if(sm.state===1){if(now-sm.stateTime>TIMEOUT_MS){sm.reset();return{step:-1};}if(isThumbsUp(lm1)&&isThumbsUp(lm2)){sm.reset();return{done:true};}return{step:1};}
  return{step:-1};
}

// ═══ GESTURE PLACEHOLDER (คำที่ยังไม่มี logic จริง) ═════════
// TODO: ใส่เงื่อนไขรูปทรงนิ้ว/แกน x,y จริงสำหรับแต่ละคำในอนาคต
function detectWordPose(word, handLandmarks) {
  if (['zero','one','two','three','four','five','six','seven','eight','nine'].includes(word)) {
    return classifyOneHand(handLandmarks) === word;
  }
  if (word === 'chan') return classifyOneHand(handLandmarks) === 'chan';
  return false; // kun, sawaddee, dee, maidee, noan, yuen, tum — ยังไม่มี logic
}

function detectWordStep(word, stepIndex, handLandmarks) {
  return false; // ten, twenty, perd, pid, san, yao, eleven, twenty_one — ยังไม่มี logic
}

// ═══ ตรวจจับคำ STATIC (มี debounce กันสั่นสั้นๆ) ═════════════
let staticPendingWord = null, staticPendingTime = 0;
const CONFIRM_MS = 400;

function checkStaticWord(word, handsData, now) {
  const matched = (word === 'rak')
    ? classifyRak(handsData)
    : handsData.some(h => detectWordPose(word, h.landmarks));

  if (!matched) { staticPendingWord = null; return; }
  if (staticPendingWord !== word) { staticPendingWord = word; staticPendingTime = now; return; }
  if (now - staticPendingTime >= CONFIRM_MS) completeSelectedWord();
}

// ═══ ตรวจจับคำ DYNAMIC (2 หรือ 3 ขั้นตอน) ═══════════════════
function checkDynamicWord(word, totalSteps, handsData, now) {
  if (word === 'khobkun') {
    const r = processKhobkhun(handsData, now);
    if (r.done) { fillPillSegment(1); completeSelectedWord(); return; }
    if (r.step === 1 && currentDynamicStep === 0) {
      currentDynamicStep = 1; fillPillSegment(0);
      dynInstructionEl.textContent = DYNAMIC_STEPS.khobkun[1];
    }
    return;
  }
  if (word === 'sabaidee') {
    const r = processSabaidee(handsData, now);
    if (r.done) { fillPillSegment(1); completeSelectedWord(); return; }
    if (r.step === 1 && currentDynamicStep === 0) {
      currentDynamicStep = 1; fillPillSegment(0);
      dynInstructionEl.textContent = DYNAMIC_STEPS.sabaidee[1];
    }
    return;
  }

  // คำ dynamic อื่นที่ยังไม่มี logic จริง (detectWordStep คืนค่า false เสมอ)
  for (const h of handsData) {
    if (detectWordStep(word, currentDynamicStep, h.landmarks)) {
      fillPillSegment(currentDynamicStep);
      currentDynamicStep++;
      const steps = DYNAMIC_STEPS[word] || [];
      if (currentDynamicStep < totalSteps) {
        dynInstructionEl.textContent = steps[currentDynamicStep] || '';
      } else {
        completeSelectedWord();
      }
      return;
    }
  }
}

// ═══ WORD COMPLETION ═════════════════════════════════════════
function completeSelectedWord() {
  if (isCurrentWordCompleted) return;
  isCurrentWordCompleted = true;
  completedWords.add(selectedWordId);

  gestureLabelEl.classList.add('correct');
  if (!STATIC_WORDS.includes(selectedWordId)) dynInstructionEl.classList.add('correct');

  const row = document.getElementById(`row-${selectedWordId}`);
  if (row) { row.classList.add('done'); row.classList.remove('active'); }

  successFlash.classList.add('show');
  clearTimeout(completeSelectedWord._t);
  completeSelectedWord._t = setTimeout(() => successFlash.classList.remove('show'), 700);
}

// ═══ MODAL ════════════════════════════════════════════════
window.openLearnModal = function () {
  if (!selectedWordId) return;
  modalTitle.textContent = `สาธิตท่า: ${WORD_LABELS[selectedWordId] || selectedWordId}`;
  const videoFile = `${selectedWordId}.mp4`;
  modalVideoWrap.innerHTML =
    `<video controls autoplay muted playsinline>` +
    `<source src="VDO/${videoFile}" type="video/mp4"/>เบราว์เซอร์ไม่รองรับวิดีโอ</video>`;
  const v = modalVideoWrap.querySelector('video');
  if (v) v.onerror = () => {
    modalVideoWrap.innerHTML = `<div class="no-video-msg">ขณะนี้ยังไม่มีวิดีโอสาธิต<br>ขออภัยในความไม่สะดวก</div>`;
  };
  learnModal.classList.add('open');
};
window.closeLearnModal = function (e) { if (e.target === learnModal) _closeModal(); };
window.closeLearnModalBtn = function () { _closeModal(); };
function _closeModal() {
  learnModal.classList.remove('open');
  const v = modalVideoWrap.querySelector('video');
  if (v) { v.pause(); v.currentTime = 0; }
  modalVideoWrap.innerHTML = '';
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && learnModal.classList.contains('open')) _closeModal();
});

// ═══ DRAW: จุด+เส้นข้อมือ (สีขาว บาง) ═══════════════════════
const HC=[[LM.WRIST,LM.THUMB_CMC],[LM.THUMB_CMC,LM.THUMB_MCP],[LM.THUMB_MCP,LM.THUMB_IP],[LM.THUMB_IP,LM.THUMB_TIP],[LM.WRIST,LM.INDEX_MCP],[LM.INDEX_MCP,LM.INDEX_PIP],[LM.INDEX_PIP,LM.INDEX_DIP],[LM.INDEX_DIP,LM.INDEX_TIP],[LM.WRIST,LM.MID_MCP],[LM.MID_MCP,LM.MID_PIP],[LM.MID_PIP,LM.MID_DIP],[LM.MID_DIP,LM.MID_TIP],[LM.WRIST,LM.RING_MCP],[LM.RING_MCP,LM.RING_PIP],[LM.RING_PIP,LM.RING_DIP],[LM.RING_DIP,LM.RING_TIP],[LM.WRIST,LM.PINKY_MCP],[LM.PINKY_MCP,LM.PINKY_PIP],[LM.PINKY_PIP,LM.PINKY_DIP],[LM.PINKY_DIP,LM.PINKY_TIP],[LM.INDEX_MCP,LM.MID_MCP],[LM.MID_MCP,LM.RING_MCP],[LM.RING_MCP,LM.PINKY_MCP]];
function drawHand(lm,W,H){ctx.strokeStyle='rgba(255,255,255,0.52)';ctx.lineWidth=1.5;ctx.lineCap='round';for(const[a,b]of HC){ctx.beginPath();ctx.moveTo(lm[a].x*W,lm[a].y*H);ctx.lineTo(lm[b].x*W,lm[b].y*H);ctx.stroke();}for(let i=0;i<lm.length;i++){const x=lm[i].x*W,y=lm[i].y*H,isTip=[4,8,12,16,20].includes(i),r=isTip?4:(i===0?5:2.8);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,0.82)';ctx.fill();if(isTip){ctx.strokeStyle='rgba(168,85,247,0.8)';ctx.lineWidth=1.2;ctx.stroke();}}}

// ═══ CAMERA FRAME PROCESSING ═════════════════════════════════
function onResults(results) {
  const W = canvasEl.width, H = canvasEl.height;
  ctx.save(); ctx.clearRect(0, 0, W, H); ctx.drawImage(results.image, 0, 0, W, H); ctx.restore();

  const now = performance.now();
  const handsData = (results.multiHandLandmarks || []).map(lm => ({ landmarks: lm }));
  for (const h of handsData) drawHand(h.landmarks, W, H);

  if (!selectedWordId) return;
  if (isCurrentWordCompleted) return; // คงหน้าจอสำเร็จไว้ ไม่ประมวลผลต่อ

  if (STATIC_WORDS.includes(selectedWordId)) {
    checkStaticWord(selectedWordId, handsData, now);
  } else if (TWO_DYNAMIC_WORDS.includes(selectedWordId)) {
    checkDynamicWord(selectedWordId, 2, handsData, now);
  } else if (THREE_DYNAMIC_WORDS.includes(selectedWordId)) {
    checkDynamicWord(selectedWordId, 3, handsData, now);
  }
}

// ═══ HAND RECOGNITION INIT / CAMERA CONTROL ═══════════════════
let cameraActive=false, mpCamera=null, handsModel=null;
window.toggleCamera = async function () { if (!cameraActive) await startCamera(); else stopCamera(); };

async function startCamera() {
  if (cameraActive) return; // เปิดกล้อง/โมเดลแค่ครั้งเดียว
  btnPractice.disabled = true; statusTxt.textContent = 'กำลังโหลด…';
  handsModel = new Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${f}` });
  handsModel.setOptions({ maxNumHands:2, modelComplexity:1, minDetectionConfidence:0.72, minTrackingConfidence:0.65 });
  handsModel.onResults(onResults);
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video:{ width:1280, height:960, facingMode:'user' } });
    videoEl.srcObject = stream; await new Promise(res => { videoEl.onloadedmetadata = res; });
    canvasEl.width = videoEl.videoWidth || 1280; canvasEl.height = videoEl.videoHeight || 960;
    mpCamera = new Camera(videoEl, { onFrame: async () => { await handsModel.send({ image: videoEl }); }, width: canvasEl.width, height: canvasEl.height });
    mpCamera.start();
    cameraActive = true; placeholder.classList.add('hidden');
    btnPractice.textContent = '⏹ หยุด'; btnPractice.classList.add('active'); btnNext.disabled = false;
    statusDot.classList.add('active'); statusTxt.textContent = 'กล้องทำงานอยู่';
  } catch (err) {
    console.error(err); statusTxt.textContent = 'ไม่สามารถเข้าถึงกล้องได้'; handsModel = null;
  }
  btnPractice.disabled = false;
}

function stopCamera() {
  if (mpCamera) { mpCamera.stop(); mpCamera = null; }
  if (videoEl.srcObject) { videoEl.srcObject.getTracks().forEach(t => t.stop()); videoEl.srcObject = null; }
  if (handsModel) { handsModel.close(); handsModel = null; }
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  placeholder.classList.remove('hidden');
  btnPractice.textContent = 'ฝึกทำ'; btnPractice.classList.remove('active');
  btnNext.disabled = true; statusDot.classList.remove('active'); statusTxt.textContent = 'รอการเชื่อมต่อ';
  cameraActive = false;
  khobkhunSM.reset(); sabadeeSM.reset(); staticPendingWord = null;
}

// ปุ่ม "ไปท่าต่อไป" — เลื่อนไปคำถัดไปในรายการ (ไม่บังคับว่าคำก่อนหน้าต้องเสร็จ)
window.skipToNext = function () {
  if (!selectedWordId || WORDS.length === 0) return;
  const idx = WORDS.indexOf(selectedWordId);
  const nextIdx = (idx + 1) % WORDS.length;
  selectWord(WORDS[nextIdx]);
};

// ═══ INIT ═════════════════════════════════════════════════
buildChecklist();
if (selectedWordId) selectWord(selectedWordId);
