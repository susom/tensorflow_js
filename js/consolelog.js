/*! @description Cross-Browser console.log() Wrapper
 * @version 2.1.3
 * @date 2015-03-05
 * @copyright 2015
 * https://github.com/patik/console.log-wrapper
 */
Function.prototype.bind&&/^object$|^function$/.test(typeof console)&&"object"==typeof console.log&&"function"==typeof window.addEventListener&&(["assert","clear","dir","error","info","log","profile","profileEnd","warn"].forEach(function(a){console[a]=this.call(console[a],console)},Function.prototype.bind),["_exception","count","debug","dirxml","group","groupCollapsed","groupEnd","table","time","timeEnd","timeline","timelineEnd","timeStamp","trace"].forEach(function(a){console[a]=console.log})),function(a,b){"undefined"!=typeof module?module.exports=b():"function"==typeof define&&define.amd?define(b):window[a]=b()}("log",function(){var a,b=navigator.userAgent,c=function(){var a=/Windows\sNT\s(\d+\.\d+)/;return"undefined"!=typeof console&&console.log&&/MSIE\s(\d+)/.test(b)&&a.test(b)&&parseFloat(a.exec(b)[1])>=6.1?!0:!1}(),d=function(){var a=Function.prototype.bind;return(!a||a&&"undefined"==typeof window.addEventListener)&&"object"==typeof console&&"object"==typeof console.log}(),e=!c&&!d&&/Trident\//.test(b),f=c||window.console&&"function"==typeof console.log,g=0,h={label:"Log:",collapsed:!0},i=function(){!function(a,b,c,d,e,f,g,h,i,j,k){a.getElementById(e)||(k=a[b+"NS"]&&a.documentElement.namespaceURI,k=k?a[b+"NS"](k,"script"):a[b]("script"),k[c]("id",e),k[c]("src",i+g+j),k[c](e,f),(a[d]("head")[0]||a[d]("body")[0]).appendChild(k),k=new Image,k[c]("src",i+h))}(document,"createElement","setAttribute","getElementsByTagName","FirebugLite","4","firebug-lite.js","releases/lite/latest/skin/xp/sprite.png","https://getfirebug.com/","#startOpened")},j=function(a){var b=a.split("\n").pop(),c=document.location.pathname.substr(0,document.location.pathname.lastIndexOf("/")+1);return b.indexOf(c)>-1&&(b=b.replace(c,"").replace(document.location.protocol+"//","")),/[^\(\@]+\:\d+\:\d+\)?$/.test(b)?b="@"+/([^\(\@]+\:\d+\:\d+)\)?$/.exec(b)[1]:(b.indexOf(" (")>-1?b=b.split(" (")[1].substring(0,b.length-1):b.indexOf("at ")>-1?b=b.split("at ")[1]:/([^\/]+\:\d+\:\d+)/.test(b)&&(b=/([^\/]+\:\d+\:\d+)/.exec(b)[1]),b="@"+b.substring(b.lastIndexOf("/")+1)),b},k=function(a){var b,c,d;if(null===a)return"null";if(/function|undefined|string|boolean|number/.test(typeof a))return typeof a;if("object"==typeof a)for(b=Object.prototype.toString.call(a),c=["Math","ErrorEvent","Error","Date","RegExp","Event","Array"],d=c.length;d--;)return b==="[object "+c[d]+"]"?c[d].toLowerCase():"object"==typeof HTMLElement&&a instanceof HTMLElement?"element":"string"==typeof a.nodeName&&1===a.nodeType?"element":"object"==typeof Node&&a instanceof Node?"node":"number"==typeof a.nodeType&&"string"==typeof a.nodeName?"node":/^\[object (HTMLCollection|NodeList|Object)\]$/.test(b)&&"number"==typeof a.length&&"undefined"!=typeof a.item&&(0===a.length||"object"==typeof a[0]&&a[0].nodeType>0)?"nodelist":"object";return"unknown"};return a=function(){var b,f,h=arguments,l=Array.prototype.slice.call(h),m=c||window.console&&"function"==typeof console.log;if(a.history.push(arguments),m){if(a.options.group&&(a.options.group.collapsed?console.groupCollapsed(a.options.group.label):console.group(a.options.group.label)),a.options.lineNumber&&(b=new Error,b.fileName&&b.lineNumber?l.push("@"+b.fileName.substr(b.fileName.lastIndexOf("/")+1)+":"+b.lineNumber+":1"):b.stack&&l.push(j(b.stack))),a.detailPrint&&a.needsDetailPrint)for(console.log("-----------------"),h=a.detailPrint(h),f=0;f<h.length;)console.log(h[f]),f++;else if(1===l.length&&"string"==typeof l[0])console.log(l.toString());else if(e)for(f=0;f<h.length;)e&&"object"===k(h[f])?console.dir(h[f]):console.log(h[f]),f++;else console.log(l);a.options.group&&console.groupEnd()}else if(d)if(a.detailPrint)for(h=a.detailPrint(h),h.unshift("-----------------"),f=0;f<h.length;)Function.prototype.call.call(console.log,console,Array.prototype.slice.call([h[f]])),f++;else Function.prototype.call.call(console.log,console,Array.prototype.slice.call(h));else document.getElementById("FirebugLite")?20>g?(setTimeout(function(){window.log.apply(window,h)},500),g++):g=0:(i(),setTimeout(function(){window.log.apply(window,h)},3e3),a.needsDetailPrint=!1)},a.history=[],a.options={lineNumber:!0,group:!1},e&&!a.options.group&&(a.options.group=h),a.settings=function(b){b&&"object"===k(b)&&(f&&console.group&&("boolean"==typeof b.group?a.options.group=b.group?h:!1:"object"===k(b.group)&&(a.options.group=h,"undefined"!=typeof b.group.collapsed&&(a.options.group.collapsed=!!b.group.collapsed),"string"==typeof b.group.label&&(a.options.group.label=b.group.label))),"undefined"!=typeof b.lineNumber&&(a.options.lineNumber=!!b.lineNumber))},a});