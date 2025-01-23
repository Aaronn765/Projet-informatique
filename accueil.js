document.addEventListener("DOMContentLoaded", () => {
  const startHuntButton = document.getElementById("start-hunt");
  const resumeHuntButton = document.getElementById("resume-hunt");

  // Événement pour "Commencer une chasse"
  startHuntButton.addEventListener("click", (e) => {
    e.preventDefault();

    // Redirige vers la page pour créer ou rejoindre une équipe
    window.location.href = "commencer.html";
  });

  // Événement pour "Reprendre la chasse"
  resumeHuntButton.addEventListener("click", async (e) => {
    e.preventDefault();

    // Récupérer l'ID de l'équipe stockée dans localStorage
    const teamId = localStorage.getItem("teamId");

    if (!teamId) {
      // L'utilisateur n'est dans aucune équipe
      alert(
        "Vous n'êtes dans aucune équipe. Cliquez sur 'Commencer une chasse' pour créer ou rejoindre une équipe."
      );
      return; // Reste sur la page d'accueil
    }

    try {
      // Vérifie si l'équipe participe à une chasse
      const response = await fetch(`http://localhost:3000/team/${teamId}`);
      const data = await response.json();

      if (response.ok) {
        if (data.team.chasse) {
          // Si l'équipe participe à une chasse, redirige vers la page de jeu
          window.location.href = "game.html";
        } else {
          // Si l'équipe ne participe à aucune chasse
          alert("Rejoignez une chasse depuis la page de votre équipe.");
          window.location.href = "team.html"; // Redirige vers la page de l'équipe
        }
      } else {
        alert(data.message || "Erreur lors de la vérification de votre équipe.");
      }
    } catch (error) {
      console.error("Erreur :", error);
      alert("Erreur lors de la vérification de votre équipe. Veuillez réessayer.");
    }
  });
});
