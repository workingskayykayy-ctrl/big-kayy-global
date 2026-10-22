(function(){
"use strict";
const form=document.getElementById("subscription-form");
const productSelect=document.getElementById("subscription-product");
const periodSelect=document.getElementById("subscription-period");
const noteInput=document.getElementById("subscription-note");
const status=document.getElementById("subscription-status");
const submit=document.getElementById("subscription-submit");
if(!form||!productSelect||!periodSelect||!status||!submit)return;
const catalog=window.BKG_CATALOG;
if(catalog&&Array.isArray(catalog.products)){const seen=new Set();catalog.products.forEach(function(product){if(!product||!product.name||seen.has(product.name))return;seen.add(product.name);const option=document.createElement("option");option.value=product.name;option.textContent=product.name+" — "+(product.priceLabel||"Price on request");productSelect.appendChild(option);});}
function show(message,kind){status.textContent=message;status.className="subscription-status"+(kind?" "+kind:"");}
form.addEventListener("submit",async function(event){event.preventDefault();const token=window.sessionStorage.getItem("bkg-session-token");if(!token){show("Please sign in to your verified BKG account before submitting a subscription request.","error");return;}if(!productSelect.value){show("Choose a product first.","error");return;}submit.disabled=true;submit.textContent="Sending request…";show("Sending your request","");
try{const base=String(window.BKG_API_BASE||"");const apiBase=base.endsWith("/")?base.slice(0,-1):base;const response=await fetch(apiBase+"/api/subscriptions/request",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({productName:productSelect.value,period:periodSelect.value,note:(noteInput.value||"").trim()})});const result=await response.json().catch(function(){return {};});if(!response.ok){if(response.status===401)window.sessionStorage.removeItem("bkg-session-token");throw new Error(result.message||"Could not submit request. Please sign in and try again.");}show(result.message||"Request received. BKG will confirm the price and payment instructions before you pay.","success");form.reset();}
catch(error){show(error.message||"Network error. Please try again.","error");}finally{submit.disabled=false;submit.textContent="Request subscription →";}});
})();
