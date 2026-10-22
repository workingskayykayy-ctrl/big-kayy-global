(function(){
"use strict";
const data=window.BKG_CATALOG;
const host=document.getElementById("catalog-groups");
const search=document.getElementById("catalog-search");
const select=document.getElementById("catalog-category");
const count=document.getElementById("catalog-count");
if(!data||!host||!select)return;

const photos={
 iphoneX:"https://commons.wikimedia.org/wiki/Special:FilePath/Apple%20iPhone%20X%20-%20back%20(8111).jpg",
 iphoneXR:"https://commons.wikimedia.org/wiki/Special:FilePath/IPhone%20XR.jpg",
 iphoneXS:"https://commons.wikimedia.org/wiki/Special:FilePath/Apple%20iPhone%20XS%2C%20rear%20(gold).jpg",
 iphone11:"https://commons.wikimedia.org/wiki/Special:FilePath/IPhone%2011.jpeg",
 iphone11pro:"https://commons.wikimedia.org/wiki/Special:FilePath/20191227%20iPhone%2011%20Pro%201.jpg",
 iphone11promax:"https://commons.wikimedia.org/wiki/Special:FilePath/Iphone%2011%20pro%20max.jpg",
 iphone12:"https://commons.wikimedia.org/wiki/Special:FilePath/IPhone%2012%20-%203.jpg",
 iphone12mini:"https://commons.wikimedia.org/wiki/Special:FilePath/IPhone%2012%20Mini%20-%204.jpg",
 iphone12pro:"https://commons.wikimedia.org/wiki/Special:FilePath/IPhone%2012%20Pro%20-%203.jpg",
 iphone12promax:"https://i.simpalsmedia.com/marketplace/products/original/d12ec1b84d0c7ae90144b67ee576387f.jpg",
 iphone13:"https://commons.wikimedia.org/wiki/Special:FilePath/IPhone%2013.jpg",
 iphone13pro:"https://commons.wikimedia.org/wiki/Special:FilePath/Back%20of%20the%20iPhone%2013%20Pro.jpg",
 iphone13promax:"https://commons.wikimedia.org/wiki/Special:FilePath/Iphone%2013%20pro%20max.jpg",
 iphone14:"https://media.currys.biz/i/currysprod/10242697?%24l-large%24=&fmt=auto",
 iphone14pro:"https://commons.wikimedia.org/wiki/Special:FilePath/Back%20of%20iPhone%2014%20Pro.jpg",
 iphone14promax:"https://commons.wikimedia.org/wiki/Special:FilePath/Back%20of%20the%20iPhone%2014%20Pro%20Max.jpg",
 iphone15:"https://img1.kakaku.k-img.com/images/maga/icv/sp1200/19511/thumbnail_l.jpg",
 iphone15pro:"https://www.virginmegastore.ae/medias/465384-main.jpg?context=bWFzdGVyfHJvb3R8MTE5MzY3fGltYWdlL2pwZWd8YURaaUwyaGlZeTh4TURNMk9UZzJOelkzTnpjeU5pODBOalV6T0RSZlgyMWhhVzR1YW5CbnxiNjg0ZWQwNmU5OTRmMjdiYTJlZDhmNzc0MTc1ZGFhNGQyNzNhNzlhZjM2MGZhN2YzNzJiY2VmMDYwZTI1NTI1",
 iphone16:"https://www.planeo.cz/-f52825---iVYgMLsS/iphone-16?field=data",
 iphone16pro:"https://www.teknikproffset.no/img/bilder/artiklar/zoom/C81510_1.jpg?m=1727144034",
 iphone17:"https://commons.wikimedia.org/wiki/Special:FilePath/IPhone%2017%20(Lavender)%20-%20Backside.jpg",
 iphone17pro:"https://commons.wikimedia.org/wiki/Special:FilePath/IPhone%2017%20Pro%20(Silver)%20-%20Backside.jpg",
 iphone17promax:"https://static.tildacdn.com/stor6530-3831-4536-b439-666334313037/d4a4d51f0fbdf132f8bc3ee714c36aac.jpg",
 samsungS10:"https://cdn.new-brz.net/app/public/models/SM-G973FZBDSEK/large/w/241015160013622783.webp",
 samsungS20:"https://image.ohousecdn.com/i/bucketplace-v2-development/uploads/productions/168439678322695637.jpg?c=c&h=1920&w=1920",
 samsungS20FE:"https://mobitel.uk/cdn/shop/files/9-_Samsung_Galaxy_S20_FE_5G_Refurbished_CLOUD_NAVY_BACK.webp?v=1780897573&width=2000",
 samsungS21:"https://media.wired.jp/photos/61ce641a8233dfa1a0412318/master/w_2560%2Cc_limit/255f6b5e70362992687bb9ed91984264.jpg",
 samsungS22:"https://m-cdn.phonearena.com/images/articles/389295-image/Galaxy-S22-family.webp",
 samsungS23:"https://media.rueducommerce.fr/mktp/product/productImage/3/72/70f2732787f14042b2f9265893188b30.webp",
 samsungNote:"https://image.ohousecdn.com/i/bucketplace-v2-development/uploads/productions/168439678322695637.jpg?c=c&h=1920&w=1920",
 samsungA:"https://mobilemall.co/blog/wp-content/uploads/2022/03/Galaxy-A-Series-Specs-leak-1-1024x683.jpg",
 samsungOlder:"https://static.tildacdn.com/tild6634-3062-4738-a431-326432363863/samsung-phones-2-152.jpg",
 redmiA7:"https://cdn.movertix.com/media/catalog/product/r/e/redmi-a7-pro-4g-dual-sim-mist-blue-64gb-and-4gb-ram.jpg",
 redmiNote15:"https://www.xtmobile.vn/vnt_upload/news/06_2024/Nen-mua-xiaomi-redmi-15-hay-redmi-note-15-pro-xtmobile.jpg",
 ipad10:"https://storage.micromagma.ma/micromagma/938bd1b008a13f01d1a2bb169b8907e3.jpg",
 ipad11:"https://seentat.com/cdn/shop/files/apple-ipad-11-a16-pink-1_4b0eec31-c9fd-4348-94b8-73848dc58c65.jpg?v=1769574849",
 jblFlip6:"https://cdn.shopware.store/N/R/R/AlrFq/media/28/4a/02/1772707448/e00116fd8aea4c83b7e16a629cb670ec.jpeg?ts=1772707448",
 jblFlip7:"https://hniesfp.imgix.net/8/images/detailed/1042/JBLFLIP7BLK_2.jpg?auto=format%2Ccompress&bg=0FFF&fit=fill&h=1000&w=1500",
 jblCharge5:"https://www.smarthomesounds.co.uk/wp/wp-content/uploads/2025/04/jbl_charge_6_vs_flip_7_portable_speaker_comparison_design-1024x576.jpg",
 jblCharge6:"https://deonet.com/web/image/product.product/2716474/image_1024/JBL%20Charge%206%20%28Zwart%2C%20Afdrukken%20in%20full%20color%2C%20Geen%20individuele%20personalisatie%20op%20product%2C%20Geen%20verpakking%2C%20Geen%20individuele%20personalisatie%20sleeve%2C%20Geen%20professionele%20hulp%20bij%20opmaak%29?unique=d245511",
 jblXtreme3:"https://www.jbl.com/dw/image/v2/BFND_PRD/on/demandware.static/-/Sites-masterCatalog_Harman/default/dwca9663e5/JBL_XTREME_4_HERO_BLACK_47136_X2_%281%29.png?sh=535&sw=535",
 jblXtreme4:"https://www.jbl.com/dw/image/v2/BFND_PRD/on/demandware.static/-/Sites-masterCatalog_Harman/default/dwca9663e5/JBL_XTREME_4_HERO_BLACK_47136_X2_%281%29.png?sh=535&sw=535",
 jblStudio:"https://www.jbl.com/dw/image/v2/BFND_PRD/on/demandware.static/-/Sites-masterCatalog_Harman/default/dwca9663e5/JBL_XTREME_4_HERO_BLACK_47136_X2_%281%29.png?sh=535&sw=535",
 power:"https://pbs.twimg.com/media/Gc5dRrfXAAELHsd.jpg"
};
const backupPhotos={
 iphone:"https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-13.jpg",
 samsung:"https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-s21-5g.jpg",
 redmi:"https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-note-15-pro-5g.jpg"
};
function backupFor(p){
 const n=p.name.toLowerCase();
 if(n.includes("iphone"))return backupPhotos.iphone;
 if(n.includes("samsung"))return backupPhotos.samsung;
 if(n.includes("redmi"))return backupPhotos.redmi;
 return "";
}
function imageFor(p){
 const n=p.name.toLowerCase().replace(/\s+/g," ");
 if(n.includes("iphone x")&&!n.includes("xr")&&!n.includes("xs"))return photos.iphoneX;
 if(n.includes("iphone xr"))return photos.iphoneXR;
 if(n.includes("iphone xs max"))return photos.iphoneXS;
 if(n.includes("iphone xs"))return photos.iphoneXS;
 if(n.includes("iphone 11 pro max"))return photos.iphone11promax;
 if(n.includes("iphone 11 pro"))return photos.iphone11pro;
 if(n.includes("iphone 11"))return photos.iphone11;
 if(n.includes("iphone 12 pro max"))return photos.iphone12promax;
 if(n.includes("iphone 12 pro"))return photos.iphone12pro;
 if(n.includes("iphone 12 mini"))return photos.iphone12mini;
 if(n.includes("iphone 12"))return photos.iphone12;
 if(n.includes("iphone 13 pro max"))return photos.iphone13promax;
 if(n.includes("iphone 13 pro"))return photos.iphone13pro;
 if(n.includes("iphone 13 mini"))return photos.iphone13;
 if(n.includes("iphone 13"))return photos.iphone13;
 if(n.includes("iphone 14 pro max"))return photos.iphone14promax;
 if(n.includes("iphone 14 pro"))return photos.iphone14pro;
 if(n.includes("iphone 14"))return photos.iphone14;
 if(n.includes("iphone 15 pro max"))return photos.iphone15pro;
 if(n.includes("iphone 15 pro"))return photos.iphone15pro;
 if(n.includes("iphone 15"))return photos.iphone15;
 if(n.includes("iphone 16 pro max"))return photos.iphone16pro;
 if(n.includes("iphone 16 pro"))return photos.iphone16pro;
 if(n.includes("iphone 16"))return photos.iphone16;
 if(n.includes("iphone 17 pro max"))return photos.iphone17promax;
 if(n.includes("iphone 17 pro"))return photos.iphone17pro;
 if(n.includes("iphone 17 air")||n.includes("iphone 17"))return photos.iphone17;
 if(n.includes("ipad 10"))return photos.ipad10;
 if(n.includes("ipad 11"))return photos.ipad11;
 if(n.includes("samsung s23"))return photos.samsungS23;
 if(n.includes("samsung s22 ultra")||n.includes("samsung s22+")||n.includes("samsung s22 "))return photos.samsungS22;
 if(n.includes("samsung s21 fe"))return photos.samsungS20FE;
 if(n.includes("samsung s21"))return photos.samsungS21;
 if(n.includes("samsung s20 fe"))return photos.samsungS20FE;
 if(n.includes("samsung s20"))return photos.samsungS20;
 if(n.includes("note 20")||n.includes("note 10"))return photos.samsungNote;
 if(n.includes("samsung s10"))return photos.samsungS10;
 if(n.includes("samsung s9")||n.includes("samsung s8")||n.includes("samsung s6")||n.includes("samsung j7")||n.includes("samsung j3"))return photos.samsungOlder;
 if(n.includes("samsung a53")||n.includes("samsung a20")||n.includes("samsung a14")||n.includes("samsung a13")||n.includes("samsung a12")||n.includes("samsung a03"))return photos.samsungA;
 if(n.includes("redmi a7"))return photos.redmiA7;
 if(n.includes("redmi note 15"))return photos.redmiNote15;
 if(n.includes("jbl flip 6"))return photos.jblFlip6;
 if(n.includes("jbl flip 7"))return photos.jblFlip7;
 if(n.includes("jbl charge 5"))return photos.jblCharge5;
 if(n.includes("jbl charge 6"))return photos.jblCharge6;
 if(n.includes("jbl xtreme 3"))return photos.jblXtreme3;
 if(n.includes("jbl xtreme 4"))return photos.jblXtreme4;
 if(n.includes("jbl studio"))return photos.jblStudio;
 if(n.includes("power bank"))return photos.power;
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
    const img=document.createElement("img");img.className="catalog-product-image";img.src=src;img.alt=p.name+" product photo";img.loading="lazy";img.decoding="async";img.referrerPolicy="no-referrer";
    img.addEventListener("load",()=>visual.classList.add("has-image"),{once:true});
    img.addEventListener("error",()=>{
     const backup=backupFor(p);
     if(backup && img.dataset.backup!=="used"){
      img.dataset.backup="used";img.src=backup;return;
     }
     img.remove();visual.classList.remove("has-image");
    });
    visual.appendChild(img);
   }
   const info=document.createElement("div");info.className="catalog-product-info";
   const category=document.createElement("p");category.className="catalog-product-category";category.textContent=p.category;
   const name=document.createElement("h4");name.textContent=p.name;
   const price=document.createElement("p");price.className="catalog-product-price"+(p.price===null?" price-request":"");price.textContent=p.priceLabel;
   const btn=document.createElement("button");btn.type="button";btn.className="outline-button catalog-add-item";btn.dataset.item=p.name+" — "+p.priceLabel;btn.textContent="Add to enquiry list +";
   const subscribe=document.createElement("button");subscribe.type="button";subscribe.className="catalog-subscribe-item";subscribe.dataset.product=p.name;subscribe.textContent="Subscribe →";info.append(category,name,price,btn,subscribe);card.append(visual,info);grid.appendChild(card);
  });
  section.append(heading,grid);host.appendChild(section);
 });
 count.textContent=total+" product"+(total===1?"":"s")+" found";
 if(!total){const empty=document.createElement("p");empty.className="empty-cart";empty.textContent="No products match your search.";host.appendChild(empty);}
}
search.addEventListener("input",render);select.addEventListener("change",render);render();
})();