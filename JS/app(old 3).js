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
  ten:        ['กำมือหันหลังมือ','กำมือหันหน้ามือ'],
  twenty:     ['ใช้นิ้วชี้และนิ้วโป้งทำรูปตัว L','นำนิ้วชี้และนิ้วโป้งมาประกบกัน'],
  sabaidee:   ['มือทั้งสองแบออก นิ้วประชิดกัน นิ้วโป้งชูขึ้น และหันหลังมือแนวนอนขนานกับพื้น','มือทั้งสองทำท่าเยี่ยม'],
  khobkun:    ['มือทั้งสองพนม แต่ไม่ชิดกัน','มือทั้งสองแบออก หันหน้ามือออก'],
  perd:       ['มือทั้งสองแบออก หันหน้ามือออก และนำด้านข้างของมือประชิดกัน','นำมือทั้งสองที่แบออกห่างจากกัน'],
  pid:        ['มือทั้งสองแบออก หันหน้ามือออก และอยู่ห่างจากกัน','นำมือทั้งสองเคลื่อนที่เข้าหากัน ให้ด้านข้างของมือประชิดกัน'],
  san:        ['มือทั้งสองแบออก หันเข้าหากันในแนวนอนขนานกับพื้น และอยู่ห่างกัน','ขยับมือทั้งสองเข้าหากัน ให้ระยะห่างลดลงจากขั้นตอนที่ 1'],
  yao:        ['มือทั้งสองแบออก หันเข้าหากันในแนวนอนขนานกับพื้น และอยู่ห่างกันเล็กน้อย','ขยับมือทั้งสองออกจากกัน ให้ระยะห่างเพิ่มขึ้นจากขั้นตอนที่ 1'],
  eleven:     ['กำมือหันหลังมือ','กำมือหันหน้ามือ','ทำท่าเลข 1'],
  twenty_one: ['ใช้นิ้วชี้และนิ้วโป้งทำรูปตัว L','นำนิ้วชี้และนิ้วโป้งมาประกบกัน','ทำท่าเลข 1'],
};

// ป้ายชื่อเฉพาะที่ใช้ในลิสต์ด้านขวาเท่านั้น (ชื่ออื่นในหน้าจอ เช่น modal ยังใช้ WORD_LABELS ปกติ)
const CHECKLIST_LABELS = {
  eleven:     'เลข 11 (วิธีทำเลข 11-19)',
  twenty_one: 'เลข 21 (วิธีทำเลข 21-29)',
};
function getChecklistLabel(wordId) {
  return CHECKLIST_LABELS[wordId] || WORD_LABELS[wordId] || wordId;
}
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
    row.textContent = getChecklistLabel(wordId);
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
}

// ═══ เลือกคำศัพท์ ═══════════════════════════════════════════
function selectWord(wordId) {
  selectedWordId          = wordId;
  currentDynamicStep      = 0;
  isCurrentWordCompleted  = false;
  staticPendingWord       = null;
  khobkhunSM.reset();
  sabadeeSM.reset();
  twoHandDistState.word = null; twoHandDistState.initialDist = null;

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

// ระยะอ้างอิงตามขนาดมือของแต่ละคน (relative to hand size) — ใช้แทนค่าคงที่ตรงๆ
// เพื่อให้ threshold ใช้งานได้ไม่ว่าผู้ใช้จะอยู่ใกล้หรือไกลกล้อง
function handScale(lm){ return dist2D(lm[LM.WRIST], lm[LM.MID_MCP]); }

// ทิศทางฝ่ามือ (หันเข้า/ออกจากกล้อง) — ใช้ cross-product ของเวกเตอร์ wrist→index_mcp
// กับ wrist→pinky_mcp เพื่อประมาณเวกเตอร์ตั้งฉากของฝ่ามือ แล้วดูว่าชี้เข้าหากล้องหรือไม่
// หมายเหตุ: เป็นค่าประมาณ อาจต้องปรับเครื่องหมาย (< 0 / > 0) ตามผลทดสอบจริง
function palmFacingCamera(lm, handedness){
  const w=lm[LM.WRIST], i=lm[LM.INDEX_MCP], p=lm[LM.PINKY_MCP];
  const v1={x:i.x-w.x,y:i.y-w.y,z:i.z-w.z};
  const v2={x:p.x-w.x,y:p.y-w.y,z:p.z-w.z};
  const crossZ = v1.x*v2.y - v1.y*v2.x;
  return handedness === 'Left' ? crossZ < 0 : crossZ > 0;
}
function getFingersUp(lm){
  return {
    thumb:  dist2D(lm[LM.THUMB_TIP],lm[LM.INDEX_MCP])>dist2D(lm[LM.THUMB_MCP],lm[LM.INDEX_MCP]),
    index:  lm[LM.INDEX_TIP].y<lm[LM.INDEX_PIP].y,
    middle: lm[LM.MID_TIP].y<lm[LM.MID_PIP].y,
    ring:   lm[LM.RING_TIP].y<lm[LM.RING_PIP].y,
    pinky:  lm[LM.PINKY_TIP].y<lm[LM.PINKY_PIP].y,
  };
}

// ── การจำแนกท่ามือทางเดียว: ใช้กับตัวเลข 0-9 (คงเงื่อนไขรูปทรงนิ้วเดิมไว้ทั้งหมด) ──
function classifyOneHand(lm) {
  const f=getFingersUp(lm);
  if (!f.thumb&&!f.index&&!f.middle&&!f.ring&&!f.pinky) return 'zero';
  if (!f.thumb&&f.index&&!f.middle&&!f.ring&&!f.pinky) return 'one';
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

// ── ระยะ 2D ของนิ้วชี้ (tip↔mcp) — สั้นลงเมื่อนิ้วชี้เข้า/ออกจากกล้อง (foreshortening) ──
function indexForeshorten2D(lm){ return dist2D(lm[LM.INDEX_TIP], lm[LM.INDEX_MCP]); }

// "chan" (ฉัน): นิ้วชี้เหยียด นิ้วอื่นงอ, ปลายนิ้วชี้เข้าหาตัวเอง (ลึกจากกล้อง)
// ใช้ foreshortening (2D) ยืนยันว่าชี้ "เข้า/ออกแนวลึก" ไม่ใช่ชี้ข้าง + landmark.z บอกทิศ
function classifyChan(lm){
  const f=getFingersUp(lm);
  if (!(!f.thumb&&f.index&&!f.middle&&!f.ring&&!f.pinky)) return false;
  const scale=handScale(lm);
  const foreshortened = indexForeshorten2D(lm) < scale*0.85;
  const zThresh = scale*0.15;
  const pointingSelf = (lm[LM.INDEX_TIP].z - lm[LM.WRIST].z) > zThresh;
  return foreshortened && pointingSelf;
}

// "kun" (คุณ): เหมือน chan แต่ปลายนิ้วชี้เข้าหากล้องแทน
function classifyKun(lm){
  const f=getFingersUp(lm);
  if (!(!f.thumb&&f.index&&!f.middle&&!f.ring&&!f.pinky)) return false;
  const scale=handScale(lm);
  const foreshortened = indexForeshorten2D(lm) < scale*0.85;
  const zThresh = scale*0.15;
  const pointingCamera = (lm[LM.INDEX_TIP].z - lm[LM.WRIST].z) < -zThresh;
  return foreshortened && pointingCamera;
}

// "dee" (ดี): thumb up, thumbTip สูงกว่า wrist, นิ้วอื่นกำ
function classifyDee(lm){
  const f=getFingersUp(lm);
  const othersFolded = !f.index&&!f.middle&&!f.ring&&!f.pinky;
  return othersFolded && lm[LM.THUMB_TIP].y < lm[LM.WRIST].y;
}
// "maidee" (ไม่ดี): thumb down, thumbTip ต่ำกว่า wrist, นิ้วอื่นกำ
function classifyMaidee(lm){
  const f=getFingersUp(lm);
  const othersFolded = !f.index&&!f.middle&&!f.ring&&!f.pinky;
  return othersFolded && lm[LM.THUMB_TIP].y > lm[LM.WRIST].y;
}

// PALM_TOUCH_MULT / STACK_HAND_MULT — ตัวคูณของ handScale ใช้กำหนดว่า "ชิด/ซ้อน" กันแค่ไหน
// (ปรับตัวเลขตรงนี้ได้ทีหลังหากทดสอบแล้วไวไป/ไม่ไวพอ)
const PALM_TOUCH_MULT = 0.7;  // sawaddee, noan: ฝ่ามือ/มือประกบกันแนบชิด
const STACK_HAND_MULT = 1.1;  // tum: มือซ้อนมือ

// "sawaddee": 2 มือ แบตรงนิ้วชิด ฝ่ามือประกบกัน ระยะห่าง < PALM_TOUCH_MULT×scale, y ใกล้กัน
function detectSawaddee(hands){
  if (hands.length<2) return false;
  const [h1,h2]=hands;
  const f1=getFingersUp(h1.landmarks), f2=getFingersUp(h2.landmarks);
  const flat1=f1.index&&f1.middle&&f1.ring&&f1.pinky;
  const flat2=f2.index&&f2.middle&&f2.ring&&f2.pinky;
  if (!flat1||!flat2) return false;
  const scale=(handScale(h1.landmarks)+handScale(h2.landmarks))/2;
  const palmDist=dist2D(h1.landmarks[LM.MID_MCP], h2.landmarks[LM.MID_MCP]);
  const yDiff=Math.abs(h1.landmarks[LM.WRIST].y-h2.landmarks[LM.WRIST].y);
  return palmDist < scale*PALM_TOUCH_MULT && yDiff < scale*0.6;
}

// "noan" (นอน): 2 มือพนมประกบกัน เอียงไปข้างคอ — ไม่มี face landmark จึงประมาณตำแหน่ง
// "ข้างใบหน้า/คอ" จากกรอบกล้อง: อยู่ครึ่งบนของเฟรม และเยื้องออกจากกึ่งกลางแนวนอน
function classifyNoan(hands){
  if (hands.length<2) return false;
  const [h1,h2]=hands;
  const scale=(handScale(h1.landmarks)+handScale(h2.landmarks))/2;
  const palmDist=dist2D(h1.landmarks[LM.MID_MCP], h2.landmarks[LM.MID_MCP]);
  if (palmDist > scale*PALM_TOUCH_MULT) return false;
  const cx=(h1.landmarks[LM.WRIST].x+h2.landmarks[LM.WRIST].x)/2;
  const cy=(h1.landmarks[LM.WRIST].y+h2.landmarks[LM.WRIST].y)/2;
  return cy < 0.5 && Math.abs(cx-0.5) > 0.12;
}

// "yuen" (ยืน): มือ A แบมือเหยียดนิ้ว, มือ B ทำ peace sign คว่ำอยู่เหนือกึ่งกลางฝ่ามือ A
function classifyYuen(hands){
  if (hands.length<2) return false;
  for (const base of hands){
    const other = hands.find(h=>h!==base);
    const fb=getFingersUp(base.landmarks);
    const isFlat = fb.index&&fb.middle&&fb.ring&&fb.pinky;
    const fo=getFingersUp(other.landmarks);
    const isPeace = fo.index&&fo.middle&&!fo.ring&&!fo.pinky;
    if (isFlat && isPeace){
      const scale=handScale(base.landmarks);
      const aboveEnough = other.landmarks[LM.WRIST].y < base.landmarks[LM.WRIST].y - scale*0.15;
      const centerDist = dist2D(other.landmarks[LM.MID_MCP], base.landmarks[LM.MID_MCP]);
      if (aboveEnough && centerDist < scale*0.9) return true;
    }
  }
  return false;
}

// "tum" (ทำ): 2 มือกำ มือหนึ่งซ้อนอยู่บน/ใกล้อีกมือ ระยะ < STACK_HAND_MULT×scale
function classifyTum(hands){
  if (hands.length<2) return false;
  const [h1,h2]=hands;
  const f1=getFingersUp(h1.landmarks), f2=getFingersUp(h2.landmarks);
  const fist1=!f1.index&&!f1.middle&&!f1.ring&&!f1.pinky;
  const fist2=!f2.index&&!f2.middle&&!f2.ring&&!f2.pinky;
  if (!fist1||!fist2) return false;
  const scale=(handScale(h1.landmarks)+handScale(h2.landmarks))/2;
  const d=dist2D(h1.landmarks[LM.WRIST], h2.landmarks[LM.WRIST]);
  return d < scale*STACK_HAND_MULT;
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

// ═══ STATIC WORD DETECTION ════════════════════════════════
function detectWordPose(word, lm, handedness) {
  if (word === 'zero') {
    return classifyOneHand(lm) === 'zero' && palmFacingCamera(lm, handedness);
  }
  if (['one','two','three','four','five','six','seven','eight','nine'].includes(word)) {
    return classifyOneHand(lm) === word;
  }
  if (word === 'chan')   return classifyChan(lm);
  if (word === 'kun')    return classifyKun(lm);
  if (word === 'dee')    return classifyDee(lm);
  if (word === 'maidee') return classifyMaidee(lm);
  return false;
}

// ═══ DYNAMIC WORD DETECTION (ระยะทางเทียบตามขนาดมือ, รองรับซ้าย/ขวา) ═══
const PALM_OUT_MULT_CLOSE = 0.6;   // perd/pid: มือชิดกัน (ด้านข้างประชิด)
const PALM_OUT_MULT_APART = 1.2;   // pid step0: มือห่างกัน
const FACE_APART_MULT     = 1.0;   // san step0: มือหันเข้าหากัน ห่างกัน
const FACE_NEAR_MULT_LO   = 0.5;   // yao step0: ห่างกันเล็กน้อย (ขอบล่าง)
const FACE_NEAR_MULT_HI   = 1.3;   // yao step0: ห่างกันเล็กน้อย (ขอบบน)
const DIST_CHANGE_MULT    = 0.4;   // เกณฑ์ "เปลี่ยนแปลงพอสังเกตได้" ของระยะห่างระหว่าง step

// state เก็บระยะห่างเริ่มต้นของ step 0 (ใช้เทียบกับ step 1) — รีเซ็ตทุกครั้งที่เปลี่ยนคำ
const twoHandDistState = { word: null, initialDist: null };

function isLShape(lm) {
  const f = getFingersUp(lm);
  return f.thumb && f.index && !f.middle && !f.ring && !f.pinky;
}

// "ten": step0 = กำมือหันหลังมือ, step1 = กำมือหันหน้ามือ
function detectTenStep(stepIndex, lm, handedness) {
  const f = getFingersUp(lm);
  const isFist = !f.thumb && !f.index && !f.middle && !f.ring && !f.pinky;
  if (!isFist) return false;
  const facing = palmFacingCamera(lm, handedness);
  return stepIndex === 0 ? !facing : facing;
}

// "twenty": step0 = รูปตัว L ห่าง, step1 = นิ้วโป้ง+ชี้ประกบกัน (pinch)
function detectTwentyStep(stepIndex, lm) {
  if (!isLShape(lm)) return false;
  const scale = handScale(lm);
  const pinchDist = dist2D(lm[LM.THUMB_TIP], lm[LM.INDEX_TIP]);
  return stepIndex === 0 ? pinchDist > scale * 0.5 : pinchDist < scale * 0.35;
}

function bothHandsFlat(hands) {
  return hands.length >= 2 && hands.every(h => {
    const f = getFingersUp(h.landmarks);
    return f.index && f.middle && f.ring && f.pinky;
  });
}
function handsFacingOut(hands, handedness) {
  return hands.every((h, i) => palmFacingCamera(h.landmarks, handedness[i]));
}
function handsFacingEachOther(hands, handedness) {
  return hands.every((h, i) => !palmFacingCamera(h.landmarks, handedness[i]));
}
function sideDist(hands) { return dist2D(hands[0].landmarks[LM.WRIST], hands[1].landmarks[LM.WRIST]); }
function handsScaleAvg(hands) { return (handScale(hands[0].landmarks) + handScale(hands[1].landmarks)) / 2; }

// "perd" (เปิด): step0 = มือชิดกัน หันหน้ามือออก, step1 = แยกห่างออกจากกัน
function detectPerdStep(stepIndex, hands, handedness) {
  if (!bothHandsFlat(hands) || !handsFacingOut(hands, handedness)) return false;
  const scale = handsScaleAvg(hands), d = sideDist(hands);
  if (stepIndex === 0) {
    const touching = d < scale * PALM_OUT_MULT_CLOSE;
    if (touching) twoHandDistState.initialDist = d;
    return touching;
  }
  if (twoHandDistState.initialDist == null) return false;
  return d > twoHandDistState.initialDist + scale * DIST_CHANGE_MULT;
}

// "pid" (ปิด): step0 = มือห่างกัน หันหน้ามือออก, step1 = เคลื่อนเข้าหากันจนชิด
function detectPidStep(stepIndex, hands, handedness) {
  if (!bothHandsFlat(hands) || !handsFacingOut(hands, handedness)) return false;
  const scale = handsScaleAvg(hands), d = sideDist(hands);
  if (stepIndex === 0) {
    const apart = d > scale * PALM_OUT_MULT_APART;
    if (apart) twoHandDistState.initialDist = d;
    return apart;
  }
  if (twoHandDistState.initialDist == null) return false;
  return d < scale * PALM_OUT_MULT_CLOSE && d < twoHandDistState.initialDist - scale * DIST_CHANGE_MULT;
}

// "san" (สั้น): step0 = มือหันเข้าหากัน ห่างกัน, step1 = ขยับเข้าใกล้กันขึ้น
function detectSanStep(stepIndex, hands, handedness) {
  if (!bothHandsFlat(hands) || !handsFacingEachOther(hands, handedness)) return false;
  const scale = handsScaleAvg(hands), d = sideDist(hands);
  if (stepIndex === 0) {
    const apart = d > scale * FACE_APART_MULT;
    if (apart) twoHandDistState.initialDist = d;
    return apart;
  }
  if (twoHandDistState.initialDist == null) return false;
  return d < twoHandDistState.initialDist - scale * DIST_CHANGE_MULT;
}

// "yao" (ยาว): step0 = มือหันเข้าหากัน ห่างกันเล็กน้อย, step1 = ขยับออกห่างกันมากขึ้น
function detectYaoStep(stepIndex, hands, handedness) {
  if (!bothHandsFlat(hands) || !handsFacingEachOther(hands, handedness)) return false;
  const scale = handsScaleAvg(hands), d = sideDist(hands);
  if (stepIndex === 0) {
    const slightlyApart = d > scale * FACE_NEAR_MULT_LO && d < scale * FACE_NEAR_MULT_HI;
    if (slightlyApart) twoHandDistState.initialDist = d;
    return slightlyApart;
  }
  if (twoHandDistState.initialDist == null) return false;
  return d > twoHandDistState.initialDist + scale * DIST_CHANGE_MULT;
}

// รวมทุก dynamic word ที่มี logic จริงแล้ว (ยกเว้น khobkun/sabaidee ที่ใช้ state machine แยกต่างหาก)
function detectWordStep(word, stepIndex, hands, handedness) {
  if (word === 'ten')    return hands.some((h, i) => detectTenStep(stepIndex, h.landmarks, handedness[i]));
  if (word === 'twenty') return hands.some(h => detectTwentyStep(stepIndex, h.landmarks));
  if (word === 'perd')   return detectPerdStep(stepIndex, hands, handedness);
  if (word === 'pid')    return detectPidStep(stepIndex, hands, handedness);
  if (word === 'san')    return detectSanStep(stepIndex, hands, handedness);
  if (word === 'yao')    return detectYaoStep(stepIndex, hands, handedness);
  if (word === 'eleven') {
    if (stepIndex === 0 || stepIndex === 1) return hands.some((h, i) => detectTenStep(stepIndex, h.landmarks, handedness[i]));
    if (stepIndex === 2) return hands.some(h => classifyOneHand(h.landmarks) === 'one');
  }
  if (word === 'twenty_one') {
    if (stepIndex === 0 || stepIndex === 1) return hands.some(h => detectTwentyStep(stepIndex, h.landmarks));
    if (stepIndex === 2) return hands.some(h => classifyOneHand(h.landmarks) === 'one');
  }
  return false;
}

// ═══ ตรวจจับคำ STATIC (มี debounce กันสั่นสั้นๆ) ═════════════
let staticPendingWord = null, staticPendingTime = 0;
const CONFIRM_MS = 400;

function checkStaticWord(word, handsData, now) {
  let matched;
  if (word === 'rak')          matched = classifyRak(handsData);
  else if (word === 'sawaddee') matched = detectSawaddee(handsData);
  else if (word === 'noan')     matched = classifyNoan(handsData);
  else if (word === 'yuen')     matched = classifyYuen(handsData);
  else if (word === 'tum')      matched = classifyTum(handsData);
  else matched = handsData.some(h => detectWordPose(word, h.landmarks, h.handedness));

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

  // คำ dynamic ที่มี logic จริงแล้ว (ten, twenty, perd, pid, san, yao, eleven, twenty_one)
  const handedness = handsData.map(h => h.handedness);
  if (detectWordStep(word, currentDynamicStep, handsData, handedness)) {
    fillPillSegment(currentDynamicStep);
    currentDynamicStep++;
    const steps = DYNAMIC_STEPS[word] || [];
    if (currentDynamicStep < totalSteps) {
      dynInstructionEl.textContent = steps[currentDynamicStep] || '';
    } else {
      completeSelectedWord();
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
  const handedArr = results.multiHandedness || [];
  const handsData = (results.multiHandLandmarks || []).map((lm, i) => ({
    landmarks: lm,
    handedness: (handedArr[i] && handedArr[i].label) || 'Right',
  }));
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
