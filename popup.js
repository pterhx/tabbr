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

  var datumScore = function(query, datum) {
    scores = datum.tokens.map(function(token) {
      return tokenScore(query, token);
    });
    datum.score = scores.reduce(function(prev, curr, i, arr) {
      return prev + curr;
    });
  };

  var tokenScore = function(query, token) {
    dist = levDist(query.toLowerCase(), token.toLowerCase());
    max = Math.max(query.length, token.length);
    score = (max - dist) / max;
    return score;
  };

  var compareDatum = function(a, b) {
    return b.score - a.score;
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

    response.datums.forEach(function(datum) {
      datumScore($tabsearch.val(), datum);
    });

    sortedDatums = response.datums.sort(compareDatum);
    for (var i=0; i < sortedDatums.length; i++) {
      var datum = sortedDatums[i];
      if (datum.score >= $tabsearch.val().length / 10) {
        drawDatum(datum);
      }
    }
  });

  $tabsearch.focus();
});
