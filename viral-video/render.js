const {chromium}=require('playwright');const {spawn}=require('child_process');
(async()=>{
  const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
  await p.goto('file://'+__dirname+'/scene.html');
  const n=await p.evaluate(()=>FPS*DUR);
  const ff=spawn('ffmpeg',['-y','-f','image2pipe','-framerate','30','-i','-','-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-profile:v','high','-r','30','-movflags','+faststart',process.argv[2]],{stdio:['pipe','inherit','inherit']});
  const el=await p.$('#c');
  for(let i=0;i<n;i++){await p.evaluate(f=>render(f),i);ff.stdin.write(await el.screenshot({type:'jpeg',quality:92}));if(i%100==0)console.log('frame',i)}
  ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();
})();
