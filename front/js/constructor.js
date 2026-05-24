let constructorMode = null;

let startPoint = null;
let endPoint = null;

let mandatoryPoints = [];

let constructorRouteLayer = null;
let constructorPointLayer = null;

// панель
const panel = document.createElement("div");

panel.id = "routing-panel";

panel.classList.add("hidden");

panel.innerHTML = `
    <button id="start-btn">Начало</button>
    <button id="end-btn">Конец</button>
    <button id="mandatory-btn">Обязательные</button>
    <button id="build-btn">Построить</button>
`;

document.body.appendChild(panel);
const startBtn = document.getElementById("start-btn");
const endBtn = document.getElementById("end-btn");
const mandatoryBtn = document.getElementById("mandatory-btn");
const buildBtn = document.getElementById("build-btn");

function toggleConstructorPanel() {
  const panel = document.getElementById("routing-panel");

  panel.classList.toggle("hidden");
}

// режимы
startBtn.onclick = () => {
  constructorMode = "start";

  console.log("MODE START");
};

endBtn.onclick = () => {
  constructorMode = "end";

  console.log("MODE END");
};

mandatoryBtn.onclick = () => {
  constructorMode = "mandatory";

  console.log("MODE MANDATORY");
};

// построение
document.getElementById("build-btn").onclick = async () => {
  console.log("BUILD");

  console.log("start =", startPoint);
  console.log("end =", endPoint);
  if (!startPoint || !endPoint) {
    alert("Выберите начало и конец");
    return;
  }

  const response = await fetch(
    `${API_URL}/route?start=${startPoint}&end=${endPoint}`,
  );

  const geojson = await response.json();

  drawRoute(geojson);
};

function drawRoute(geojson) {
  if (constructorRouteLayer) {
    map.removeLayer(constructorRouteLayer);
  }

  if (constructorPointLayer) {
    map.removeLayer(constructorPointLayer);
  }

  const feature = new ol.format.GeoJSON().readFeature(geojson, {
    featureProjection: "EPSG:3857",
  });

  // линия
  feature.setStyle(
    new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: "#ff6600",
        width: 5,
      }),
    }),
  );

  constructorRouteLayer = new ol.layer.Vector({
    source: new ol.source.Vector({
      features: [feature],
    }),
  });

  map.addLayer(constructorRouteLayer);

  // вершины
  const coords = feature.getGeometry().getCoordinates();

  const pointFeatures = coords.map((coord) => {
    const point = new ol.Feature({
      geometry: new ol.geom.Point(coord),
    });

    point.setStyle(
      new ol.style.Style({
        image: new ol.style.Circle({
          radius: 6,

          fill: new ol.style.Fill({
            color: "#ffffff",
          }),

          stroke: new ol.style.Stroke({
            color: "#ff6600",
            width: 3,
          }),
        }),
      }),
    );

    return point;
  });

  constructorPointLayer = new ol.layer.Vector({
    source: new ol.source.Vector({
      features: pointFeatures,
    }),
  });

  map.addLayer(constructorPointLayer);
}
document
  .getElementById("constructorBtn")
  .addEventListener("click", toggleConstructorPanel);
