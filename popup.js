chrome.tabs.query({}, function(tabs) {
  tabs.forEach(function(tab) {
    console.log(tab.title);
  });
});
