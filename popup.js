var template = '<p><img width="19px" height="19px" src="{{favIconUrl}}"/> {{value}}';

chrome.runtime.sendMessage({cmd: 'getDatums'}, function(response) {
  var $tabsearch = $('#tab-search');
  $tabsearch.on('typeahead:selected', function(_, datum) {
    chrome.tabs.update(datum.id, {active: true});
  });
  $tabsearch.typeahead({
    name: 'tabs',
    local: response.datums,
    template: template,
    engine: Hogan
  });
});
