// our ROT13/spoiler functionality

function rot13(input) {
  // thanks, "ESL": http://stackoverflow.com/a/41435838/1414079
  return input.
    replace(/[a-z]/gi,c=>String.fromCharCode((c=c.charCodeAt())+((c&95)>77?-13:13))).
    replace(/\d/gi,c=>(c>4?-5:5)+c*1);
}

module.exports = rot13;