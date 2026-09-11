const CloudAPI = (() => {
  const cfg = window.APP_CONFIG || {};
  const url = cfg.GAS_API_URL || "";
  const useCloud = /^https:\/\//.test(url) && !url.includes("YOUR_APPS_SCRIPT_DEPLOYMENT_ID");

  async function call(action, payload={}){
    if(!useCloud) throw new Error("cloud-disabled");
    const res = await fetch(url, {
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({action,payload})
    });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if(!data.ok) throw new Error(data.error || "API error");
    return data.data;
  }
  return {
    enabled:()=>useCloud,
    loadApp:()=>call("loadApp"),
    saveStudent:(p)=>call("saveStudent",p),
    saveAttempts:(items)=>call("saveAttempts",{items})
  };
})();
