var template = '<div><img width="19px" height="19px" src="{{favIconUrl}}"/> {{value}}<a class="indx">{{index}}</a></div>';
chrome.runtime.sendMessage({cmd: 'getDatums'}, function(response) {
  var $tabsearch = $('#tab-search');
  var $previewImg = $('#preview-img');
  var $previewH1 = $('#preview-header');
  var closeWindow = function(tab) {
    window.close();
  };
  var navigateToDatum = function(datum) {
    chrome.windows.update(datum.windowId, {focused: true}, function() {
      chrome.tabs.update(datum.id, {active: true}, closeWindow);
    });
  };
  var displayedDatums = [],
      currentIndex = 0;

  var displayPreview = function(datum) {
    var previewUrl = datum.previewUrl;
    if (typeof previewUrl !== 'undefined') {
      $previewImg.attr('src', previewUrl);
      $previewImg.show();
      $previewH1.hide();
    } else {
      $previewImg.hide();
      $previewH1.show();
    }
  };
  var drawDatum = function(datum) {
    var suggestion = document.createElement('div');
    suggestion.style.whiteSpace = 'nowrap';
    suggestion.style.cursor = 'pointer';
    suggestion.className = 'tt-suggestion';
    if (displayedDatums.length === 0) {
      suggestion.className += ' selected';
      displayPreview(datum);
      datum.index = ' ';
    } else if (displayedDatums.length <= 9){
      datum.index = displayedDatums.length;
    } else {
      datum.index = ' ';
    }
    suggestion.innerHTML = Hogan.compile(template).render(datum);
    $('.tt-suggestions').append(suggestion);
    displayedDatums.push(datum);
  };

  response.datums = _.sortBy(response.datums, function(datum) {
    return -(new Date(datum.lastAccessTime)).getTime();
  });
  for (var i=0; i < response.datums.length; i++) {
    drawDatum(response.datums[i]);
  }

  var datumScore = function(query, datum) {
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
    console.log(datum.value + ': ' + datum.score);
  };

  var tokenScore = function(query, token) {
    term = token.term.toLowerCase();
    query = query.toLowerCase();
    var dist = levDist(query, term);
    var factor = 1;
    if (query.length === 0) {
      return 0;
    }

    if (query.charAt(0) === '-') {
      query = query.slice(1);
      factor = -1;
    }
    if (query.length > term.length) {
      return 0;
    }
    min = Math.min(query.length, term.length);
    max = Math.max(query.length, term.length);
    if (dist > (max - min + 1)) {
      return 0;
    }
    if (dist === 0) {
      score = 6;
    } else if (term.indexOf(query) === 0) {
      score = 4;
    } else if (term.indexOf(query) > 0) {
      score =  3;
    } else if (dist <= token.length / 3.5) {
      score = token.length / 3 - dist + 1;
    } else {
      score = min / (dist + min + 1);
      score *= score;
    }
    score = score * token.weight * factor;
    console.log('\t' + query + ', ' + term + ': ' + score);
    return score;
  };

  var compareDatum = function(d) {
    return -d.score;
  };

  var getDateFilter = function(filterNquery) {
    if (filterNquery.indexOf("within") < 0) {
      return [filterNquery];
    }
    var withinNquery = filterNquery.split("within"),
        not = withinNquery[0].indexOf("not") >= 0,
        numMinsNquery = withinNquery[1].trim().split(" "),
        numMins = parseInt(numMinsNquery[0], 10),
        date = new Date(new Date() - 60000 * numMins);
    query = numMinsNquery[1] || "";
    return [query, filter];

    function filter(datum) {
      var res = not === true && new Date(datum.lastAccessTime) < date ||
        not === false && date < new Date(datum.lastAccessTime);
      return res;
    }
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
      displayPreview(displayedDatums[currentIndex]);
      return;
    } else if (e.keyCode == 40) { // down
      $($('.tt-suggestion')[currentIndex]).removeClass('selected');
      currentIndex = Math.min(displayedDatums.length - 1, currentIndex + 1);
      $($('.tt-suggestion')[currentIndex]).addClass('selected');
      displayPreview(displayedDatums[currentIndex]);
      return;
    } else if (e.keyCode === 68 && e.ctrlKey) { // ctrl + d
      tabIds = displayedDatums.map(function(datum) {
        return datum.id;
      });
      chrome.tabs.remove(tabIds, closeWindow);
      return;
    } else if (e.ctrlKey && e.keyCode >= 49 && e.keyCode <= 57) {
      currentIndex = e.keyCode - 48;
      return navigateToDatum(displayedDatums[currentIndex]);
    }
    if ((e.keyCode < 48 || e.keyCode > 65 + 52) && e.keyCode != 8 &&
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
    if (displayedDatums.length === 0) {
      var noResult = document.createElement('p');
      noResult.innerText = 'no results found :(';
      $(".tt-suggestions").append(noResult);
      $previewImg.hide();
      $previewH1.show();
    }
  });

  $tabsearch.focus();
});
