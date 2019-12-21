
 export function IntilizeTimer(min,sec,won)
{
  
    document.getElementById('timer').innerHTML = min + ":" + sec;
    
    startTimer(won);
}
export function IntilizeCoins(min) {
  document.getElementById('coins').innerHTML = min.toString();
}
var myTimer;
function startTimer(won) 
{
  if(won){clearTimeout(myTimer);return;}
  console.log("Here")
  var presentTime = document.getElementById('timer').innerHTML;
  
  var timeArray = presentTime.split(/[:]+/);
  var m = +timeArray[0];
  var s = checkSecond((+timeArray[1] - 1));
  if(s==59){m=+m-1} 
  if(m<0&& !won)
  {
    document.getElementById("losebutton").click()
    
    return;
  }
  
  document.getElementById('timer').innerHTML =
    m + ":" + s;
  console.log(m);
  
myTimer = setTimeout(startTimer, 1000);
}

function checkSecond(sec) {
  if (sec < 10 && sec >= 0) {sec = "0" + sec}; // add zero in front of numbers < 10
  if (sec < 0) {sec = "59"};
  return sec;
}