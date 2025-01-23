async function loadGame() {
    const teamId = localStorage.getItem('teamId');
  
    try {
      const response = await fetch(`http://localhost:3000/team/${teamId}/chasse`);
      const data = await response.json();
  
      if (response.ok) {
        document.getElementById('current-indice').textContent = `Indice : ${data.indice.name}`;
        document.getElementById('current-location').textContent = `Lieu : ${data.indice.location}`;
      } else {
        alert(data.message);
        window.location.href = 'team.html';
      }
    } catch (error) {
      console.error("Erreur lors du chargement de la chasse :", error);
    }
  }
  
  function startQrScanner() {
    const teamId = localStorage.getItem('teamId');
    const qrReader = document.getElementById('qr-reader');
    qrReader.style.display = 'block';
  
    const html5QrCode = new Html5Qrcode("qr-reader");
    html5QrCode.start(
      { facingMode: "environment" }, // Utiliser la caméra arrière
      {
        fps: 10,
        qrbox: 250,
      },
      async (decodedText) => {
        try {
          const response = await fetch(`http://localhost:3000/team/${teamId}/validate-qr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qrContent: decodedText }),
          });
  
          const data = await response.json();
          if (response.ok) {
            alert(data.message);
            if (data.progression === 100) {
              window.location.href = 'team.html'; // Retour à la page de l'équipe si la chasse est terminée
            } else {
              loadGame(); // Recharge l'indice suivant
            }
          } else {
            alert(data.message);
          }
        } catch (error) {
          console.error("Erreur lors de la validation du QR code :", error);
        }
      },
      (errorMessage) => {
        console.error(`Erreur : ${errorMessage}`);
      }
    );
  }
  
  document.getElementById('scan-qr').addEventListener('click', startQrScanner);
  
  // Charge le jeu au démarrage
  loadGame();
  