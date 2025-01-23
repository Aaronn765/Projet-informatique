// Création d'une équipe
document.getElementById('create-button').addEventListener('click', async () => {
  const teamName = document.getElementById('team-name').value.trim();
  const userId = localStorage.getItem('userId'); // Récupère l'ID utilisateur depuis localStorage

  if (!teamName) {
    alert('Veuillez entrer un nom pour votre équipe.');
    return;
  }

  if (!userId) {
    alert('Vous devez être connecté pour créer une équipe.');
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/admin/create-team', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-id': userId, // Ajoute l'ID utilisateur dans les en-têtes
      },
      body: JSON.stringify({ name: teamName }),
    });

    const data = await response.json();

    if (response.ok) {
      // Affiche le code de l'équipe et stocke l'ID de l'équipe
      alert(`Équipe créée avec succès ! Code : ${data.team.code}`);
      localStorage.setItem('teamId', data.team._id);

      // Redirige vers la page de jeu
      window.location.href = 'jeu.html';
    } else {
      // Afficher une erreur
      showError(data.message || 'Erreur lors de la création de l\'équipe.');
    }
  } catch (error) {
    console.error('Erreur :', error);
    showError('Impossible de se connecter au serveur.');
  }
});

// Rejoindre une équipe
document.getElementById('join-button').addEventListener('click', async () => {
  const teamCode = document.getElementById('team-code').value.trim();
  const userId = localStorage.getItem('userId'); // Récupère l'ID utilisateur depuis localStorage

  if (!teamCode) {
    alert('Veuillez entrer un code d\'équipe.');
    return;
  }

  if (!userId) {
    alert('Vous devez être connecté pour rejoindre une équipe.');
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/team/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-id': userId,
      },
      body: JSON.stringify({ code: teamCode }),
    });

    const data = await response.json();

    if (response.ok) {
      alert(`Vous avez rejoint l'équipe : ${data.team.name}`);
      localStorage.setItem('teamId', data.team._id);

      // Redirige vers la page de jeu
      window.location.href = 'jeu.html';
    } else {
      // Afficher une erreur
      showError(data.message || 'Erreur lors de la tentative de rejoindre l\'équipe.');
    }
  } catch (error) {
    console.error('Erreur :', error);
    showError('Impossible de se connecter au serveur.');
  }
});

// Fonction pour afficher les erreurs
function showError(message) {
  const errorSection = document.getElementById('error-section');
  const errorMessage = document.getElementById('error-message');

  errorSection.style.display = 'block';
  errorMessage.textContent = message;
}
