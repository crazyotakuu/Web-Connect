const socket=io();
const remote_video=document.getElementById("remote_videotag");
const selfView=document.getElementById("local_videotag");
let localstream;
let rtc;
const constraints = {audio: false, video: { width: { exact: 1030 }, height: { exact: 500 } }};
start();
async function start() {
  try {
    console.log('setting local stream');
    // Get local stream, show it in self-view, and add it to be sent.
    localstream =
      await navigator.mediaDevices.getUserMedia(constraints);
    selfView.srcObject = localstream;
  } catch (err) {
    console.error(err);
  }
}
socket.on("sdp",handlesdp);
socket.on('ice',handleice);
socket.on('answer',handleAnswer);
socket.on('new_join',callUser);

function callUser(data) {
  console.log("since new user has joined calling call user for peer A");
  rtc = createPeer();
  localstream.getTracks().forEach(track => rtc.addTrack(track, localstream));
}

function createPeer() {
  console.log("creating peer connection");
  const peer = new RTCPeerConnection({
      iceServers: [
          {
              urls: "stun:stun.l.google.com:19302"
          }
      ]
  });

  peer.onicecandidate = handleICECandidateEvent;
  peer.ontrack = handleTrackEvent;
  peer.onnegotiationneeded = () => handleNegotiationNeededEvent();

  return peer;
}
function handleNegotiationNeededEvent(){
  console.log("sending sdp to peer b");
  rtc.createOffer().then(offer=>{
    return rtc.setLocalDescription(offer);
  }).then(()=>{
    socket.emit('offer',rtc.localDescription);
  }).catch(e=>console.log(e));
}

function handlesdp(incoming){
  console.log("getting sdp from peer a and sending sdp to peer a");
rtc=createPeer();
rtc.setRemoteDescription(incoming).then(()=>{
  navigator.mediaDevices
        .getUserMedia(constraints)
        .then(stream => {
            stream.getTracks().forEach(track => rtc.addTrack(track, stream));
        })
}).then(()=>{
  return rtc.createAnswer();
}).then(answer => {
  return rtc.setLocalDescription(answer);
}).then(()=>{
  socket.emit('sendsdp',rtc.localDescription);
});
}

function handleAnswer(incoming){
  console.log("got sdp from peer b");
  let sdp=incoming.sdp;
  sdp=JSON.stringify(sdp);
  sdp=sdp.replace("a=setup:active", "a=setup:passive");
  sdp=JSON.parse(sdp);
  incoming.sdp=sdp;
  console.log(incoming);
  rtc.setRemoteDescription(incoming).catch(e=>console.log(e));
}

function handleICECandidateEvent(e){
  if(e.candidate){
    console.log("finding ice "+rtc.localDescription);
    socket.emit('ice-candidate',e.candidate);
  }
}

function handleice(incoming){
  console.log("setting ice");
rtc.addIceCandidate(incoming);
}

function handleTrackEvent(e){
  console.log("setting streams");
  remote_video.srcObject=e.streams[0];
}

