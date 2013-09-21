var template = [
  '<p><img width="19px" height="19px" src="{{faviconUrl}}"/>',
  ' {{value}}</p>'
].join('');
chrome.tabs.query({}, function(tabs) {
  var $tabsearch = $('#tab-search');
  titles = tabs.map(function(tab) {
    titleTokens = tab.title.split(' ');
    return {
      value: tab.title,
      tokens: titleTokens,
      faviconUrl: tab.favIconUrl,
      id: tab.id
    };
  });
  $tabsearch.on('typeahead:selected', function(_, datum) {
    chrome.tabs.update(datum.id, {active: true});
  });
  $tabsearch.typeahead({
    name: 'tabs',
    local: titles,
    template: template,
    engine: Hogan
  });
});
