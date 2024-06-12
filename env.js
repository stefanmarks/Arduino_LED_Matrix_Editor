const userAgent = navigator.userAgent.toLowerCase();
let isElectron = false;
if (userAgent.indexOf(' electron/') > -1) {
   isElectron = true;
}
let isDev = true;