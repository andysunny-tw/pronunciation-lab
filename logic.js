function normalizeText(text){
  return String(text||"").toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu,"")
    .replace(/\s+/g," ")
    .trim();
}
function levenshtein(a,b){
  const m=a.length,n=b.length,dp=Array.from({length:m+1},()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++) dp[i][0]=i;
  for(let j=0;j<=n;j++) dp[0][j]=j;
  for(let i=1;i<=m;i++) for(let j=1;j<=n;j++) dp[i][j]=Math.min(
    dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1)
  );
  return dp[m][n];
}
function similarityScore(expected,actual){
  const a=normalizeText(expected),b=normalizeText(actual);
  if(!a||!b) return 0;
  return Math.max(0,Math.round((1-levenshtein(a,b)/Math.max(a.length,b.length))*100));
}
function scoreBand(score){
  if(score>=95) return "excellent";
  if(score>=82) return "good";
  if(score>=60) return "retry";
  return "low";
}
function feedbackFor(score){
  if(score>=95) return "太棒了！發音非常清楚。";
  if(score>=82) return "很好！再注意節奏會更自然。";
  if(score>=60) return "接近了，再試一次並注意完整尾音。";
  return "再練一次，先聽標準發音後慢慢朗讀。";
}
