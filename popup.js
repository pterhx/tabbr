var template = '<p><img width="19px" height="19px" src="{{favIconUrl}}"/> {{value}}';
chrome.runtime.sendMessage({cmd: 'getDatums'}, function(response) {
  var $tabsearch = $('#tab-search');
  var closeWindow = function(tab) {
    window.close();
  }
  var navigateToDatum = function(_, datum) {
    chrome.tabs.update(datum.id, {active: true}, closeWindow);
  };
  $tabsearch.on('typeahead:selected', navigateToDatum);
  $tabsearch.on('typeahead:autocompleted', navigateToDatum);
  $tabsearch.typeahead({
    name: 'tabs',
    local: response.datums,
    template: template,
    engine: Hogan
  });
  $tabsearch.focus();
});
