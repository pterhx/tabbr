var template = '<p><img width="19px" height="19px" src="{{favIconUrl}}"/> {{value}}';
chrome.runtime.sendMessage({cmd: 'getDatums'}, function(response) {
  var $tabsearch = $('#tab-search');
  var navigateToDatum = function(_, datum) {
    chrome.tabs.update(datum.id, {active: true}, window.close);
  };
  $tabsearch.on('typeahead:selected', navigateToDatum);
  $tabsearch.on('typeahead:autocompleted', navigateToDatum);
  $tabsearch.typeahead({
    name: 'tabs',
    local: response.datums,
    template: template,
    engine: Hogan
  });
});
