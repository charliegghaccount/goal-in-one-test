const {chromium}=require('playwright');const fs=require('fs');const assert=require('assert');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const p=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});await p.goto(process.env.STUDIO_URL || 'http://127.0.0.1:5174/?dev=1&godotPreview=http://127.0.0.1:8064/');await p.getByRole('button',{name:'Settings',exact:true}).click();await p.getByRole('button',{name:'LEVEL EDITOR',exact:true}).click();
async function exported(){await p.getByRole('button',{name:'Export',exact:true}).click();const d=JSON.parse(await p.getByRole('textbox',{name:'Level JSON'}).inputValue());await p.getByRole('button',{name:'Close dialog',exact:true}).click();return d;}
for(const name of ['basic','mechanics','wide']){
 await p.getByRole('button',{name:'Import',exact:true}).click();await p.getByRole('textbox',{name:'Level JSON'}).fill(fs.readFileSync('/workspace/goal-in-one-test/docs/godot-examples/'+name+'.json','utf8'));await p.locator('#ed-apply-import').click();
 let original;
 if(name==='basic'){
  original=await exported();
  const c=p.locator('#editor-canvas'); const r=await c.boundingBox(); const d=await c.evaluate(c=>({...c.dataset})); const scale=+d.scale;
  const x=r.x+(r.width-(+d.viewWidth)*scale)/2+(650-(+d.cameraX))*scale;
  const y=r.y+(r.height-(+d.viewHeight)*scale)/2+(600-(+d.cameraY))*scale;
  await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+50,y-15,{steps:8});await p.mouse.up();
  await p.getByRole('button',{name:'Editor zoom in',exact:true}).click();
 }
 if(name==='wide')await p.getByRole('button',{name:'Save Draft',exact:true}).click();
 const before=await exported();
 if(name==='basic')assert.notDeepStrictEqual(before.level.obstacles,original.level.obstacles);const workspace=await p.locator('#editor-canvas').evaluate(c=>({...c.dataset}));const progress=await p.evaluate(()=>localStorage.getItem('goal-in-one:grass:v5'));
 await p.getByRole('button',{name:'Test in Godot',exact:true}).click();await p.getByRole('status').filter({hasText:'Godot physics'}).waitFor({timeout:90000});
 const frame=p.locator('.godot-preview iframe');const box=await frame.boundingBox();
 await p.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await p.mouse.down();await p.mouse.move(box.x+box.width*.5-110,box.y+box.height*.5+30,{steps:12});await p.mouse.up();await p.waitForTimeout(1100);await p.screenshot({path:'/tmp/v4-'+name+'.png'});
 await p.getByRole('button',{name:'Return to Editor',exact:true}).click();assert.deepStrictEqual(await exported(),before);assert.deepStrictEqual(await p.locator('#editor-canvas').evaluate(c=>({...c.dataset})),workspace);assert.equal(await p.evaluate(()=>localStorage.getItem('goal-in-one:grass:v5')),progress);console.log('PASS roundtrip',name);
 if(name==='basic'){
  await p.getByRole('button',{name:'Test in Godot',exact:true}).click();await p.getByRole('status').filter({hasText:'Godot physics'}).waitFor({timeout:90000});
  await p.getByRole('button',{name:'Return to Editor',exact:true}).click();
  assert.deepStrictEqual((await exported()).level.obstacles,before.level.obstacles);
  await p.getByRole('button',{name:'Undo',exact:true}).click();assert.deepStrictEqual((await exported()).level.obstacles,original.level.obstacles);
  await p.getByRole('button',{name:'Redo',exact:true}).click();assert.deepStrictEqual((await exported()).level.obstacles,before.level.obstacles);
  console.log('PASS actual geometry edit, repeated Godot tests, Undo and Redo after return');
 }

}
// Unsupported library objects produce a visible error, not a partial playable level.
await p.locator('.object-library').getByRole('button',{name:'Rotating paddle',exact:true}).click();
const canvasBox=await p.locator('#editor-canvas').boundingBox();await p.mouse.click(canvasBox.x+canvasBox.width*.55,canvasBox.y+canvasBox.height*.45);
const unsupported=await exported();await p.getByRole('button',{name:'Test in Godot',exact:true}).click();
await p.getByRole('status').filter({hasText:'Unsupported mechanic: rotors'}).waitFor({timeout:90000});
await p.getByRole('button',{name:'Return to Editor',exact:true}).click();assert.deepStrictEqual(await exported(),unsupported);
console.log('PASS unsupported feature reported and session preserved');
if(errors.length)throw Error(errors.join('\n'));await browser.close()})().catch(e=>{console.error(e);process.exit(1)});
