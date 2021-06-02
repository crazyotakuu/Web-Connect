//socket server creation
const socket=io();

let polite=true;
//joined room message to check if socket.io is working
socket.on('joined',data=>{
  polite=data.data;
  console.log(data.intro);
});

//variables creation
const remote_view=document.getElementById('remote_videotag');
const local_view=document.getElementById('local_videotag');
// const call_button=document.getElementById('button-connect');

//setting button onclick function
// call_button.addEventListener('click',doStart);
// function doStart(){
//   socket.emit('start','start');
//   start();
// }
socket.on('start',data=>{console.log('performing start method');start()});
//signalling
//signalling variables
const constraints={audio:false,video:true}
const pc = new RTCPeerConnection({
  iceServers: [
      {
          urls: "stun:stun.l.google.com:19302"
      }
  ]
});

//setting local video stream and adding it to peer connection
async function start(){
  console.log('everything starts here - setting local video')
  try {
    const stream=await navigator.mediaDevices.getUserMedia(constraints);
    for(const track of stream.getTracks()){
      pc.addTrack(track,stream);
    }
    local_view.srcObject=stream;
  } catch (error) {
    console.log(error);
  }
}

//when the pc has a media track attached to it this event will get triggered
pc.ontrack=({track,streams})=>{
  console.log('setting remote video');
  track.onunmute=()=>{
    if(remote_view.srcObject){console.log('something is happening here!');  return;}
    else{
    remote_view.srcObject=streams[0];
  };
}};

//the perfect negotiation logic
//setting some variables
let makingOffer=false;
let ignoreOffer=false;
let isSettingRemoteAnswerPending=false;

//sending ice candidates
pc.onicecandidate=({candidate})=>{console.log('getting ice candidates and sending to peer');socket.emit('send',{type:"candidate",data:candidate});}

//doing onnegotiationneeded
pc.onnegotiationneeded=async()=>{
  console.log('setting local sdp');
  try {
    makingOffer=true;
    await pc.setLocalDescription();
    socket.emit('send',{type:"sdp",data: pc.localDescription});
  } catch (error) {
    console.log(error);
  } finally{
    makingOffer=false;
  }
};


//some more signalling 
socket.on('message',data=async(data)=>{
  try {
    console.log('getting sdp');
    if(data.type=="sdp"){
      const readyForOffer=!makingOffer&&(pc.signalingState=="stable"||isSettingRemoteAnswerPending);
      const sdp=data.data;
      const offerCollision=sdp.type=="offer"&&!readyForOffer;
      ignoreOffer=!polite &&offerCollision;
      if(ignoreOffer){
        return;
      }
      isSettingRemoteAnswerPending=sdp.type=="answer";
      await pc.setRemoteDescription(sdp);
      isSettingRemoteAnswerPending=false;
      if(sdp.type=='offer'){
        await pc.setLocalDescription();
        socket.emit('send',{type:"sdp",data: pc.localDescription});
      }
    }else if(data.type=="candidate"){
      try {
        console.log('setting ice candidates');
        let candidate=data.data;
        await pc.addIceCandidate(candidate);
      } catch (error) {
        if(!ignoreOffer) throw error;
      }
    }
  } catch (error) {
    console.log(error);
  }
});