(() => {
'use strict';
let win;
document.querySelector('#music-launch').addEventListener('click', () => {
 if (win?.isConnected) { win.classList.remove('minimized'); focusWindow(win); return; }
 win = createWindow({title:'Музыка',width:390,height:650,content:`
 <div class="ipod"><div class="ipod-screen">
 <strong>Музыка</strong>
 <label>Сервис<select class="provider"><option value="apple">Apple Music</option><option value="yandex">Яндекс Музыка</option></select></label>
 <div class="apple"><button class="connect">Войти в Apple Music</button><label>ID песни Apple Music<input class="song" inputmode="numeric" placeholder="Например, 1440857781"></label><button class="load">Загрузить песню</button></div>
 <div class="yandex" hidden><label>Ссылка на трек Яндекс Музыки<input class="url" type="url" placeholder="https://music.yandex.ru/album/…/track/…"></label><button class="embed">Открыть виджет</button><div class="frame"></div><p>Управление и доступность — внутри виджета сервиса.</p></div>
 <p class="status" role="status" aria-live="polite">Выберите сервис</p>
 </div><div class="click-wheel" aria-label="Click Wheel">
 <button class="menu">MENU</button><button class="prev" aria-label="Предыдущая песня">◀◀</button><button class="next" aria-label="Следующая песня">▶▶</button><button class="play" aria-label="Воспроизведение или пауза">▶Ⅱ</button><button class="center" aria-label="Загрузить выбранную песню">●</button></div>
 <label>Громкость<input class="volume" type="range" min="0" max="1" step=".05" value=".5"></label></div>`});
 const q = s => win.querySelector(s);
 let kit, busy=false;
 const status = message => {q('.status').textContent=message;};
 const run = async action => {if(busy)return; busy=true;try {await action();}catch(e){status(e.message || 'Не удалось выполнить действие');}finally{busy=false;}};
 const apple = () => {if(q('.provider').value!=='apple')throw Error('Используйте кнопки внутри виджета Яндекс Музыки');if(!kit?.isAuthorized)throw Error('Сначала войдите в Apple Music');return kit;};
 q('.provider').onchange=()=>{const a=q('.provider').value==='apple';q('.apple').hidden=!a;q('.yandex').hidden=a;if(kit)kit.pause();q('.frame').replaceChildren();status(a?'Войдите в Apple Music':'Вставьте ссылку на трек');};
 q('.connect').onclick=()=>run(async()=>{
 const token=window.APP_CONFIG?.APPLE_MUSIC_DEVELOPER_TOKEN;
 if(!token)throw Error('Для Apple Music администратор должен настроить developer token (см. MUSIC.md)');
 if(!window.MusicKit) await new Promise((resolve,reject)=>{
 const script=document.createElement('script');script.src='https://js-cdn.music.apple.com/musickit/v3/musickit.js';
 const ready=()=>{clearTimeout(timer);document.removeEventListener('musickitloaded',ready);resolve();};
 const timer=setTimeout(()=>{document.removeEventListener('musickitloaded',ready);script.remove();reject(Error('MusicKit не загрузился. Повторите попытку'));},15000);
 document.addEventListener('musickitloaded',ready);script.onerror=()=>{clearTimeout(timer);document.removeEventListener('musickitloaded',ready);script.remove();reject(Error('Ошибка загрузки MusicKit'));};document.head.append(script);
 });
 kit=await MusicKit.configure({developerToken:token,app:{name:'Chaos System',build:'1.0'}});await kit.authorize();kit.volume=Number(q('.volume').value);status('Apple Music подключена');
 });
 const load=()=>run(async()=>{const k=apple(),id=q('.song').value.trim();if(!/^\d+$/.test(id))throw Error('Введите числовой ID песни');await k.setQueue({song:id});await k.play();status('Воспроизведение Apple Music');});
 q('.load').onclick=load;q('.center').onclick=load;
 q('.play').onclick=()=>run(async()=>{const k=apple();await(k.isPlaying?k.pause():k.play());status(k.isPlaying?'Воспроизведение':'Пауза');});
 q('.prev').onclick=()=>run(()=>apple().skipToPreviousItem());
 q('.next').onclick=()=>run(()=>apple().skipToNextItem());
 q('.menu').onclick=()=>q('.provider').focus();
 q('.volume').oninput=()=>{if(kit)kit.volume=Number(q('.volume').value);};
 q('.embed').onclick=()=>run(async()=>{
 const u=new URL(q('.url').value);const m=u.pathname.match(/^\/album\/(\d+)\/track\/(\d+)\/?$/);
 if(u.protocol!=='https:'||!['music.yandex.ru','music.yandex.com'].includes(u.hostname)||!m)throw Error('Нужна ссылка https://music.yandex.ru/album/ID/track/ID');
 const frame=document.createElement('iframe');frame.title='Яндекс Музыка';frame.src='https://music.yandex.ru/iframe/#track/'+m[2]+'/'+m[1];frame.allow='autoplay';frame.style.width='100%';frame.style.height='180px';q('.frame').replaceChildren(frame);status('Виджет Яндекс Музыки');
 });
 win.querySelector('.close').addEventListener('click',()=>{if(kit)kit.pause();q('.frame').replaceChildren();});
});
})();