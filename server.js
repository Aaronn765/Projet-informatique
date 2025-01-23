const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Connexion à MongoDB Atlas
mongoose
  .connect("mongodb+srv://Pierre:AZERTY@cluster0.aycsk.mongodb.net/usersDB?retryWrites=true&w=majority")
  .then(() => {
    console.log("Connexion à MongoDB Atlas réussie !");
  })
  .catch((err) => {
    console.error("Erreur de connexion à MongoDB Atlas :", err);
  });

// Schéma utilisateur pour MongoDB
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" }, // Référence à une équipe
});

// Schéma pour les équipes
const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  progression: { type: Number, default: 0 },
  chasse: { type: mongoose.Schema.Types.ObjectId, ref: "Chasse", default: null },
  code: { type: String, unique: true, required: true }, // Code unique pour rejoindre l'équipe
});

// Schéma pour une chasse
const chasseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  indices: [
    {
      name: { type: String, required: true },
      location: { type: String, required: true },
      qrCode: { type: String, required: true }, // Ajoutez le QR code ici
    },
  ],
  equipes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
});

// Modèles MongoDB
const User = mongoose.model("User", userSchema);
const Chasse = mongoose.model("Chasse", chasseSchema);
const Team = mongoose.model("Team", teamSchema);

//Route pour le formulaire d'inscription
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Tous les champs sont requis." });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Cet email est déjà utilisé." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    console.log("Nouvel utilisateur inscrit :", { name, email });

    // Retourne l'ID utilisateur pour le frontend
    res.status(200).json({ 
      message: "Inscription réussie !",
      userId: newUser._id 
    });
  } catch (error) {
    console.error("Erreur lors de l'inscription :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});


// Route pour le formulaire de connexion
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Tous les champs sont requis." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Mot de passe incorrect." });
    }

    console.log("Utilisateur connecté :", { email });

    // Inclure l'ID utilisateur dans la réponse
    res.status(200).json({ 
      message: "Connexion réussie !", 
      userId: user._id 
    });
  } catch (error) {
    console.error("Erreur lors de la connexion :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

// Route pour créer une chasse avec des indices
const QRCode = require("qrcode");

app.post("/admin/create-chasse", async (req, res) => {
  const { name, indices } = req.body;

  if (!name || !indices || !Array.isArray(indices)) {
    return res.status(400).json({ message: "Nom de la chasse et indices valides requis." });
  }

  try {
    // Générer les QR codes pour chaque indice
    const indicesWithQrCodes = await Promise.all(
      indices.map(async (indice) => {
        const qrContent = `Indice : ${indice.name}, Lieu : ${indice.location}`;
        const qrCode = await QRCode.toDataURL(qrContent); // Génération du QR code
        return { ...indice, qrCode }; // Inclure le QR code dans chaque indice
      })
    );

    // Créer et sauvegarder la chasse
    const newChasse = new Chasse({ name, indices: indicesWithQrCodes });
    await newChasse.save();

    res.status(200).json({ message: "Chasse créée avec succès.", chasse: newChasse });
  } catch (error) {
    console.error("Erreur lors de la création de la chasse :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});


// Route pour créer une équipe
app.post("/admin/create-team", async (req, res) => {
  const { name } = req.body;
  const userId = req.headers['user-id']; // Récupère l'utilisateur qui crée l'équipe

  if (!name) {
    return res.status(400).json({ message: "Nom de l'équipe requis." });
  }

  if (!userId) {
    return res.status(401).json({ message: "Utilisateur non connecté." });
  }

  try {
    // Vérifiez si l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    // Générer un code unique à 5 chiffres
    let code;
    do {
      code = Math.floor(10000 + Math.random() * 90000).toString(); // Génère un nombre entre 10000 et 99999
    } while (await Team.findOne({ code })); // Assurez-vous que le code est unique

    // Créer une équipe avec le code
    const newTeam = new Team({ name, members: [user._id], chasse: null, code });
    await newTeam.save();

    res.status(200).json({ message: "Équipe créée avec succès.", team: newTeam });
  } catch (error) {
    console.error("Erreur lors de la création de l'équipe :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

// Route pour ajouter un membre à une équipe.
app.post('/team/:teamId/add-member', async (req, res) => {
  const { teamId } = req.params;
  const { userId } = req.body;

  try {
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Équipe non trouvée." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    if (team.members.includes(user._id)) {
      return res.status(400).json({ message: "L'utilisateur est déjà dans cette équipe." });
    }

    team.members.push(user._id);
    await team.save();

    res.status(200).json({ message: "Utilisateur ajouté à l'équipe avec succès." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de l'ajout à l'équipe." });
  }
});
//Route pour récuperer les chasses disponibles.
app.get('/chasses', async (req, res) => {
  try {
    const chasses = await Chasse.find({});
    console.log('Chasses récupérées :', chasses); // Log pour vérifier les données
    if (chasses.length === 0) {
      return res.status(404).json({ message: 'Aucune chasse disponible.' });
    }
    res.status(200).json({ chasses });
  } catch (error) {
    console.error('Erreur lors de la récupération des chasses :', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});
//route pour voir les utilisateurs disponibles
app.get('/users', async (req, res) => {
  try {
    const users = await User.find({});
    if (users.length === 0) {
      return res.status(404).json({ message: 'Aucun utilisateur trouvé.' });
    }
    res.status(200).json({ users });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs :', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});
//route pour récuperer les équipes
app.get('/teams', async (req, res) => {
  try {
    const teams = await Team.find({}).populate('members', 'name');
    if (teams.length === 0) {
      return res.status(404).json({ message: 'Aucune équipe disponible.' });
    }
    res.status(200).json({ teams });
  } catch (error) {
    console.error('Erreur lors de la récupération des équipes :', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});
// Route pour rejoindre une équipe avec un code
app.post("/team/join", async (req, res) => {
  const { code } = req.body;
  const userId = req.headers['user-id']; // ID de l'utilisateur qui veut rejoindre

  if (!code) {
    return res.status(400).json({ message: "Code requis pour rejoindre une équipe." });
  }

  if (!userId) {
    return res.status(401).json({ message: "Utilisateur non connecté." });
  }

  try {
    const team = await Team.findOne({ code });
    if (!team) {
      return res.status(404).json({ message: "Équipe non trouvée avec ce code." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    if (team.members.includes(user._id)) {
      return res.status(400).json({ message: "Vous êtes déjà membre de cette équipe." });
    }

    // Ajouter l'utilisateur à l'équipe
    team.members.push(user._id);
    await team.save();

    res.status(200).json({ message: "Vous avez rejoint l'équipe avec succès.", team });
  } catch (error) {
    console.error("Erreur lors de la tentative de rejoindre une équipe :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});
//Route pour récuperer les informations d'une chasse spécifique
app.get("/team/:teamId", async (req, res) => {
  const { teamId } = req.params;

  try {
    const team = await Team.findById(teamId).populate("members").populate("chasse");
    if (!team) {
      return res.status(404).json({ message: "Équipe non trouvée." });
    }

    res.status(200).json({ team });
  } catch (error) {
    console.error("Erreur lors de la récupération des informations de l'équipe :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});
//Route pour rejoindre une chasse
app.post("/team/:teamId/join-chasse", async (req, res) => {
  const { teamId } = req.params;
  const { chasseId } = req.body;

  try {
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Équipe non trouvée." });
    }

    if (team.chasse) {
      return res.status(400).json({ message: "L'équipe participe déjà à une chasse." });
    }

    const chasse = await Chasse.findById(chasseId);
    if (!chasse) {
      return res.status(404).json({ message: "Chasse non trouvée." });
    }

    team.chasse = chasse._id;
    await team.save();

    res.status(200).json({ message: "L'équipe a rejoint la chasse.", team });
  } catch (error) {
    console.error("Erreur lors de la tentative de rejoindre une chasse :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});
//Route pour quitter une chasse 
app.post("/team/:teamId/leave-chasse", async (req, res) => {
  const { teamId } = req.params;

  try {
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Équipe non trouvée." });
    }

    if (!team.chasse) {
      return res.status(400).json({ message: "L'équipe ne participe à aucune chasse." });
    }

    team.chasse = null;
    await team.save();

    res.status(200).json({ message: "L'équipe a quitté la chasse.", team });
  } catch (error) {
    console.error("Erreur lors de la tentative de quitter une chasse :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});
//Route pour augmenter la progression via un Qr code
app.post("/chasse/:chasseId/scan-qr", async (req, res) => {
  const { chasseId } = req.params;
  const { teamId } = req.body;

  try {
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: "Équipe non trouvée." });
    }

    if (!team.chasse || team.chasse.toString() !== chasseId) {
      return res.status(400).json({ message: "L'équipe ne participe pas à cette chasse." });
    }

    team.progression += 10; // Augmente la progression (ajustez selon vos besoins)
    await team.save();

    res.status(200).json({ message: "Progression augmentée.", team });
  } catch (error) {
    console.error("Erreur lors du scan du QR code :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

app.post("/admin/generate-qr", async (req, res) => {
  const { name, location } = req.body;

  if (!name || !location) {
    return res.status(400).json({ message: "Nom et lieu requis pour générer un QR code." });
  }

  try {
    const qrContent = `Indice : ${name}, Lieu : ${location}`;
    const qrCode = await QRCode.toDataURL(qrContent);

    res.status(200).json({ qrCode });
  } catch (error) {
    console.error("Erreur lors de la génération du QR code :", error);
    res.status(500).json({ message: "Erreur interne lors de la génération du QR code." });
  }
});

//Route pour démarrer ou reprendre une chasse

app.get("/team/:teamId/chasse", async (req, res) => {
  const { teamId } = req.params;

  try {
    const team = await Team.findById(teamId).populate("chasse");
    if (!team || !team.chasse) {
      return res.status(400).json({ message: "L'équipe ne participe à aucune chasse." });
    }

    const currentIndiceIndex = Math.floor(team.progression / (100 / team.chasse.indices.length));
    const currentIndice = team.chasse.indices[currentIndiceIndex];

    res.status(200).json({
      indice: currentIndice,
      progression: team.progression,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de la chasse :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

//Route pour valider un QR Code

app.post("/team/:teamId/validate-qr", async (req, res) => {
  const { teamId } = req.params;
  const { qrContent } = req.body;

  try {
    const team = await Team.findById(teamId).populate("chasse");
    if (!team || !team.chasse) {
      return res.status(400).json({ message: "L'équipe ne participe à aucune chasse." });
    }

    const currentIndiceIndex = Math.floor(team.progression / (100 / team.chasse.indices.length));
    const currentIndice = team.chasse.indices[currentIndiceIndex];

    // Vérifiez si le QR code correspond à l'indice actuel
    if (qrContent !== `Indice : ${currentIndice.name}, Lieu : ${currentIndice.location}`) {
      return res.status(400).json({ message: "Code QR invalide." });
    }

    // Passez à l'indice suivant ou terminez la chasse
    team.progression += 100 / team.chasse.indices.length;
    if (team.progression >= 100) {
      team.progression = 100; // Assurez-vous que la progression ne dépasse pas 100%
      team.chasse = null; // Retirez l'équipe de la chasse
      await team.save();
      return res.status(200).json({ message: "Félicitations ! Vous avez terminé la chasse !" });
    }

    await team.save();
    res.status(200).json({ message: "Indice validé. Passez au suivant.", progression: team.progression });
  } catch (error) {
    console.error("Erreur lors de la validation du QR code :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

// Lancer le serveur
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${PORT}`);
});
