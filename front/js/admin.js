const API_URL = "http://192.168.0.101:5000";
//const API_URL = "https://khaki-hoops-sin.loca.lt";
console.log("ADMIN JS LOADED");
async function login(event) {
  event.preventDefault();

  const login = document.getElementById("login").value;

  const password = document.getElementById("password").value;

  //const response = await fetch("{http://192.168.0.101:5000}/login", {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      login,
      password,
    }),
  });

  if (response.ok) {
    document.getElementById("login-form").style.display = "none";

    document.getElementById("admin-panel").style.display = "block";

    loadPlants();
  } else {
    alert("Неверный логин");
  }
}

document.getElementById("login-form").addEventListener("submit", login);

async function addPlant() {
  const data = {
    name_rus: document.getElementById("name_rus").value,
    name_lat: document.getElementById("name_lat").value,
    country: document.getElementById("country").value,
    height: document.getElementById("height").value
      ? parseInt(document.getElementById("height").value)
      : null,

    year: document.getElementById("year").value
      ? parseInt(document.getElementById("year").value)
      : null,
    leaf_type: document.getElementById("leafType").value,
    description: document.getElementById("description").value,
    fact: document.getElementById("fact").value, // <-- ДОБАВЛЕНО
    image: document.getElementById("image").value, // <-- ДОБАВЛЕНО
  };
  console.log("Отправляемые данные:", data); // Для отладки

  //await fetch("http://192.168.0.101:5000/admin/plants", {
  await fetch(`${API_URL}/admin/plants`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  loadPlants();
}

document.getElementById("addPlantBtn").addEventListener("click", addPlant);

async function loadPlants() {
  //const response = await fetch("http://192.168.0.101:5000/admin/plants", {
  const response = await fetch(`${API_URL}/admin/plants`, {
    credentials: "include",
  });

  const plants = await response.json();
  if (!Array.isArray(plants)) {
    console.error(plants);
    alert("Ошибка авторизации");
    return;
  }

  const container = document.getElementById("plantsList");

  container.innerHTML = "";

  const select = document.getElementById("plantSelect");

  select.innerHTML = "";

  plants.forEach((plant) => {
    const div = document.createElement("div");

    div.innerHTML = `
      ${plant[0]} — ${plant[1]}
      <button onclick="deletePlant(${plant[0]})">
        Удалить
      </button>
    `;

    container.appendChild(div);

    const option = document.createElement("option");

    option.value = plant[0];
    option.textContent = plant[1];

    select.appendChild(option);
  });
}

async function deletePlant(id) {
  //await fetch(`http://192.168.0.101:5000/admin/plants/${id}`, {
  await fetch(`${API_URL}/admin/plants/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  loadPlants();
}

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

map.on("click", async function (evt) {
  const coords = ol.proj.toLonLat(evt.coordinate);

  const plantId = document.getElementById("plantSelect").value;

  //await fetch("http://192.168.0.101:5000/admin/points", {
  await fetch(`${API_URL}/admin/points`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    credentials: "include",

    body: JSON.stringify({
      plant_id: plantId,
      latitude: coords[1],
      longitude: coords[0],
    }),
  });

  alert("Точка добавлена");
});
