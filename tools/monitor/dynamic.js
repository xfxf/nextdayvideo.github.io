const fetchState = async (roomName) => {

  const fetchResponse = await fetch(`https://pyconlinestreammonitor.azurewebsites.net/api/stream/${roomName}`);

  console.log("Got fetchResponse", fetchResponse);

  const blob = await fetchResponse.json();

  console.log("Got blob", blob);

  const { live, streamURL, error, offlineReason } = blob;

  if (error) {
    // TODO: Handle error
    return { mode: 'error', error };
  }

  if (!live) {
    console.log('Offline because:', offlineReason);
    return { mode: 'offline' };
  }

  // TODO: Handle actually being live. Oh.
  return { mode: 'live', streamURL };
}

const wait = (time) => new Promise(resolve => setTimeout(resolve, time));

const run = async () => {
  const myPlayer = amp("azuremediaplayer", {
    nativeControlsForTouch: false,
    controls: true,
    autoplay: true,
    width: "100%",
    height: "100%",
    muted: true,
    // logo: {
    //   enabled: false
    // }
  });

  

  const room = (new URL(location.href)).searchParams.get('event');

  if (!room) {
    throw new Error('Event not set');
  }

  const offlineEl = document.getElementById('offline');
  const roomNameEl = document.getElementById('room-name');

  roomNameEl.textContent = `${room}...`;

  let currentMode = 'pending';
  let currentStreamURL;

  let nextState;
  while (nextState = await fetchState(room)) {    
    roomNameEl.textContent = `${room} ${nextState.mode}`;

    if (nextState.mode === 'error') {
      console.log('Problem fetching data from server: ', nextState.error);
      await wait(30000);
      continue;
    }

    if (nextState.mode === 'offline') {
      offlineEl.style.display = '';
    } else {
      offlineEl.style.display = 'none';
    }

    if (nextState.mode === 'live') {
      if (nextState.streamURL !== currentStreamURL) {
        myPlayer.src({
          src: nextState.streamURL,
          type: "application/vnd.ms-sstr+xml"
        });
      }
    } else {
      if (currentStreamURL) {
        if (myPlayer.isFullscreen()) {
          myPlayer.exitFullscreen();
        }

        myPlayer.pause();
      }
    }

    currentMode = nextState.mode;
    currentStreamURL = nextState.streamURL;

    console.log('Set currentState to be: ', {
      currentMode,
      currentStreamURL,
    });


    await wait(30000);

    roomNameEl.textContent = `${room}...`;
  };

};

run().catch(err => console.error('Failed somewhere', err));
