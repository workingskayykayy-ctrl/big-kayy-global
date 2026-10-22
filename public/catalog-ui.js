(function(){
"use strict";
const data=window.BKG_CATALOG;
const host=document.getElementById("catalog-groups");
const search=document.getElementById("catalog-search");
const select=document.getElementById("catalog-category");
const count=document.getElementById("catalog-count");
if(!data||!host||!select)return;

const photo={
 iphone:"https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80",
 samsung:"https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=80",
 redmi:"https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80",
 ipad:"https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=800&q=80",
 jbl:"https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80",
 power:"https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=800&q=80"
};
function imageFor(p){
 const n=p.name.toLowerCase();
 if(n.includes("ipad"))return photo.ipad;
 if(n.includes("samsung"))return photo.samsung;
 if(n.includes("redmi"))return photo.redmi;
 if(n.includes("jbl"))return photo.jbl;
 if(n.includes("power bank"))return photo.power;
 if(n.includes("iphone"))return photo.iphone;
 return "";
}
data.groups.forEach(g=>{const o=document.createElement("option");o.value=g.category;o.textContent=g.category;select.appendChild(o);});
function render(){
 const q=(search.value||"").trim().toLowerCase(), chosen=select.value;
 host.replaceChildren();let total=0;
 data.groups.forEach(g=>{
  if(chosen!=="all"&&chosen!==g.category)return;
  const products=data.products.filter(p=>p.category===g.category&&(!q||(p.name+" "+p.category).toLowerCase().includes(q)));
  if(!products.length)return;total+=products.length;
  const section=document.createElement("section");section.className="catalog-category";
  const heading=document.createElement("div");heading.className="catalog-category-heading";
  const title=document.createElement("h3");title.textContent=g.category;
  const qty=document.createElement("span");qty.textContent=products.length+" products";heading.append(title,qty);
  const grid=document.createElement("div");grid.className="catalog-product-grid";
  products.forEach(p=>{
   const card=document.createElement("article");card.className="catalog-product-card";
   const visual=document.createElement("div");visual.className="catalog-product-visual";
   const icon=document.createElement("span");icon.className="catalog-product-fallback";icon.setAttribute("aria-hidden","true");icon.textContent=/iphone|samsung|redmi/i.test(p.name)?"▯":/ipad/i.test(p.name)?"▱":/jbl/i.test(p.name)?"♫":"ϟ";visual.appendChild(icon);
   const src=imageFor(p);
   if(src){
    const img=document.createElement("img");img.className="catalog-product-image";img.src=src;img.alt=p.name+" product photo";img.loading="lazy";img.decoding="async";
    img.addEventListener("load",()=>visual.classList.add("has-image"),{once:true});
    img.addEventListener("error",()=>img.remove(),{once:true});
    visual.appendChild(img);
   }
   const info=document.createElement("div");info.className="catalog-product-info";
   const category=document.createElement("p");category.className="catalog-product-category";category.textContent=p.category;
   const name=document.createElement("h4");name.textContent=p.name;
   const price=document.createElement("p");price.className="catalog-product-price"+(p.price===null?" price-request":"");price.textContent=p.priceLabel;
   const btn=document.createElement("button");btn.type="button";btn.className="outline-button catalog-add-item";btn.dataset.item=p.name+" — "+p.priceLabel;btn.textContent="Add to enquiry list +";
   info.append(category,name,price,btn);card.append(visual,info);grid.appendChild(card);
  });
  section.append(heading,grid);host.appendChild(section);
 });
 count.textContent=total+" product"+(total===1?"":"s")+" found";
 if(!total){const empty=document.createElement("p");empty.className="empty-cart";empty.textContent="No products match your search.";host.appendChild(empty);}
}
search.addEventListener("input",render);select.addEventListener("change",render);render();
})();