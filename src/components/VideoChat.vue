<script setup>
  import { onMounted, ref } from "vue";
  import { servers } from "../config/stunServers";
  import { firestore } from "../config/firebase";

  const pc = ref(null);
  const localVideoSrcObject = ref(null);
  const remoteVideoSrcObject = ref(null);
  const callId = ref("");

  // initialize p2p connection
  onMounted(() => {
    pc.value = new RTCPeerConnection(servers);
  });

  const start = async () => {
    // get user permissions for webcam and microphone
    const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const remoteStream = new MediaStream();

    // add tracks from local stream to peer connection
    localStream.getTracks().forEach((track) => {
      pc.value.addTrack(track, localStream);
    });

    // pull tracks from remote stream, add to video stream
    pc.value.addEventListener("track", event => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track);
      });
    });

    // set srcObject for local and remote streams
    localVideoSrcObject.value = localStream;
    remoteVideoSrcObject.value = remoteStream;
  };

  const call = async () => {
    const callDoc = firestore.collection("calls").doc();
    const offerCandidates = callDoc.collection("offerCandidates");
    const answerCandidates = callDoc.collection("answerCandidates");

    callId.value = callDoc.id;

    // get ice candidates for call and add them to offer collection
    pc.value.addEventListener("icecandidate", event => {
      if (event.candidate) {
        offerCandidates.add(event.candidate.toJSON());
      }
    });

    // create offer for call and add offer local description
    const offerDescription = await pc.value.createOffer();
    await pc.value.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await callDoc.set({ offer });

    // listen for remote answer
    callDoc.onSnapshot((snapshot) => {
      const data = snapshot.data();

      if (!pc.value.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pc.value.setRemoteDescription(answerDescription);
      }
    });

    // when get answer, add him to p2p connection
    answerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.value.addIceCandidate(candidate);
        }
      });
    });
  }

  const answer = async () => {
    const callDoc = firestore.collection("calls").doc(callId.value);
    const answerCandidates = callDoc.collection("answerCandidates");
    const offerCandidates = callDoc.collection("offerCandidates");

    // get ice candidates for call and add them to answer collection
    pc.value.addEventListener("icecandidate", event => {
      if (event.candidate) {
        answerCandidates.add(event.candidate.toJSON());
      }
    });

    // get call data by id
    const callData = (await callDoc.get()).data();

    // create offer for answer and add answer remote description
    const offerDescription = callData.offer;
    await pc.value.setRemoteDescription(new RTCSessionDescription(offerDescription));

    // create answer and add answer remote description
    const answerDescription = await pc.value.createAnswer();
    await pc.value.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await callDoc.update({ answer });

    offerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          let data = change.doc.data();
          pc.value.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
  }
</script>

<template>
  <div class="videos">
    <span>
      <h3>Local Stream</h3>
      <video class="webcam-video" :srcObject="localVideoSrcObject" autoplay playsinline></video>
    </span>
    <span>
      <h3>Remote Stream</h3>
      <video class="remote-webcam-video" :srcObject="remoteVideoSrcObject" autoplay playsinline></video>
    </span>
  </div>
  <div class="webcam-btn-wrapper">
    <button 
      id="webcam-btn"
      @click="start"
    >Start webcam</button>
  </div>
  <div class="create-new-call-wrapper">
    <h3>Create a new Call</h3>
    <button
      id="call-btn"
      @click="call"
    >Create Call (offer)</button>
  </div>
  <div class="join-call-wrapper">
    <h3>Join a Call</h3>
    <button 
      id="answer-btn"
      @click="answer"
    >Answer</button>
  </div>
</template>

<style scoped>
  .videos {
    margin-top: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .videos span {
    text-align: center;
  }

  video {
    width: 400px;
    height: 250px;
    margin: 15px;
    background-color: #2c3e50;
  }

  .webcam-btn-wrapper {
    margin-top: 15px;
    text-align: center;
  }

  .create-new-call-wrapper {
    margin-top: 25px;
    text-align: center;
  }

  .create-new-call-wrapper h3 {
    margin-bottom: 10px;
  }

  .join-call-wrapper {
    margin-top: 25px;
    text-align: center;
  }

  .join-call-wrapper h3 {
    margin-bottom: 10px;
  }
</style>