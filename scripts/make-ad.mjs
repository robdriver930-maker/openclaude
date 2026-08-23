#!/usr/bin/env node
// Premium 60s video ad for Bobby's Tech Services
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const OUT = path.resolve('scripts', 'output');
fs.mkdirSync(OUT, { recursive: true });

// --- Step 1: Voiceover ---
const wavPath = path.join(OUT, 'voiceover.wav');
if (!fs.existsSync(wavPath)) {
  const script = "Attention! Is your computer slowing you down? Laptop keeps crashing? Tech problems ruining your day? At Bobby's Tech Services, we've got you covered. We fix desktop computers and laptops - fast, reliable, and affordable. From virus removal to full system rebuilds, software setup to data recovery, no job is too big or too small. Here's the deal: for just thirty pounds, we'll diagnose ANY computer problem and have an answer within twenty-four hours. That's right - a full professional diagnostic for only thirty quid, guaranteed within a day. Call today for our call-out service and diagnosis at just thirty pounds. You will be seen within twenty-four hours. Quality work. Honest prices. Real results. Bobby's Tech Services - your computer, our expertise.";
  fs.writeFileSync(path.join(OUT, 'script.txt'), script);
  execSync(`edge-tts --file "${path.join(OUT, 'script.txt')}" --voice en-GB-SoniaNeural --rate="+5%" --write-media "${wavPath}"`, { stdio: 'inherit' });
  console.log('Voiceover generated');
} else {
  console.log('Voiceover exists');
}

const probe = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${wavPath}"`, { encoding: 'utf8' }).trim();
const totalDur = Math.max(parseFloat(probe), 60).toFixed(2);

// --- Copy fonts to output dir so we can use simple relative-style paths without colons ---
const localFontBold = path.join(OUT, 'bold.ttf');
const localFontReg = path.join(OUT, 'reg.ttf');
if (!fs.existsSync(localFontBold)) {
  fs.copyFileSync('C:/Windows/Fonts/arialbd.ttf', localFontBold);
  fs.copyFileSync('C:/Windows/Fonts/arial.ttf', localFontReg);
}

// --- Write text files for labels with apostrophes ---
fs.writeFileSync(path.join(OUT, 'brand.txt'), "Bobby's Tech Services");
fs.writeFileSync(path.join(OUT, 'covered.txt'), "We've got you COVERED.");
fs.writeFileSync(path.join(OUT, 'cta.txt'), "Call TODAY - Call-Out Service");
fs.writeFileSync(path.join(OUT, 'phone.txt'), "07309 904 025  /  07463 065 826");
fs.writeFileSync(path.join(OUT, 'outro.txt'), "Bobby's Tech Services");
fs.writeFileSync(path.join(OUT, 'phone-outro.txt'), "07309 904 025  /  07463 065 826");
fs.writeFileSync(path.join(OUT, 'price.txt'), "\u00a330");

// --- Build filter graph using file paths relative to CWD ---
// Key insight: run FFmpeg from the output dir so paths have NO colons at all
const fB = path.basename(localFontBold);
const fR = path.basename(localFontReg);
const txF = (n) => `textfile=${n}.txt`;

const e = (s, e) => `'gte(t,${s})*lte(t,${e})'`;

const filters = [
  `[0:v]scale=1920:1080,setpts=PTS-STARTPTS`,
  // Scene 1: HOOK
  `drawtext=text='ATTENTION!':fontcolor=white:fontsize=140:fontfile=${fB}:x=(w-text_w)/2:y=h*0.25:enable=${e(0.3,4.5)}:box=1:boxcolor=0xFFD700:boxw=1720:boxh=180:boxborderw=25`,
  `drawtext=text='Is your computer slowing you down?':fontcolor=white:fontsize=78:fontfile=${fR}:x=(w-text_w)/2:y=h*0.45:enable=${e(1.0,4.5)}`,
  // Scene 2: PAIN
  `drawtext=text='Laptop keeps crashing?':fontcolor=white:fontsize=108:fontfile=${fB}:x=(w-text_w)/2:y=h*0.32:enable=${e(5.2,7.5)}:box=1:boxcolor=0xFF6B6B:boxw=1620:boxh=140:boxborderw=18`,
  `drawtext=text='Tech problems ruining your day?':fontcolor=0xFF8A80:fontsize=82:fontfile=${fB}:x=(w-text_w)/2:y=h*0.55:enable=${e(6.0,9.5)}`,
  // Scene 3: BRAND
  `drawtext=${txF('brand')}:fontcolor=white:fontsize=128:fontfile=${fB}:x=(w-text_w)/2:y=h*0.22:enable=${e(10.5,17.5)}:box=1:boxcolor=0x1565C0:boxw=1670:boxh=170:boxborderw=22`,
  `drawtext=${txF('covered')}:fontcolor=white:fontsize=92:fontfile=${fB}:x=(w-text_w)/2:y=h*0.52:enable=${e(11.5,17)}`,
  // Scene 4: SERVICES
  `drawtext=text='DESKTOPS  .  LAPTOPS':fontcolor=white:fontsize=105:fontfile=${fB}:x=(w-text_w)/2:y=h*0.2:enable=${e(18.5,31)}:box=1:boxcolor=0x0D47A1:boxw=1620:boxh=130:boxborderw=16`,
  `drawtext=text='Virus Removal':fontcolor=0x69F0AE:fontsize=82:fontfile=${fR}:x=(w-text_w)/2:y=h*0.42:enable=${e(19.5,26)}`,
  `drawtext=text='System Rebuilds':fontcolor=0x69F0AE:fontsize=82:fontfile=${fR}:x=(w-text_w)/2:y=h*0.52:enable=${e(21.5,28)}`,
  `drawtext=text='Software Setup':fontcolor=0x69F0AE:fontsize=82:fontfile=${fR}:x=(w-text_w)/2:y=h*0.62:enable=${e(24,30)}`,
  `drawtext=text='Data Recovery':fontcolor=0x69F0AE:fontsize=82:fontfile=${fR}:x=(w-text_w)/2:y=h*0.72:enable=${e(24,30)}`,
  `drawtext=text='No job too big or too small.':fontcolor=0xFFD54F:fontsize=86:fontfile=${fB}:x=(w-text_w)/2:y=h*0.86:enable=${e(27,31)}`,
  // Scene 5: OFFER
  `drawtext=text='SPECIAL OFFER':fontcolor=white:fontsize=115:fontfile=${fB}:x=(w-text_w)/2:y=h*0.08:enable=${e(32.5,47.5)}:box=1:boxcolor=0xC62828:boxw=1740:boxh=140:boxborderw=25`,
  `drawtext=${txF('price')}:fontcolor=white:fontsize=280:fontfile=${fB}:x=(w-text_w)/2:y=h*0.38:enable=${e(33.5,47)}:box=1:boxcolor=0xFFD700:boxw=1570:boxh=340:boxborderw=35`,
  `drawtext=text='FULL COMPUTER DIAGNOSTIC':fontcolor=white:fontsize=98:fontfile=${fB}:x=(w-text_w)/2:y=h*0.65:enable=${e(34.5,47)}`,
  `drawtext=text='Answer within 24 HOURS':fontcolor=white:fontsize=100:fontfile=${fB}:x=(w-text_w)/2:y=h*0.82:enable=${e(36,47)}:box=1:boxcolor=0x2E7D32:boxw=1570:boxh=130:boxborderw=20`,
  // Scene 6: CTA
  `drawtext=${txF('cta')}:fontcolor=white:fontsize=108:fontfile=${fB}:x=(w-text_w)/2:y=h*0.22:enable=${e(48.5,55.5)}:box=1:boxcolor=0x1565C0:boxw=1720:boxh=150:boxborderw=20`,
  `drawtext=${txF('phone')}:fontcolor=white:fontsize=80:fontfile=${fR}:x=(w-text_w)/2:y=h*0.42:enable=${e(49,55.5)}`,
  `drawtext=text='Be SEEN within 24 Hours.':fontcolor=0x69F0AE:fontsize=88:fontfile=${fB}:x=(w-text_w)/2:y=h*0.62:enable=${e(50,55.5)}`,
  // Scene 7: OUTRO
  `drawtext=${txF('outro')}:fontcolor=white:fontsize=135:fontfile=${fB}:x=(w-text_w)/2:y=h*0.28:enable=${e(56.5,60)}:box=1:boxcolor=0x1565C0:boxw=1720:boxh=175:boxborderw=22`,
  `drawtext=${txF('phone-outro')}:fontcolor=white:fontsize=72:fontfile=${fR}:x=(w-text_w)/2:y=h*0.52:enable=${e(57,60)}`,
  `drawtext=text='Your Computer . Our Expertise.':fontcolor=0xE0E0E0:fontsize=86:fontfile=${fR}:x=(w-text_w)/2:y=h*0.72:enable=${e(57.5,60)}`,
  `format=yuv420p[outv]`,
].join(',');

console.log('Building video...');

const mp4Path = path.join(OUT, 'bobby-tech-services-ad-60s.mp4');
const wavRel = path.relative(OUT, wavPath);
const mp4Rel = path.relative(OUT, mp4Path);

// Run FFmpeg from the OUT directory so all paths are relative (no colons!)
const child = spawn('ffmpeg', [
  '-y',
  '-f', 'lavfi', '-i', `color=c=0x060B18:s=1920x1080:r=30:d=${totalDur}`,
  '-i', wavRel,
  '-filter_complex', filters,
  '-map', '[outv]',
  '-map', '1:a',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k',
  '-shortest',
  '-movflags', '+faststart',
  mp4Rel,
], { stdio: 'inherit', cwd: OUT });

await new Promise((res, rej) => {
  child.on('close', (c) => c === 0 ? res() : rej(new Error(`FFmpeg exit ${c}`)));
});

const info = execSync(`ffprobe -v error -show_entries stream=width,height,codec_name -show_entries format=size,duration -of default=noprint_wrappers=1 "${mp4Path}"`, { encoding: 'utf8' });
console.log('\nOutput:', info);
console.log(`Done! ${mp4Path}`);
