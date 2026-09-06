import{e as l,f as m}from"./chunk-EMRWSO5Y.js";l();var p="AQ.Ab8RN6J4tJsxY6eW4p90JyulXc0Ftv1I2sD4TtihnxxnJfMIjQ",y="smh.gemini.api_key";function f(){try{let i=localStorage.getItem(y);if(i&&i.trim())return i.trim()}catch{}let h=m?.VITE_GEMINI_API_KEY;return h&&typeof h=="string"&&h.trim()?h.trim():p}function k(h,i){let t=h.trim(),n=t.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d").toLowerCase(),e=i?.hotelName||"Sao Mai Hotel & Residences";return n.includes("gia")||n.includes("phong nao")||n.includes("loai phong")||n.includes("hang phong")||n.includes("bao gia")||n.includes("co nhung phong")||n.includes("phong trong")||n.includes("dat phong")?`\u2728 **B\u1EA3ng gi\xE1 v\xE0 c\xE1c h\u1EA1ng ph\xF2ng t\u1EA1i ${e}:**

${i?.roomTypesSummary?i.roomTypesSummary.split(";").map(c=>`\u2022 **${c.trim()}**`).join(`
`):`\u2022 **Deluxe H\u01B0\u1EDBng Bi\u1EC3n**: 1.200.000 \u0111/\u0111\xEAm (2 kh\xE1ch, 35m\xB2, ban c\xF4ng ng\u1EAFm bi\u1EC3n)
\u2022 **Suite Ho\xE0ng Gia**: 2.500.000 \u0111/\u0111\xEAm (2 kh\xE1ch, 65m\xB2, b\u1ED3n s\u1EE5c Jacuzzi)
\u2022 **Family Panorama**: 3.500.000 \u0111/\u0111\xEAm (4-6 kh\xE1ch, 90m\xB2, view 360 \u0111\u1ED9)`}

${i?.todayStats?`\u{1F4A1} *${i.todayStats}*`:""}

Qu\xFD kh\xE1ch mu\u1ED1n \u0111\u1EB7t h\u1EA1ng ph\xF2ng n\xE0o ho\u1EB7c c\u1EA7n t\u01B0 v\u1EA5n th\xEAm v\u1EC1 ng\xE0y l\u01B0u tr\xFA kh\xF4ng \u1EA1?`:n.includes("chao")||n.includes("hello")||n.includes("hi")||n.includes("alo")||n.includes("ban la ai")||n.includes("gioi thieu")?`K\xEDnh ch\xE0o Qu\xFD kh\xE1ch! \u{1F44B} Em l\xE0 **Sao Mai AI Concierge** \u2014 Tr\u1EE3 l\xFD \u1EA3o 5 sao c\u1EE7a ${e}.

Em s\u1EB5n s\xE0ng h\u1ED7 tr\u1EE3 Qu\xFD kh\xE1ch tra c\u1EE9u gi\xE1 ph\xF2ng, t\u01B0 v\u1EA5n d\u1ECBch v\u1EE5, g\u1EE3i \xFD l\u1ECBch tr\xECnh du l\u1ECBch ho\u1EB7c gi\u1EA3i \u0111\xE1p b\u1EA5t k\u1EF3 th\u1EAFc m\u1EAFc n\xE0o 24/7 \u1EA1!`:n.includes("gio nhan")||n.includes("gio tra")||n.includes("check in")||n.includes("check out")||n.includes("may gio")?`\u23F0 **Quy \u0111\u1ECBnh gi\u1EDD gi\u1EA5c t\u1EA1i ${e}:**

\u2022 **Gi\u1EDD nh\u1EADn ph\xF2ng (Check-in):** t\u1EEB **14:00**
\u2022 **Gi\u1EDD tr\u1EA3 ph\xF2ng (Check-out):** tr\u01B0\u1EDBc **12:00** tr\u01B0a

*(Qu\xFD kh\xE1ch c\xF3 nhu c\u1EA7u nh\u1EADn s\u1EDBm ho\u1EB7c tr\u1EA3 mu\u1ED9n vui l\xF2ng th\xF4ng b\xE1o tr\u01B0\u1EDBc \u0111\u1EC3 l\u1EC5 t\xE2n s\u1EAFp x\u1EBFp theo t\xECnh tr\u1EA1ng ph\xF2ng)*.`:n.includes("an sang")||n.includes("buffet")||n.includes("nha hang")||n.includes("thuc don")?`\u{1F373} **\u1EA8m th\u1EF1c & Buffet s\xE1ng 5 sao:**

Kh\xE1ch s\u1EA1n ph\u1EE5c v\u1EE5 **Buffet s\xE1ng chu\u1EA9n 5 sao mi\u1EC5n ph\xED** t\u1EEB **6:30 \u2013 10:00** h\xE0ng ng\xE0y t\u1EA1i nh\xE0 h\xE0ng t\u1EA7ng th\u01B0\u1EE3ng h\u01B0\u1EDBng bi\u1EC3n, v\u1EDBi th\u1EF1c \u0111\u01A1n \xC1 - \xC2u phong ph\xFA v\xE0 qu\u1EA7y c\xE0 ph\xEA pha m\xE1y h\u1EA3o h\u1EA1ng.`:n.includes("huy phong")||n.includes("hoan tien")||n.includes("chinh sach")||n.includes("dieu khoan")?`\u{1F4DC} **Ch\xEDnh s\xE1ch h\u1EE7y & ho\xE0n c\u1ECDc t\u1EA1i ${e}:**

\u2022 H\u1EE7y tr\u01B0\u1EDBc 7 ng\xE0y: **Ho\xE0n 100% ti\u1EC1n c\u1ECDc**
\u2022 H\u1EE7y tr\u01B0\u1EDBc 3\u20137 ng\xE0y: **Ho\xE0n 50% ti\u1EC1n c\u1ECDc**
\u2022 H\u1EE7y d\u01B0\u1EDBi 3 ng\xE0y: Kh\xF4ng ho\xE0n c\u1ECDc`:n.includes("lich trinh")||n.includes("di dau")||n.includes("dia diem")||n.includes("choi gi")||n.includes("an gi")?`\u{1F334} **G\u1EE3i \xFD l\u1ECBch tr\xECnh du l\u1ECBch h\u1EA5p d\u1EABn:**

1. **S\xE1ng:** Th\u01B0\u1EDFng th\u1EE9c buffet ng\u1EAFm b\xECnh minh bi\u1EC3n, check-in cung \u0111\u01B0\u1EDDng bi\u1EC3n v\xE0 ng\u1ECDn h\u1EA3i \u0111\u0103ng.
2. **Chi\u1EC1u:** T\u1EAFm bi\u1EC3n, ch\xE8o SUP ho\u1EB7c th\u01B0 gi\xE3n t\u1EA1i Spa c\u1EE7a kh\xE1ch s\u1EA1n.
3. **T\u1ED1i:** Th\u01B0\u1EDFng th\u1EE9c h\u1EA3i s\u1EA3n t\u01B0\u01A1i s\u1ED1ng v\xE0 ng\u1EAFm to\xE0n c\u1EA3nh th\xE0nh ph\u1ED1 t\u1EEB Sky Bar t\u1EA7ng th\u01B0\u1EE3ng.`:n.includes("tho")||n.includes("viet tho")?`\u{1F30A} *G\u1EEDi t\u1EB7ng Qu\xFD kh\xE1ch v\u1EA7n th\u01A1 bi\u1EC3n v\u1ED7:*

*"Bi\u1EC3n bi\u1EBFc nghi\xEAng m\xECnh \u0111\xF3n s\u1EDBm mai,
\xC1nh d\u01B0\u01A1ng tr\u1EA3i m\u1EA1 d\u1EA3i mi\u1EC7t m\xE0i.
Gi\xF3 l\u1ED9ng t\u1EA7ng m\xE2y ru gi\u1EA5c m\u1ED9ng,
Sao Mai t\u1ECFa s\xE1ng n\xE9t trang \u0111\xE0i."* \u2728`:n.includes("dich vu")||n.includes("dua don")||n.includes("san bay")||n.includes("giu xe")||n.includes("do xe")||n.includes("tre em")||n.includes("thu cung")||n.includes("giat ui")||n.includes("ho boi")||n.includes("gym")||n.includes("spa")?`\u{1F6CE}\uFE0F **D\u1ECBch v\u1EE5 t\u1EA1i ${e}:**

${i?.servicesSummary?i.servicesSummary.split(";").map(c=>`\u2022 ${c.trim()}`).join(`
`):`\u2022 \u0110\u01B0a \u0111\xF3n s\xE2n bay theo y\xEAu c\u1EA7u
\u2022 H\u1ED3 b\u01A1i, Gym, Spa mi\u1EC5n ph\xED cho kh\xE1ch l\u01B0u tr\xFA
\u2022 Gi\u1EEF xe, gi\u1EB7t \u1EE7i t\xEDnh theo y\xEAu c\u1EA7u`}

Qu\xFD kh\xE1ch c\u1EA7n \u0111\u1EB7t tr\u01B0\u1EDBc d\u1ECBch v\u1EE5 n\xE0o \u0111\u1EC3 em s\u1EAFp x\u1EBFp kh\xF4ng \u1EA1?`:n.includes("khuyen mai")||n.includes("uu dai")||n.includes("giam gia")||n.includes("voucher")?`\u{1F381} **\u01AFu \u0111\xE3i hi\u1EC7n c\xF3 t\u1EA1i ${e}:**

Qu\xFD kh\xE1ch \u0111\u1EB7t tr\u1EF1c ti\u1EBFp qua Concierge s\u1EBD \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3 b\xE1o gi\xE1 t\u1ED1t nh\u1EA5t theo ng\xE0y l\u01B0u tr\xFA th\u1EF1c t\u1EBF. Qu\xFD kh\xE1ch cho em bi\u1EBFt ng\xE0y nh\u1EADn ph\xF2ng v\xE0 s\u1ED1 \u0111\xEAm d\u1EF1 ki\u1EBFn \u0111\u1EC3 em ki\u1EC3m tra \u01B0u \u0111\xE3i ph\xF9 h\u1EE3p nh\xE9.`:`D\u1EA1, v\u1EC1 c\xE2u h\u1ECFi c\u1EE7a Qu\xFD kh\xE1ch: **"${t}"** \u2014 hi\u1EC7n em ch\u01B0a c\xF3 \u0111\u1EE7 d\u1EEF li\u1EC7u \u0111\u1EC3 tr\u1EA3 l\u1EDDi th\u1EADt ch\xEDnh x\xE1c ph\u1EA7n n\xE0y qua k\xEAnh d\u1EF1 ph\xF2ng offline.

Qu\xFD kh\xE1ch vui l\xF2ng h\u1ECFi l\u1EA1i c\u1EE5 th\u1EC3 h\u01A1n (VD: gi\xE1 ph\xF2ng, gi\u1EDD nh\u1EADn/tr\u1EA3 ph\xF2ng, d\u1ECBch v\u1EE5, ch\xEDnh s\xE1ch h\u1EE7y) ho\u1EB7c th\u1EED g\u1EEDi l\u1EA1i c\xE2u h\u1ECFi \u2014 em s\u1EBD k\u1EBFt n\u1ED1i AI \u0111\u1EC3 tr\u1EA3 l\u1EDDi chi ti\u1EBFt h\u01A1n \u1EA1.`}async function v(h,i=[],t){let n=f(),e=`B\u1EA1n l\xE0 Sao Mai AI Concierge & Tr\u1EE3 l\xFD th\xF4ng minh cao c\u1EA5p c\u1EE7a Kh\xE1ch s\u1EA1n Sao Mai (${t?.hotelName||"Sao Mai Hotel & Residences"}).

NGUY\xCAN T\u1EAEC PH\u1EA2N H\u1ED2I:
1. NG\u1EAEN G\u1ECCN, \u0110\u1EE6 \xDD \u2014 QUAN TR\u1ECCNG NH\u1EA4T:
   - T\u1ED1i \u0111a 4-5 c\xE2u ho\u1EB7c 4-5 g\u1EA1ch \u0111\u1EA7u d\xF2ng ng\u1EAFn cho M\u1ED6I c\xE2u tr\u1EA3 l\u1EDDi. Kh\xF4ng vi\u1EBFt \u0111o\u1EA1n v\u0103n d\xE0i.
   - M\u1ED7i \xFD ch\u1EC9 1 c\xE2u ng\u1EAFn. B\u1ECF h\u1EBFt ph\u1EA7n r\xE0o \u0111\xF3n, l\u1EB7p l\u1EA1i c\xE2u h\u1ECFi, hay gi\u1EA3i th\xEDch th\u1EEBa.
   - N\u1EBFu ch\u1EE7 \u0111\u1EC1 th\u1EF1c s\u1EF1 c\u1EA7n nhi\u1EC1u th\xF4ng tin (VD: li\u1EC7t k\xEA nhi\u1EC1u h\u1EA1ng ph\xF2ng), \u01B0u ti\xEAn g\u1EA1ch \u0111\u1EA7u d\xF2ng thay v\xEC v\u0103n xu\xF4i, m\u1ED7i d\xF2ng d\u01B0\u1EDBi 15 t\u1EEB.
   - Kh\xF4ng d\xF9ng emoji qu\xE1 1-2 l\u1EA7n trong 1 c\xE2u tr\u1EA3 l\u1EDDi.

2. TR\u1EA2 L\u1EDCI \u0110\xDANG TR\u1ECCNG T\xC2M C\xC2U H\u1ECEI:
   - Khi ng\u01B0\u1EDDi d\xF9ng h\u1ECFi v\u1EC1 GI\xC1 PH\xD2NG, C\xC1C LO\u1EA0I PH\xD2NG, T\xCCNH TR\u1EA0NG PH\xD2NG TR\u1ED0NG: li\u1EC7t k\xEA ng\u1EAFn g\u1ECDn t\u1EEBng h\u1EA1ng ph\xF2ng k\xE8m gi\xE1/\u0111\xEAm, kh\xF4ng m\xF4 t\u1EA3 d\xE0i d\xF2ng.
   - Khi ng\u01B0\u1EDDi d\xF9ng h\u1ECFi v\u1EC1 d\u1ECBch v\u1EE5, gi\u1EDD gi\u1EA5c, ch\xEDnh s\xE1ch: tr\u1EA3 l\u1EDDi tr\u1EF1c ti\u1EBFp, ch\xEDnh x\xE1c, ng\u1EAFn g\u1ECDn.
   - Khi ng\u01B0\u1EDDi d\xF9ng h\u1ECFi v\u1EC1 du l\u1ECBch, \u0103n u\u1ED1ng, \u0111\u1EDDi s\u1ED1ng, th\u01A1 ca, ki\u1EBFn th\u1EE9c: tr\u1EA3 l\u1EDDi th\xF4ng minh nh\u01B0ng v\u1EABn c\xF4 \u0111\u1ECDng.

3. TH\xD4NG TIN TH\u1EF0C T\u1EBE C\u1EE6A KH\xC1CH S\u1EA0N:
   - T\xEAn kh\xE1ch s\u1EA1n: ${t?.hotelName||"Sao Mai Hotel & Residences (5 sao)"}
   - Gi\u1EDD nh\u1EADn ph\xF2ng: 14:00 | Gi\u1EDD tr\u1EA3 ph\xF2ng: 12:00
   ${t?.roomTypesSummary?`- Danh s\xE1ch h\u1EA1ng ph\xF2ng & B\xE1o gi\xE1: ${t.roomTypesSummary}`:""}
   ${t?.servicesSummary?`- D\u1ECBch v\u1EE5 k\xE8m theo: ${t.servicesSummary}`:""}
   ${t?.todayStats?`- T\xECnh tr\u1EA1ng ph\xF2ng h\xF4m nay: ${t.todayStats}`:""}

4. PHONG C\xC1CH:
   - L\u1ECBch thi\u1EC7p, \xE2n c\u1EA7n, \u0111\u1ECBnh d\u1EA1ng Markdown g\u1ECDn g\xE0ng (in \u0111\u1EADm t\xEAn ph\xF2ng v\xE0 gi\xE1 ti\u1EC1n, g\u1EA1ch \u0111\u1EA7u d\xF2ng khi li\u1EC7t k\xEA).`,c=["gemini-flash-latest","gemini-flash-lite-latest","gemini-3.5-flash","gemini-3.1-flash-lite","gemini-3.7-flash"];if(n){for(let s of c)try{let r=`https://generativelanguage.googleapis.com/v1beta/models/${s}:generateContent?key=${encodeURIComponent(n)}`,u=[],d=i.slice(-8);for(let o of d)u.push({role:o.role==="user"?"user":"model",parts:[{text:o.text}]});u.push({role:"user",parts:[{text:h}]});let g=await fetch(r,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system_instruction:{parts:[{text:e}]},contents:u,generationConfig:{temperature:.5,maxOutputTokens:400}})});if(g.ok){let a=(await g.json())?.candidates?.[0]?.content?.parts?.[0]?.text;if(a&&typeof a=="string"&&a.trim())return a.trim();console.warn(`[gemini] Model ${s} tr\u1EA3 v\u1EC1 n\u1ED9i dung r\u1ED7ng, th\u1EED model k\u1EBF ti\u1EBFp.`)}else{let o=await g.text().catch(()=>"");console.warn(`[gemini] Model ${s} l\u1ED7i ${g.status}: ${o.slice(0,300)}`)}}catch(r){console.warn(`[gemini] Model ${s} g\u1ECDi th\u1EA5t b\u1EA1i:`,r);continue}console.warn("[gemini] T\u1EA5t c\u1EA3 model \u0111\u1EC1u th\u1EA5t b\u1EA1i \u2014 d\xF9ng offline fallback (tr\u1EA3 l\u1EDDi theo t\u1EEB kh\xF3a, kh\xF4ng ph\u1EA3i AI th\u1EADt).")}return k(h,t)}export{v as a};
