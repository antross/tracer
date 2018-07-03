var s = document.createElement('script');
s.src = (window.browser || window.chrome).extension.getURL('main.js');
s.onload = function() {
    s.parentNode.removeChild(s);
};
(document.head || document.documentElement).appendChild(s);
