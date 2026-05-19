const plans = {
  1900: "images/maps/дореволюц.jpg",
  1930: "images/maps/1939.jpg",
  1960: "images/maps/map1966.jpg",
  2000: "images/maps/2009.png",
  2010: "images/maps/2016.png",
  2020: "images/maps/ufa2020.jpg",
};

function getPlanForYear(year) {
  const years = Object.keys(plans)
    .map(Number)
    .sort((a, b) => a - b);

  let result = years[0];

  for (let y of years) {
    if (y <= year) {
      result = y;
    }
  }

  return plans[result];
}

const plantsData = {
  1900: {
    present: ["Ель", "Сосна", "Липа"],
    lost: [],
  },

  1920: {
    present: ["Ель", "Сосна"],
    lost: ["Липа"],
  },

  1980: {
    present: ["Гибриды тополя", "Лиственный лес"],
    lost: ["Белая акация", "Ива ломкая", "Сибирский кедр"],
  },
};

function updateYear(year) {
  document.getElementById("yearLabel").textContent = year;

  document.getElementById("plan").src = getPlanForYear(year);

  const data = plantsData[year] || plantsData[1900];

  document.getElementById("presentList").innerHTML = data.present
    .map((p) => `<li>${p}</li>`)
    .join("");

  document.getElementById("lostList").innerHTML = data.lost
    .map((p) => `<li>${p}</li>`)
    .join("");
}

updateYear(1900);

document.getElementById("yearRange").addEventListener("input", (e) => {
  updateYear(Number(e.target.value));
});
