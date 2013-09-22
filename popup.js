var template = '<p><img width="19px" height="19px" src="{{favIconUrl}}"/> {{value}}</p>';
chrome.runtime.sendMessage({cmd: 'getDatums'}, function(response) {
  var $tabsearch = $('#tab-search');
  var closeWindow = function(tab) {
    window.close();
  }
  var navigateToDatum = function(_, datum) {
    chrome.tabs.update(datum.id, {active: true}, closeWindow);
  };
  var displayedDatums = [],
      currentIndex = 0;
  var drawDatum = function(datum) {
    var suggestion = document.createElement("div");
    suggestion.style.whiteSpace = "nowrap";
    suggestion.style.cursor = "pointer";
    suggestion.className = "tt-suggestion";
    if (displayedDatums.length == 0) {
      suggestion.className += ' selected';
    }
    suggestion.innerHTML = Hogan.compile(template).render(datum);
    $(".tt-suggestions").append(suggestion);
    displayedDatums.push(datum);
  }
  for (var i=0; i < response.datums.length; i++) {
    drawDatum(response.datums[i]);
  }
  var matches = function(query, datum) {
    return (new RegExp(query.split("").join(".*"))).test(datum.value);
  };
  $tabsearch.on('keydown', function(e) {
    if (e.keyCode == 13) { // enter
      return navigateToDatum('penis', displayedDatums[currentIndex]);
    } else if (e.keyCode == 38) { // up
      $($('.tt-suggestion')[currentIndex]).removeClass('selected');
      currentIndex = Math.max(0, currentIndex - 1);
      $($('.tt-suggestion')[currentIndex]).addClass('selected');
      return;
    } else if (e.keyCode == 40) { // down
      $($('.tt-suggestion')[currentIndex]).removeClass('selected');
      currentIndex = Math.min(displayedDatums.length - 1, currentIndex + 1);
      $($('.tt-suggestion')[currentIndex]).addClass('selected');
      return;
    }
    if ((e.keyCode < 65 || e.keyCode > 65 + 52) && e.keyCode != 8 &&
        e.keyCode != 18) {
      return;
    }
    currentIndex = 0;
    displayedDatums.length = 0;
    $(".tt-suggestions").children().remove();
    for (var i=0; i < response.datums.length; i++) {
      var datum = response.datums[i];
      if (matches($tabsearch.val(), datum)) {
        drawDatum(datum);
      }
    }
  });

  $tabsearch.focus();
});
