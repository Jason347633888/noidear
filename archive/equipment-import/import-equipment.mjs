// 设备台账批量导入脚本
// 运行前：把下面的 TOKEN 替换成你的登录 token
// 运行方式（在项目根目录执行）：node archive/equipment-import/import-equipment.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('../../client/node_modules/xlsx');

// ========== 修改这里 ==========
const BASE_URL = 'http://localhost:3000/api/v1';
const TOKEN = '在这里填入你的JWT token';
// ==============================

const wb = XLSX.readFile(new URL('./设备台账.xlsx', import.meta.url).pathname);
const sheet = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// 把每行按子编号展开成独立设备记录
const equipments = [];
rows.slice(1).forEach(r => {
  if (!r[0] || !r[1]) return;
  const category = r[0];
  const name = r[1];
  const location = r[2] || '';
  const subLabels = r.slice(4).filter(x => x && x !== '/');

  if (subLabels.length === 0) {
    equipments.push({ name, category, location });
  } else {
    subLabels.forEach(label => {
      equipments.push({ name: `${name} ${label}`, category, location });
    });
  }
});

console.log(`准备导入 ${equipments.length} 台设备...\n`);

let success = 0;
let failed = 0;

for (const eq of equipments) {
  try {
    const res = await fetch(`${BASE_URL}/equipment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
      body: JSON.stringify(eq),
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`✅ [${eq.category}] ${eq.name} (${eq.location}) → ${data.code}`);
      success++;
    } else {
      console.error(`❌ ${eq.name}: ${JSON.stringify(data.message || data)}`);
      failed++;
    }
  } catch (e) {
    console.error(`❌ ${eq.name}: ${e.message}`);
    failed++;
  }
}

console.log(`\n=============================`);
console.log(`导入完成：成功 ${success} 台，失败 ${failed} 台`);
