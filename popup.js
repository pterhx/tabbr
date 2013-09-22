var template = '<p><img width="19px" height="19px" src="{{favIconUrl}}"/> {{value}}</p>';
chrome.runtime.sendMessage({cmd: 'getDatums'}, function(response) {
  var $tabsearch = $('#tab-search');
  var closeWindow = function(tab) {
    window.close();
  }
  var navigateToDatum = function(datum) {
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
    console.log(datum.value + ': ' + datum.score);
    if (typeof datum.prefixMap[query] !== 'undefined') {
      datum.score = (datum.prefixMap[query] + query.length) * 2;
    } else {
      datum.score = 0;
    }
    query.split(' ').forEach(function(q) {
      scores = datum.tokens.map(function(token) {
        return tokenScore(q, token);
      });
      scores.push(0);
      datum.score += scores.reduce(function(prev, curr, i, arr) {
        return prev + curr;
      });
      
    });
  };

  var tokenScore = function(query, token) {
    token = token.toLowerCase();
    query = query.toLowerCase();
    dist = levDist(query, token);
    if (query.length > token.length) {
      return 0;
    }
    min = Math.min(query.length, token.length);
    max = Math.max(query.length, token.length);
    if (dist > (max - min + 1)) {
      return 0;
    }
    if (dist == 0) {
      console.log('\t' + query + ', ' + token + ': ' + 6);
      return 6;
    } else if (token.indexOf(query) === 0) {
      console.log('\t' + query + ', ' + token + ': ' + 4);
      return 4;
    } else if (token.indexOf(query) > 0) {
      return 3;
    }
    score = min / (dist + min);
    score *= score;
    console.log('\t' + query + ', ' + token + ': ' + score);
    return score;
  };

  var compareDatum = function(d) {
    return -d.score;
  };

  var getDateFilter = function(filterNquery) {
    if (filterNquery.indexOf("within") >= 0) {
      var withinNquery = filterNquery.split("within"),
          not = withinNquery[0].indexOf("not") >= 0,
          numMinsNquery = withinNquery[1].trim().split(" "),
          numMins = parseInt(numMinsNquery[0]),
          date = new Date(new Date() - 60000 * numMins);
      query = numMinsNquery[1] || "";
      console.log("filtering for after date: "+date.toLocaleTimeString());
      return [query, filter];

      function filter(datum) {
        var res = not === true && new Date(datum.lastAccessTime) < date ||
          not === false && date < new Date(datum.lastAccessTime);
        return res;
      }
    }
    return [filterNquery];
  };

  $tabsearch.on('keyup', function(e) {
    if (e.keyCode == 13) { // enter
      chrome.runtime.sendMessage({cmd: 'addPrefix', 
                                  prefix: $tabsearch.val(),
                                  tabId: displayedDatums[currentIndex].id });
      return navigateToDatum(displayedDatums[currentIndex]);
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

    var queryNfilter = getDateFilter($tabsearch.val()),
        query = queryNfilter[0],
        filter = queryNfilter[1],
        datums = typeof filter === "undefined" ? response.datums
                                               : response.datums.filter(filter);
    datums.forEach(function(datum) {
      datumScore(query, datum);
    });

    sortedDatums = _.sortBy(datums, compareDatum);
    for (var i=0; i < sortedDatums.length; i++) {
      var datum = sortedDatums[i];
      if (datum.score >= query.length / 10) {
        drawDatum(datum);
      }
    }
  });

  $tabsearch.focus();
});
