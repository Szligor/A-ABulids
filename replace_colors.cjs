const fs = require('fs');

const path = 'src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  ['bg-[#070709]', 'bg-[#0A0A0A]'],
  ['bg-[#0b0c10]', 'bg-[#111]'],
  ['bg-[#08090d]', 'bg-[#0A0A0A]'],
  ['bg-[#111115]', 'bg-[#111]'],
  ['bg-[#101115]', 'bg-[#111]'],
  ['bg-[#181922]', 'bg-[#222]'],
  ['bg-[#18181f]', 'bg-[#222]'],
  ['bg-[#15161d]', 'bg-[#222]'],
  ['bg-[#0d0e12]', 'bg-[#0A0A0A]'],
  ['bg-[#9146FF]', 'bg-[#C2A578]'],
  ['text-[#bf94ff]', 'text-[#C2A578]'],
  ['text-[#c0a2ff]', 'text-[#C2A578]'],
  ['border-[#9146FF]', 'border-[#C2A578]'],
  ['text-gray-400', 'text-white/40'],
  ['text-gray-500', 'text-white/30'],
  ['text-gray-300', 'text-white/50'],
  ['text-gray-200', 'text-[#E0E0E0]'],
  ['border-white/5', 'border-white/10'],
  ['hover:bg-[#803ce3]', 'hover:bg-[#A38A64]'],
  ['shadow-[#9146ff]/30', 'shadow-[#C2A578]/30'],
  ['shadow-[#9146ff]/5', 'shadow-[#C2A578]/5'],
  ['shadow-[#9146ff]/10', 'shadow-[#C2A578]/10'],
  ['text-emerald-400', 'text-green-400'],
  ['bg-emerald-500/10', 'bg-green-500/10'],
  ['bg-emerald-600', 'bg-green-600'],
  ['hover:bg-emerald-500', 'hover:bg-green-500'],
  ['accent-emerald-400', 'accent-green-400'],
  ['text-gray-700', 'text-white/20'],
  ['text-gray-600', 'text-white/30'],
  ['text-[#9146FF]', 'text-[#C2A578]'],
  ['text-white', 'text-[#E0E0E0]'],
  ['text-[#E0E0E0]/40', 'text-white/40'],
  ['text-[#E0E0E0]/50', 'text-white/50'],
  ['text-[#E0E0E0]/30', 'text-white/30'],
  ['text-[#E0E0E0]/20', 'text-white/20'],
  ['#9146FF', '#C2A578'],
  ['#bf94ff', '#D3B68A'],
  ['#803ce3', '#A38A64']
];

for (const [from, to] of replacements) {
    content = content.split(from).join(to);
}

fs.writeFileSync(path, content, 'utf8');

const path2 = 'src/components/VoxelCanvas.tsx';
let content2 = fs.readFileSync(path2, 'utf8');
for (const [from, to] of replacements) {
    content2 = content2.split(from).join(to);
}
fs.writeFileSync(path2, content2, 'utf8');

console.log("Replaced!");
