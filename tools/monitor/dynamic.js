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

  const params = (new URL(location.href)).searchParams;
  const hlsDebug = params.get('hlsdebug') === 'true';

  const hls = new Hls({
      debug: hlsDebug,
      enableWorker: true,
      fragLoadingMaxRetry: Infinity,
      fragLoadingMaxRetryTimeout: 5000,
      levelLoadingMaxRetry: Infinity,
      levelLoadingMaxRetryTimeout: 5000,
      liveBackBufferLength: 0,
      liveMaxLatencyDurationCount: 10,
      manifestLoadingMaxRetry: Infinity,
      manifestLoadingMaxRetryTimeout: 5000,
  });
  hls.attachMedia(video);
  hls.on(Hls.Events.MEDIA_ATTACHED, () => {
    video.muted = true;
    video.play();
  });
  

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

  const showError = (message) => {
    offlineEl.style.display = '';
    offlineEl.querySelector('small').textContent = `${displayName}: ${message}`;
    video.style.display = 'none';
  }

  let refreshingFromState = false;

  const refreshFromState = async () => {
    if (refreshingFromState) {
      return;
    }
    refreshingFromState = true;

    setTitleLabel({ loading: true });

    const { error, stream: streamURL, online } = await fetchState(displayName, id);

    if (error) {
      setTitleLabel({ error: error });
      refreshingFromState = false;
      return;
    }

    setTitleLabel({ live: !!streamURL });

    if (streamURL) {
      video.style.display = '';
      offlineEl.style.display = 'none';
      if (streamURL !== currentStreamURL) {
        hls.loadSource(streamURL + '?cdn=fastly');
      }
    } else {
      showError(`Stream offline`);
      
      if (currentStreamURL) {
        if (player.isFullscreen()) {
          player.exitFullscreen();
        }

        player.pause();
      }
    }

    currentStreamURL = streamURL;

    refreshingFromState = false;
  };

  hls.on(Hls.Events.ERROR, function (eventName, data) {
    console.warn('Error event:', data);
    switch (data.details) {
    case Hls.ErrorDetails.MANIFEST_LOAD_ERROR:
      showError(`MANIFEST_LOAD_ERROR`);
    case Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT:
      showError('Timeout while loading manifest');
      break;
    case Hls.ErrorDetails.MANIFEST_PARSING_ERROR:
      showError(`Error while parsing manifest: ${data.reason}`);
      break;
    case Hls.ErrorDetails.LEVEL_EMPTY_ERROR:
      showError('Loaded level contains no fragments ' + data.level + ' ' + data.url);
      break;
    case Hls.ErrorDetails.LEVEL_LOAD_ERROR:
      showError('Error while loading level playlist ' + data.context.level + ' ' + data.url);
      break;
    case Hls.ErrorDetails.LEVEL_LOAD_TIMEOUT:
      showError('Timeout while loading level playlist ' + data.context.level + ' ' + data.url);
      break;
    case Hls.ErrorDetails.LEVEL_SWITCH_ERROR:
      showError('Error while trying to switch to level ' + data.level);
      break;
    case Hls.ErrorDetails.FRAG_LOAD_ERROR:
      showError('Error while loading fragment ' + data.frag.url);
      break;
    case Hls.ErrorDetails.FRAG_LOAD_TIMEOUT:
      showError('Timeout while loading fragment ' + data.frag.url);
      break;
    case Hls.ErrorDetails.FRAG_LOOP_LOADING_ERROR:
      showError('Fragment-loop loading error');
      break;
    case Hls.ErrorDetails.FRAG_DECRYPT_ERROR:
      showError('Decrypting error:' + data.reason);
      break;
    case Hls.ErrorDetails.FRAG_PARSING_ERROR:
      showError('Parsing error:' + data.reason);
      break;
    case Hls.ErrorDetails.KEY_LOAD_ERROR:
      showError('Error while loading key ' + data.frag.decryptdata.uri);
      break;
    case Hls.ErrorDetails.KEY_LOAD_TIMEOUT:
      showError('Timeout while loading key ' + data.frag.decryptdata.uri);
      break;
    case Hls.ErrorDetails.BUFFER_APPEND_ERROR:
      showError('Buffer append error');
      break;
    case Hls.ErrorDetails.BUFFER_ADD_CODEC_ERROR:
      showError('Buffer add codec error for ' + data.mimeType + ':' + data.err.message);
      break;
    case Hls.ErrorDetails.BUFFER_APPENDING_ERROR:
      showError('Buffer appending error');
      break;
    case Hls.ErrorDetails.BUFFER_STALLED_ERROR:
      showError('Buffer stalled error');
      break;
    default:
      break;
    }

    if (data.fatal) {
      console.error('Fatal error :' + data.details);
      switch (data.type) {
      case Hls.ErrorTypes.MEDIA_ERROR:
        showError('MEDIA_ERROR');
        break;
      case Hls.ErrorTypes.NETWORK_ERROR:
        showError('NETWORK_ERROR');
        break;
      default:
        logError('An unrecoverable error occurred');
        break;
      }

      currentStreamURL = "error://"
      refreshFromState();
    }
  });

  do {
    await refreshFromState();

    const offset = 30000 + (Math.round(Math.random() * 10000) - 5000);

    console.log(`[${displayName}] Next in ${offset}ms`);

    await wait(offset);
  } while(true);
};

run().catch(err => console.error('Failed somewhere', err));
