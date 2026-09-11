
const fs=require('fs'),vm=require('vm');
const configCode=fs.readFileSync(__dirname+'/config.js','utf8');
const cloudCode=fs.readFileSync(__dirname+'/cloud-api.js','utf8');
const s={window:{},URLSearchParams:global.URLSearchParams,console};
vm.createContext(s);
vm.runInContext(configCode,s);

const expected='https://script.google.com/macros/s/AKfycbyZCFnXGyaRjZMMC0rvfyL8x29Hu5bfswkFQuLtg5APxkXYce-FeoYThpRI6oN_QWTt9Q/exec';
if(s.window.APP_CONFIG.GAS_API_URL!==expected) throw new Error('GAS_API_URL not configured');
if(configCode.includes('YOUR_APPS_SCRIPT_DEPLOYMENT_ID')) throw new Error('placeholder still present');
if(!cloudCode.includes('尚未設定雲端題庫 API')) throw new Error('friendly cloud-disabled message missing');
console.log('V4.4.1 cloud config tests passed');
