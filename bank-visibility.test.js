
const fs=require('fs');
const app=fs.readFileSync(__dirname+'/app.js','utf8');

function assert(c,m){ if(!c) throw new Error(m); }

// V4.4.3 requirements:
// 1) Teacher assignments and free-practice banks coexist.
// 2) They are visually grouped.
// 3) Assignment labels show question counts.
// 4) Free-practice hint is explicit, not the old "no matching assignment" message.
assert(app.includes('【老師指定作業】') || app.includes('老師指定作業'), 'teacher assignment group label missing');
assert(app.includes('【自由練習】') || app.includes('自由練習'), 'free-practice group label missing');
assert(app.includes('document.createElement("optgroup")') || app.includes("document.createElement('optgroup')"), 'optgroup grouping missing');
assert(app.includes('（${banks[a.bankKey].length}題）'), 'assignment question count missing');
assert(app.includes('自由練習模式'), 'explicit free-practice hint missing');

// Old exclusive branch must be gone: free banks should not appear only when no assignment exists.
assert(!/if\(eligible\.length\)\{[\s\S]*?\}\s*else\s*\{[\s\S]*?Object\.entries\(banks\)/.test(app), 'free banks are still exclusive to no-assignment state');

console.log('V4.4.3 bank visibility tests passed');
