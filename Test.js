const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const app = express();
const PORT = 3000;

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
  equipeId: { type: mongoose.Schema.Types.ObjectId, ref: "Equipe", default: null }, // Optionnel
});

// Schéma pour une équipe
const equipeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  utilisateurs: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Liste des utilisateurs
  chasses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Chasse" }],    // Liste des chasses
});

// Schéma pour une chasse
const chasseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  indices: [{ name: String, location: String }], // Liste d'indices
  equipes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Equipe" }], // Référence des équipes
});

// Modèles MongoDB
const User = mongoose.model("User", userSchema);
const Equipe = mongoose.model("Equipe", equipeSchema);
const Chasse = mongoose.model("Chasse", chasseSchema);

// Route pour le formulaire d'inscription
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
    res.status(200).json({ message: "Inscription réussie !" });
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

    res.status(200).json({ message: "Connexion réussie !" });
  } catch (error) {
    console.error("Erreur lors de la connexion :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

// Route pour créer une équipe
app.post("/create-team", async (req, res) => {
  const { name, chasseIds } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Le nom de l'équipe est requis." });
  }

  try {
    const newEquipe = new Equipe({ name, utilisateurs: [], chasses: chasseIds || [] });
    await newEquipe.save();

    // Ajouter l'équipe dans les chasses spécifiées
    if (chasseIds && chasseIds.length > 0) {
      await Chasse.updateMany(
        { _id: { $in: chasseIds } },
        { $push: { equipes: newEquipe._id } }
      );
    }

    res.status(200).json({ message: `Équipe "${name}" créée avec succès.`, team: newEquipe });
  } catch (error) {
    console.error("Erreur lors de la création de l'équipe :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

// Route pour créer une chasse
app.post("/create-chasse", async (req, res) => {
  const { name, indices, equipeIds } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Le nom de la chasse est requis." });
  }

  try {
    const newChasse = new Chasse({ name, indices: indices || [], equipes: equipeIds || [] });
    await newChasse.save();

    // Ajouter la chasse aux équipes spécifiées
    if (equipeIds && equipeIds.length > 0) {
      await Equipe.updateMany(
        { _id: { $in: equipeIds } },
        { $push: { chasses: newChasse._id } }
      );
    }

    res.status(200).json({ message: `Chasse "${name}" créée avec succès.`, chasse: newChasse });
  } catch (error) {
    console.error("Erreur lors de la création de la chasse :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

// Route pour ajouter un utilisateur à une équipe
app.post("/team/:teamId/add-user", async (req, res) => {
  const { userId } = req.body;
  const { teamId } = req.params;

  try {
    const user = await User.findById(userId);
    const equipe = await Equipe.findById(teamId);

    if (!user || !equipe) {
      return res.status(404).json({ message: "Utilisateur ou équipe non trouvé." });
    }

    user.equipeId = teamId;
    await user.save();

    equipe.utilisateurs.push(userId);
    await equipe.save();

    res.status(200).json({ message: "Utilisateur ajouté à l'équipe.", team: equipe });
  } catch (error) {
    console.error("Erreur lors de l'ajout à l'équipe :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});
//récuperer les informations d'une équipe
app.get("/team-info", async (req, res) => {
  const { teamId } = req.query; // `teamId` passé en paramètre de requête

  if (!teamId) {
    return res.status(400).json({ message: "L'ID de l'équipe est requis." });
  }

  try {
    const equipe = await Equipe.findById(teamId).populate("utilisateurs").populate("chasses");
    if (!equipe) {
      return res.status(404).json({ message: "Équipe non trouvée." });
    }

    res.status(200).json({
      name: equipe.name,
      participants: equipe.utilisateurs.map((user) => user.name),
      isInHunt: equipe.chasses.length > 0, // Indique si l'équipe participe à une chasse
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des informations de l'équipe :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});
//route pour récuperer les chasses disponibles
app.get("/available-hunts", async (req, res) => {
  try {
    const chasses = await Chasse.find().populate("equipes");
    const formattedChasses = chasses.map((chasse) => ({
      name: chasse.name,
      participants: chasse.equipes.map((team) => team.name),
    }));

    res.status(200).json(formattedChasses);
  } catch (error) {
    console.error("Erreur lors de la récupération des chasses disponibles :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
});

// Lancer le serveur
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${PORT}`);
});
