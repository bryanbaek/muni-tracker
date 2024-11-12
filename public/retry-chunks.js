window.addEventListener('error', function(e) {
    if (e.message === 'Loading chunk failed') {
      window.location.reload();
    }
  });