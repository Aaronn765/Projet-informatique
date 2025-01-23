// Récupérer l'ID de l'équipe depuis localStorage
const teamId = localStorage.getItem('teamId');

if (!teamId) {
  document.getElementById('status').textContent = "Aucune équipe sélectionnée. Veuillez retourner à l'accueil.";
  return;
}

// Fonction pour charger les informations de l'équipe
async function fetchTeamInfo(teamId) {
  try {
    const response = await fetch(`http://localhost:3000/team/${teamId}`);
    const data = await response.json();

    if (response.ok) {
      // Mettre à jour les informations de l'équipe
      document.getElementById('team-name').textContent = data.team.name;
      document.getElementById('participant-count').textContent = data.team.members.length;

      // Ajouter les participants à la liste
      const participantList = document.getElementById('participant-list');
      participantList.innerHTML = ''; // Clear previous participants
      data.team.members.forEach(member => {
        const li = document.createElement('li');
        li.textContent = member.name;
        participantList.appendChild(li);
      });

      // Mettre à jour le lien de l'équipe
      const teamLink = document.getElementById('team-link');
      teamLink.href = `connexion.html?teamId=${teamId}`;
      teamLink.textContent = `Rejoindre l'équipe ${data.team.name}`;

      document.getElementById('status').textContent = "Informations de l'équipe chargées avec succès.";
    } else {
      document.getElementById('status').textContent =
        data.message || "Erreur lors du chargement des informations de l'équipe.";
    }
  } catch (error) {
    console.error("Erreur :", error);
    document.getElementById('status').textContent =
      "Impossible de charger les données de l'équipe. Veuillez vérifier votre connexion.";
  }
}

// Fonction pour charger les chasses disponibles
async function fetchChasses() {
  try {
    const response = await fetch('http://localhost:3000/chasses');
    const data = await response.json();

    if (response.ok) {
      const chasses = data.chasses;

      if (chasses.length === 0) {
        document.getElementById('status').textContent = "Aucune chasse disponible.";
        return;
      }

      const chasseList = document.getElementById('chasse-list');
      chasseList.innerHTML = ''; // Clear previous chasses
      chasses.forEach(chasse => {
        const li = document.createElement('li');
        li.textContent = `Nom : ${chasse.name}`;
        chasseList.appendChild(li);
      });

      document.getElementById('status').textContent = "Liste des chasses chargée avec succès.";
    } else {
      document.getElementById('status').textContent = data.message || "Erreur lors du chargement des chasses.";
    }
  } catch (error) {
    console.error("Erreur :", error);
    document.getElementById('status').textContent = 'Erreur de connexion au serveur.';
  }
}

// Charger les informations de l'équipe et les chasses
(async () => {
  await fetchTeamInfo(teamId);
  await fetchChasses();
})();
