/*
  REQUEST AUTHORISATION TO USE CLIPBOARD CONTENT AS WELL AS WRITE TO IT
  THIS IS IMPORTANT FOR SECURITY AND PRIVACY 
*/

if (navigator.clipboard) {
  navigator.clipboard.readText()
    .then(text => {
      console.log('Clipboard contents:', text);
    })
    .catch(err => {
      console.error('Failed to read clipboard contents:', err);
    });
} else {
  console.error('Clipboard access not supported.');
}