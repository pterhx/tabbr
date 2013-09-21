chrome.tabs.query({}, function(tabs) {
  var $tabsearch = $('#tab-search');
  titles = tabs.map(function(tab) {
    return tab.title;
  });
  $tabsearch.on('typeahead:selected', function(datum) {
    chrome.tabs.update(datum.id, {active: true});
  });
  $tabsearch.typeahead({
    name: 'tabs',
    local: titles
  });
});
