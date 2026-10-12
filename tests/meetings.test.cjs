const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../source/meetings.js'),'utf8');
function setup(){
  const table={uid:1,id:'meeting_table',gx:5,gy:5,rot:0};
  const seats=[{key:'1:0',uid:1,face:'SW',acc:[4,5]},{key:'1:1',uid:1,face:'NE',acc:[6,5]}];
  const job={id:9,name:'Pitch',req:['meeting_table'],need:18,cust:0,meeting:{phase:'queued',remaining:20}};
  const host={ci:0,x:3,y:5,path:[],state:'wander',stress:10};
  const c={GS:{jobs:[job]},AG:[host],VIS:[],OBJS:[table],SEATS:seats,ENTRY:[0,0],SIDEWALK:[-7,2],streetExit:()=>[-14,2],OUTSIDE_ENTRY:[0,2],BUSY:new Map(),visId:1,GAME_MIN_PER_SEC:1,
    accessOf:z=>z.acc,bfs:(a,b)=>[a,b],custFor:()=>0,assignSeats:()=>{},renderJobs:()=>{},save:()=>{},toast:()=>{},goToSofa:v=>v.state='leave',visLeave:v=>v.state='leave'};
  vm.createContext(c);vm.runInContext(source,c);
  return {c,job,host,table,run:s=>vm.runInContext(s,c)};
}
test('large jobs and pitch require a meeting; ordinary jobs do not',()=>{
  const {run}=setup();assert.equal(run('needsMeeting({req:[],need:60})'),true);assert.equal(run('needsMeeting({req:["meeting_table"],need:18})'),true);assert.equal(run('needsMeeting({req:[],need:59})'),false);
});
test('meeting reserves separate guest and host seats, counts only after both arrive, then releases',()=>{
  const {c,job,host,run}=setup();run('stepMeetings(1)');assert.equal(job.meeting.phase,'walking');assert.equal(c.VIS.length,1);
  assert.notEqual(job.meeting.hostKey,job.meeting.guestKey);assert.equal(run('meetingReservations().size'),2);
  run('stepMeetings(10)');assert.equal(job.meeting.remaining,20);
  host.state='sit';c.VIS[0].state='meeting';run('stepMeetings(7)');assert.equal(job.meeting.remaining,13);
  run('stepMeetings(0)');assert.equal(job.meeting.remaining,13);
  run('stepMeetings(13)');assert.equal(job.meeting.phase,'done');assert.equal(run('meetingReservations().size'),0);assert.equal(host.meetingJob,undefined);assert.equal(c.VIS[0].state,'leave');
});
test('a missing or unreachable table queues safely without resetting completed conversation',()=>{
  const {c,job,host,run}=setup();run('stepMeetings(1)');host.state='sit';c.VIS[0].state='meeting';run('stepMeetings(8)');c.OBJS=[];run('stepMeetings(1)');
  assert.equal(job.meeting.phase,'queued');assert.equal(job.meeting.remaining,12);assert.equal(host.meetingJob,undefined);run('stepMeetings(10)');assert.equal(job.meeting.remaining,12);
});
test('blocked routes cannot start a meeting or consume its timer',()=>{
  const {c,job,run}=setup();c.bfs=()=>null;run('stepMeetings(50)');assert.equal(job.meeting.phase,'queued');assert.equal(job.meeting.remaining,20);assert.equal(c.VIS.length,0);
});
test('reload retains elapsed conversation and drops transient seat reservations',()=>{
  const {job,run}=setup();Object.assign(job.meeting,{phase:'meeting',remaining:6,tableUid:1,guestKey:'1:0',hostKey:'1:1'});run('restoreMeetings()');assert.equal(job.meeting.phase,'queued');assert.equal(job.meeting.remaining,6);assert.equal(run('meetingReservations().size'),0);
});
test('one table cannot be booked by two jobs',()=>{
  const {c,run}=setup();c.GS.jobs.push({id:10,name:'TVC',req:[],need:80,meeting:{phase:'queued',remaining:20}});run('stepMeetings(1)');assert.equal(c.GS.jobs[0].meeting.phase,'walking');assert.equal(c.GS.jobs[1].meeting.phase,'queued');
});
test('moving or rotating a table cancels the old route and requeues',()=>{
  const {job,table,run}=setup();run('stepMeetings(1)');table.rot=1;run('stepMeetings(1)');assert.equal(job.meeting.phase,'queued');
});

test('restoring a completed timer never restarts a twenty-minute meeting',()=>{const {c,job}=setup();job.meeting={phase:'meeting',remaining:0};c.restoreMeetings();assert.equal(job.meeting.phase,'done');assert.equal(job.meeting.remaining,0);});
test('invalid saved meeting timers fall back to a finite duration',()=>{for(const remaining of [null,'bad',Infinity]){const {c,job}=setup();job.meeting={phase:'meeting',remaining};c.restoreMeetings();assert.equal(job.meeting.remaining,20);assert.equal(job.meeting.phase,'queued');}});

test('pause cannot start a queued meeting or summon a guest',()=>{const {c,job}=setup();c.stepMeetings(0);assert.equal(job.meeting.phase,'queued');assert.equal(c.VIS.length,0);});
test('returning meeting guest waits for outgoing copy and enters from the street end',()=>{const {c,job}=setup();c.VIS=[{jobId:9,state:'leave'}];c.stepMeetings(1);assert.equal(job.meeting.phase,'queued');c.VIS=[];c.stepMeetings(1);assert.equal(c.VIS[0].x,-14);assert.equal(c.VIS[0].y,2);assert.equal(c.VIS[0].path[0].join(','),'0,2');assert.equal(c.VIS[0].path[1].join(','),'0,0');});
test('host route uses the indoor staff restriction',()=>{const {c,job}=setup();const flags=[];c.bfs=(a,b,staff)=>{if(a[0]===3)flags.push(staff);return [a,b];};c.stepMeetings(1);assert.equal(job.meeting.phase,'walking');assert.ok(flags.length>=2);assert.ok(flags.every(Boolean));});

test('absent or departing staff cannot host a queued meeting',()=>{for(const flag of [{away:true},{state:'leaving'}]){const {c,host,job}=setup();Object.assign(host,flag);c.stepMeetings(1);assert.equal(job.meeting.phase,'queued');assert.equal(c.VIS.length,0);assert.equal(host.meetingJob,undefined);}});
