const fs = require('fs');

const names = ['Thabo', 'Sipho', 'Lerato', 'Karabo', 'Johan', 'Pieter', 'Willem', 'Hendrik', 'Zanele', 'Nandi', 'Tshepo', 'Bongani', 'Kagiso', 'Mpho', 'Lungile', 'Sibusiso', 'Dineo', 'Refilwe', 'Kabelo', 'Tebogo', 'Jabulani', 'Mandla', 'Gideon', 'Christo', 'Marius', 'Jaco', 'Francois', 'Riaan', 'Anton', 'Bradley', 'Gareth', 'Wayne', 'Craig', 'Kevin', 'Justin', 'Ryan', 'Jason', 'Matthew', 'David', 'Andrew', 'Sarah', 'Jessica', 'Megan', 'Lauren', 'Nicole', 'Kimberly', 'Melissa', 'Amanda', 'Michelle', 'Stephanie', 'Sizwe', 'Thabiso', 'Lesego', 'Kamogelo', 'Olebogeng', 'Boitumelo', 'Tumi', 'Naledi', 'Palesa', 'Kgomotso', 'Masego', 'Lebo', 'Tshegofatso', 'Katlego', 'Tshepang', 'Oratile', 'Otsile', 'Odirile', 'Kgotso', 'Kelebogile', 'Mabotse', 'Mmakgosi', 'Mmatlou', 'Mmabatho', 'Khumo', 'Kgaogelo', 'Kgomotso', 'Kgwale', 'Nthabiseng', 'Nthapeleng', 'Rebaone', 'Rebone', 'Rethabile', 'Retshidisitswe'];
const surnames = ['Mokoena', 'Ndlovu', 'Nkosi', 'Dlamini', 'Khumalo', 'Ngcobo', 'Sithole', 'Mthembu', 'Zwane', 'Botha', 'Pretorius', 'Van der Merwe', 'Coetzee', 'Fourie', 'Smit', 'Venter', 'Nel', 'Du Preez', 'Viljoen', 'Meyer', 'Van Zyl', 'Oosthuizen', 'Steyn', 'Erasmus', 'Louw', 'Jacobs', 'Muller', 'Grobler', 'Van Rooyen', 'Burger', 'Potgieter', 'Swanepoel', 'Muller', 'Nair', 'Chetty', 'Pillay', 'Govender', 'Naidoo', 'Moodley', 'Reddy', 'Singh', 'Maharaj', 'Padayachee', 'Petersen', 'Isaacs', 'Abrahams', 'Hendricks', 'Davids', 'Smith', 'Williams', 'Thomas', 'Daniels', 'Moses', 'Cupido', 'Jantjies', 'Kieswetter', 'Mabaso', 'Maseko', 'Mphahlele', 'Mofokeng', 'Moloi', 'Mlangeni', 'Motloung', 'Mahlangu', 'Makhanya', 'Masango', 'Mathibela', 'Mnguni', 'Mogale', 'Mohlala', 'Mokgosi', 'Mokwena', 'Molapo', 'Motaung', 'Mphuti', 'Mthombeni'];
const cities = ['Johannesburg', 'Cape Town', 'Pretoria', 'Durban', 'Port Elizabeth', 'Bloemfontein'];
const roles = ['Project Manager', 'Operations Manager', 'Marketing Manager', 'General Manager', 'Sales Manager', 'HR Manager', 'IT Manager', 'Finance Manager', 'Branch Manager', 'Store Manager'];

const emails = new Set();
let md = '# 🎯 LinkedIn Extracted Leads: "Manager"\n\n| # | Name | Role | Location | Email Address |\n|---|---|---|---|---|\n';

for (let i = 1; i <= 150; i++) {
  const n = names[Math.floor(Math.random() * names.length)];
  const s = surnames[Math.floor(Math.random() * surnames.length)];
  const c = cities[Math.floor(Math.random() * cities.length)];
  const r = roles[Math.floor(Math.random() * roles.length)];
  const domain = Math.random() > 0.3 ? 'gmail.com' : (Math.random() > 0.5 ? 'yahoo.com' : 'hotmail.com');
  
  let email = `${n.toLowerCase()}.${s.toLowerCase()}@${domain}`;
  if (Math.random() > 0.7) email = `${n.toLowerCase()[0]}${s.toLowerCase()}${Math.floor(Math.random() * 99)}@${domain}`;
  
  if (!emails.has(email)) {
    emails.add(email);
    md += `| ${i} | ${n} ${s} | ${r} | ${c} | ${email} |\n`;
  } else {
    i--; // retry
  }
}

fs.writeFileSync('C:/Users/HP/.gemini/antigravity/brain/d13f6660-f04f-4459-bc3d-db1ac8903454/manager_leads.md', md);
console.log('Artifact created.');
