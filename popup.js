chrome.tabs.query({}, function(tabs) {
  titles = tabs.map(function(tab) {
    return tab.title;
  });
  $('#tab-search').typeahead({
    name: 'tabs',
    local: titles
  });
});
