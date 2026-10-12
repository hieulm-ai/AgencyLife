function enterOffice(showWelcome=true){
 closeHub();if(guideOpen)closeGuide();titleOpen=false;document.getElementById('titleScreen').hidden=true;document.body.classList.remove('title-view');
 if(!GS.player)openIntro(!hadSave||GS.introPending===true);
 else if(showWelcome)setTimeout(()=>{if(!maybeStartTour()&&!showUiNotice())offerGuide();},300);
}
function openTitle(){
 if(VISIT){enterOffice();return;}
 let direct=false;try{direct=sessionStorage.getItem(SAVE+'.enter')==='1';sessionStorage.removeItem(SAVE+'.enter');}catch(e){}
 if(direct&&GS.player){enterOffice();return;}
 titleOpen=true;const screen=document.getElementById('titleScreen');screen.hidden=false;document.body.classList.add('title-view');
 document.getElementById('titleAgency').textContent=GS.player?agencyName():'Agency mới của bạn';
 document.getElementById('titleSummary').textContent=GS.player?`Ngày ${GS.day} · Cấp ${lvl()} · ${fmt(cash)} coin`:'Xây văn phòng, tuyển đồng đội và tạo nên agency của riêng bạn.';
 const go=document.getElementById('titlePlay');go.textContent=GS.player?'Chơi tiếp':'Bắt đầu';go.onclick=enterOffice;
 document.getElementById('titleNew').hidden=!hadSave||!GS.player;document.getElementById('titleNew').onclick=()=>document.getElementById('bNewGame').click();
 document.getElementById('titleGuide').onclick=()=>openGuide();
 document.getElementById('titleSettings').onclick=()=>openHub('settings');
 document.getElementById('titleLogin').onclick=()=>openLogin();
 document.getElementById('titleLogin').hidden=!OL.be;
 document.getElementById('titleMusic').onclick=()=>document.getElementById('ambientMusic').click();
 go.focus();
}
