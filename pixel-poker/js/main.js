(function () {
  const PT = window.PT;
  window.addEventListener('DOMContentLoaded', () => {
    PT.Session.bind();
    PT.UI.menu();
    // Browsers only allow audio after a user gesture.
    const unlock = () => { PT.Audio.unlock(); PT.Audio.music(true); document.removeEventListener('pointerdown', unlock); document.removeEventListener('keydown', unlock); };
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);
  });
})();
