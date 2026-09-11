const $ = id => document.getElementById(id);
const DEFAULT_BANKS = {
  easy:[
    {text:"schedule",kk:"ˋskɛdʒʊl",syllables:"sched-ule",translation:"行程；時程"},
    {text:"comfortable",kk:"ˋkʌmfɚtəbḷ",syllables:"com-fort-a-ble",translation:"舒適的"},
    {text:"pronunciation",kk:"prəˌnʌnsɪˋeʃən",syllables:"pro-nun-ci-a-tion",translation:"發音"}
  ],
  phrases:[
    {text:"Could you say that again?",kk:"kʊd ju se ðæt əˋgɛn",syllables:"could / you / say / that / a-gain",translation:"你可以再說一次嗎？"},
    {text:"as soon as possible",kk:"əz sun əz ˋpɑsəbḷ",syllables:"as / soon / as / pos-si-ble",translation:"盡快"}
  ]
};
let banks = DEFAULT_BANKS;
let bankLabels = {easy:'離線備用單字',phrases:'離線備用片語'};
let questionsUpdatedAt = null;
let session = {queue:[],index:0,correct:0,wrong:0,startedAt:null,timer:null,current:null,answered:false};
let soundOn = true;
let pending = JSON.parse(localStorage.getItem("pendingAttempts")||"[]");

function init(){
  restoreStudent();
  fillBanks();
  updatePending();
  $("cloudStatus").textContent = CloudAPI.enabled() ? "雲端模式" : "本機模式";
  $("cloudStatus").className = "status " + (CloudAPI.enabled() ? "online":"offline");
  bind();
  if(CloudAPI.enabled()) loadCloudData();
}
async function loadCloudData(force=false){
  try{
    setRefreshState(true);
    const data = force ? await CloudAPI.refreshQuestions() : await CloudAPI.loadApp();
    if(data?.banks && Object.keys(data.banks).length){
      banks=data.banks;
      bankLabels=data.bankLabels||{};
      questionsUpdatedAt=data.updatedAt||null;
      fillBanks();
      $("cloudStatus").textContent = force ? "題庫已更新" : "雲端模式";
      $("cloudStatus").className = "status online";
    }else{
      throw new Error("雲端題庫目前沒有啟用中的題目");
    }
  }catch(e){
    console.warn("Cloud load failed",e);
    $("cloudStatus").textContent="使用離線備用題庫";
    $("cloudStatus").className="status offline";
    if(force) alert("題庫更新失敗，已保留目前題庫。\n"+e.message);
  }finally{
    setRefreshState(false);
  }
}
function setRefreshState(busy){
  const b=$("refreshBankBtn");
  b.disabled=busy;
  b.textContent=busy?"更新中…":"↻ 更新題庫";
}
function bind(){
  $("startBtn").onclick=startSession;
  $("listenBtn").onclick=playReference;
  $("speakBtn").onclick=recognize;
  $("nextBtn").onclick=next;
  $("soundBtn").onclick=()=>{soundOn=!soundOn;$("soundBtn").textContent=soundOn?"🔊 音效":"🔇 靜音"};
  $("syncBtn").onclick=flushPending;
  $("refreshBankBtn").onclick=()=>loadCloudData(true);
}
function restoreStudent(){
  const s=JSON.parse(localStorage.getItem("studentProfile")||"{}");
  $("studentClass").value=s.className||"";$("studentNo").value=s.studentNo||"";$("studentName").value=s.name||"";
}
function saveStudent(){
  const s={className:$("studentClass").value.trim(),studentNo:$("studentNo").value.trim(),name:$("studentName").value.trim()};
  localStorage.setItem("studentProfile",JSON.stringify(s));
  if(CloudAPI.enabled()) CloudAPI.saveStudent(s).catch(()=>{});
  return s;
}
function fillBanks(){
  const sel=$("bankSelect"), cur=sel.value;
  sel.innerHTML="";
  Object.entries(banks).forEach(([k,v])=>{
    const o=document.createElement("option");o.value=k;o.textContent=`${bankLabels[k]||k}（${v.length}題）`;sel.appendChild(o);
  });
  if([...sel.options].some(o=>o.value===cur)) sel.value=cur;
}
function startSession(){
  saveStudent();
  const q=[...(banks[$("bankSelect").value]||[])];
  if(!q.length) return alert("此題庫沒有題目。");
  session={queue:q,index:0,correct:0,wrong:0,startedAt:Date.now(),timer:null,current:null,answered:false};
  $("listenBtn").disabled=false;$("speakBtn").disabled=false;$("nextBtn").disabled=false;
  $("correctCount").textContent=0;$("wrongCount").textContent=0;
  clearInterval(session.timer); session.timer=setInterval(updateTimer,1000);
  showCurrent();
}
function showCurrent(){
  if(session.index>=session.queue.length){finish();return}
  session.current=session.queue[session.index];session.answered=false;
  $("targetText").textContent=session.current.text;
  $("kkText").textContent=session.current.kk?`[ ${session.current.kk} ]`:"";
  $("syllablesText").textContent=session.current.syllables||"";
  $("translationText").textContent=session.current.translation||"";
  $("progressText").textContent=`${session.index+1} / ${session.queue.length}`;
  $("speechResult").textContent="尚未辨識"; $("scoreValue").textContent="--"; $("feedbackText").textContent="等待作答";
  ["accuracyValue","fluencyValue","completeValue","prosodyValue"].forEach(id=>$(id).textContent="--");
  $("scoreRing").className="score-ring"; $("permissionHelp").classList.add("hidden");
}
function playReference(){
  if(!session.current||!("speechSynthesis" in window)) return;
  speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(session.current.text);u.lang=$("accentSelect").value;u.rate=.88;speechSynthesis.speak(u);
}
function recognize(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!window.isSecureContext){
    $("permissionHelp").classList.remove("hidden");
    $("speechResult").textContent="此頁面不是安全的 HTTPS 環境，瀏覽器可能拒絕麥克風。";
    return;
  }
  if(!SR){
    $("speechResult").textContent="此瀏覽器不支援語音辨識，請使用最新版 Chrome 或 Edge。";return;
  }
  const rec=new SR();rec.lang=$("accentSelect").value;rec.interimResults=false;rec.maxAlternatives=3;
  $("speakBtn").disabled=true;$("speakBtn").textContent="🎙 聆聽中…";
  rec.onresult=e=>{
    const alts=[...e.results[0]].map(x=>x.transcript);
    const best=alts.map(t=>({t,s:similarityScore(session.current.text,t)})).sort((a,b)=>b.s-a.s)[0];
    evaluate(best.t,best.s);
  };
  rec.onerror=e=>{
    $("speechResult").textContent=`語音辨識失敗：${e.error}`;
    if(e.error==="not-allowed"||e.error==="service-not-allowed") $("permissionHelp").classList.remove("hidden");
  };
  rec.onend=()=>{$("speakBtn").disabled=false;$("speakBtn").textContent="🎙 開始說話"};
  rec.start();
}
function evaluate(transcript, score){
  $("speechResult").textContent=transcript;$("scoreValue").textContent=score;
  $("scoreRing").className=`score-ring ${scoreBand(score)}`;$("feedbackText").textContent=feedbackFor(score);
  playFeedback(score);
  if(!session.answered){
    session.answered=true;
    if(score>=(window.APP_CONFIG.PASS_SCORE||82)) session.correct++; else session.wrong++;
    $("correctCount").textContent=session.correct;$("wrongCount").textContent=session.wrong;
    enqueueAttempt({transcript,score});
  }
}
function playFeedback(score){
  if(!soundOn) return;
  const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
  const ctx=new C(), gain=ctx.createGain();gain.gain.value=.05;gain.connect(ctx.destination);
  const band=scoreBand(score), notes=band==="excellent"?[523,659,784]:band==="good"?[523,659]:band==="retry"?[392,330]:[294,220];
  notes.forEach((f,i)=>{const o=ctx.createOscillator();o.frequency.value=f;o.connect(gain);o.start(ctx.currentTime+i*.12);o.stop(ctx.currentTime+i*.12+.10)});
  setTimeout(()=>ctx.close(),800);
}
function getStudentProfile(){
  return {
    className:$("studentClass").value.trim(),
    studentNo:$("studentNo").value.trim(),
    name:$("studentName").value.trim()
  };
}
function enqueueAttempt(extra){
  const s=getStudentProfile();
  pending.push({
    time:new Date().toISOString(), className:s.className, studentNo:s.studentNo, name:s.name,
    bank:$("bankSelect").value, target:session.current.text, kk:session.current.kk||"",
    transcript:extra.transcript, score:extra.score, pass:extra.score>=(window.APP_CONFIG.PASS_SCORE||82),
    assessmentMode:"browser-speech"
  });
  localStorage.setItem("pendingAttempts",JSON.stringify(pending));updatePending();
  clearTimeout(window.__syncTimer);window.__syncTimer=setTimeout(flushPending,window.APP_CONFIG.AUTO_SYNC_MS||1200);
}
async function flushPending(){
  if(!CloudAPI.enabled()||!pending.length) return;
  const max=window.APP_CONFIG.MAX_BATCH||12, batch=pending.slice(0,max);
  try{
    await CloudAPI.saveAttempts(batch);pending=pending.slice(batch.length);
    localStorage.setItem("pendingAttempts",JSON.stringify(pending));updatePending();
    if(pending.length) setTimeout(flushPending,300);
  }catch(e){console.warn("Sync failed",e);}
}
function updatePending(){$("pendingCount").textContent=pending.length}
function next(){session.index++;showCurrent()}
function finish(){clearInterval(session.timer);$("speakBtn").disabled=true;$("listenBtn").disabled=true;$("nextBtn").disabled=true;flushPending();alert(`完成！答對 ${session.correct} 題，需再練 ${session.wrong} 題。`)}
function updateTimer(){
  if(!session.startedAt)return;const sec=Math.floor((Date.now()-session.startedAt)/1000);
  $("timer").textContent=`${String(Math.floor(sec/60)).padStart(2,"0")}:${String(sec%60).padStart(2,"0")}`;
}
init();
