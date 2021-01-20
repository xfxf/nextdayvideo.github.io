
const fetchState = async (displayName, id) => {
  try {
    const before = Date.now();
    const fetchResponse = await fetch(`https://fpylzao93a.execute-api.ap-southeast-2.amazonaws.com/api/stream/${encodeURIComponent(id)}`);
    const state = await fetchResponse.json();

    const totalTime = Date.now() - before;

    console.log(`[${displayName}] Got state in ${totalTime}ms`, state);

    return state;
  } catch(err) {
    return { ok: false, error: err.message }
  }
}

const wait = (time) => new Promise(resolve => setTimeout(resolve, time));

const createSetTitleLabel = (el, room) => ({ loading = false, live = false, error }) => {
  let description = '';
  if (loading) {
    description = '...';
  } else if (error) {
    description = `: ${error}`;
  } else if (live) {
    description = ' (live)';
  } else {
    description = ' (offline)';
  }
  el.textContent = `${room}${description}`;
}

const run = async () => {
  if (!Hls.isSupported()) {
    alert('This multiview is only intended for use with hls.js, sorry');
  }
  
  const video = document.getElementById('azuremediaplayer');

  const hls = new Hls({
      debug: true
  });
  hls.attachMedia(video);
  hls.on(Hls.Events.MEDIA_ATTACHED, () => {
    video.muted = true;
    video.play();
});

  // const player = amp("azuremediaplayer", {
  //   nativeControlsForTouch: false,
  //   controls: true,
  //   autoplay: true,
  //   width: "100%",
  //   height: "100%",
  //   muted: true,
  //   // logo: { enabled: false }
  // });

  
  const params = (new URL(location.href)).searchParams;

  const displayName = params.get('name');
  const id = params.get('id');

  if (!displayName) {
    throw new Error('Display Name not set');
  }
  if (!id) {
    throw new Error('ID not set');
  }

  const offlineEl = document.getElementById('offline');
  const roomNameEl = document.getElementById('room-name');

  const setTitleLabel = createSetTitleLabel(roomNameEl, displayName);

  let currentStreamURL;

  do {
    setTitleLabel({ loading: true });

    const { error, stream: streamURL, online } = await fetchState(displayName, id);

    if (error) {
      setTitleLabel({ error: error });
      await wait(30000);
      continue;
    }

    setTitleLabel({ live: !!streamURL });

    if (streamURL) {
      video.style.display = '';
      offlineEl.style.display = 'none';
      if (streamURL !== currentStreamURL) {
        hls.loadSource(streamURL + '?cdn=fastly');
      }
    } else {
      offlineEl.style.display = '';
      offlineEl.querySelector('small').textContent = `${displayName}: Stream offline`;
      video.style.display = 'none';
      
      if (currentStreamURL) {
        if (player.isFullscreen()) {
          player.exitFullscreen();
        }

        player.pause();
      }
    }

    currentStreamURL = streamURL;

    const offset = 30000 + (Math.round(Math.random() * 10000) - 5000);


    console.log(`[${displayName}] Next in ${offset}ms`);

    await wait(offset);
  } while(true);

};

run().catch(err => console.error('Failed somewhere', err));
