chrome.tabs.query({}, function(tabs) {
  var $tabsearch = $('#tab-search');
  titles = tabs.map(function(tab) {
    return {
      value: tab.title,
      tokens: tab.title.split(' '),
      id: tab.id
    }
  });
  $tabsearch.on('typeahead:selected', function(_, datum) {
    chrome.tabs.update(datum.id, {active: true});
  });
  $tabsearch.typeahead({
    name: 'tabs',
    local: titles
  });
});
