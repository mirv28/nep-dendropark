let routeMode = false;
function toggleRoutePanel() {
  const plantsList = document.getElementById("plants-list");
  const routesPanel = document.getElementById("routes-panel");
  const plantDetail = document.getElementById("plant-detail");
  // включаем маршруты
  if (!routeMode) {
    routeMode = true;
    plantsList.style.display = "none";
    plantDetail.classList.add("hidden");
    routesPanel.classList.remove("hidden");
  }

  // выключаем маршруты
  else {
    routeMode = false;
    routesPanel.classList.add("hidden");
    plantDetail.classList.add("hidden");
    plantsList.style.display = "grid";
    // скрыть маршрут
    if (routeLayer) {
      map.removeLayer(routeLayer);
    }

    if (routePointLayer) {
      map.removeLayer(routePointLayer);
    }
    // удалить year popup
    if (typeof yearOverlays !== "undefined") {
      yearOverlays.forEach((overlay) => {
        map.removeOverlay(overlay);
      });

      yearOverlays = [];
    }

    // показать обычные растения
    if (markerLayer) {
      markerLayer.setVisible(true);
    }
  }
}
document.getElementById("mobileFilterBtn").addEventListener("click", () => {
  document.getElementById("right-panel").classList.add("mobile-open");
});

document.getElementById("closeFilters").addEventListener("click", () => {
  document.getElementById("right-panel").classList.remove("mobile-open");
});
var map = new ol.Map({
  target: "map",
  layers: [
    new ol.layer.Tile({
      source: new ol.source.OSM(),
    }),
  ],
  view: new ol.View({
    center: ol.proj.fromLonLat([56.0506595555, 54.7896770556]),
    zoom: 17,
  }),
});

let points = [];
let markerLayer;

///enters
let mapObjects = [
  {
    type: "entracne",
    name: "Вход: Уфимское шоссе",
    lat: 54.787335,
    lon: 56.050099,
    icon: "images/icons/enter.png",
  },
  {
    type: "entracne",
    name: "Вход: Шота Руставели",
    lat: 54.790634,
    lon: 56.049408,
    icon: "images/icons/enter.png",
  },
  {
    type: "entracne",
    name: "Вход: Даута Юлтыя 8",
    lat: 54.788672,
    lon: 56.045219,
    icon: "images/icons/enter.png",
  },
  {
    type: "entracne",
    name: "Вход: Даута Юлтыя 4",
    lat: 54.790641,
    lon: 56.046581,
    icon: "images/icons/enter.png",
  },
  {
    type: "playground",
    name: "Детская площадка",
    lat: 54.789717,
    lon: 56.048577,
    icon: "images/icons/playground.png",
  },
  {
    type: "playground",
    name: "Детская площадка",
    lat: 54.789442,
    lon: 56.048364,
    icon: "images/icons/playground.png",
  },
];

const popupElement = document.getElementById("popup");

const popupOverlay = new ol.Overlay({
  element: popupElement,
  positioning: "bottom-center",
  stopEvent: false,
  offset: [0, -25],
});

map.addOverlay(popupOverlay);

function loadPoints(filters = {}) {
  let url = "http://127.0.0.1:5000/plants";

  const params = new URLSearchParams(filters);

  if (params.toString()) {
    url += "?" + params.toString();
  }

  console.log("Загрузка:", url);

  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      points = data;

      updatePlantList(data);
      updateMarkers(data);
    });
}

function updatePlantList(data) {
  const container = document.getElementById("plants-list");
  container.innerHTML = "";

  const plantsMap = new Map();

  data.forEach((item) => {
    if (!plantsMap.has(item.plant_id)) {
      plantsMap.set(item.plant_id, {
        id: item.plant_id,
        name: item.plant_name,
        height: item.plant_height,
        country: item.plant_country,
        type: item.plant_type,
        year: item.plant_year,
        image: item.plant_image,
        points: 0,
      });
    }

    // считаем точки
    if (item.point_id && item.latitude !== null && item.longitude !== null) {
      plantsMap.get(item.plant_id).points++;
    }
  });

  plantsMap.forEach((plant) => {
    const card = document.createElement("div");
    card.className = "plant-card";

    card.innerHTML = `
    <img src="${plant.image || ""}">
      <span>${plant.name}</span><br>
      <small>${plant.points} точек</small>
    `;

    card.onclick = () => showPlantInfo(plant);

    container.appendChild(card);
  });
}

function updateMarkers(data) {
  if (markerLayer) {
    map.removeLayer(markerLayer);
  }

  let features = [];

  data.forEach((item) => {
    if (item.latitude && item.longitude) {
      let feature = new ol.Feature({
        geometry: new ol.geom.Point(
          ol.proj.fromLonLat([item.longitude, item.latitude]),
        ),
        point: item,
      });

      // выбор иконки по типу растения
      let iconSrc = "";

      if (item.plant_type === "Хвоя") {
        iconSrc = "images/icons/pine.png";
      } else {
        iconSrc = "images/icons/tree.png";
      }

      // стиль маркера
      feature.setStyle(
        new ol.style.Style({
          image: new ol.style.Icon({
            src: iconSrc,
            scale: 1,
            anchor: [0.5, 1],
          }),
        }),
      );

      features.push(feature);
    }
  });

  let source = new ol.source.Vector({
    features: features,
  });

  markerLayer = new ol.layer.Vector({
    source: source,
  });

  map.addLayer(markerLayer);

  console.log("Маркеров:", features.length);
}

function addMapObjects() {
  let objectFeatures = [];

  mapObjects.forEach((item) => {
    let feature = new ol.Feature({
      geometry: new ol.geom.Point(ol.proj.fromLonLat([item.lon, item.lat])),

      objectData: item,
    });

    feature.setStyle(
      new ol.style.Style({
        image: new ol.style.Icon({
          src: item.icon,
          scale: 1,
          anchor: [0.5, 1],
        }),
      }),
    );

    objectFeatures.push(feature);
  });

  let objectLayer = new ol.layer.Vector({
    source: new ol.source.Vector({
      features: objectFeatures,
    }),
  });

  map.addLayer(objectLayer);
}
map.on("click", function (evt) {
  let feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
    return feature;
  });

  if (!feature) {
    popupOverlay.setPosition(undefined);
    return;
  }

  // растения
  const plantPoint = feature.get("point");

  if (plantPoint) {
    showPopup(plantPoint, evt.coordinate);
    return;
  }

  // остальные объекты
  const objectData = feature.get("objectData");

  if (objectData) {
    popupElement.style.display = "block";

    popupElement.innerHTML = `
      <strong>${objectData.name}</strong>
    `;

    popupOverlay.setPosition(evt.coordinate);
  }
});

function showPopup(point, coord) {
  popupElement.style.display = "block";

  popupElement.innerHTML = `
<strong>${point.plant_name}</strong><br>
${point.plant_country || ""}
`;

  popupOverlay.setPosition(coord);
}

function showPlantInfo(plant) {
  fetch(`http://127.0.0.1:5000/plants/${plant.id}`)
    .then((res) => res.json())
    .then((data) => renderPlantDetail(data));
}

function renderPlantDetail(plant) {
  const list = document.getElementById("plants-list");
  const detail = document.getElementById("plant-detail");

  list.style.display = "none";
  detail.classList.remove("hidden");

  detail.innerHTML = `
    <div class="back-btn" onclick="closePlantDetail()">← Назад</div>

    <div class="gallery">
      ${plant.images.map((img) => `<img src="${img}">`).join("")}
    </div>

    <h3>${plant.name}</h3>

    <p><b>Страна:</b> ${plant.country}</p>
    <p><b>Тип:</b> ${plant.type}</p>
    <p><b>Высота:</b> ${plant.height || "-"} м</p>

    <h4>Ботаническая справка</h4>
    <p>${plant.description || "-"}</p>

    <h4>Интересные факты</h4>
    <p>${plant.fact || "-"}</p>
  `;
}

function closePlantDetail() {
  document.getElementById("plant-detail").classList.add("hidden");
  document.getElementById("plants-list").style.display = "grid";
}

function resetFilters() {
  document.getElementById("countryFilter").value = "all";
  document.getElementById("heightFilter").value = "";
  document.getElementById("typeFilter").value = "all";
  document.getElementById("yearFilter").value = "";

  loadPoints();
}

document.getElementById("applyFilter").addEventListener("click", (event) => {
  event.preventDefault();

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
  console.log("Отправляемые фильтры:", filters);
  loadPoints(filters);
  document.getElementById("right-panel").classList.remove("mobile-open");
});

document.getElementById("resetFilter").addEventListener("click", (event) => {
  event.preventDefault();
  resetFilters();
});

loadPoints();
addMapObjects();
