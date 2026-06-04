let constructorMode = null;
let startPoint = null;
let endPoint = null;
let mandatoryPoints = [];
let constructorRouteLayer = null;
let constructorPointLayer = null;

const startBtn = document.getElementById("start-btn");
const endBtn = document.getElementById("end-btn");
const mandatoryBtn = document.getElementById("mandatory-btn");
const buildBtn = document.getElementById("build-btn");

function openConstructorPanel() {
  document.getElementById("routes-panel").classList.add("hidden");

  document.getElementById("constructor-panel").classList.remove("hidden");
}
function closeConstructorPanel() {
  document.getElementById("constructor-panel").classList.add("hidden");

  document.getElementById("routes-panel").classList.remove("hidden");
}
document
  .getElementById("backToRoutes")
  .addEventListener("click", closeConstructorPanel);

// режимы
startBtn.onclick = () => setConstructorMode("start");

endBtn.onclick = () => setConstructorMode("end");

mandatoryBtn.onclick = () => setConstructorMode("mandatory");
function setConstructorMode(mode) {
  constructorMode = mode;

  startBtn.classList.remove("constructor-active");
  endBtn.classList.remove("constructor-active");
  mandatoryBtn.classList.remove("constructor-active");

  if (mode === "start") {
    startBtn.classList.add("constructor-active");
  }

  if (mode === "end") {
    endBtn.classList.add("constructor-active");
  }

  if (mode === "mandatory") {
    mandatoryBtn.classList.add("constructor-active");
  }

  console.log("MODE =", mode);
}
let filteredPointsLayer = null;
document
  .getElementById("highlight-btn")
  .addEventListener("click", highlightFilteredPoints);

function highlightFilteredPoints() {
  const filters = {};

  const countryValue = document.getElementById("countryFilter").value;

  const heightValue = document.getElementById("heightFilter").value;

  const typeValue = document.getElementById("typeFilter").value;

  const yearValue = document.getElementById("yearFilter").value;

  if (countryValue && countryValue !== "all") {
    filters.country = countryValue;
  }

  if (heightValue) {
    filters.height = heightValue;
  }

  if (typeValue && typeValue !== "all") {
    filters.type = typeValue;
  }

  if (yearValue) {
    filters.year = yearValue;
  }

  let matched = points.filter((item) => {
    if (filters.country && item.plant_country !== filters.country) {
      return false;
    }

    if (filters.type && item.plant_type !== filters.type) {
      return false;
    }

    return true;
  });

  drawFilteredHighlights(matched);
}
function drawFilteredHighlights(data) {
  if (filteredPointsLayer) {
    map.removeLayer(filteredPointsLayer);
  }

  const features = data
    .filter((item) => item.latitude && item.longitude)
    .map((item) => {
      const feature = new ol.Feature({
        geometry: new ol.geom.Point(
          ol.proj.fromLonLat([item.longitude, item.latitude]),
        ),
      });

      feature.setStyle(
        new ol.style.Style({
          image: new ol.style.Circle({
            radius: 14,
            fill: new ol.style.Fill({
              color: [255, 255, 0, 0.5],
            }),
            stroke: new ol.style.Stroke({
              color: "orange",
              width: 1,
            }),
            displacement: [0.5, 6],
          }),
        }),
      );

      return feature;
    });

  filteredPointsLayer = new ol.layer.Vector({
    source: new ol.source.Vector({
      features,
    }),
  });

  map.addLayer(filteredPointsLayer);
}

let startMarkerLayer = null;
let endMarkerLayer = null;
function createSelectionMarker(coord, type) {
  let iconPath = "images/icons/pin_A.png";
  if (type === "end") {
    iconPath = "images/icons/pin_B.png";
  }

  const feature = new ol.Feature({
    geometry: new ol.geom.Point(coord),
  });

  feature.setStyle(
    new ol.style.Style({
      image: new ol.style.Icon({
        src: iconPath,
        scale: 1,
        anchor: [0.5, 1.3],
      }),
    }),
  );

  return new ol.layer.Vector({
    source: new ol.source.Vector({
      features: [feature],
    }),
  });
}
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

  const data = await response.json();
  document.getElementById("route-info").innerHTML = `
    Длина маршрута: ${Math.round(data.distance)} м
    <br>
    Время пешком: ~${data.duration} мин
  `;
  drawRoute(data.route, data.start_segment, data.end_segment);
};

function drawRoute(routeGeojson, startGeojson, endGeojson) {
  if (constructorRouteLayer) {
    map.removeLayer(constructorRouteLayer);
  }

  if (constructorPointLayer) {
    map.removeLayer(constructorPointLayer);
  }

  // главный маршрут
  const mainFeature = new ol.format.GeoJSON().readFeature(routeGeojson, {
    featureProjection: "EPSG:3857",
  });

  // стартовый сегмент
  const startFeature = new ol.format.GeoJSON().readFeature(startGeojson, {
    featureProjection: "EPSG:3857",
  });

  // конечный сегмент
  const endFeature = new ol.format.GeoJSON().readFeature(endGeojson, {
    featureProjection: "EPSG:3857",
  });

  // стиль линии
  const routeStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: "#ff6600",
      width: 5,
    }),
  });

  mainFeature.setStyle(routeStyle);
  startFeature.setStyle(routeStyle);
  endFeature.setStyle(routeStyle);

  // слой маршрута
  constructorRouteLayer = new ol.layer.Vector({
    source: new ol.source.Vector({
      features: [startFeature, mainFeature, endFeature],
    }),
  });

  map.addLayer(constructorRouteLayer);

  // вершины маршрута
  const coords = mainFeature.getGeometry().getCoordinates();

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
  .addEventListener("click", openConstructorPanel);

document.getElementById("clear-btn").onclick = clearConstructor;
function clearConstructor() {
  startPoint = null;
  endPoint = null;

  mandatoryPoints = [];

  constructorMode = null;

  startBtn.classList.remove("constructor-active");
  endBtn.classList.remove("constructor-active");
  mandatoryBtn.classList.remove("constructor-active");

  if (startMarkerLayer) {
    map.removeLayer(startMarkerLayer);
    startMarkerLayer = null;
  }

  if (endMarkerLayer) {
    map.removeLayer(endMarkerLayer);
    endMarkerLayer = null;
  }

  if (constructorRouteLayer) {
    map.removeLayer(constructorRouteLayer);
  }

  if (constructorPointLayer) {
    map.removeLayer(constructorPointLayer);
  }

  console.log("CONSTRUCTOR CLEARED");
}
