// URL du backend
const BASE_URL = "http://localhost:3000";

let currentChasse = {
  name: "",
  indices: [],
};

// Gestion de la création d'une chasse
document.getElementById("createChasseForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const chasseName = document.getElementById("chasseName").value;
  currentChasse.name = chasseName;
  currentChasse.indices = []; // Réinitialise les indices

  // Affiche la section pour ajouter des indices
  document.getElementById("indiceSection").style.display = "block";
  document.getElementById("currentChasseName").textContent = chasseName;
  alert(`Chasse "${chasseName}" créée. Ajoutez des indices.`);
});

// Gestion de l'ajout d'un indice
document.getElementById("addIndiceForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const indiceName = document.getElementById("indiceName").value;
  const indiceLocation = document.getElementById("indiceLocation").value;

  // Ajoute l'indice à la chasse actuelle
  currentChasse.indices.push({ name: indiceName, location: indiceLocation });

  // Affiche l'indice dans la liste
  const indiceList = document.getElementById("indiceList");
  const li = document.createElement("li");
  li.textContent = `${indiceName} - ${indiceLocation}`;
  indiceList.appendChild(li);

  // Efface les champs du formulaire
  document.getElementById("indiceName").value = "";
  document.getElementById("indiceLocation").value = "";

  // Affiche le bouton "Terminer la Chasse"
  document.getElementById("finishChasse").style.display = "block";
});

// Gestion de la fin de la chasse
document.getElementById("finishChasse").addEventListener("click", async () => {
  try {
    const response = await fetch(`${BASE_URL}/admin/create-chasse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(currentChasse),
    });

    if (response.ok) {
      alert("Chasse et indices enregistrés avec succès !");
      // Réinitialise l'interface
      document.getElementById("createChasseForm").reset();
      document.getElementById("indiceSection").style.display = "none";
      document.getElementById("indiceList").innerHTML = "";
      document.getElementById("finishChasse").style.display = "none";
    } else {
      const error = await response.json();
      alert("Erreur : " + error.message);
    }
  } catch (error) {
    console.error("Erreur lors de l'enregistrement de la chasse :", error);
  }
});
