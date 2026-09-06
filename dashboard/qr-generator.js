const button = document.querySelector('#create');
button?.addEventListener('click', async () => {
  // TODO: call the authenticated relay endpoint and render the returned pairing URL with a QR library.
  document.querySelector('#status').textContent = 'Pairing QR generation must use an authenticated operator session.';
});
