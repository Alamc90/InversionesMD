(()=>{var e={};e.id=702,e.ids=[702],e.modules={7849:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external")},2934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},5403:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external")},4580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},4749:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external")},5869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},1367:(e,s,a)=>{"use strict";a.r(s),a.d(s,{GlobalError:()=>r.a,__next_app__:()=>x,originalPathname:()=>m,pages:()=>c,routeModule:()=>u,tree:()=>d}),a(8256),a(3817),a(5866);var t=a(3191),l=a(8716),n=a(7922),r=a.n(n),i=a(5231),o={};for(let e in i)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(o[e]=()=>i[e]);a.d(s,o);let d=["",{children:["dashboard",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(a.bind(a,8256)),"C:\\Users\\ALAMFLP\\Documents\\vehicle-installment-manager\\src\\app\\dashboard\\page.tsx"]}]},{}]},{layout:[()=>Promise.resolve().then(a.bind(a,3817)),"C:\\Users\\ALAMFLP\\Documents\\vehicle-installment-manager\\src\\app\\layout.tsx"],"not-found":[()=>Promise.resolve().then(a.t.bind(a,5866,23)),"next/dist/client/components/not-found-error"]}],c=["C:\\Users\\ALAMFLP\\Documents\\vehicle-installment-manager\\src\\app\\dashboard\\page.tsx"],m="/dashboard/page",x={require:a,loadChunk:()=>Promise.resolve()},u=new t.AppPageRouteModule({definition:{kind:l.x.APP_PAGE,page:"/dashboard/page",pathname:"/dashboard",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:d}})},3980:(e,s,a)=>{Promise.resolve().then(a.bind(a,7241))},7241:(e,s,a)=>{"use strict";a.r(s),a.d(s,{default:()=>E});var t=a(326),l=a(7577),n=a(3546),r=a(9752),i=a(1664),o=a(1190),d=a(6829),c=a(3819),m=a(4118),x=a(1223);function u(e){if(!e||!e.start_date)return{overdueInstallments:0,nextDueDate:null};let s=new Date(e.start_date),a=new Date().getTime()-s.getTime();if(a<0)return{overdueInstallments:0,nextDueDate:s};let t=7;"DIARIO"===e.payment_frequency&&(t=1),"SEMANAL"===e.payment_frequency&&(t=7),"QUINCENAL"===e.payment_frequency&&(t=15),"MENSUAL"===e.payment_frequency&&(t=30);let l=Math.floor(Math.ceil(a/864e5)/t),n=Number(e.installments_paid)||0,r=new Date(s);return r.setDate(s.getDate()+(Math.floor(n)+1)*t),{overdueInstallments:Math.max(0,l-n),nextDueDate:r}}var p=a(5999),h=a(2881);/**
 * @license lucide-react v0.454.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */let f=(0,h.Z)("Info",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"M12 16v-4",key:"1dtifu"}],["path",{d:"M12 8h.01",key:"e9boi3"}]]),g=(0,h.Z)("User",[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]]),b=(0,h.Z)("ShieldCheck",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}],["path",{d:"m9 12 2 2 4-4",key:"dzmm74"}]]),j=(0,h.Z)("Car",[["path",{d:"M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2",key:"5owen"}],["circle",{cx:"7",cy:"17",r:"2",key:"u2ysq9"}],["path",{d:"M9 17h6",key:"r8uit2"}],["circle",{cx:"17",cy:"17",r:"2",key:"axvx0g"}]]),N=(0,h.Z)("PenLine",[["path",{d:"M12 20h9",key:"t2du7b"}],["path",{d:"M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z",key:"1ykcvy"}]]);var y=a(8998),v=a(361),w=a(9669),_=a(3869),k=a(2011);function C(e){let{payment:s,customer:a,vehicle:t,plan:l,businessConfig:n}=e,r=new Date(s.payment_date).toLocaleDateString("es-CO"),i=new Date(s.payment_date).toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit"}),o=Number(l?.installment_value)||0,d=Number(s.amount)||0,c=o>0?d/o:0,m=c%1==0?Math.floor(c).toString():c.toFixed(1),p=Math.floor(u(l).overdueInstallments),h=p>0?`${p} Cuota(s) Vencida(s)`:"Al dia";return{businessName:n?.business_name||"MI NEGOCIO",nit:n?.nit||"0000000000",address:n?.address||"",phone:n?.phone||"",date:r,time:i,receiptNumber:s.id,customerName:`${a.first_name} ${a.last_name}`,cedula:a.cedula||"",plate:t.plate||"",installmentsCount:m,installmentValue:(0,x.x)(o),totalPayment:(0,x.x)(d),statusText:h}}async function A(e){if(!(0,k.t5)())return!1;let s=C(e),a=(0,k.gX)(s);return await (0,k._m)(a),!0}let P=e=>{let{logoUrl:s}=e,a=C(e),t=`
    @page {
      size: 48mm auto;
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      width: 48mm;
      max-width: 48mm;
      margin: 0 auto;
      padding: 1mm 0.5mm;
      font-family: 'Courier New', Courier, monospace;
      font-size: 10px;
      line-height: 1.3;
      color: #000;
      background: #fff;
      overflow: hidden;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .title {
      font-size: 13px;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      margin-bottom: 1px;
    }
    .subtitle {
      text-align: center;
      font-size: 9px;
      line-height: 1.2;
    }
    .logo {
      max-width: 36mm;
      max-height: 12mm;
      display: block;
      margin: 0 auto 2px auto;
      object-fit: contain;
    }
    .sep {
      border: none;
      border-top: 1px dashed #000;
      margin: 3px 0;
    }
    .row {
      display: table;
      width: 100%;
      table-layout: fixed;
      font-size: 10px;
    }
    .row .lbl {
      display: table-cell;
      font-weight: bold;
      white-space: nowrap;
      width: 45%;
      padding-right: 2px;
      vertical-align: top;
    }
    .row .val {
      display: table-cell;
      text-align: right;
      width: 55%;
      word-break: break-all;
      vertical-align: top;
    }
    .row .val-left {
      display: table-cell;
      text-align: left;
      width: 55%;
      word-break: break-word;
      vertical-align: top;
    }
    .field-block {
      font-size: 10px;
      word-break: break-word;
      padding-left: 1px;
      margin-bottom: 1px;
    }
    .total-box {
      text-align: center;
      font-size: 14px;
      font-weight: bold;
      padding: 3px 0;
      margin: 2px 0;
    }
    .footer {
      text-align: center;
      font-size: 9px;
      margin-top: 5px;
      line-height: 1.3;
    }
    @media print {
      body { width: 48mm; max-width: 48mm; }
    }
  `,l=`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Recibo #${a.receiptNumber}</title>
<style>${t}</style>
</head>
<body>

<div class="center">
  ${s?`<img src="${s}" class="logo" alt="Logo" />`:""}
  <div class="title">${a.businessName}</div>
  <div class="subtitle">NIT: ${a.nit}</div>
  <div class="subtitle">${a.address}</div>
  ${a.phone?`<div class="subtitle">${a.phone}</div>`:""}
</div>

<hr class="sep">

<div class="row">
  <span class="lbl">Fecha:</span>
  <span class="val">${a.date}</span>
</div>
<div class="row">
  <span class="lbl">Hora:</span>
  <span class="val">${a.time}</span>
</div>
<div class="row">
  <span class="lbl">Recibo #:</span>
  <span class="val">${a.receiptNumber}</span>
</div>

<hr class="sep">

<div class="bold" style="font-size:10px;">Cliente:</div>
<div class="field-block">${a.customerName}</div>

<div class="row">
  <span class="lbl">CC:</span>
  <span class="val">${a.cedula}</span>
</div>
<div class="row">
  <span class="lbl">Placa:</span>
  <span class="val">${a.plate}</span>
</div>

<hr class="sep">

<div class="row">
  <span class="lbl">Cant. Cuotas:</span>
  <span class="val">${a.installmentsCount}</span>
</div>
<div class="row">
  <span class="lbl">Valor Cuota:</span>
  <span class="val">$${a.installmentValue}</span>
</div>

<hr class="sep">

<div class="total-box">
  Total: $${a.totalPayment}
</div>

<hr class="sep">

<div class="bold" style="font-size:10px;">Estado:</div>
<div class="field-block">${a.statusText}</div>

<div class="footer">
  Gracias por su preferencia<br>
  ${a.businessName}
</div>

<script>
window.onload = function() {
  setTimeout(function() { window.print(); }, 300);
};
</script>
</body>
</html>`,n=window.open("","_blank","width=300,height=600,menubar=0,toolbar=0,location=0,status=0");n?(n.document.write(l),n.document.close()):alert("Permita las ventanas emergentes para imprimir el recibo.")};var D=a(4001),M=a(1338);let I=({vehicleId:e,isOpen:s,onClose:a})=>{let{hasPermission:h,business:C}=(0,D.a)(),I=h("can_approve_payments"),[$,z]=(0,l.useState)(null),[E,S]=(0,l.useState)([]),[L,R]=(0,l.useState)(0),[q,O]=(0,l.useState)({overdueInstallments:0,nextDueDate:""}),[T,V]=(0,l.useState)(!1),[Z,F]=(0,l.useState)(""),[G,H]=(0,l.useState)(!1),[U,Y]=(0,l.useState)(null),[B,K]=(0,l.useState)(!1);(0,l.useEffect)(()=>{s&&e&&X()},[s,e]);let X=async()=>{try{let s=await n.D.getBusinessConfig();Y(s);let a=await n.D.getVehicleDetails(e),t=Array.isArray(a?.installment_plans)?a.installment_plans:a?.installment_plans?[a.installment_plans]:[];if(t.length>0){let e=t[0];try{let s=await n.D.getInstallmentPlan(e.id);s&&(e={...e,...s})}catch(e){console.error("Failed to refresh plan details",e)}let s=await n.D.getPaymentHistory(e.id);S(s||[]);let l=(s||[]).filter(e=>"APROBADO"===e.status).reduce((e,s)=>e+(Number(s.amount)||0),0),r=Number(e.installment_value)||1,i=Number((r>0?l/r:0).toFixed(2));e.installments_paid=i,t[0]=e,z({...a,installment_plans:t}),L||R(Number(e.installment_value)||0),W(e)}else z(a)}catch(e){console.error("Error loading payment data:",e)}},Q=async e=>{S(await n.D.getPaymentHistory(e)||[])},W=e=>{let s=u(e);O({overdueInstallments:Math.floor(s.overdueInstallments),nextDueDate:s.nextDueDate?s.nextDueDate.toLocaleDateString():""})},J=()=>{let e=Array.isArray($?.installment_plans)?$.installment_plans:$?.installment_plans?[$.installment_plans]:[];e.length>0&&R(Number(e[0].installment_value)||0)},ee=()=>{let e=Array.isArray($?.installment_plans)?$.installment_plans:$?.installment_plans?[$.installment_plans]:[];if(e.length>0){let s=(Number(e[0].installment_value)||0)*Math.floor(q.overdueInstallments);s>0?R(s):p.A.info("No hay cuotas pendientes para pagar")}},es=async()=>{V(!0)},ea=async()=>{let e=Array.isArray($?.installment_plans)?$.installment_plans:$?.installment_plans?[$.installment_plans]:[];if(0!==e.length)try{let s=await n.D.registerPayment(e[0].id,L,Z,I);if(I){if(p.A.success("Pago registrado y aprobado correctamente"),C?.id&&s.payment)try{await d.y.recordPaymentIncome(C.id,L,s.payment.id?.toString()||"",`Pago cuota - ${$.plate}`)}catch(e){console.error("Error recording income:",e)}}else p.A.success("Pago registrado como PENDIENTE. Requiere aprobaci\xf3n de un administrador.");if(V(!1),F(""),s&&void 0!==s.newProgress&&e[0]){let a={...e[0],installments_paid:s.newProgress},t=Array.isArray($.installment_plans)?[...$.installment_plans]:[$.installment_plans];Array.isArray($.installment_plans)?t[0]=a:t=[a];let l={...$,installment_plans:t};z(l),W(a),await Q(e[0].id)}else await X()}catch(e){p.A.error("Error al registrar pago"),console.error(e)}};if(!s||!$)return null;let et=Array.isArray($.installment_plans)?$.installment_plans:$.installment_plans?[$.installment_plans]:[],el=et.length>0?et[0]:null,en=Number(el?.installment_value)||0,er=Number(el?.installments_paid)||0,ei=Number(el?.total_installments)||0;return t.jsx(m.Vq,{open:s,onOpenChange:e=>{e||H(!1),a()},children:(0,t.jsxs)(m.cZ,{className:"max-w-[85rem] w-[95vw] max-h-[95vh] flex flex-col mobile-dialog",children:[t.jsx(i.z,{variant:"ghost",size:"icon",className:"absolute right-12 top-4 text-muted-foreground hover:text-foreground z-10",onClick:()=>H(!0),title:"Ver informaci\xf3n detallada",children:t.jsx(f,{className:"h-4 w-4"})}),t.jsx(m.fK,{className:"shrink-0",children:(0,t.jsxs)(m.$N,{children:["Gesti\xf3n de Pagos - ",$.plate]})}),G?(0,t.jsxs)("div",{className:"space-y-4 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 overflow-y-auto flex-1",children:[(0,t.jsxs)("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6",children:[(0,t.jsxs)(r.Zb,{children:[t.jsx(r.Ol,{className:"pb-2",children:(0,t.jsxs)(r.ll,{className:"text-lg flex items-center gap-2",children:[t.jsx(g,{className:"h-5 w-5 text-blue-500"}),"Cliente"]})}),(0,t.jsxs)(r.aY,{className:"space-y-2 text-sm",children:[(0,t.jsxs)("div",{children:[t.jsx("span",{className:"text-muted-foreground block text-xs",children:"Nombre Completo"}),(0,t.jsxs)("span",{className:"font-medium",children:[$.customers?.first_name," ",$.customers?.last_name]})]}),(0,t.jsxs)("div",{children:[t.jsx("span",{className:"text-muted-foreground block text-xs",children:"C\xe9dula"}),t.jsx("span",{className:"font-medium",children:$.customers?.cedula||"N/A"})]}),(0,t.jsxs)("div",{children:[t.jsx("span",{className:"text-muted-foreground block text-xs",children:"Tel\xe9fono"}),t.jsx("span",{className:"font-medium",children:$.customers?.phone||"N/A"})]}),(0,t.jsxs)("div",{children:[t.jsx("span",{className:"text-muted-foreground block text-xs",children:"Direcci\xf3n"}),t.jsx("span",{className:"font-medium",children:$.customers?.address||"N/A"})]})]})]}),(0,t.jsxs)(r.Zb,{children:[t.jsx(r.Ol,{className:"pb-2",children:(0,t.jsxs)(r.ll,{className:"text-lg flex items-center gap-2",children:[t.jsx(b,{className:"h-5 w-5 text-green-500"}),"Fiador"]})}),(0,t.jsxs)(r.aY,{className:"space-y-2 text-sm",children:[(0,t.jsxs)("div",{children:[t.jsx("span",{className:"text-muted-foreground block text-xs",children:"Nombre Completo"}),(0,t.jsxs)("span",{className:"font-medium",children:[$.customers?.guarantor_first_name," ",$.customers?.guarantor_last_name]})]}),(0,t.jsxs)("div",{children:[t.jsx("span",{className:"text-muted-foreground block text-xs",children:"C\xe9dula"}),t.jsx("span",{className:"font-medium",children:$.customers?.guarantor_cedula||"N/A"})]}),(0,t.jsxs)("div",{children:[t.jsx("span",{className:"text-muted-foreground block text-xs",children:"Direcci\xf3n"}),t.jsx("span",{className:"font-medium",children:$.customers?.guarantor_address||"N/A"})]})]})]}),(0,t.jsxs)(r.Zb,{children:[t.jsx(r.Ol,{className:"pb-2",children:(0,t.jsxs)(r.ll,{className:"text-lg flex items-center gap-2",children:[t.jsx(j,{className:"h-5 w-5 text-orange-500"}),"Veh\xedculo"]})}),(0,t.jsxs)(r.aY,{className:"space-y-2 text-sm",children:[(0,t.jsxs)("div",{children:[t.jsx("span",{className:"text-muted-foreground block text-xs",children:"Placa"}),t.jsx("span",{className:"font-bold bg-yellow-400 text-black px-1 rounded inline-block",children:$.plate})]}),(0,t.jsxs)("div",{children:[t.jsx("span",{className:"text-muted-foreground block text-xs",children:"Modelo"}),t.jsx("span",{className:"font-medium",children:$.model})]}),(0,t.jsxs)("div",{children:[t.jsx("span",{className:"text-muted-foreground block text-xs",children:"A\xf1o"}),t.jsx("span",{className:"font-medium",children:$.year})]}),(0,t.jsxs)("div",{children:[t.jsx("span",{className:"text-muted-foreground block text-xs",children:"Color"}),t.jsx("span",{className:"font-medium",children:$.color})]})]})]})]}),t.jsx("div",{className:"flex justify-end",children:t.jsx(i.z,{variant:"outline",onClick:()=>H(!1),children:"Volver a Pagos"})})]}):(0,t.jsxs)(t.Fragment,{children:[t.jsx("div",{className:"flex-1 overflow-y-auto min-h-0",children:(0,t.jsxs)("div",{className:"grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.4fr)] gap-4",children:[t.jsx("div",{className:"space-y-6",children:(0,t.jsxs)(r.Zb,{className:"h-full",children:[t.jsx(r.Ol,{children:t.jsx(r.ll,{children:"Informaci\xf3n del Plan"})}),t.jsx(r.aY,{className:"space-y-3",children:(0,t.jsxs)("div",{className:"space-y-1",children:[(0,t.jsxs)("div",{className:"flex justify-between items-center py-0.5",children:[t.jsx("span",{className:"text-muted-foreground text-sm",children:"Cliente:"}),(0,t.jsxs)("span",{className:"font-medium text-right",children:[$.customers?.first_name," ",$.customers?.last_name]})]}),(0,t.jsxs)("div",{className:"flex justify-between items-center py-0.5 border-t",children:[t.jsx("span",{className:"text-muted-foreground text-sm",children:"Tel\xe9fono:"}),t.jsx("span",{className:"font-medium text-right",children:$.customers?.phone||"N/A"})]}),(0,t.jsxs)("div",{className:"flex justify-between items-center py-0.5 border-t",children:[t.jsx("span",{className:"text-muted-foreground text-sm",children:"Veh\xedculo:"}),(0,t.jsxs)("span",{className:"font-medium text-right",children:[$.model," (",$.year,")"]})]}),(0,t.jsxs)("div",{className:"flex justify-between items-center py-0.5 border-t",children:[t.jsx("span",{className:"text-muted-foreground text-sm",children:"Color:"}),t.jsx("span",{className:"font-medium text-right",children:$.color})]}),(0,t.jsxs)("div",{className:"flex justify-between items-center py-0.5 border-t",children:[t.jsx("span",{className:"text-muted-foreground text-sm",children:"Fecha Inicio:"}),t.jsx("span",{className:"font-medium text-right",children:el?.start_date?new Date(el.start_date).toLocaleDateString():"N/A"})]}),(0,t.jsxs)("div",{className:"flex justify-between items-center py-0.5 border-t",children:[t.jsx("span",{className:"text-muted-foreground text-sm",children:"Frecuencia:"}),t.jsx("span",{className:"font-medium text-right",children:el?.payment_frequency||"N/A"})]}),(0,t.jsxs)("div",{className:"flex justify-between items-center py-0.5 border-t",children:[t.jsx("span",{className:"text-muted-foreground text-sm",children:"Valor Cuota:"}),(0,t.jsxs)("span",{className:"font-medium text-right",children:["$",en.toLocaleString()]})]}),(0,t.jsxs)("div",{className:"flex justify-between items-center py-0.5 border-t",children:[t.jsx("span",{className:"text-muted-foreground text-sm",children:"Progreso:"}),(0,t.jsxs)("span",{className:"font-medium font-bold text-right",children:[er%1==0?er:er.toFixed(2)," / ",ei]})]})]})})]})}),t.jsx("div",{className:"space-y-6",children:(0,t.jsxs)(r.Zb,{className:q.overdueInstallments>0?"border-yellow-500":"border-green-500",children:[t.jsx(r.Ol,{className:"pb-3",children:t.jsx(r.ll,{children:"Estado de Cuenta"})}),(0,t.jsxs)(r.aY,{className:"space-y-3",children:[(0,t.jsxs)("div",{className:"text-center p-4 bg-secondary/10 rounded-lg",children:[t.jsx("p",{className:"text-sm text-muted-foreground",children:"Cuotas Pendientes"}),t.jsx("p",{className:`text-4xl font-bold ${q.overdueInstallments>0?"text-yellow-500":"text-green-500"}`,children:Math.floor(q.overdueInstallments)})]}),(0,t.jsxs)("div",{className:"flex justify-between text-sm",children:[t.jsx("span",{children:"Pr\xf3ximo Vencimiento:"}),t.jsx("span",{className:"font-bold",children:q.nextDueDate})]}),(0,t.jsxs)("div",{className:"space-y-4",children:[t.jsx("span",{className:"text-sm font-medium",children:"Selecci\xf3n de Pago"}),(0,t.jsxs)("div",{className:"flex gap-2 flex-wrap",children:[(0,t.jsxs)(i.z,{variant:!B&&1>Math.abs(L-en)?"default":"outline",className:"flex-1",onClick:()=>{J(),K(!1)},children:["1 Cuota (",(0,x.x)(en),")"]}),q.overdueInstallments>0&&(0,t.jsxs)(i.z,{variant:!B&&1>Math.abs(L-en*q.overdueInstallments)?"destructive":"outline",className:"flex-1",onClick:()=>{ee(),K(!1)},children:["Pendientes (",(0,x.x)(en*q.overdueInstallments),")"]}),(0,t.jsxs)(i.z,{variant:B?"secondary":"outline",className:"flex-1",onClick:()=>K(!0),children:[t.jsx(N,{className:"h-4 w-4 mr-1"}),"Personalizado"]})]}),B&&(0,t.jsxs)("div",{className:"space-y-2 animate-fade-in",children:[t.jsx("label",{className:"text-sm text-muted-foreground",children:"Monto personalizado:"}),t.jsx(o.I,{type:"text",value:(0,x.x)(L),onChange:e=>{R((0,x.z)(e.target.value))},placeholder:"Ingrese el monto",className:"text-lg font-bold"}),en>0&&(0,t.jsxs)("p",{className:"text-xs text-muted-foreground",children:["Equivale a ",t.jsx("span",{className:"font-semibold text-foreground",children:(L/en).toFixed(2)})," cuota",L/en!=1?"s":""]})]})]}),(0,t.jsxs)("div",{className:"p-4 bg-muted rounded-lg flex justify-between items-center",children:[t.jsx("span",{className:"font-semibold",children:"Monto a Pagar:"}),t.jsx("span",{className:"text-xl font-bold",children:(0,x.x)(L)})]}),t.jsx(i.z,{size:"lg",className:"w-full",onClick:es,disabled:L<=0,children:"Confirmar Pago"})]})]})}),(0,t.jsxs)("div",{className:"flex flex-col min-h-0",children:[t.jsx("h3",{className:"text-lg font-bold mb-2",children:"Historial de Pagos"}),t.jsx("div",{className:"border rounded-md overflow-auto max-h-[40vh] lg:max-h-[60vh]",children:(0,t.jsxs)(c.iA,{children:[t.jsx(c.xD,{className:"sticky top-0 bg-background/95 backdrop-blur z-10",children:(0,t.jsxs)(c.SC,{children:[t.jsx(c.ss,{className:"text-xs",children:"Fecha"}),t.jsx(c.ss,{className:"text-xs",children:"Monto"}),t.jsx(c.ss,{className:"text-xs",children:"Estado"}),t.jsx(c.ss,{className:"text-xs hidden sm:table-cell",children:"Nota"}),t.jsx(c.ss,{className:"w-[40px]"})]})}),(0,t.jsxs)(c.RM,{children:[E.map(e=>{let s=e.status||"APROBADO";return(0,t.jsxs)(c.SC,{children:[t.jsx(c.pj,{className:"text-xs sm:text-sm whitespace-nowrap",children:new Date(e.payment_date).toLocaleDateString()}),(0,t.jsxs)(c.pj,{className:"font-medium text-xs sm:text-sm",children:["$",e.amount?.toLocaleString()]}),(0,t.jsxs)(c.pj,{children:[(0,t.jsxs)("span",{className:`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${M.T[s]}`,children:["PENDIENTE"===s&&t.jsx(y.Z,{className:"h-3 w-3"}),"APROBADO"===s&&t.jsx(v.Z,{className:"h-3 w-3"}),"DENEGADO"===s&&t.jsx(w.Z,{className:"h-3 w-3"}),M.s[s]]}),e.created_by_name&&(0,t.jsxs)("span",{className:"text-xs text-muted-foreground block mt-0.5",children:["por ",e.created_by_name]})]}),t.jsx(c.pj,{className:"hidden sm:table-cell text-xs",children:e.note||"-"}),t.jsx(c.pj,{children:t.jsx(i.z,{variant:"ghost",size:"icon",title:"Imprimir Recibo",onClick:async()=>{let s={payment:e,customer:$.customers,vehicle:$,plan:$.installment_plans[0],businessConfig:U,logoUrl:C?.logo_url};if((0,k.t5)())try{await A(s),p.A.success("Recibo impreso")}catch(e){p.A.error("Error al imprimir: "+e.message),P(s)}else P(s)},children:t.jsx(_.Z,{className:"h-4 w-4"})})})]},e.id)}),0===E.length&&t.jsx(c.SC,{children:t.jsx(c.pj,{colSpan:5,className:"text-center text-muted-foreground text-sm",children:"No hay pagos registrados"})})]})]})})]})]})}),t.jsx(m.Vq,{open:T,onOpenChange:V,children:(0,t.jsxs)(m.cZ,{className:"sm:max-w-md",children:[t.jsx(m.fK,{children:t.jsx(m.$N,{children:"Confirmar Pago"})}),(0,t.jsxs)("div",{className:"space-y-4 py-4",children:[(0,t.jsxs)("div",{className:"flex justify-between font-bold text-lg",children:[t.jsx("span",{children:"Total a Pagar:"}),t.jsx("span",{children:(0,x.x)(L)})]}),en>0&&(0,t.jsxs)("div",{className:"text-sm text-muted-foreground text-right",children:["Equivale a ",t.jsx("span",{className:"font-semibold text-foreground",children:(L/en).toFixed(2)})," cuota",L/en!=1?"s":""," de ",(0,x.x)(en)]}),!I&&(0,t.jsxs)("div",{className:"p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700 flex items-center gap-2",children:[t.jsx(y.Z,{className:"h-4 w-4 shrink-0"}),"Este pago quedar\xe1 como ",t.jsx("strong",{children:"PENDIENTE"})," hasta que un administrador lo apruebe."]}),(0,t.jsxs)("div",{className:"space-y-2",children:[t.jsx("label",{className:"text-sm font-medium",children:"Nota (Opcional):"}),t.jsx("textarea",{className:"flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]",placeholder:"Ingrese una nota para este pago...",value:Z,onChange:e=>F(e.target.value)})]}),(0,t.jsxs)("div",{className:"flex justify-end gap-2 pt-4",children:[t.jsx(i.z,{variant:"outline",onClick:()=>V(!1),children:"Cancelar"}),t.jsx(i.z,{onClick:ea,children:"Aceptar Pago"})]})]})]})})]})]})})},$=()=>{let{business:e}=(0,D.a)(),[s,a]=(0,l.useState)([]),[d,c]=(0,l.useState)(null),[m,x]=(0,l.useState)("");(0,l.useEffect)(()=>{e?.id&&p()},[e?.id,d]);let p=async()=>{try{let s=await n.D.getActiveVehicles(e?.id);a(s||[])}catch(e){console.error(e)}},h=s.filter(e=>e.plate.toLowerCase().includes(m.toLowerCase())||(e.customers?.first_name+" "+e.customers?.last_name).toLowerCase().includes(m.toLowerCase()));return(0,t.jsxs)("div",{className:"space-y-4 md:space-y-6",children:[(0,t.jsxs)("div",{className:"flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3",children:[t.jsx("h2",{className:"text-2xl md:text-3xl font-bold tracking-tight",children:"Veh\xedculos Entregados"}),t.jsx("div",{className:"w-full sm:w-auto sm:max-w-sm",children:t.jsx(o.I,{placeholder:"Buscar por placa o cliente...",value:m,onChange:e=>x(e.target.value)})})]}),t.jsx("div",{className:"grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",children:h.map(e=>{let s=Array.isArray(e.installment_plans)?e.installment_plans:e.installment_plans?[e.installment_plans]:[],a=(s=s.sort((e,s)=>(s.id||0)-(e.id||0))).length>0?s[0]:{},l=e.customers,n=Number(a.total_installments)||0,o=Number(a.installments_paid)||0,d=u(a);d.overdueInstallments;let m=n>0?o/n*100:0;return(0,t.jsxs)(r.Zb,{className:"overflow-hidden flex flex-col",children:[t.jsx(r.Ol,{className:"bg-muted/50 pb-4",children:(0,t.jsxs)("div",{className:"flex justify-between items-center",children:[t.jsx("span",{className:"bg-yellow-400 text-black px-2 py-1 rounded font-bold border-2 border-black text-sm",children:e.plate}),(0,t.jsxs)("span",{className:"font-medium text-sm text-muted-foreground",children:[e.model," (",e.year,")"]})]})}),t.jsx(r.aY,{className:"pt-6 flex-1",children:(0,t.jsxs)("div",{className:"space-y-4",children:[(0,t.jsxs)("div",{className:"flex justify-between items-start",children:[(0,t.jsxs)("div",{className:"text-sm",children:[t.jsx("p",{className:"text-muted-foreground",children:"Cliente"}),(0,t.jsxs)("p",{className:"font-medium text-lg",children:[l?.first_name," ",l?.last_name]}),(0,t.jsxs)("p",{className:"text-xs text-muted-foreground",children:["Color: ",e.color]})]}),(()=>{let e=Math.floor(d.overdueInstallments),s="Al D\xeda",a="text-gray-500";return e>0&&(s=`${e} Pendientes`,a=e<=3?"text-yellow-600":"text-red-600"),(0,t.jsxs)("div",{className:"text-sm text-right",children:[t.jsx("p",{className:"text-muted-foreground",children:"Estado"}),t.jsx("p",{className:`font-medium text-lg ${a}`,children:s})]})})()]}),(0,t.jsxs)("div",{className:"space-y-2",children:[(0,t.jsxs)("div",{className:"flex justify-between text-sm",children:[t.jsx("span",{className:"text-muted-foreground",children:"Progreso de Pago"}),(0,t.jsxs)("span",{className:"font-medium",children:[o%1==0?o:o.toFixed(2)," / ",n]})]}),t.jsx("div",{className:"h-2 w-full bg-secondary rounded-full overflow-hidden",children:t.jsx("div",{className:"h-full bg-green-500",style:{width:`${m}%`}})})]})]})}),t.jsx(r.eW,{className:"bg-muted/10 pt-4",children:t.jsx(i.z,{className:"w-full",variant:"outline",onClick:()=>c(e.id),children:"Gestionar Pagos"})})]},e.id)})}),d&&t.jsx(I,{vehicleId:d,isOpen:!0,onClose:()=>c(null)})]})};var z=a(32);function E(){return t.jsx(z.MainLayout,{children:t.jsx($,{})})}},4118:(e,s,a)=>{"use strict";a.d(s,{$N:()=>u,Vq:()=>o,cZ:()=>m,fK:()=>x});var t=a(326),l=a(7577),n=a(8459),r=a(4019),i=a(1223);let o=n.fC;n.xz;let d=n.h_;n.x8;let c=l.forwardRef(({className:e,...s},a)=>t.jsx(n.aV,{ref:a,className:(0,i.cn)("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",e),...s}));c.displayName=n.aV.displayName;let m=l.forwardRef(({className:e,children:s,...a},l)=>(0,t.jsxs)(d,{children:[t.jsx(c,{}),(0,t.jsxs)(n.VY,{ref:l,"aria-describedby":void 0,className:(0,i.cn)("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",e),...a,children:[s,(0,t.jsxs)(n.x8,{className:"absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",children:[t.jsx(r.Z,{className:"h-4 w-4"}),t.jsx("span",{className:"sr-only",children:"Close"})]})]})]}));m.displayName=n.VY.displayName;let x=({className:e,...s})=>t.jsx("div",{className:(0,i.cn)("flex flex-col space-y-1.5 text-center sm:text-left",e),...s});x.displayName="DialogHeader";let u=l.forwardRef(({className:e,...s},a)=>t.jsx(n.Dx,{ref:a,className:(0,i.cn)("text-lg font-semibold leading-none tracking-tight",e),...s}));u.displayName=n.Dx.displayName,l.forwardRef(({className:e,...s},a)=>t.jsx(n.dk,{ref:a,className:(0,i.cn)("text-sm text-muted-foreground",e),...s})).displayName=n.dk.displayName},1190:(e,s,a)=>{"use strict";a.d(s,{I:()=>r});var t=a(326),l=a(7577),n=a(1223);let r=l.forwardRef(({className:e,type:s,...a},l)=>t.jsx("input",{type:s,className:(0,n.cn)("flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",e),ref:l,...a}));r.displayName="Input"},3819:(e,s,a)=>{"use strict";a.d(s,{RM:()=>o,SC:()=>d,iA:()=>r,pj:()=>m,ss:()=>c,xD:()=>i});var t=a(326),l=a(7577),n=a(1223);let r=l.forwardRef(({className:e,...s},a)=>t.jsx("div",{className:"relative w-full overflow-auto",children:t.jsx("table",{ref:a,className:(0,n.cn)("w-full caption-bottom text-sm",e),...s})}));r.displayName="Table";let i=l.forwardRef(({className:e,...s},a)=>t.jsx("thead",{ref:a,className:(0,n.cn)("[&_tr]:border-b",e),...s}));i.displayName="TableHeader";let o=l.forwardRef(({className:e,...s},a)=>t.jsx("tbody",{ref:a,className:(0,n.cn)("[&_tr:last-child]:border-0",e),...s}));o.displayName="TableBody",l.forwardRef(({className:e,...s},a)=>t.jsx("tfoot",{ref:a,className:(0,n.cn)("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",e),...s})).displayName="TableFooter";let d=l.forwardRef(({className:e,...s},a)=>t.jsx("tr",{ref:a,className:(0,n.cn)("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",e),...s}));d.displayName="TableRow";let c=l.forwardRef(({className:e,...s},a)=>t.jsx("th",{ref:a,className:(0,n.cn)("h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",e),...s}));c.displayName="TableHead";let m=l.forwardRef(({className:e,...s},a)=>t.jsx("td",{ref:a,className:(0,n.cn)("p-4 align-middle [&:has([role=checkbox])]:pr-0",e),...s}));m.displayName="TableCell",l.forwardRef(({className:e,...s},a)=>t.jsx("caption",{ref:a,className:(0,n.cn)("mt-4 text-sm text-muted-foreground",e),...s})).displayName="TableCaption"},8256:(e,s,a)=>{"use strict";a.r(s),a.d(s,{$$typeof:()=>r,__esModule:()=>n,default:()=>i});var t=a(8570);let l=(0,t.createProxy)(String.raw`C:\Users\ALAMFLP\Documents\vehicle-installment-manager\src\app\dashboard\page.tsx`),{__esModule:n,$$typeof:r}=l;l.default;let i=(0,t.createProxy)(String.raw`C:\Users\ALAMFLP\Documents\vehicle-installment-manager\src\app\dashboard\page.tsx#default`)}};var s=require("../../webpack-runtime.js");s.C(e);var a=e=>s(s.s=e),t=s.X(0,[948,261,270,113,961,459,448,32,50],()=>a(1367));module.exports=t})();