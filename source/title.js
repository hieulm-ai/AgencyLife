function enterOffice(showWelcome=true){
 if(typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches&&!document.fullscreenElement&&navigator.userActivation?.isActive){
  const request=document.documentElement.requestFullscreen;
  if(request)request.call(document.documentElement).catch(()=>{});
 }

 closeHub();if(guideOpen)closeGuide();titleOpen=false;document.getElementById('titleScreen').hidden=true;document.body.classList.remove('title-view');
 if(typeof closeSignup==='function')closeSignup();
 if(!GS.player)openIntro(!hadSave||GS.introPending===true);
 else if(showWelcome)setTimeout(()=>{if(!maybeStartTour()&&!showUiNotice())offerGuide();},300);
}
// Người chơi mới chưa có tài khoản: Bắt đầu mở màn đăng ký; đã đăng nhập hoặc đã có ván: vào thẳng.
function titleStart(){
 const signedIn=typeof titleSignedIn==='function'&&titleSignedIn();
 if(!GS.player&&!signedIn&&typeof openSignup==='function'){openSignup();return;}
 enterOffice();
}
function openTitle(){
 if(VISIT){enterOffice();return;}
 let direct=false,signup=false;
 try{direct=sessionStorage.getItem(SAVE+'.enter')==='1';sessionStorage.removeItem(SAVE+'.enter');
  signup=sessionStorage.getItem(SAVE+'.signup')==='1';sessionStorage.removeItem(SAVE+'.signup');}catch(e){}
 if(direct&&GS.player){enterOffice();return;}
 // Vừa tạo tài khoản/đăng nhập (trang tải lại hoặc quay về từ Facebook/Google): đi tiếp bước chọn nhân vật.
 if(signup&&typeof titleSignedIn==='function'&&titleSignedIn()){enterOffice();return;}
 titleOpen=true;const screen=document.getElementById('titleScreen');screen.hidden=false;document.body.classList.add('title-view');
 const go=document.getElementById('titlePlay');go.textContent=GS.player?'Chơi tiếp':'Bắt đầu';go.onclick=titleStart;
 document.getElementById('titleGuide').onclick=()=>openGuide();
 document.getElementById('titleSettings').onclick=()=>openHub('settings');
 document.getElementById('titleLogin').onclick=()=>openLogin();
 document.getElementById('titleLogin').hidden=!OL.be;
 if(typeof olTitleAccount==='function')olTitleAccount();
 document.getElementById('titleMusic').onclick=()=>document.getElementById('ambientMusic').click();
 go.focus();
}
