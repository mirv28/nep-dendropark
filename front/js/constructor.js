let routeMode = null;
let startPoint = null;
let endPoint = null;
let waypointPoints = [];

document.getElementById("startBtn").onclick = () => {
  routeMode = "start";
};

document.getElementById("endBtn").onclick = () => {
  routeMode = "end";
};

document.getElementById("waypointBtn").onclick = () => {
  routeMode = "waypoint";
};
