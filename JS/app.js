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
    words:['dee','maidee','perd','pid'] },
  { id:'verbs',             title:'คำกริยา',
    words:['noan','yuen','rak'] },
];

const STATIC_WORDS = [
  'zero','one','two','three','four','five','six','seven','eight','nine',
  'chan','kun','sawaddee','dee','maidee','noan','yuen','rak',
];
const TWO_DYNAMIC_WORDS   = ['ten','twenty','sabaidee','khobkun','perd','pid'];
const THREE_DYNAMIC_WORDS = ['eleven','twenty_one'];

const WORD_LABELS = {
  zero:'เลข 0', one:'เลข 1', two:'เลข 2', three:'เลข 3', four:'เลข 4',
  five:'เลข 5', six:'เลข 6', seven:'เลข 7', eight:'เลข 8', nine:'เลข 9',
  ten:'เลข 10', eleven:'เลข 11', twenty:'เลข 20', twenty_one:'เลข 21',
  chan:'ฉัน', kun:'คุณ', sawaddee:'สวัสดี', sabaidee:'สบายดี', khobkun:'ขอบคุณ',
  dee:'ดี', maidee:'ไม่ดี', perd:'เปิด', pid:'ปิด',
  noan:'นอน', yuen:'ยืน', rak:'รัก',
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
// ปรับตาม reference image: มือถืออยู่ใกล้อก/คาง — ผ่อนเกณฑ์ foreshorten/z ให้หลวมขึ้น
// (webcam ทั่วไป z คลาดเคลื่อนมาก จึงลด zThresh ลง)
function classifyChan(lm){
  const f=getFingersUp(lm);
  if (!(!f.thumb&&f.index&&!f.middle&&!f.ring&&!f.pinky)) return false;
  const scale=handScale(lm);
  const foreshortened = indexForeshorten2D(lm) < scale*0.95;
  const zThresh = scale*0.08;
  const pointingSelf = (lm[LM.INDEX_TIP].z - lm[LM.WRIST].z) > zThresh;
  return foreshortened && pointingSelf;
}

// "kun" (คุณ): เหมือน chan แต่ปลายนิ้วชี้เข้าหากล้องแทน
function classifyKun(lm){
  const f=getFingersUp(lm);
  if (!(!f.thumb&&f.index&&!f.middle&&!f.ring&&!f.pinky)) return false;
  const scale=handScale(lm);
  const foreshortened = indexForeshorten2D(lm) < scale*0.95;
  const zThresh = scale*0.08;
  const pointingCamera = (lm[LM.INDEX_TIP].z - lm[LM.WRIST].z) < -zThresh;
  return foreshortened && pointingCamera;
}

// "dee" (ดี): thumb up, thumbTip สูงกว่า wrist, นิ้วอื่นกำ (ไม่อยู่ในรายการอัปเดต คงเดิม)
function classifyDee(lm){
  const f=getFingersUp(lm);
  const othersFolded = !f.index&&!f.middle&&!f.ring&&!f.pinky;
  return othersFolded && lm[LM.THUMB_TIP].y < lm[LM.WRIST].y;
}
// "maidee" (ไม่ดี): thumb down ชัดเจน (เหยียดออกจากข้อมือจริง ไม่ใช่กำหมัดเฉยๆ) ตาม reference image
function classifyMaidee(lm){
  const f=getFingersUp(lm);
  const othersFolded = !f.index&&!f.middle&&!f.ring&&!f.pinky;
  const thumbExtended = dist2D(lm[LM.THUMB_TIP], lm[LM.WRIST]) > handScale(lm)*0.9;
  return othersFolded && thumbExtended && lm[LM.THUMB_TIP].y > lm[LM.WRIST].y;
}

// "sawaddee": มือเดียวตั้งตรง โดยวัดแกนจากข้อมือไปโคนนิ้วกลาง
function detectSawaddee(hand){
  if (!hand) return false;
  const lm = hand.landmarks;
  const dx = lm[LM.MID_MCP].x - lm[LM.WRIST].x;
  const dy = lm[LM.MID_MCP].y - lm[LM.WRIST].y;
  return dy < 0 && Math.abs(dx) <= Math.abs(dy) * 0.5;
}

// "noan" (นอน): มือเดียวเอียงไปทางซ้ายหรือขวา
function detectNoan(hand){
  if (!hand) return false;
  const lm = hand.landmarks;
  const dx = lm[LM.MID_MCP].x - lm[LM.WRIST].x;
  const dy = lm[LM.MID_MCP].y - lm[LM.WRIST].y;
  const tiltedLeft = dx < -Math.abs(dy) * 0.5;
  const tiltedRight = dx > Math.abs(dy) * 0.5;
  return tiltedLeft || tiltedRight;
}

// "yuen" (ยืน): มือ A แบมือเหยียดนิ้ว ถือเฉียง/ตั้งขึ้น, มือ B ทำ peace sign คว่ำอยู่เหนือฝ่ามือ A
// (ผ่อนเกณฑ์ตำแหน่งให้หลวมขึ้น เพราะภาพอ้างอิงจับได้ชัดแค่มือเดียวในเฟรม)
function classifyYuen(hands){
  if (hands.length<2) return false;
  for (const base of hands){
    const other = hands.find(h=>h!==base);
    const fb=getFingersUp(base.landmarks);
    const isFlat = fb.index&&fb.middle&&fb.ring&&fb.pinky;
    const scale=handScale(base.landmarks);
    const pointingUp = base.landmarks[LM.MID_TIP].y < base.landmarks[LM.WRIST].y - scale*0.2;
    const fo=getFingersUp(other.landmarks);
    const isPeace = fo.index&&fo.middle&&!fo.ring&&!fo.pinky;
    if (isFlat && pointingUp && isPeace){
      const aboveEnough = other.landmarks[LM.WRIST].y < base.landmarks[LM.WRIST].y - scale*0.05;
      const centerDist = dist2D(other.landmarks[LM.MID_MCP], base.landmarks[LM.MID_MCP]);
      if (aboveEnough && centerDist < scale*1.3) return true;
    }
  }
  return false;
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

// ── "sabaidee" (สองมือ, state machine) — แก้ตาม reference image: step1 นิ้วโป้ง
// "ชูขึ้น" ไม่ใช่งอ (โค้ดเดิมเช็กแบบกลับด้าน จึงตรวจจับไม่ได้เลย) ──
const sabadeeSM={state:0,stateTime:0,reset(){this.state=0;this.stateTime=0;}};
function processSabaidee(hands,now){
  if(hands.length<2){sabadeeSM.reset();return{step:-1};}
  const sm=sabadeeSM,lm1=hands[0].landmarks,lm2=hands[1].landmarks;
  if(sm.state===0){if(fourFingersUp(lm1)&&getFingersUp(lm1).thumb&&fourFingersUp(lm2)&&getFingersUp(lm2).thumb){sm.state=1;sm.stateTime=now;}return{step:-1};}
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
const PALM_OUT_MULT_APART = 1.5;   // pid step0: มือห่างกันมาก (ตาม reference image)
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
// แก้ตาม reference image: ตอน pinch นิ้วชี้จะงอลงมาสัมผัสนิ้วโป้ง (ไม่ใช่เหยียดตรงแบบ step0)
// เดิมบังคับ isLShape ทั้ง 2 step ทำให้ step1 ตรวจไม่ได้เลย จึงแยกเงื่อนไข step1 ออกมาต่างหาก
function detectTwentyStep(stepIndex, lm) {
  const scale = handScale(lm);
  const pinchDist = dist2D(lm[LM.THUMB_TIP], lm[LM.INDEX_TIP]);
  if (stepIndex === 0) {
    return isLShape(lm) && pinchDist > scale * 0.5;
  }
  const f = getFingersUp(lm);
  const othersCurled = !f.middle && !f.ring && !f.pinky;
  return othersCurled && pinchDist < scale * 0.35;
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

// รวมทุก dynamic word ที่มี logic จริงแล้ว (ยกเว้น khobkun/sabaidee ที่ใช้ state machine แยกต่างหาก)
function detectWordStep(word, stepIndex, hands, handedness) {
  if (word === 'ten')    return hands.some((h, i) => detectTenStep(stepIndex, h.landmarks, handedness[i]));
  if (word === 'twenty') return hands.some(h => detectTwentyStep(stepIndex, h.landmarks));
  if (word === 'perd')   return detectPerdStep(stepIndex, hands, handedness);
  if (word === 'pid')    return detectPidStep(stepIndex, hands, handedness);
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
  if (word === 'rak')            matched = classifyRak(handsData);
  else if (word === 'sawaddee')  matched = handsData.some(detectSawaddee);
  else if (word === 'noan')      matched = handsData.some(detectNoan);
  else if (word === 'yuen')      matched = classifyYuen(handsData);
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

  // คำ dynamic ที่มี logic จริงแล้ว (ten, twenty, perd, pid, eleven, twenty_one)
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
