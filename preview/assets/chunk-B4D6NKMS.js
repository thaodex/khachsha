import{a as m}from"./chunk-BZZJXV2F.js";import{d as i}from"./chunk-OMMZC6EX.js";import{e as $}from"./chunk-EMRWSO5Y.js";$();function u(n,o=900){return new Promise(t=>setTimeout(()=>t(n),o))}var l={name:"MockProvider (offline)",async suggestRooms(n){let{availableRooms:o,budgetPerNight:t,guests:r,nights:c,preferences:h}=n,g=o.filter(e=>e.type.capacity>=r).filter(e=>t?e.type.basePrice<=t*1.1:!0).sort((e,a)=>{let y=p=>(t?Math.abs(p.type.basePrice-t):p.type.basePrice)+(p.type.capacity-r)*5e4;return y(e)-y(a)});if(g.length===0)return u({intro:"R\u1EA5t ti\u1EBFc, hi\u1EC7n kh\xF4ng c\xF3 ph\xF2ng tr\u1ED1ng n\xE0o kh\u1EDBp y\xEAu c\u1EA7u c\u1EE7a b\u1EA1n.",suggestions:[],fallback:"G\u1EE3i \xFD: n\u1EDBi ng\xE2n s\xE1ch, gi\u1EA3m s\u1ED1 kh\xE1ch, ho\u1EB7c ch\u1ECDn ng\xE0y kh\xE1c \u0111\u1EC3 c\xF3 th\xEAm l\u1EF1a ch\u1ECDn ph\xF2ng."});let s=g.slice(0,3);return u({intro:`D\u1EF1a tr\xEAn ${r} kh\xE1ch, ${c} \u0111\xEAm${t?` v\xE0 ng\xE2n s\xE1ch ~${i(t)}/\u0111\xEAm`:""}, \u0111\xE2y l\xE0 c\xE1c ph\xF2ng tr\u1ED1ng ph\xF9 h\u1EE3p nh\u1EA5t:`,suggestions:s.map(e=>({roomId:e.room.id,reason:`Ph\xF2ng ${e.room.number} (${e.type.name}) \u2014 ${i(e.type.basePrice)}/\u0111\xEAm, s\u1EE9c ch\u1EE9a ${e.type.capacity} kh\xE1ch. T\u1ED5ng ~${i(e.type.basePrice*c)} cho ${c} \u0111\xEAm.${h&&e.type.amenities.some(a=>h.toLowerCase().includes(a.toLowerCase()))?" C\xF3 ti\u1EC7n \xEDch b\u1EA1n quan t\xE2m.":""}`}))})},async draftEmail(n){let{kind:o,customerName:t,hotelName:r,bookingCode:c,roomLabel:h,checkIn:g,checkOut:s,amountDue:e}=n,a="";return o==="confirmation"?a=`K\xEDnh g\u1EEDi Qu\xFD kh\xE1ch ${t},

C\u1EA3m \u01A1n Qu\xFD kh\xE1ch \u0111\xE3 \u0111\u1EB7t ph\xF2ng t\u1EA1i ${r}. Ch\xFAng t\xF4i xin x\xE1c nh\u1EADn th\xF4ng tin \u0111\u1EB7t ph\xF2ng:

\u2022 M\xE3 \u0111\u1EB7t ph\xF2ng: ${c}
\u2022 Ph\xF2ng: ${h}
\u2022 Nh\u1EADn ph\xF2ng: ${g}
\u2022 Tr\u1EA3 ph\xF2ng: ${s}

Gi\u1EDD nh\u1EADn ph\xF2ng t\u1EEB 14:00, tr\u1EA3 ph\xF2ng tr\u01B0\u1EDBc 12:00. N\u1EBFu c\u1EA7n h\u1ED7 tr\u1EE3 th\xEAm, vui l\xF2ng ph\u1EA3n h\u1ED3i email n\xE0y.

Tr\xE2n tr\u1ECDng,
${r}`:o==="cancellation"?a=`K\xEDnh g\u1EEDi Qu\xFD kh\xE1ch ${t},

Ch\xFAng t\xF4i x\xE1c nh\u1EADn \u0111\xE3 H\u1EE6Y \u0111\u1EB7t ph\xF2ng ${c} (Ph\xF2ng ${h}, ${g} \u2192 ${s}) theo y\xEAu c\u1EA7u c\u1EE7a Qu\xFD kh\xE1ch.

N\u1EBFu c\xF3 kho\u1EA3n ho\xE0n ti\u1EC1n, b\u1ED9 ph\u1EADn k\u1EBF to\xE1n s\u1EBD x\u1EED l\xFD trong 3\u20135 ng\xE0y l\xE0m vi\u1EC7c. R\u1EA5t mong \u0111\u01B0\u1EE3c \u0111\xF3n ti\u1EBFp Qu\xFD kh\xE1ch trong d\u1ECBp kh\xE1c.

Tr\xE2n tr\u1ECDng,
${r}`:a=`K\xEDnh g\u1EEDi Qu\xFD kh\xE1ch ${t},

Ch\xFAng t\xF4i xin nh\u1EAFc v\u1EC1 kho\u1EA3n thanh to\xE1n c\xF2n l\u1EA1i cho \u0111\u1EB7t ph\xF2ng ${c} (Ph\xF2ng ${h}, ${g} \u2192 ${s}).

\u2022 S\u1ED1 ti\u1EC1n c\u1EA7n thanh to\xE1n: ${e?i(e):"(c\u1EADp nh\u1EADt)"}

Qu\xFD kh\xE1ch vui l\xF2ng ho\xE0n t\u1EA5t thanh to\xE1n khi tr\u1EA3 ph\xF2ng ho\u1EB7c qua chuy\u1EC3n kho\u1EA3n. Xin c\u1EA3m \u01A1n!

Tr\xE2n tr\u1ECDng,
${r}`,u(a)},async occupancyInsight(n){let o=Math.round(n.occupancyRate*100),t=n.trend==="up"?"\u0111ang t\u0103ng":n.trend==="down"?"\u0111ang gi\u1EA3m":"\u1ED5n \u0111\u1ECBnh",r=`C\xF4ng su\u1EA5t ph\xF2ng hi\u1EC7n ~${o}% (${n.totalRooms-n.availableRooms}/${n.totalRooms} ph\xF2ng), xu h\u01B0\u1EDBng ${t}. Doanh thu h\xF4m nay ${i(n.revenueToday)}.`,c="";return o<50?c="G\u1EE3i \xFD khuy\u1EBFn m\xE3i: gi\u1EA3m 15\u201320% cho kh\xE1ch \u0111\u1EB7t t\u1ED1i thi\u1EC3u 2 \u0111\xEAm, ho\u1EB7c combo '\u1EDF 3 t\xEDnh ti\u1EC1n 2' \u0111\u1EC3 l\u1EA5p ph\xF2ng tr\u1ED1ng gi\u1EEFa tu\u1EA7n.":o<80?c="G\u1EE3i \xFD: b\xE1n th\xEAm d\u1ECBch v\u1EE5 (b\u1EEFa s\xE1ng, \u0111\u01B0a \u0111\xF3n), \u01B0u \u0111\xE3i n\xE2ng h\u1EA1ng ph\xF2ng c\xF3 thu ph\xED \u0111\u1EC3 t\u0103ng doanh thu trung b\xECnh/kh\xE1ch.":c="C\xF4ng su\u1EA5t cao \u2014 n\xEAn t\u1ED1i \u01B0u gi\xE1 theo m\xF9a (dynamic pricing) v\xE0 gi\u1EEF v\xE0i ph\xF2ng cho kh\xE1ch trung th\xE0nh/\u0111\u1EB7t ph\xFAt ch\xF3t gi\xE1 cao.",u(`${r}

${c}`,700)}},d={name:"Google Gemini (Tr\u1EF1c tuy\u1EBFn)",async suggestRooms(n){try{let o=n.availableRooms.map(h=>`- ID: ${h.room.id}, Ph\xF2ng ${h.room.number} (${h.type.name}), Gi\xE1: ${i(h.type.basePrice)}/\u0111\xEAm, S\u1EE9c ch\u1EE9a: ${h.type.capacity} kh\xE1ch, Ti\u1EC7n nghi: ${h.type.amenities.join(", ")}`).join(`
`),t=`Kh\xE1ch h\xE0ng y\xEAu c\u1EA7u t\xECm ph\xF2ng:
- S\u1ED1 kh\xE1ch: ${n.guests}
- S\u1ED1 \u0111\xEAm: ${n.nights}
${n.budgetPerNight?`- Ng\xE2n s\xE1ch: ~${i(n.budgetPerNight)}/\u0111\xEAm`:""}
${n.preferences?`- S\u1EDF th\xEDch/Y\xEAu c\u1EA7u: ${n.preferences}`:""}

Danh s\xE1ch ph\xF2ng tr\u1ED1ng th\u1EF1c t\u1EBF hi\u1EC7n c\xF3:
${o||"Kh\xF4ng c\xF3 ph\xF2ng tr\u1ED1ng"}

H\xE3y ph\xE2n t\xEDch v\xE0 tr\u1EA3 v\u1EC1 \u0111\u1ECBnh d\u1EA1ng JSON duy nh\u1EA5t v\u1EDBi c\u1EA5u tr\xFAc:
{
  "intro": "C\xE2u m\u1EDF \u0111\u1EA7u ng\u1EAFn g\u1ECDn l\u1ECBch s\u1EF1",
  "suggestions": [
    { "roomId": "id_phong_chinh_xac_trong_danh_sach", "reason": "L\xFD do v\xEC sao ph\xF2ng n\xE0y ph\xF9 h\u1EE3p nh\u1EA5t" }
  ],
  "fallback": "G\u1EE3i \xFD th\xEAm n\u1EBFu kh\xF4ng c\xF3 ph\xF2ng kh\u1EDBp"
}`,c=(await m(t)).match(/\{[\s\S]*\}/);if(c){let h=JSON.parse(c[0]);if(h&&Array.isArray(h.suggestions))return h}}catch{}return l.suggestRooms(n)},async draftEmail(n){try{let o=`So\u1EA1n m\u1ED9t email kh\xE1ch s\u1EA1n chuy\xEAn nghi\u1EC7p, \u1EA5m \xE1p v\xE0 trang tr\u1ECDng:
- Lo\u1EA1i email: ${n.kind==="confirmation"?"X\xE1c nh\u1EADn \u0111\u1EB7t ph\xF2ng":n.kind==="cancellation"?"X\xE1c nh\u1EADn h\u1EE7y ph\xF2ng":"Nh\u1EAFc nh\u1EDF thanh to\xE1n"}
- T\xEAn kh\xE1ch h\xE0ng: ${n.customerName}
- T\xEAn kh\xE1ch s\u1EA1n: ${n.hotelName}
- M\xE3 \u0111\u1EB7t ph\xF2ng: ${n.bookingCode}
- Ph\xF2ng: ${n.roomLabel}
- Nh\u1EADn ph\xF2ng: ${n.checkIn} (t\u1EEB 14:00)
- Tr\u1EA3 ph\xF2ng: ${n.checkOut} (tr\u01B0\u1EDBc 12:00)
${n.amountDue?`- S\u1ED1 ti\u1EC1n c\xF2n l\u1EA1i c\u1EA7n thanh to\xE1n: ${i(n.amountDue)}`:""}

Ch\u1EC9 tr\u1EA3 v\u1EC1 n\u1ED9i dung ho\xE0n ch\u1EC9nh c\u1EE7a b\u1EE9c th\u01B0 b\u1EB1ng ti\u1EBFng Vi\u1EC7t chu\u1EA9n m\u1EF1c, kh\xF4ng k\xE8m l\u1EDDi b\xECnh gi\u1EA3i th\xEDch.`,t=await m(o);if(t&&t.trim().length>30)return t.trim()}catch{}return l.draftEmail(n)},async occupancyInsight(n){try{let o=`Ph\xE2n t\xEDch t\xECnh h\xECnh kinh doanh v\xE0 \u0111\u01B0a ra chi\u1EBFn l\u01B0\u1EE3c t\u1ED1i \u01B0u doanh thu cho kh\xE1ch s\u1EA1n:
- C\xF4ng su\u1EA5t ph\xF2ng hi\u1EC7n t\u1EA1i: ${Math.round(n.occupancyRate*100)}%
- Doanh thu h\xF4m nay: ${i(n.revenueToday)}
- Ph\xF2ng tr\u1ED1ng: ${n.availableRooms}/${n.totalRooms}
- Xu h\u01B0\u1EDBng: ${n.trend==="up"?"T\u0103ng":n.trend==="down"?"Gi\u1EA3m":"\u1ED4n \u0111\u1ECBnh"}

\u0110\u01B0a ra nh\u1EADn x\xE9t s\xFAc t\xEDch v\xE0 2-3 g\u1EE3i \xFD h\xE0nh \u0111\u1ED9ng chi\u1EBFn l\u01B0\u1EE3c c\u1EE5 th\u1EC3 (khuy\u1EBFn m\xE3i, upsell ho\u1EB7c \u0111i\u1EC1u ch\u1EC9nh gi\xE1) \u0111\u1EC3 \u0111\u1EA1t doanh thu t\u1ED1i \u0111a.`,t=await m(o);if(t&&t.trim().length>30)return t.trim()}catch{}return l.occupancyInsight(n)}},v=d;export{v as a};
