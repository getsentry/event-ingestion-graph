function hideAllElements() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('embed') !== '1') {
    return;
  }

  const body = $('body');
  const svg = $('svg');

  // Hide everything except <svg>
  body.children().hide();
  body.addClass('embedded');

  svg.attr('width', window.innerWidth);
  svg.show();
}

$(document).ready(hideAllElements);
