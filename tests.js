
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

function normalizeText(text){
  return text.toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu,"")
    .replace(/\s+/g," ")
    .trim();
}

function scoreBand(score){
  if (score >= 95) return "excellent";
  if (score >= 82) return "good";
  if (score >= 60) return "retry";
  return "low";
}

function shouldUseCloud(baseUrl){
  return /^https:\/\//.test(baseUrl) && !/YOUR_APPS_SCRIPT_DEPLOYMENT_ID/.test(baseUrl);
}

function batchAttempts(items, maxBatch=12){
  const out = [];
  for (let i=0;i<items.length;i+=maxBatch) out.push(items.slice(i,i+maxBatch));
  return out;
}

assert(normalizeText(" Hello,  World! ") === "hello world", "normalizeText");
assert(scoreBand(98) === "excellent", "excellent band");
assert(scoreBand(90) === "good", "good band");
assert(scoreBand(70) === "retry", "retry band");
assert(scoreBand(25) === "low", "low band");
assert(shouldUseCloud("https://script.google.com/macros/s/abc/exec"), "valid cloud URL");
assert(!shouldUseCloud("https://script.google.com/macros/s/YOUR_APPS_SCRIPT_DEPLOYMENT_ID/exec"), "placeholder cloud URL");
assert(batchAttempts([1,2,3,4,5], 2).length === 3, "batch attempts");
console.log("All V4.1 tests passed");

const fs = require('fs');
const html = fs.readFileSync(__dirname + '/index.html','utf8');
const app = fs.readFileSync(__dirname + '/app.js','utf8');
if(!html.includes('id="refreshBankBtn"')) throw new Error('refreshBankBtn missing');
if(!app.includes('bankLabels[k]||k')) throw new Error('bank labels not used');
if(!app.includes('loadCloudData(true)')) throw new Error('forced refresh not wired');
console.log('V4.2 frontend cloud-question checks passed');

const app43 = fs.readFileSync(__dirname + '/app.js','utf8');
const html43 = fs.readFileSync(__dirname + '/index.html','utf8');
if(!html43.includes('id="assignmentHint"')) throw new Error('assignment hint missing');
if(!app43.includes('eligibleAssignmentsForClass')) throw new Error('assignment filtering missing');
if(!app43.includes('assignmentId:currentAssignment?.assignmentId')) throw new Error('attempt assignment metadata missing');
console.log('V4.3 assignment UI checks passed');
