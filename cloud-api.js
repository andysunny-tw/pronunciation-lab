
const CloudAPI = (() => {
  const cfg = window.APP_CONFIG || {};
  const url = cfg.GAS_API_URL || "";
  const useCloud = /^https:\/\//.test(url) && !url.includes("YOUR_APPS_SCRIPT_DEPLOYMENT_ID");

  function jsonp(action, params={}){
    if(!useCloud) return Promise.reject(new Error("cloud-disabled"));
    return new Promise((resolve,reject)=>{
      const cb = "__pron_cb_" + Date.now() + "_" + Math.random().toString(36).slice(2);
      const qs = new URLSearchParams({action, callback:cb, ...params});
      const script = document.createElement("script");
      const timer = setTimeout(()=>cleanup(new Error("API timeout")),12000);

      function cleanup(err, data){
        clearTimeout(timer);
        delete window[cb];
        script.remove();
        err ? reject(err) : resolve(data);
      }
      window[cb] = payload => {
        if(!payload || !payload.ok) cleanup(new Error(payload?.error || "API error"));
        else cleanup(null,payload.data);
      };
      script.onerror = () => cleanup(new Error("API load failed"));
      script.src = `${url}?${qs.toString()}`;
      document.head.appendChild(script);
    });
  }

  async function postNoCors(action,payload={}){
    if(!useCloud) throw new Error("cloud-disabled");
    await fetch(url,{
      method:"POST",
      mode:"no-cors",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({action,payload}),
      keepalive:true
    });
    return {queued:true};
  }

  return {
    enabled:()=>useCloud,
    loadApp:(force=false)=>jsonp("loadApp", force ? {force:"1"} : {}),
    refreshQuestions:()=>jsonp("loadApp",{force:"1"}),
    saveStudent:(p)=>postNoCors("saveStudent",p),
    saveAttempts:(items)=>postNoCors("saveAttempts",{items})
  };
})();
